const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// All routes require authentication
router.use(authMiddleware.authenticateToken);

// Dashboard routes
router.get("/test", dashboardController.testDashboard);
router.get("/stats", dashboardController.getDashboardStats);

module.exports = router;
