const {
  order,
  orderItem,
  productVariant,
  customer,
} = require("../models");
const shiprocketService = require("../services/shiprocket.service");
const {
  parseWeightToKg,
  formatWeightForPayload,
  formatDimensionForPayload,
  calculateShipmentWeightFromOrderItems,
  calculateShipmentDimensionsFromOrderItems,
} = require("../utils/shipmentWeight");

const buildOriginDetails = (incoming = {}) => ({
  name: incoming.name || process.env.WAREHOUSE_NAME || "Naveenam Naturals",
  phone: incoming.phone || process.env.WAREHOUSE_PHONE || "9876543210",
  address_line_1:
    incoming.address_line_1 ||
    process.env.WAREHOUSE_ADDRESS ||
    "No 17 Sylvan Lodge Colony, Kelly's Road, Kilpauk",
  address_line_2: incoming.address_line_2 || process.env.WAREHOUSE_ADDRESS_2 || "",
  pincode: incoming.pincode || process.env.WAREHOUSE_PINCODE || "600010",
  city: incoming.city || process.env.WAREHOUSE_CITY || "Chennai",
  state: incoming.state || process.env.WAREHOUSE_STATE || "Tamil Nadu",
  email:
    incoming.email ||
    process.env.WAREHOUSE_EMAIL ||
    "support@naveenamnaturals.com",
});

const parseAddressSnapshot = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

const buildOrderItemsPayload = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const snapshot = item?.productSnapshot || {};
    return {
      productName:
        item?.productName || snapshot?.name || item?.product?.name || "Product",
      productSku:
        item?.productSku || snapshot?.sku || item?.product?.slug || "SKU",
      quantity: Number(item?.quantity || 1),
      unitPrice: Number(item?.unitPrice || snapshot?.price || 0),
      taxAmount: Number(item?.taxAmount || 0),
      discountAmount: Number(item?.discountAmount || 0),
      productSnapshot: snapshot,
    };
  });

const buildShippingStateUpdateData = (shipment = {}, overrides = {}) => ({
  shippingProvider: shiprocketService.PROVIDER_NAME,
  shippingProviderOrderId:
    shipment.providerOrderId || overrides.shippingProviderOrderId || null,
  shippingShipmentId: shipment.shipmentId || overrides.shippingShipmentId || null,
  shippingCourierName:
    shipment.courierName || overrides.shippingCourierName || null,
  shippingLatestStatus:
    shipment.latestStatusLabel || overrides.shippingLatestStatus || null,
  shippingBookingStage:
    shipment.shippingBookingStage ||
    overrides.shippingBookingStage ||
    shiprocketService.BOOKING_STAGE_NOT_CREATED,
  trackingNumber:
    shipment.awbNumber !== undefined
      ? shipment.awbNumber || null
      : overrides.trackingNumber,
  shippingCarrier:
    shipment.courierName ||
    overrides.shippingCarrier ||
    (shipment.awbNumber ? shiprocketService.PROVIDER_LABEL : null),
});

const getOrderShippingInclude = () => [
  {
    model: customer,
    as: "customer",
    required: false,
  },
  {
    model: orderItem,
    as: "items",
    include: [
      {
        model: productVariant,
        as: "variant",
        required: false,
      },
    ],
  },
];

const hydrateOrderForShipping = async (orderIdOrNumber, by = "id") =>
  order.findOne({
    where:
      by === "orderNumber"
        ? { orderNumber: orderIdOrNumber }
        : { id: orderIdOrNumber },
    include: getOrderShippingInclude(),
  });

const syncOrderTrackingState = async (orderRecord, trackingData) => {
  if (!orderRecord || !trackingData) return;

  const mappedStatus = shiprocketService.mapTrackingToOrderStatus(trackingData);
  const updateData = buildShippingStateUpdateData(trackingData, {
    shippingProviderOrderId: orderRecord.shippingProviderOrderId,
    shippingShipmentId: orderRecord.shippingShipmentId,
    shippingBookingStage:
      trackingData.awbNumber || orderRecord.trackingNumber
        ? shiprocketService.BOOKING_STAGE_BOOKED
        : orderRecord.shippingBookingStage ||
          shiprocketService.BOOKING_STAGE_NOT_CREATED,
    trackingNumber: trackingData.awbNumber || orderRecord.trackingNumber,
    shippingCarrier:
      trackingData.carrier ||
      orderRecord.shippingCarrier ||
      shiprocketService.PROVIDER_LABEL,
  });

  if (mappedStatus === "delivered") {
    updateData.status = "delivered";
    updateData.deliveredAt = orderRecord.deliveredAt || new Date();
  } else if (mappedStatus === "cancelled") {
    if (orderRecord.status !== "delivered") {
      updateData.status = "cancelled";
      updateData.cancelledAt = orderRecord.cancelledAt || new Date();
    }
  } else if (mappedStatus === "shipped") {
    if (["pending", "confirmed", "processing"].includes(orderRecord.status)) {
      updateData.status = "shipped";
      updateData.shippedAt = orderRecord.shippedAt || new Date();
    }
  } else if (mappedStatus === "confirmed") {
    if (["pending", "processing"].includes(orderRecord.status)) {
      updateData.status = "confirmed";
      updateData.shippedAt = null;
    }
  }

  await orderRecord.update(updateData);
};

const buildConsignmentFromOrder = (basePayload, orderRecord) => {
  const address = parseAddressSnapshot(orderRecord?.address);
  const customerRecord = orderRecord?.customer || {};
  const customerAddress = parseAddressSnapshot(customerRecord?.address);

  return {
    ...basePayload,
    origin_details: buildOriginDetails(basePayload.origin_details),
    destination_details: {
      ...basePayload.destination_details,
      name:
        basePayload.destination_details?.name ||
        address.name ||
        customerAddress.name ||
        `${customerRecord.firstName || ""} ${customerRecord.lastName || ""}`.trim() ||
        "Customer",
      phone:
        basePayload.destination_details?.phone ||
        address.phone ||
        customerAddress.phone ||
        customerRecord.phone ||
        "0000000000",
      address_line_1:
        basePayload.destination_details?.address_line_1 ||
        address.address ||
        customerAddress.address ||
        "Address Missing",
      address_line_2:
        basePayload.destination_details?.address_line_2 ||
        address.address2 ||
        customerAddress.address2 ||
        "",
      pincode:
        basePayload.destination_details?.pincode ||
        address.postalCode ||
        address.pincode ||
        customerAddress.postalCode ||
        customerAddress.pincode ||
        "000000",
      city:
        basePayload.destination_details?.city ||
        address.city ||
        customerAddress.city ||
        "Unknown City",
      state:
        basePayload.destination_details?.state ||
        address.state ||
        customerAddress.state ||
        "Unknown State",
      email:
        basePayload.destination_details?.email ||
        address.email ||
        customerAddress.email ||
        customerRecord.email ||
        process.env.WAREHOUSE_EMAIL ||
        "support@naveenamnaturals.com",
      country:
        basePayload.destination_details?.country ||
        address.country ||
        customerAddress.country ||
        "India",
    },
    order_items: buildOrderItemsPayload(orderRecord?.items),
    shipping_charges:
      Number(basePayload.shipping_charges) ||
      Number(orderRecord?.shippingAmount || 0),
    total_discount:
      Number(basePayload.total_discount) ||
      Number(orderRecord?.discountAmount || 0),
    tax_amount: Number(basePayload.tax_amount) || Number(orderRecord?.taxAmount || 0),
    sub_total: Number(basePayload.sub_total) || Number(orderRecord?.subtotal || 0),
    total_amount:
      Number(basePayload.total_amount) || Number(orderRecord?.totalAmount || 0),
    declared_value:
      Number(basePayload.declared_value) || Number(orderRecord?.totalAmount || 0),
    payment_method:
      basePayload.payment_method || orderRecord?.paymentMethod || "online",
    cod_amount:
      Number(basePayload.cod_amount) ||
      (orderRecord?.paymentMethod === "cod" ? Number(orderRecord.totalAmount || 0) : 0),
  };
};

const buildConsignmentForOrderRecord = (orderRecord, basePayload = {}) => {
  if (!orderRecord) {
    throw new Error("Order record is required to prepare shipment");
  }

  let consignmentData = buildConsignmentFromOrder(basePayload, orderRecord);
  const fallbackWeightKg =
    parseWeightToKg(consignmentData.weight, { defaultUnit: "kg" }) || 0.5;
  const weightSummary = calculateShipmentWeightFromOrderItems(orderRecord.items, {
    fallbackWeightKg,
  });
  const dimensionSummary = calculateShipmentDimensionsFromOrderItems(
    orderRecord.items,
    { fallbackWeightKg: weightSummary.weightKg || fallbackWeightKg },
  );

  consignmentData.weight = formatWeightForPayload(weightSummary.weightKg);
  consignmentData.dimension_unit = dimensionSummary.dimensionUnit || "cm";
  consignmentData.length = formatDimensionForPayload(
    dimensionSummary.length,
    dimensionSummary.length,
  );
  consignmentData.width = formatDimensionForPayload(
    dimensionSummary.width,
    dimensionSummary.width,
  );
  consignmentData.height = formatDimensionForPayload(
    dimensionSummary.height,
    dimensionSummary.height,
  );
  consignmentData.origin_details = buildOriginDetails(consignmentData.origin_details);

  return consignmentData;
};

const createProviderOrderForOrderRecord = async (
  orderRecord,
  basePayload = {},
  options = {},
) => {
  if (!orderRecord) {
    throw new Error("Order record is required to create provider order");
  }

  if (
    !options.force &&
    orderRecord.shippingBookingStage ===
      shiprocketService.BOOKING_STAGE_ORDER_CREATED &&
    orderRecord.shippingShipmentId
  ) {
    return {
      provider: shiprocketService.PROVIDER_NAME,
      providerOrderId: orderRecord.shippingProviderOrderId,
      shipmentId: orderRecord.shippingShipmentId,
      latestStatus: shiprocketService.BOOKING_STAGE_ORDER_CREATED,
      latestStatusLabel:
        orderRecord.shippingLatestStatus || "Shiprocket Order Created",
      shippingBookingStage: shiprocketService.BOOKING_STAGE_ORDER_CREATED,
    };
  }

  if (
    !options.force &&
    orderRecord.shippingBookingStage === shiprocketService.BOOKING_STAGE_BOOKED &&
    (orderRecord.shippingShipmentId || orderRecord.trackingNumber)
  ) {
    return {
      provider: shiprocketService.PROVIDER_NAME,
      providerOrderId: orderRecord.shippingProviderOrderId,
      shipmentId: orderRecord.shippingShipmentId,
      awbNumber: orderRecord.trackingNumber,
      courierName: orderRecord.shippingCourierName || orderRecord.shippingCarrier,
      latestStatus: orderRecord.shippingLatestStatus,
      latestStatusLabel: orderRecord.shippingLatestStatus || "Shipment Booked",
      shippingBookingStage: shiprocketService.BOOKING_STAGE_BOOKED,
    };
  }

  const consignmentData = buildConsignmentForOrderRecord(orderRecord, basePayload);
  const providerOrder = await shiprocketService.createProviderOrder(consignmentData);

  await orderRecord.update(
    buildShippingStateUpdateData(providerOrder, {
      shippingBookingStage: shiprocketService.BOOKING_STAGE_ORDER_CREATED,
      trackingNumber: orderRecord.trackingNumber || null,
      shippingCarrier: orderRecord.shippingCarrier || null,
    }),
  );

  return {
    ...providerOrder,
    shippingBookingStage: shiprocketService.BOOKING_STAGE_ORDER_CREATED,
  };
};

const bookShipmentForOrderRecord = async (orderRecord, basePayload = {}) => {
  if (!orderRecord) {
    throw new Error("Order record is required to book shipment");
  }

  if (
    orderRecord.shippingBookingStage === shiprocketService.BOOKING_STAGE_BOOKED &&
    orderRecord.trackingNumber
  ) {
    return {
      provider: shiprocketService.PROVIDER_NAME,
      providerOrderId: orderRecord.shippingProviderOrderId,
      shipmentId: orderRecord.shippingShipmentId,
      awbNumber: orderRecord.trackingNumber,
      courierName: orderRecord.shippingCourierName || orderRecord.shippingCarrier,
      latestStatus: orderRecord.shippingLatestStatus,
      latestStatusLabel: orderRecord.shippingLatestStatus || "Shipment Booked",
      shippingBookingStage: shiprocketService.BOOKING_STAGE_BOOKED,
    };
  }

  const consignmentData = buildConsignmentForOrderRecord(orderRecord, basePayload);
  let shippingShipmentId = orderRecord.shippingShipmentId;
  let shippingProviderOrderId = orderRecord.shippingProviderOrderId;

  if (!shippingShipmentId) {
    const providerOrder = await createProviderOrderForOrderRecord(orderRecord, basePayload);
    shippingShipmentId = providerOrder.shipmentId;
    shippingProviderOrderId = providerOrder.providerOrderId;
  }

  const shipment = await shiprocketService.bookProviderShipment({
    ...consignmentData,
    shipment_id: shippingShipmentId,
    providerOrderId: shippingProviderOrderId,
  });

  const updateData = buildShippingStateUpdateData(shipment, {
    shippingProviderOrderId,
    shippingShipmentId,
    shippingBookingStage: shiprocketService.BOOKING_STAGE_BOOKED,
  });
  if (["pending", "confirmed", "processing"].includes(orderRecord.status)) {
    updateData.status = "confirmed";
    updateData.shippedAt = null;
  }

  await orderRecord.update(updateData);
  return {
    ...shipment,
    shippingBookingStage: shiprocketService.BOOKING_STAGE_BOOKED,
  };
};

const checkServiceability = async (req, res) => {
  try {
    const { originPincode, destPincode, weight, cod, declaredValue } = req.body;
    const origin = originPincode || process.env.WAREHOUSE_PINCODE || "600010";
    const isCod =
      cod === true || cod === "true" || cod === 1 || cod === "1";

    if (!destPincode) {
      return res.status(400).json({
        success: false,
        message: "Destination pincode is required",
      });
    }

    const result = await shiprocketService.checkServiceability(origin, destPincode, {
      weight,
      cod: isCod,
      declaredValue,
    });

    if (!result.serviceable) {
      return res.json({
        success: false,
        message: "Service not available for this pincode",
        data: {
          serviceable: false,
          shippingRate: 0,
          provider: shiprocketService.PROVIDER_NAME,
        },
      });
    }

    res.json({
      success: true,
      data: {
        serviceable: true,
        shippingRate: result.shippingRate,
        provider: result.provider,
        estimatedDays: result.estimatedDays,
        courierName: result.courierName,
        courierCompanyId: result.courierCompanyId,
        details: result.details,
      },
    });
  } catch (error) {
    console.error("Shiprocket pincode check error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to check serviceability",
      error: error.details || error.message,
    });
  }
};

const createShipment = async (req, res) => {
  try {
    let consignmentData = { ...req.body };
    let orderRecord = null;

    if (consignmentData.order_id) {
      orderRecord = await hydrateOrderForShipping(
        consignmentData.order_id,
        "orderNumber",
      );

      if (!orderRecord) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
    }

    if (orderRecord) {
      const shipment = await bookShipmentForOrderRecord(orderRecord, consignmentData);

      return res.json({
        success: true,
        message: "Shiprocket shipment booked successfully",
        data: shipment,
        awbNumber: shipment.awbNumber,
      });
    } else {
      consignmentData.origin_details = buildOriginDetails(consignmentData.origin_details);
    }

    const shipment = await shiprocketService.createShipment(consignmentData);

    res.json({
      success: true,
      data: shipment,
      awbNumber: shipment.awbNumber,
    });
  } catch (error) {
    console.error("Create Shiprocket shipment error:", error.message);
    const statusCode =
      error.message?.includes("does not service") ||
      error.message?.includes("destination pincode")
        ? 400
        : 500;
    res.status(statusCode).json({
      success: false,
      message: "Failed to create shipment",
      error: error.details || error.message,
    });
  }
};

const createProviderOrder = async (req, res) => {
  try {
    const consignmentData = { ...req.body };

    if (!consignmentData.order_id) {
      return res.status(400).json({
        success: false,
        message: "order_id is required to create a Shiprocket order",
      });
    }

    const orderRecord = await hydrateOrderForShipping(
      consignmentData.order_id,
      "orderNumber",
    );

    if (!orderRecord) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const providerOrder = await createProviderOrderForOrderRecord(
      orderRecord,
      consignmentData,
    );

    return res.json({
      success: true,
      message: "Shiprocket order created successfully",
      data: providerOrder,
    });
  } catch (error) {
    console.error("Create Shiprocket provider order error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create Shiprocket order",
      error: error.details || error.message,
    });
  }
};

const getShippingLabel = async (req, res) => {
  try {
    const { referenceNumber } = req.query;

    if (!referenceNumber) {
      return res.status(400).json({
        success: false,
        message: "Reference number (AWB) is required",
      });
    }

    let shipmentId = null;

    const orderRecord = await order.findOne({
      where: {
        trackingNumber: referenceNumber,
      },
    });

    if (orderRecord?.shippingShipmentId) {
      shipmentId = orderRecord.shippingShipmentId;
    } else {
      const trackingData = await shiprocketService.trackShipment(referenceNumber);
      shipmentId = trackingData.shipmentId;
    }

    if (!shipmentId) {
      return res.status(404).json({
        success: false,
        message: "No shipment found for this reference number",
      });
    }

    const labelPdf = await shiprocketService.getShippingLabel(shipmentId);
    res.set("Content-Type", "application/pdf");
    res.send(labelPdf);
  } catch (error) {
    console.error("Get Shiprocket label error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get shipping label",
      error: error.details || error.message,
    });
  }
};

const cancelShipment = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const requestedOrderIds = Array.isArray(orderIds)
      ? orderIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (requestedOrderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid Shiprocket order IDs array is required",
      });
    }

    const providerResponse = await shiprocketService.cancelOrders(
      requestedOrderIds,
    );
    const cancelledOrders = [];
    const providerCancelledSet = new Set(
      (providerResponse.providerCancelledOrderIds || []).map(String),
    );

    for (const providerOrderId of requestedOrderIds) {
      if (!providerCancelledSet.has(String(providerOrderId))) {
        continue;
      }

      const orderRecord = await order.findOne({
        where: { shippingProviderOrderId: String(providerOrderId) },
      });

      if (!orderRecord) continue;

      await orderRecord.update({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledReason: "Shipment cancelled via admin panel",
        trackingNumber: null,
        shippingCarrier: null,
        shippingProviderOrderId: null,
        shippingShipmentId: null,
        shippingCourierName: null,
        shippingLatestStatus: "Cancelled",
        shippingBookingStage: shiprocketService.BOOKING_STAGE_NOT_CREATED,
      });
      cancelledOrders.push(orderRecord.orderNumber);
    }

    res.json({
      success: true,
      message:
        cancelledOrders.length > 0
          ? "Shiprocket order cancelled successfully"
          : "Shiprocket did not confirm cancellation for the requested order ID(s).",
      data: providerResponse.payload,
      cancelledOrders,
      providerCancelledOrderIds: providerResponse.providerCancelledOrderIds,
      notCancelledOrderIds: providerResponse.notCancelledOrderIds,
    });
  } catch (error) {
    console.error("Cancel Shiprocket order error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to cancel Shiprocket order",
      error: error.details || error.message,
    });
  }
};

const trackShipment = async (req, res) => {
  try {
    const awbNumber = req.query.awbNumber || req.params.awb;
    const shouldSync = req.query.sync !== "false";

    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB Number is required",
      });
    }

    const trackingData = await shiprocketService.trackShipment(awbNumber);
    const orderRecord = await order.findOne({
      where: { trackingNumber: trackingData.awbNumber || awbNumber },
    });

    if (shouldSync && orderRecord) {
      await syncOrderTrackingState(orderRecord, trackingData);
    }

    res.json({
      success: true,
      data: {
        awbNumber: trackingData.awbNumber,
        carrier: trackingData.carrier,
        latestStatus: trackingData.latestStatus,
        latestStatusLabel: trackingData.latestStatusLabel,
        shipmentId: trackingData.shipmentId || null,
        providerOrderId: trackingData.providerOrderId || null,
        courierCompanyId: trackingData.courierCompanyId || null,
        events: trackingData.events || [],
      },
    });
  } catch (error) {
    console.error("Track Shiprocket shipment error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to track shipment",
      error: error.details || error.message,
    });
  }
};

module.exports = {
  checkServiceability,
  createProviderOrder,
  createShipment,
  createProviderOrderForOrderRecord,
  bookShipmentForOrderRecord,
  getShippingLabel,
  cancelShipment,
  trackShipment,
  hydrateOrderForShipping,
  syncOrderTrackingState,
};
