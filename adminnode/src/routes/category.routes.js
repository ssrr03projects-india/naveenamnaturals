const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// Public routes
router.get("/", categoryController.getAllCategories);
router.get("/tree", categoryController.getCategoryTree);
router.get("/:id", categoryController.getCategoryById);

// Protected routes (require authentication)
router.use(authenticateToken);

router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
