const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// All routes require authentication
router.use(authMiddleware.authenticateToken);

// Reports routes
router.get("/sales", reportsController.getSalesReport);
router.get("/products", reportsController.getProductPerformanceReport);
router.get("/customers", reportsController.getCustomerInsightsReport);

module.exports = router;
