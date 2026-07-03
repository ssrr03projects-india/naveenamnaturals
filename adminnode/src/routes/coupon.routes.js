const express = require("express");
const router = express.Router();
const couponController = require("../controllers/coupon.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { validateCoupon, validateCouponValidation, validateId, sanitizeRequestBody } = require("../middlewares/validation.middleware");

// Public routes
router.get("/public", couponController.getPublicCoupons);
router.post("/validate", sanitizeRequestBody, validateCouponValidation, couponController.validateCoupon);

// Protected routes
router.use(authMiddleware.authenticateToken);

// Coupon management routes
router.get("/", couponController.getAllCoupons);
router.get("/:id", validateId, couponController.getCouponById);
router.post("/", sanitizeRequestBody, validateCoupon, couponController.createCoupon);
router.put("/:id", validateId, sanitizeRequestBody, validateCoupon, couponController.updateCoupon);
router.delete("/:id", validateId, couponController.deleteCoupon);

module.exports = router;
