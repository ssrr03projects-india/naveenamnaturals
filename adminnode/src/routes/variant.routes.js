const express = require("express");
const router = express.Router();
const variantController = require("../controllers/variant.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// Public routes
router.get("/product/:productId", variantController.getProductVariants);

// All other routes require admin authentication
router.use(authenticateToken);

// Create variant for a product
router.post("/product/:productId", variantController.createVariant);

// Bulk create variants for a product
router.post("/product/:productId/bulk", variantController.bulkCreateVariants);

// Update variant
router.put("/:id", variantController.updateVariant);

// Trigger low-stock test email for a variant
router.post("/:id/test-low-stock-email", variantController.sendLowStockTestEmail);

// Delete variant
router.delete("/:id", variantController.deleteVariant);

module.exports = router;
