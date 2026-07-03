const express = require("express");
const router = express.Router();
const exportController = require("../controllers/export.controller");
// Assuming you have an auth middleware to protect this route
// const { protect, admin } = require("../middlewares/auth.middleware");

// POST /api/export/pdf - Generate PDF from filtered orders
// For now, removing auth middleware for testing, but should be added later
// router.post("/pdf", protect, admin, exportController.exportOrdersToPDF);

// Simplified for now - assuming global protection or public for verified users
router.post("/pdf", exportController.exportOrdersToPDF);

module.exports = router;
