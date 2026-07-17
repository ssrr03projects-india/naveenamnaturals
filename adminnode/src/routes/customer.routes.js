const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customer.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const customerAuthMiddleware = require("../middlewares/customerAuth.middleware");
const serviceAuthMiddleware = require("../middlewares/serviceAuth.middleware");
const { validateCustomerLogin, validateCustomerRegistration, sanitizeRequestBody } = require("../middlewares/validation.middleware");
const { loginLimiter } = require("../middlewares/rateLimit.middleware");

// Public routes (no authentication required)
router.post("/login", loginLimiter, sanitizeRequestBody, validateCustomerLogin, customerController.customerLogin);
router.post("/register", sanitizeRequestBody, validateCustomerRegistration, customerController.customerRegister);
router.post("/forgot-password", loginLimiter, sanitizeRequestBody, customerController.forgotPassword);
router.post("/reset-password", sanitizeRequestBody, customerController.resetPassword);
router.post(
	"/public/lookup",
	serviceAuthMiddleware.verifyServiceSecret,
	sanitizeRequestBody,
	customerController.lookupCustomerForCheckout,
);

// Protected customer routes (require customer authentication)
router.post("/logout", customerAuthMiddleware.authenticateCustomerToken, customerController.customerLogout);
router.get("/profile", customerAuthMiddleware.authenticateCustomerToken, customerController.getCustomerProfile);
router.put("/profile", customerAuthMiddleware.authenticateCustomerToken, customerController.updateCustomerProfile);
router.get("/orders", customerAuthMiddleware.authenticateCustomerToken, customerController.getCustomerOrders);
router.get("/orders/stats", customerAuthMiddleware.authenticateCustomerToken, customerController.getCustomerOrderStats);
router.get("/orders/:id", customerAuthMiddleware.authenticateCustomerToken, customerController.getCustomerOrderById);

// Admin routes (require admin authentication)
router.use(authMiddleware.authenticateToken);

// Customer routes (admin only)
router.get("/", customerController.getAllCustomers);
router.get("/stats", customerController.getCustomerStats);
router.post("/sync-stats", customerController.syncCustomerStats);
router.get("/:id", customerController.getCustomerById);
router.post("/", customerController.createCustomer);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);

module.exports = router;
