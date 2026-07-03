const { Op } = require("sequelize");
const {
  order,
  orderItem,
  customer,
  product,
  productVariant,
  coupon,
  couponRedemption,
  setting,
} = require("../models");
const {
  queueOrderConfirmationEmails,
  queueLowStockAlertEmail,
} = require("../services/orderEmail.service");
const shiprocketService = require("../services/shiprocket.service");
const {
  createProviderOrderForOrderRecord,
  bookShipmentForOrderRecord,
  hydrateOrderForShipping,
} = require("./shipping.controller");
const {
  getLowStockThreshold,
  shouldTriggerLowStockAlert,
} = require("../utils/stockAlert");
const { calculateGSTBreakdown } = require("../utils/gstCalculator");
const {
  calculateShipmentWeightFromOrderItems,
} = require("../utils/shipmentWeight");

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `NN${timestamp}${random}`;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SHIPPING_RATE_TOLERANCE = 1;

const parseProductSnapshot = (snapshot) => {
  if (!snapshot) return {};
  if (typeof snapshot === "string") {
    try {
      return JSON.parse(snapshot);
    } catch {
      return {};
    }
  }
  return snapshot;
};

const buildGstOrderItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const snapshot = parseProductSnapshot(item?.productSnapshot);
    const basePrice = toFiniteNumber(item?.unitPrice || snapshot?.price);

    return {
      itemId: item?.id ?? null,
      productId: item?.productId ?? null,
      productName:
        item?.productName || item?.product?.name || snapshot?.name || "Product",
      basePrice,
      gstRate: toFiniteNumber(snapshot?.gstPercentage),
      quantity: toFiniteNumber(item?.quantity),
    };
  });

const attachGstBreakdownToOrder = (orderRecord) => {
  if (!orderRecord) return orderRecord;

  const plainOrder =
    typeof orderRecord.toJSON === "function" ? orderRecord.toJSON() : orderRecord;

  return {
    ...plainOrder,
    gstBreakdown: calculateGSTBreakdown(
      buildGstOrderItems(plainOrder.items),
      plainOrder.discountAmount,
    ),
  };
};

const normalizePincode = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || "";
};

const getNumericSettingValue = async (key) => {
  const settingRecord = await setting.findOne({ where: { key } });
  if (!settingRecord) return null;

  const rawValue = settingRecord.value;
  const parsed = Number(
    rawValue && typeof rawValue === "object" && "value" in rawValue
      ? rawValue.value
      : rawValue,
  );

  return Number.isFinite(parsed) ? parsed : null;
};

const buildShipmentQuoteItems = (processedItems = []) =>
  (Array.isArray(processedItems) ? processedItems : []).map((item) => ({
    quantity: Number(item?.quantity || 1),
    variant:
      item?.usedVariant && typeof item.usedVariant.toJSON === "function"
        ? item.usedVariant.toJSON()
        : item?.usedVariant || null,
    product:
      item?.productData && typeof item.productData.toJSON === "function"
        ? item.productData.toJSON()
        : item?.productData || null,
    productSnapshot: {
      selectedSize: item?.selectedSize || null,
      variantName: item?.usedVariant?.name || null,
      length: item?.usedVariant?.length || item?.productData?.length || null,
      width: item?.usedVariant?.width || item?.productData?.width || null,
      height: item?.usedVariant?.height || item?.productData?.height || null,
    },
  }));

const resolveShippingAmount = async ({
  address,
  processedItems,
  subtotal,
  couponDiscount,
  clientProvidedShippingAmount,
  paymentMethod,
}) => {
  const freeShippingThreshold = await getNumericSettingValue(
    "free_shipping_threshold",
  );
  const normalizedSubtotal = Number(Number(subtotal || 0).toFixed(2));

  const destinationPincode = normalizePincode(
    address?.postalCode || address?.pincode,
  );
  if (!destinationPincode) {
    const error = new Error(
      "Delivery pincode is required to calculate shipping charges.",
    );
    error.statusCode = 400;
    throw error;
  }

  const quoteItems = buildShipmentQuoteItems(processedItems);
  const weightSummary = calculateShipmentWeightFromOrderItems(quoteItems);
  const shippingQuote = await shiprocketService.checkServiceability(
    process.env.WAREHOUSE_PINCODE || "600010",
    destinationPincode,
    {
      weight: weightSummary.weightKg,
      cod: String(paymentMethod).toLowerCase() === "cod",
      declaredValue: Math.max(
        0,
        Number((normalizedSubtotal - Number(couponDiscount || 0)).toFixed(2)),
      ),
    },
  );

  if (!shippingQuote.serviceable) {
    const error = new Error(
      "Delivery is not available for this pincode right now.",
    );
    error.statusCode = 400;
    throw error;
  }

  const quotedShippingAmount = Number(
    Number(shippingQuote.shippingRate || 0).toFixed(2),
  );
  const clientShippingAmount = Number(clientProvidedShippingAmount);

  if (
    Number.isFinite(clientShippingAmount) &&
    Math.abs(clientShippingAmount - quotedShippingAmount) > SHIPPING_RATE_TOLERANCE
  ) {
    console.warn(
      `[ShippingAmount] Client provided ${clientShippingAmount.toFixed(2)} but Shiprocket quoted ${quotedShippingAmount.toFixed(2)}. Using provider quote.`,
    );
  }

  const isFreeShippingApplicable =
    freeShippingThreshold !== null &&
    freeShippingThreshold > 0 &&
    normalizedSubtotal >= freeShippingThreshold;
  const shippingAmount = isFreeShippingApplicable ? 0 : quotedShippingAmount;
  const shippingDiscountAmount = Number(
    Math.max(0, quotedShippingAmount - shippingAmount).toFixed(2),
  );

  return {
    shippingAmount,
    shippingQuotedAmount: quotedShippingAmount,
    shippingDiscountAmount,
    source: isFreeShippingApplicable
      ? "free_shipping_threshold"
      : "shiprocket_quote",
    shippingQuote,
  };
};

const getGstBreakdown = async (req, res) => {
  try {
    const { orderItems = [], couponDiscount = 0 } = req.body || {};

    if (!Array.isArray(orderItems)) {
      return res.status(400).json({
        success: false,
        message: "orderItems must be an array",
      });
    }

    res.json({
      success: true,
      data: calculateGSTBreakdown(orderItems, couponDiscount),
    });
  } catch (error) {
    console.error("GST breakdown error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate GST breakdown",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get all orders with pagination and filters
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "",
      paymentStatus = "",
      packingStatus = "",
      excludeCancelledRefunded = "false",
      customerId = "",
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
      startDate = "",
      endDate = "",
    } = req.query;

    const offset = (page - 1) * limit;
    const shouldExcludeCancelledRefunded =
      String(excludeCancelledRefunded).toLowerCase() === "true";

    let whereClause = {};

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Payment status filter
    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
    }

    // Packing status filter
    if (packingStatus) {
      whereClause.packingStatus = packingStatus;
    }

    if (shouldExcludeCancelledRefunded) {
      if (!status) {
        whereClause.status = { [Op.notIn]: ["cancelled", "refunded"] };
      }
      if (!paymentStatus) {
        whereClause.paymentStatus = { [Op.ne]: "refunded" };
      }
    }

    // Customer filter
    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Search filter - search by order number or customer name/email
    if (search) {
      // Find matching customers first to avoid Sequelize subquery issues with nested includes
      const matchingCustomers = await customer.findAll({
        where: {
          [Op.or]: [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        },
        attributes: ["id"],
      });
      const matchingCustomerIds = matchingCustomers.map((c) => c.id);

      whereClause[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { customerId: { [Op.in]: matchingCustomerIds } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setUTCHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDateTime;
      }
    }

    const { count, rows: orders } = await order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
          required: search ? false : false,
        },
        {
          model: coupon,
          as: "coupon",
          attributes: ["id", "code", "name"],
          required: false,
        },
        {
          model: orderItem,
          as: "items",
          attributes: [
            "id",
            "productId",
            "productName",
            "quantity",
            "unitPrice",
            "totalPrice",
            "taxAmount",
            "productSnapshot",
          ],
          include: [
            {
              model: product,
              as: "product",
              attributes: ["id", "name", "slug", "images"],
              required: false,
            },
          ],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const ordersWithGstBreakdown = orders.map(attachGstBreakdownToOrder);

    res.json({
      success: true,
      data: {
        orders: ordersWithGstBreakdown,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderData = await order.findByPk(id, {
      include: [
        {
          model: customer,
          as: "customer",
          attributes: { exclude: ["deletedAt"] },
        },
        {
          model: coupon,
          as: "coupon",
          attributes: ["id", "code", "name", "type", "value"],
          required: false,
        },
        {
          model: orderItem,
          as: "items",
          attributes: [
            "id",
            "productId",
            "productName",
            "productSku",
            "quantity",
            "unitPrice",
            "totalPrice",
            "taxAmount",
            "discountAmount",
            "productSnapshot",
          ],
          include: [
            {
              model: product,
              as: "product",
              attributes: ["id", "name", "slug", "images"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: attachGstBreakdownToOrder(orderData),
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      items,
      address,
      paymentMethod,
      paymentStatus = "pending",
      paymentId = null,
      couponCode,
      notes,
      adminNotes,
      shippingAmount: providedShippingAmount,
    } = req.body;

    console.log("Create Order Body:", JSON.stringify(req.body, null, 2));

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Customer ID and items are required",
      });
    }

    // Verify customer exists
    const customerData = await customer.findByPk(customerId);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    let couponDiscount = 0;
    let couponId = null;

    // Process items and calculate subtotal
    const processedItems = [];

    for (const item of items) {
      const productData = await product.findByPk(item.productId, {
        include: [
          {
            model: productVariant,
            as: "variants",
            // If variantId is provided, we could narrow this down, but fetching all variants for the product is safer/easier for size matching fallback
          },
        ],
      });

      if (!productData) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} not found`,
        });
      }

      let usedVariant = null;
      let unitPrice = 0;
      let mrpPrice = 0;
      let gstPercentage = 0;

      // 1. Try to find by variantId (Preferred)
      if (item.variantId) {
        usedVariant = productData.variants?.find(
          (v) => v.id === parseInt(item.variantId),
        );
        if (!usedVariant) {
          // Fallback or Error? If variantId was sent but not found, it's an error.
          return res.status(400).json({
            success: false,
            message: `Variant ID ${item.variantId} not found for product ${productData.name}`,
          });
        }
      }
      // 2. Fallback: Try to find by selectedSize name (Legacy Frontend Support)
      else if (item.selectedSize) {
        usedVariant = productData.variants?.find(
          (v) => v.name === item.selectedSize || v.weight === item.selectedSize,
        );
      }

      // Logic with Variant
      if (usedVariant) {
        // Check Stock
        if (usedVariant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${productData.name} - ${usedVariant.name}`,
          });
        }

        unitPrice = parseFloat(usedVariant.price);
        mrpPrice = usedVariant.mrpPrice ? parseFloat(usedVariant.mrpPrice) : 0;
        gstPercentage = usedVariant.gstPercentage
          ? parseFloat(usedVariant.gstPercentage)
          : 0;
      }
      // Logic without Variant (Product Level - Deprecated but fallback)
      else {
        // If no variants exist for this product at all, we might use product price?
        // But plan says "Variants-only".
        // If we strictly fail here, old products with only 'sizes' JSON might break if they haven't been migrated.
        // For safety, let's try to parse legacy sizes JSON if no variant table match found
        let sizesArray = productData.sizes;
        if (typeof sizesArray === "string") {
          try {
            sizesArray = JSON.parse(sizesArray);
          } catch (e) { }
        }

        const legacySize = Array.isArray(sizesArray)
          ? sizesArray.find((s) => s.size === item.selectedSize)
          : null;

        if (legacySize) {
          unitPrice = Number(legacySize.price);
          mrpPrice = Number(legacySize.mrpPrice);
          // We cannot reliably track stock for legacy JSON sizes unless we rely on product.quantity
          if (
            productData.trackQuantity &&
            productData.quantity < item.quantity
          ) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for product ${productData.name}`,
            });
          }
        } else {
          // Fallback to product price if it exists (simple product)
          unitPrice = parseFloat(productData.price || 0); // Note: we removed price from model def but it might be in DB still
          if (
            productData.trackQuantity &&
            productData.quantity < item.quantity
          ) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${productData.name}`,
            });
          }
        }
      }

      if (!unitPrice || unitPrice <= 0) {
        // Try one last ditch: first variant?
        if (productData.variants && productData.variants.length > 0) {
          const v = productData.variants[0];
          usedVariant = v;
          unitPrice = parseFloat(v.price);
          mrpPrice = v.mrpPrice ? parseFloat(v.mrpPrice) : 0;
          gstPercentage = v.gstPercentage ? parseFloat(v.gstPercentage) : 0;
        }
      }

      if (!unitPrice) {
        return res.status(400).json({
          success: false,
          message: `Could not determine price for ${productData.name}`,
        });
      }

      processedItems.push({
        productData,
        quantity: item.quantity,
        variantId: usedVariant ? usedVariant.id : null,
        usedVariant,
        unitPrice,
        mrpPrice,
        gstPercentage,
        taxAmount:
          unitPrice * item.quantity * (Number.isFinite(gstPercentage) ? gstPercentage : 0) / 100,
        selectedSize:
          item.selectedSize || (usedVariant ? usedVariant.name : null),
      });

      subtotal += unitPrice * item.quantity;
      taxAmount +=
        unitPrice * item.quantity * (Number.isFinite(gstPercentage) ? gstPercentage : 0) / 100;
    }

    // Process coupon if provided - use shared validation helper
    if (couponCode) {
      const {
        validateAndCalculateCoupon,
      } = require("../helpers/couponValidation");
      const validationResult = await validateAndCalculateCoupon(
        couponCode,
        subtotal,
        customerId,
        processedItems.map((item) => ({
          productId: item.productData.id,
          categoryId: item.productData.categoryId,
          price: item.unitPrice,
          quantity: item.quantity,
        })),
      );

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: validationResult.error,
          errorCode: validationResult.errorCode,
        });
      }

      // Use validated results
      couponId = validationResult.couponId;
      couponDiscount = validationResult.discountAmount;

      console.log(
        `✅ Coupon validated: ${couponCode} (ID: ${couponId}), Discount: ₹${couponDiscount.toFixed(2)}`,
      );
    } else if (couponCode) {
      // Coupon code provided but validation failed (should not reach here)
      return res.status(400).json({
        success: false,
        message: "Invalid or expired coupon code",
      });
    }

    let shippingAmount = 0;
    let shippingQuotedAmount = 0;
    let shippingDiscountAmount = 0;
    try {
      const shippingResolution = await resolveShippingAmount({
        address,
        processedItems,
        subtotal,
        couponDiscount,
        clientProvidedShippingAmount: providedShippingAmount,
        paymentMethod,
      });
      shippingAmount = shippingResolution.shippingAmount;
      shippingQuotedAmount = shippingResolution.shippingQuotedAmount || 0;
      shippingDiscountAmount = shippingResolution.shippingDiscountAmount || 0;
    } catch (shippingError) {
      return res.status(shippingError.statusCode || 502).json({
        success: false,
        message:
          shippingError.message || "Failed to calculate shipping charges",
      });
    }
    const gstOrderItems = processedItems.map((item) => ({
      productId: item.productData.id,
      productName: item.productData.name,
      basePrice: item.unitPrice,
      gstRate: item.gstPercentage,
      quantity: item.quantity,
    }));
    const gstBreakdown = calculateGSTBreakdown(gstOrderItems, couponDiscount);
    const adjustedTaxAmount = gstBreakdown.couponApplied
      ? gstBreakdown.totalGst
      : taxAmount;
    const totalAmount = gstBreakdown.couponApplied
      ? gstBreakdown.subtotalAfterDiscount +
        gstBreakdown.totalGst +
        shippingAmount
      : subtotal + taxAmount + shippingAmount;

    // Create order
    const newOrder = await order.create({
      orderNumber: generateOrderNumber(),
      customerId,
      status: "pending",
      paymentStatus,
      paymentMethod,
      paymentId,
      subtotal,
      taxAmount: adjustedTaxAmount,
      shippingAmount,
      shippingQuotedAmount,
      shippingDiscountAmount,
      discountAmount: couponDiscount,
      totalAmount,
      couponId,
      couponCode,
      couponDiscount,
      address,
      notes,
      adminNotes,
    });

    // Create order items and update stock
    const variantRunningStock = new Map();
    for (const item of processedItems) {
      await orderItem.create({
        orderId: newOrder.id,
        productId: item.productData.id,
        variantId: item.variantId, // NEW: Store variantId
        productName: item.productData.name,
        productSku: item.usedVariant
          ? item.usedVariant.sku
          : item.productData.slug,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        taxAmount: item.taxAmount || 0,
        productSnapshot: {
          name: item.productData.name,
          slug: item.productData.slug,
          price: item.unitPrice,
          mrpPrice: item.mrpPrice,
          gstPercentage: item.gstPercentage || 0,
          selectedSize: item.selectedSize,
          variantName: item.usedVariant ? item.usedVariant.name : null, // NEW
          length: item.usedVariant?.length || item.productData.length || null,
          width: item.usedVariant?.width || item.productData.width || null,
          height: item.usedVariant?.height || item.productData.height || null,
          images: item.productData.images,
        },
      });

      // Update Stock (Variant Preferred)
      if (item.usedVariant) {
        const variantId = Number(item.usedVariant.id);
        const previousStock = variantRunningStock.has(variantId)
          ? variantRunningStock.get(variantId)
          : Number(item.usedVariant.stock || 0);
        const currentStock = Math.max(0, previousStock - Number(item.quantity || 0));
        variantRunningStock.set(variantId, currentStock);

        // Decrement variant stock
        await item.usedVariant.decrement("stock", { by: item.quantity });
        await item.usedVariant.increment("sold", { by: item.quantity });

        // Product-level sold tracking was removed (variants hold sold counts).

        const lowStockThreshold = Number.isFinite(
          Number(item.productData.lowStockThreshold),
        )
          ? Number(item.productData.lowStockThreshold)
          : getLowStockThreshold();
        const trackQuantityEnabled = item.productData.trackQuantity !== false;

        if (
          trackQuantityEnabled &&
          shouldTriggerLowStockAlert({
            previousStock,
            currentStock,
            threshold: lowStockThreshold,
          })
        ) {
          queueLowStockAlertEmail({
            productId: item.productData.id,
            productName: item.productData.name,
            variantId,
            variantName: item.usedVariant.name,
            sku: item.usedVariant.sku,
            previousStock,
            currentStock,
            threshold: lowStockThreshold,
            orderNumber: newOrder.orderNumber,
            source: "order_create",
          });
        }
      } else if (item.productData.trackQuantity) {
        // Fallback: Decrement product stock
        await item.productData.decrement("quantity", { by: item.quantity });
        // Product-level sold tracking was removed (variants hold sold counts).
      }
    }

    // Update coupon usage and create redemption record
    if (couponId) {
      try {
        console.log(
          `📝 Creating coupon redemption for couponId: ${couponId}, orderId: ${newOrder.id}, customerId: ${customerId}`,
        );

        const couponData = await coupon.findByPk(couponId);
        if (!couponData) {
          console.error(`❌ Coupon not found with ID: ${couponId}`);
        } else {
          await couponData.update({
            usedCount: couponData.usedCount + 1,
          });
          console.log(
            `✅ Updated coupon usedCount to ${couponData.usedCount + 1}`,
          );
        }

        // Create Coupon Redemption Record
        const redemption = await couponRedemption.create({
          couponId: couponId,
          orderId: newOrder.id,
          customerId: customerId,
          discountAmount: couponDiscount,
          usedAt: new Date(),
        });
        console.log(
          `✅ Coupon redemption created successfully:`,
          redemption.id,
        );
      } catch (redemptionError) {
        console.error(`❌ Error creating coupon redemption:`, redemptionError);
        // Don't fail the order creation, just log the error
      }
    } else {
      console.log(`ℹ️ No couponId provided, skipping redemption creation`);
    }

    // Update customer statistics
    await customerData.update({
      totalOrders: customerData.totalOrders + 1,
      totalSpent: parseFloat(customerData.totalSpent) + parseFloat(totalAmount),
      lastOrderDate: new Date(),
    });
    queueOrderConfirmationEmails(newOrder.id);

    let providerOrderState = null;
    try {
      const orderForShipment = await hydrateOrderForShipping(newOrder.id);

      if (orderForShipment) {
        console.log(
          `🚚 [AutoShip] Attempting Shiprocket order creation for order ${orderForShipment.orderNumber}`,
        );
        providerOrderState = await createProviderOrderForOrderRecord(orderForShipment, {
          order_id: orderForShipment.orderNumber,
        });
        console.log(
          `✅ [AutoShip] Shiprocket order created for ${orderForShipment.orderNumber} with shipment ID ${providerOrderState.shipmentId}`,
        );
      }
    } catch (shipmentError) {
      console.error(
        `❌ [AutoShip] Error for order ${newOrder.orderNumber}:`,
        shipmentError.message,
      );

      await newOrder.update({
        shippingProvider: shiprocketService.PROVIDER_NAME,
        shippingBookingStage: shiprocketService.BOOKING_STAGE_NOT_CREATED,
        shippingLatestStatus: shipmentError.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        totalAmount: newOrder.totalAmount,
        subtotal: newOrder.subtotal,
        discountAmount: newOrder.discountAmount,
        taxAmount: newOrder.taxAmount,
        shippingAmount: newOrder.shippingAmount,
        shippingQuotedAmount: newOrder.shippingQuotedAmount,
        shippingDiscountAmount: newOrder.shippingDiscountAmount,
        couponCode: newOrder.couponCode,
        gstBreakdown,
        trackingNumber: null,
        shippingCarrier: null,
        shippingProvider: shiprocketService.PROVIDER_NAME,
        shippingProviderOrderId: providerOrderState?.providerOrderId || null,
        shippingShipmentId: providerOrderState?.shipmentId || null,
        shippingCourierName: null,
        shippingLatestStatus:
          providerOrderState?.latestStatusLabel ||
          newOrder.shippingLatestStatus ||
          null,
        shippingBookingStage:
          providerOrderState?.shippingBookingStage ||
          newOrder.shippingBookingStage ||
          shiprocketService.BOOKING_STAGE_NOT_CREATED,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
    }

    const orderData = await order.findByPk(id);
    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const updateData = { status };
    const previousStatus = orderData.status;

    // Set timestamps based on status
    if (status === "shipped") {
      updateData.shippedAt = new Date();
    } else if (status === "delivered") {
      updateData.deliveredAt = new Date();
    } else if (status === "cancelled") {
      updateData.cancelledAt = new Date();
      updateData.cancelledReason = notes;

      // Update customer statistics when order is cancelled
      if (previousStatus !== "cancelled") {
        const customerData = await customer.findByPk(orderData.customerId);
        if (customerData) {
          await customerData.update({
            totalOrders: Math.max(0, customerData.totalOrders - 1),
            totalSpent: Math.max(
              0,
              parseFloat(customerData.totalSpent) -
              parseFloat(orderData.totalAmount),
            ),
          });
        }
      }
    }

    if (notes) {
      updateData.adminNotes = notes;
    }

    await orderData.update(updateData);

    if (status === "confirmed") {
      queueOrderConfirmationEmails(orderData.id);
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentId, notes } = req.body;

    const validPaymentStatuses = [
      "pending",
      "paid",
      "failed",
      "refunded",
      "partially_refunded",
    ];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment status is required",
      });
    }

    const orderData = await order.findByPk(id);
    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const updateData = { paymentStatus };

    if (paymentId) {
      updateData.paymentId = paymentId;
    }

    if (
      paymentStatus === "refunded" ||
      paymentStatus === "partially_refunded"
    ) {
      updateData.refundedAt = new Date();
      updateData.refundReason = notes;
    }

    if (notes) {
      updateData.adminNotes = notes;
    }

    await orderData.update(updateData);

    if (paymentStatus === "paid") {
      queueOrderConfirmationEmails(orderData.id);
    }

    res.json({
      success: true,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
    });
  }
};

// Update packing status
const updatePackingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { packingStatus } = req.body;

    const validStatuses = ["unpacked", "packed"];
    if (!packingStatus || !validStatuses.includes(packingStatus)) {
      return res.status(400).json({
        success: false,
        message: "Valid packing status is required (unpacked or packed)",
      });
    }

    const orderData = await hydrateOrderForShipping(id);
    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await orderData.update({ packingStatus });

    let shipmentResult = null;
    let bookingTriggered = false;
    let bookingSuccess = false;
    let manualRetryRequired = false;
    let bookingMessage = null;

    if (
      packingStatus === "packed" &&
      orderData.status !== "cancelled" &&
      orderData.status !== "refunded"
    ) {
      bookingTriggered = true;

      try {
        if (
          orderData.shippingBookingStage ===
            shiprocketService.BOOKING_STAGE_NOT_CREATED ||
          !orderData.shippingShipmentId
        ) {
          await createProviderOrderForOrderRecord(orderData, {
            order_id: orderData.orderNumber,
          });
        }

        shipmentResult = await bookShipmentForOrderRecord(orderData, {
          order_id: orderData.orderNumber,
        });
        bookingSuccess = true;
        bookingMessage = "Shipment booked and pickup scheduled successfully";
      } catch (bookingError) {
        manualRetryRequired = true;
        bookingMessage = bookingError.message || "Manual retry required";
        await orderData.update({
          shippingProvider: shiprocketService.PROVIDER_NAME,
          shippingBookingStage:
            orderData.shippingShipmentId ||
            orderData.shippingBookingStage ===
              shiprocketService.BOOKING_STAGE_ORDER_CREATED
              ? shiprocketService.BOOKING_STAGE_ORDER_CREATED
              : shiprocketService.BOOKING_STAGE_NOT_CREATED,
          shippingLatestStatus: bookingMessage,
        });
      }
    }

    const refreshedOrder = await hydrateOrderForShipping(id);

    res.json({
      success: true,
      message: manualRetryRequired
        ? "Packing status updated, but Shiprocket booking failed. Manual retry required."
        : "Packing status updated successfully",
      data: refreshedOrder || orderData,
      shipment: shipmentResult,
      bookingTriggered,
      bookingSuccess,
      manualRetryRequired,
      bookingMessage,
    });
  } catch (error) {
    console.error("Update packing status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update packing status",
    });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await order.count();
    const pendingOrders = await order.count({ where: { status: "pending" } });
    const shippedOrders = await order.count({ where: { status: "shipped" } });
    const deliveredOrders = await order.count({
      where: { status: "delivered" },
    });
    const cancelledOrders = await order.count({
      where: { status: "cancelled" },
    });

    const paidOrders = await order.count({
      where: {
        paymentStatus: "paid",
        status: {
          [Op.ne]: "cancelled",
        },
      },
    });
    const failedPayments = await order.count({
      where: { paymentStatus: "failed" },
    });

    const totalRevenue = await order.sum("totalAmount", {
      where: {
        paymentStatus: "paid",
        status: {
          [Op.ne]: "cancelled",
        },
      },
    });

    const averageOrderValue = totalRevenue / paidOrders || 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        paidOrders,
        failedPayments,
        totalRevenue: totalRevenue || 0,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
    });
  }
};

module.exports = {
  getGstBreakdown,
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updatePackingStatus,
  getOrderStats,
};
