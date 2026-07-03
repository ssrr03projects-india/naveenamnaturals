const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const serviceAuthMiddleware = require("../middlewares/serviceAuth.middleware");
const { validateOrder, validateId, sanitizeRequestBody } = require("../middlewares/validation.middleware");

// Service-to-service route (used by frontend serverless functions)
router.post(
  "/public",
  serviceAuthMiddleware.verifyServiceSecret,
  sanitizeRequestBody,
  validateOrder,
  orderController.createOrder
);

// Public utility route for GST breakdown display calculations
router.post("/gst-breakdown", sanitizeRequestBody, orderController.getGstBreakdown);

// All routes require authentication
router.use(authMiddleware.authenticateToken);

// Order routes
router.get("/", orderController.getAllOrders);
router.get("/stats", orderController.getOrderStats);
router.get("/:id", validateId, orderController.getOrderById);
router.post("/", sanitizeRequestBody, validateOrder, orderController.createOrder);
router.patch("/:id/status", validateId, sanitizeRequestBody, orderController.updateOrderStatus);
router.patch("/:id/payment-status", validateId, sanitizeRequestBody, orderController.updatePaymentStatus);
router.patch("/:id/packing-status", validateId, sanitizeRequestBody, orderController.updatePackingStatus);

module.exports = router;
