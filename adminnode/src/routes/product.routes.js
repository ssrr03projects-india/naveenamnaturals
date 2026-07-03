const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const { validateProduct, validateId, validateIdOrSlug, sanitizeRequestBody } = require("../middlewares/validation.middleware");

// Public routes (no authentication required)
router.get("/", productController.getAllProducts);
router.get("/stats", productController.getProductStats);
router.get("/best-sellers", productController.getBestSellingProducts);
router.get("/:id", validateIdOrSlug, productController.getProductById);

// Protected routes (require authentication)
router.use(authMiddleware.authenticateToken);

// Admin-only product management routes
router.get("/test", productController.testProducts);
router.put(
  "/test-update/:id",
  validateId,
  upload.array("images", 10),
  sanitizeRequestBody,
  productController.testUpdate
);
router.post("/", upload.fields([
  { name: "images", maxCount: 10 },
  { name: "keyIngredientImage_0", maxCount: 1 },
  { name: "keyIngredientImage_1", maxCount: 1 },
  { name: "keyIngredientImage_2", maxCount: 1 },
  { name: "keyIngredientImage_3", maxCount: 1 },
  { name: "keyIngredientImage_4", maxCount: 1 },
  { name: "keyIngredientImage_5", maxCount: 1 },
  { name: "keyIngredientImage_6", maxCount: 1 },
  { name: "keyIngredientImage_7", maxCount: 1 },
  { name: "keyIngredientImage_8", maxCount: 1 },
  { name: "keyIngredientImage_9", maxCount: 1 },
]), sanitizeRequestBody, validateProduct, productController.createProduct);
router.put("/:id", validateId, upload.fields([
  { name: "images", maxCount: 10 },
  { name: "keyIngredientImage_0", maxCount: 1 },
  { name: "keyIngredientImage_1", maxCount: 1 },
  { name: "keyIngredientImage_2", maxCount: 1 },
  { name: "keyIngredientImage_3", maxCount: 1 },
  { name: "keyIngredientImage_4", maxCount: 1 },
  { name: "keyIngredientImage_5", maxCount: 1 },
  { name: "keyIngredientImage_6", maxCount: 1 },
  { name: "keyIngredientImage_7", maxCount: 1 },
  { name: "keyIngredientImage_8", maxCount: 1 },
  { name: "keyIngredientImage_9", maxCount: 1 },
]), sanitizeRequestBody, validateProduct, productController.updateProduct);
router.delete("/:id", validateId, productController.deleteProduct);

module.exports = router;
