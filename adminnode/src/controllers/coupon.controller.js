const { Op } = require("sequelize");
const { coupon, order } = require("../models");

const normalizeIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const parseNullableInteger = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
};

const parseNullableFloat = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? NaN : parsed;
};

// Get all coupons with pagination and filters
const getAllCoupons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive = "",
      type = "",
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = {};

    // Active filter
    if (isActive !== "") {
      whereClause.isActive = isActive === "true";
    }

    // Type filter
    if (type) {
      whereClause.type = type;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { code: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: coupons } = await coupon.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ["deletedAt"] },
    });

    res.json({
      success: true,
      data: {
        coupons,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons",
    });
  }
};

// Get coupon by ID
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    const couponData = await coupon.findByPk(id, {
      include: [
        {
          model: order,
          as: "orders",
          limit: 5,
          order: [["createdAt", "DESC"]],
          attributes: ["id", "orderNumber", "totalAmount", "createdAt"],
        },
      ],
      attributes: { exclude: ["deletedAt"] },
    });

    if (!couponData) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({
      success: true,
      data: couponData,
    });
  } catch (error) {
    console.error("Get coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupon",
    });
  }
};

// Create new coupon
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      type,
      value,
      minimumAmount,
      usageLimitPerCustomer,
      isActive,
      startsAt,
      expiresAt,
      applicableProducts,
      applicableCategories,
      excludedProducts,
      excludedCategories,
      customerEligibility,
      eligibleCustomers,
      freeShipping,
      stackable,
    } = req.body;

    if (!code || !name || !type || !value) {
      return res.status(400).json({
        success: false,
        message: "Code, name, type, and value are required",
      });
    }

    // Validate type and value
    const validTypes = ["percentage", "fixed", "free_shipping"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon type",
      });
    }

    if (type === "percentage" && (value < 0 || value > 100)) {
      return res.status(400).json({
        success: false,
        message: "Percentage value must be between 0 and 100",
      });
    }

    if ((type === "fixed" || type === "free_shipping") && value < 0) {
      return res.status(400).json({
        success: false,
        message: "Fixed value must be greater than 0",
      });
    }

    // Check if code already exists
    const existingCoupon = await coupon.findOne({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    // Validate dates
    if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before expiry date",
      });
    }

    const parsedMinimumAmount = parseNullableFloat(minimumAmount);
    const parsedUsageLimitPerCustomer = parseNullableInteger(
      usageLimitPerCustomer,
    );

    if (
      parsedMinimumAmount !== null &&
      (Number.isNaN(parsedMinimumAmount) || parsedMinimumAmount < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum amount must be a positive number",
      });
    }

    if (
      parsedUsageLimitPerCustomer !== null &&
      (Number.isNaN(parsedUsageLimitPerCustomer) ||
        parsedUsageLimitPerCustomer < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Per-customer usage limit must be at least 1 when provided",
      });
    }

    const newCoupon = await coupon.create({
      code: code.toUpperCase(),
      name,
      description,
      type,
      value: parseFloat(value),
      minimumAmount: parsedMinimumAmount ?? 0,
      usageLimit: null,
      usageLimitPerCustomer: parsedUsageLimitPerCustomer,
      isActive: isActive !== undefined ? isActive : true,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      applicableProducts: normalizeIdArray(applicableProducts),
      applicableCategories: normalizeIdArray(applicableCategories),
      excludedProducts: normalizeIdArray(excludedProducts),
      excludedCategories: normalizeIdArray(excludedCategories),
      customerEligibility: customerEligibility || "all",
      eligibleCustomers: eligibleCustomers || [],
      freeShipping: freeShipping || false,
      stackable: stackable || false,
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: newCoupon,
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create coupon",
    });
  }
};

// Update coupon
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const couponData = await coupon.findByPk(id);

    if (!couponData) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check if code is being changed and if it already exists
    if (updateData.code && updateData.code !== couponData.code) {
      const existingCoupon = await coupon.findOne({
        where: { code: updateData.code.toUpperCase() },
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists",
        });
      }
      updateData.code = updateData.code.toUpperCase();
    }

    // Convert numeric fields (use hasOwnProperty to allow clearing with null)
    if (Object.prototype.hasOwnProperty.call(updateData, "value")) {
      const parsedValue = parseNullableFloat(updateData.value);
      if (parsedValue === null || Number.isNaN(parsedValue) || parsedValue < 0) {
        return res.status(400).json({
          success: false,
          message: "Coupon value must be a positive number",
        });
      }
      updateData.value = parsedValue;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "minimumAmount")) {
      const parsedMinimumAmount = parseNullableFloat(updateData.minimumAmount);
      if (
        parsedMinimumAmount !== null &&
        (Number.isNaN(parsedMinimumAmount) || parsedMinimumAmount < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Minimum amount must be a positive number",
        });
      }
      updateData.minimumAmount = parsedMinimumAmount;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "usageLimit")) {
      updateData.usageLimit = null;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "usageLimitPerCustomer")) {
      const parsedUsageLimitPerCustomer = parseNullableInteger(
        updateData.usageLimitPerCustomer,
      );
      if (
        parsedUsageLimitPerCustomer !== null &&
        (Number.isNaN(parsedUsageLimitPerCustomer) ||
          parsedUsageLimitPerCustomer < 1)
      ) {
        return res.status(400).json({
          success: false,
          message: "Per-customer usage limit must be at least 1 when provided",
        });
      }
      updateData.usageLimitPerCustomer = parsedUsageLimitPerCustomer;
    }

    // Convert date fields (use hasOwnProperty to allow clearing with null)
    if (Object.prototype.hasOwnProperty.call(updateData, "startsAt")) {
      updateData.startsAt = updateData.startsAt ? new Date(updateData.startsAt) : null;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "expiresAt")) {
      updateData.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "applicableProducts")) {
      updateData.applicableProducts = normalizeIdArray(
        updateData.applicableProducts,
      );
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "applicableCategories")) {
      updateData.applicableCategories = normalizeIdArray(
        updateData.applicableCategories,
      );
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "excludedProducts")) {
      updateData.excludedProducts = normalizeIdArray(updateData.excludedProducts);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "excludedCategories")) {
      updateData.excludedCategories = normalizeIdArray(
        updateData.excludedCategories,
      );
    }

    await couponData.update(updateData);

    res.json({
      success: true,
      message: "Coupon updated successfully",
    });
  } catch (error) {
    console.error("Update coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update coupon",
    });
  }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const couponData = await coupon.findByPk(id);

    if (!couponData) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Check if coupon is used in orders
    const ordersCount = await order.count({
      where: { couponId: id },
    });

    if (ordersCount > 0) {
      // Deactivate instead of deleting to maintain order history
      await couponData.update({ isActive: false });
      await couponData.destroy();
    } else {
      // Permanently delete if never used
      await couponData.destroy({ force: true });
    }
    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Delete coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get all active coupons (public endpoint)
const getPublicCoupons = async (req, res) => {
  try {
    const now = new Date();

    const coupons = await coupon.findAll({
      where: {
        isActive: true,
        [Op.and]: [
          {
            [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }],
          },
          {
            [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gte]: now } }],
          },
        ],
      },
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "code",
        "name",
        "description",
        "type",
        "value",
        "minimumAmount",
        "usedCount",
        "usageLimitPerCustomer",
        "customerEligibility",
        "eligibleCustomers",
        "applicableProducts",
        "startsAt",
        "expiresAt",
        "isActive",
      ],
    });

    res.json({
      success: true,
      data: {
        coupons,
      },
    });
  } catch (error) {
    console.error("Get public coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons",
    });
  }
};

// Validate coupon (public endpoint)
const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount, customerId, items } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and order amount are required",
        errorCode: "MISSING_PARAMETERS",
      });
    }

    // Use shared validation helper
    const {
      validateAndCalculateCoupon,
    } = require("../helpers/couponValidation");
    const result = await validateAndCalculateCoupon(
      code,
      orderAmount,
      customerId,
      items,
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.error,
        errorCode: result.errorCode,
      });
    }

    // Return successful validation result
    res.json({
      success: true,
      message: "Coupon is valid",
      data: {
        code: result.couponData.code,
        type: result.couponData.type,
        coupon: result.couponData,
        discountAmount: result.discountAmount,
        applicableProducts: result.applicableProducts || [],
        finalAmount: parseFloat(
          (orderAmount - result.discountAmount).toFixed(2),
        ),
      },
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate coupon",
      errorCode: "VALIDATION_ERROR",
    });
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getPublicCoupons,
  validateCoupon,
};
