const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const reviewAuth = require("../middlewares/reviewAuth.middleware");

// Public routes
router.get("/", reviewController.getAllReviews);
router.get("/product/:productId", reviewController.getProductReviews);

// Customer/admin authenticated route (customers submit; admins can add directly from dashboard)
router.post("/", reviewAuth.authenticateReviewCreator, reviewController.createReview);

// Admin-protected routes
router.use(authMiddleware.authenticateToken);
router.get("/stats", reviewController.getReviewStats);
router.get("/:id", reviewController.getReviewById);
router.patch("/:id/approve", reviewController.updateReviewApproval);
router.delete("/:id", reviewController.deleteReview);

module.exports = router;
