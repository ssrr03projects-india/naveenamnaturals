const { Op } = require("sequelize");

const normalizeIdArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0);
      }
    } catch {
      return value
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0);
    }
  }

  return [];
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Shared coupon validation helper
 * Single source of truth for validating coupons and calculating discounts
 *
 * @param {string} couponCode - The coupon code to validate
 * @param {number} orderAmount - Total order amount before discount
 * @param {number} customerId - Customer ID (optional for guest checkout)
 * @param {Array} items - Order items for product/category restrictions
 * @returns {Promise<{valid: boolean, couponId?: number, discountAmount?: number, couponData?: object, error?: string, errorCode?: string}>}
 */
async function validateAndCalculateCoupon(
  couponCode,
  orderAmount,
  customerId = null,
  items = [],
) {
  const { coupon, couponRedemption, order } = require("../models");

  try {
    const normalizedItems = Array.isArray(items)
      ? items.map((item) => ({
        productId: toNumber(item?.productId),
        categoryId: toNumber(item?.categoryId),
        price: toNumber(item?.price),
        quantity: toNumber(item?.quantity),
      }))
      : [];

    // Find active coupon
    const couponData = await coupon.findOne({
      where: {
        code: couponCode.toUpperCase(),
        isActive: true,
        [Op.and]: [
          {
            [Op.or]: [
              { startsAt: null },
              { startsAt: { [Op.lte]: new Date() } },
            ],
          },
          {
            [Op.or]: [
              { expiresAt: null },
              { expiresAt: { [Op.gte]: new Date() } },
            ],
          },
        ],
      },
    });

    if (!couponData) {
      return {
        valid: false,
        error: "Invalid or expired coupon code",
        errorCode: "COUPON_INVALID",
      };
    }

    // Check per-customer usage limit only when explicitly configured
    const perCustomerLimit = Number(couponData.usageLimitPerCustomer);
    if (customerId && Number.isInteger(perCustomerLimit) && perCustomerLimit > 0) {
      const customerUsageCount = await couponRedemption.count({
        where: {
          couponId: couponData.id,
          customerId: customerId,
        },
      });

      if (customerUsageCount >= perCustomerLimit) {
        return {
          valid: false,
          error: `You have already used this coupon the maximum allowed ${perCustomerLimit} time(s)`,
          errorCode: "CUSTOMER_LIMIT_EXCEEDED",
        };
      }
    }

    // Check customer eligibility
    if (customerId) {
      if (couponData.customerEligibility === "new_customers") {
        const previousOrders = await order.count({
          where: {
            customerId: customerId,
            status: { [Op.ne]: "cancelled" },
          },
        });

        if (previousOrders > 0) {
          return {
            valid: false,
            error: "This coupon is only valid for new customers",
            errorCode: "NOT_NEW_CUSTOMER",
          };
        }
      } else if (couponData.customerEligibility === "existing_customers") {
        const previousOrders = await order.count({
          where: {
            customerId: customerId,
            status: { [Op.ne]: "cancelled" },
          },
        });

        if (previousOrders === 0) {
          return {
            valid: false,
            error: "This coupon is only valid for existing customers",
            errorCode: "NOT_EXISTING_CUSTOMER",
          };
        }
      } else if (couponData.customerEligibility === "specific_customers") {
        const eligibleIds = Array.isArray(couponData.eligibleCustomers)
          ? couponData.eligibleCustomers.map((id) => Number(id))
          : [];

        if (!eligibleIds.includes(Number(customerId))) {
          return {
            valid: false,
            error: "This coupon is not applicable for your account",
            errorCode: "CUSTOMER_NOT_ELIGIBLE",
          };
        }
      }
    }

    // Check minimum order amount
    if (parseFloat(orderAmount) < parseFloat(couponData.minimumAmount)) {
      return {
        valid: false,
        error: `Minimum order amount of ₹${couponData.minimumAmount} required`,
        errorCode: "MIN_ORDER_NOT_MET",
      };
    }

    const applicableProductIds = normalizeIdArray(couponData.applicableProducts);
    const applicableCategoryIds = normalizeIdArray(couponData.applicableCategories);
    const excludedProductIds = normalizeIdArray(couponData.excludedProducts);
    const excludedCategoryIds = normalizeIdArray(couponData.excludedCategories);

    let eligibleItems = normalizedItems;

    // Include restrictions: if applicable lists are present, cart must match at least one
    if (applicableProductIds.length > 0 || applicableCategoryIds.length > 0) {
      eligibleItems = eligibleItems.filter((item) => {
        const productMatch =
          applicableProductIds.length === 0 ||
          applicableProductIds.includes(item.productId);
        const categoryMatch =
          applicableCategoryIds.length === 0 ||
          applicableCategoryIds.includes(item.categoryId);
        return productMatch && categoryMatch;
      });

      if (eligibleItems.length === 0) {
        return {
          valid: false,
          error: "This coupon is not applicable to products in your cart",
          errorCode: "PRODUCT_NOT_APPLICABLE",
        };
      }
    }

    // Exclude restrictions
    if (excludedProductIds.length > 0 || excludedCategoryIds.length > 0) {
      eligibleItems = eligibleItems.filter((item) => {
        if (
          excludedProductIds.length > 0 &&
          excludedProductIds.includes(item.productId)
        ) {
          return false;
        }
        if (
          excludedCategoryIds.length > 0 &&
          excludedCategoryIds.includes(item.categoryId)
        ) {
          return false;
        }
        return true;
      });

      if (eligibleItems.length === 0) {
        return {
          valid: false,
          error: "Coupon is excluded for products in your cart",
          errorCode: "PRODUCT_EXCLUDED",
        };
      }
    }

    const eligibleSubtotal =
      eligibleItems.length > 0
        ? eligibleItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        )
        : parseFloat(orderAmount);

    // Calculate discount based on coupon type
    let discountAmount = 0;

    if (couponData.type === "percentage") {
      discountAmount =
        (eligibleSubtotal * parseFloat(couponData.value)) / 100;
    } else if (couponData.type === "fixed") {
      discountAmount = Math.min(parseFloat(couponData.value), eligibleSubtotal);
    }

    // Return successful validation result
    return {
      valid: true,
      couponId: couponData.id,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      applicableProducts: applicableProductIds,
      couponData: {
        id: couponData.id,
        code: couponData.code,
        name: couponData.name,
        type: couponData.type,
        value: couponData.value,
      },
    };
  } catch (error) {
    console.error("Error validating coupon:", error);
    return {
      valid: false,
      error: "Failed to validate coupon. Please try again.",
      errorCode: "VALIDATION_ERROR",
    };
  }
}

module.exports = {
  validateAndCalculateCoupon,
};
