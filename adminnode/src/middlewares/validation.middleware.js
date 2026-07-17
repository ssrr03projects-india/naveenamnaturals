const { body, param, query, validationResult } = require("express-validator");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Customer registration validation
const validateCustomerRegistration = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("First name must be between 1 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("First name contains invalid characters"),
  body("lastName")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Last name must not exceed 100 characters")
    .matches(/^[a-zA-Z\s'-]*$/)
    .withMessage("Last name contains invalid characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/,
    )
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    )
    .withMessage("Invalid phone number format"),
  handleValidationErrors,
];

// Customer login validation
const validateCustomerLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

// Product creation/update validation
const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Product name must be between 1 and 200 characters"),
  body("slug")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug must be lowercase alphanumeric with hyphens"),
  body("slug")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug must be lowercase alphanumeric with hyphens"),
  body("quantity")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
  body("category")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Category must not exceed 100 characters"),
  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters"),
  handleValidationErrors,
];

// Order creation validation
const validateOrder = [
  body("customerId")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Customer ID must be a positive integer"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Items array is required and must contain at least one item"),
  body("items.*.productId")
    .notEmpty()
    .withMessage("Product ID is required for each item")
    .isInt({ min: 1 })
    .withMessage("Product ID must be a positive integer"),
  body("items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required for each item")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("address")
    .notEmpty()
    .withMessage("Address is required")
    .isObject()
    .withMessage("Address must be an object"),
  body("address.name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 200 })
    .withMessage("Name must not exceed 200 characters"),
  body("address.address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),
  body("address.city")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("City must not exceed 100 characters"),
  body("address.state")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("State must not exceed 100 characters"),
  body("address.postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required")
    .matches(/^[0-9]{5,10}$/)
    .withMessage("Postal code must be 5-10 digits"),
  body("address.email")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Address email must be valid"),
  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["online", "cod", "wallet"])
    .withMessage("Invalid payment method"),
  body("couponCode")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Coupon code must not exceed 50 characters"),
  handleValidationErrors,
];

// Coupon validation
const validateCoupon = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Coupon code must be between 3 and 50 characters")
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage(
      "Coupon code must contain only uppercase letters, numbers, hyphens, and underscores",
    ),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Coupon name is required")
    .isLength({ max: 200 })
    .withMessage("Coupon name must not exceed 200 characters"),
  body("type")
    .notEmpty()
    .withMessage("Coupon type is required")
    .isIn(["percentage", "fixed", "free_shipping"])
    .withMessage("Invalid coupon type"),
  body("value")
    .notEmpty()
    .withMessage("Coupon value is required")
    .isFloat({ min: 0 })
    .withMessage("Coupon value must be a positive number"),
  body("minimumAmount")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Minimum amount must be a positive number"),
  handleValidationErrors,
];

// Coupon validation (public endpoint)
const validateCouponValidation = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Coupon code must be between 3 and 50 characters"),
  body("orderAmount")
    .notEmpty()
    .withMessage("Order amount is required")
    .isFloat({ min: 0 })
    .withMessage("Order amount must be a positive number"),
  body("customerId")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Customer ID must be a positive integer"),
  handleValidationErrors,
];

// ID parameter validation
const validateId = [
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer"),
  handleValidationErrors,
];

// ID or slug (for product get by id or slug)
const validateIdOrSlug = [
  param("id").notEmpty().withMessage("ID or slug is required").trim(),
  handleValidationErrors,
];

// Payment amount validation
const validatePaymentAmount = [
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 1 })
    .withMessage("Amount must be at least 1"),
  body("currency")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["INR", "USD", "EUR"])
    .withMessage("Invalid currency"),
  handleValidationErrors,
];

// Sanitize string inputs to prevent XSS
const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim();
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return typeof obj === "string" ? sanitizeString(obj) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === "object") {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

// Middleware to sanitize request body
const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};

module.exports = {
  handleValidationErrors,
  validateCustomerRegistration,
  validateCustomerLogin,
  validateProduct,
  validateOrder,
  validateCoupon,
  validateCouponValidation,
  validateId,
  validateIdOrSlug,
  validatePaymentAmount,
  sanitizeRequestBody,
  sanitizeString,
  sanitizeObject,
};
