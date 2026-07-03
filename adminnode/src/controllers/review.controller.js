const { Op } = require("sequelize");
const { review, customer, product, sequelize } = require("../models");

// Get all reviews with pagination and filters
const getAllReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "",
      productId = "",
      rating = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = {};

    // Status filter
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      whereClause.status = status;
    }

    // Product filter
    if (productId) {
      whereClause.productId = parseInt(productId);
    }

    // Rating filter
    if (rating) {
      whereClause.rating = parseFloat(rating);
    }

    const { count, rows: reviews } = await review.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

// Get review by ID
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewData = await review.findByPk(id);

    if (!reviewData) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      data: reviewData,
    });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch review",
    });
  }
};

// Create new review (public endpoint)
const createReview = async (req, res) => {
  try {
    const { productId, rating, comment, images } = req.body;

    const isAdminRequest = !!req.user?.role;
    const authenticatedCustomer = isAdminRequest ? null : req.user || null;

    const requestedStatus = String(req.body.status || "").toLowerCase();
    const allowedStatuses = ["pending", "approved", "rejected"];
    const status = isAdminRequest
      ? allowedStatuses.includes(requestedStatus)
        ? requestedStatus
        : "approved"
      : "pending";

    const customerId = authenticatedCustomer?.id || req.body.customerId || null;
    const customerName =
      req.body.customerName ||
      [authenticatedCustomer?.firstName, authenticatedCustomer?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      authenticatedCustomer?.email?.split("@")?.[0] ||
      "Customer";
    const customerEmail = req.body.customerEmail || authenticatedCustomer?.email || "";

    // Validate required fields
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Product ID, rating and comment are required",
      });
    }

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required",
      });
    }

    // Validate rating
    const ratingValue = parseFloat(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 0 and 5",
      });
    }

    // Verify product exists and get product name
    const productData = await product.findByPk(parseInt(productId));
    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Verify customer exists if provided
    if (customerId) {
      const customerData = await customer.findByPk(parseInt(customerId));
      if (!customerData) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Check if customer has already reviewed this product
      const existingReview = await review.findOne({
        where: {
          customerId: parseInt(customerId),
          productId: parseInt(productId),
        },
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this product",
        });
      }
    }

    const newReview = await review.create({
      customerId: customerId ? parseInt(customerId) : null,
      customerName,
      customerEmail,
      productId: parseInt(productId),
      productName: productData.name,
      rating: ratingValue,
      comment,
      images: images || [],
      status,
      isActive: true,
    });

    // Update product rating statistics
    await updateProductRatingStats(parseInt(productId));

    res.status(201).json({
      success: true,
      message:
        status === "approved"
          ? "Review created and published successfully."
          : "Review submitted successfully. It will be visible after approval.",
      data: {
        id: newReview.id,
        rating: newReview.rating,
        customerName: newReview.customerName,
        status: newReview.status,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create review",
      error: error.message,
    });
  }
};

// Update review approval status
const updateReviewApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be one of: pending, approved, rejected",
      });
    }

    const reviewData = await review.findByPk(id);

    if (!reviewData) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const updateData = {};

    if (status) {
      updateData.status = status;
      if (status === "approved") {
        updateData.isActive = true;
      }
    }

    if (adminReply !== undefined) {
      updateData.adminReply = adminReply || null;
    }

    await reviewData.update(updateData);

    // Update product rating statistics
    await updateProductRatingStats(reviewData.productId);

    res.json({
      success: true,
      message: status
        ? `Review ${status} successfully`
        : "Review updated successfully",
    });
  } catch (error) {
    console.error("Update review approval error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update review approval",
    });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewData = await review.findByPk(id);

    if (!reviewData) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const productId = reviewData.productId;
    await reviewData.destroy({ force: true });

    // Update product rating statistics
    await updateProductRatingStats(productId);

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};

// Get product reviews (public endpoint)
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating = "" } = req.query;
    const offset = (page - 1) * limit;

    // Verify product exists
    const productData = await product.findByPk(productId);
    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let whereClause = {
      productId: parseInt(productId),
      status: "approved",
      isActive: true,
    };

    if (rating) {
      whereClause.rating = parseFloat(rating);
    }

    const { count, rows: reviews } = await review.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get review statistics
    const stats = await review.findAll({
      where: {
        productId: parseInt(productId),
        status: "approved",
        isActive: true,
      },
      attributes: [
        "rating",
        [sequelize.fn("COUNT", sequelize.col("rating")), "count"],
      ],
      group: ["rating"],
      raw: true,
    });

    const totalReviews = await review.count({
      where: {
        productId: parseInt(productId),
        status: "approved",
        isActive: true,
      },
    });

    const averageRating = await review.findOne({
      where: {
        productId: parseInt(productId),
        status: "approved",
        isActive: true,
      },
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "average"]],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        reviews,
        statistics: {
          totalReviews,
          averageRating: parseFloat(averageRating.average || 0).toFixed(2),
          ratingDistribution: stats.reduce((acc, stat) => {
            acc[stat.rating] = parseInt(stat.count);
            return acc;
          }, {}),
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews",
    });
  }
};

// Get review statistics
const getReviewStats = async (req, res) => {
  try {
    const totalReviews = await review.count();
    const approvedReviews = await review.count({
      where: { status: "approved" },
    });
    const pendingReviews = await review.count({ where: { status: "pending" } });
    const rejectedReviews = await review.count({
      where: { status: "rejected" },
    });

    const averageRating = await review.findOne({
      where: { status: "approved", isActive: true },
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "average"]],
      raw: true,
    });

    const ratingStats = await review.findAll({
      where: { status: "approved", isActive: true },
      attributes: [
        "rating",
        [sequelize.fn("COUNT", sequelize.col("rating")), "count"],
      ],
      group: ["rating"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        totalReviews,
        approvedReviews,
        pendingReviews,
        rejectedReviews,
        averageRating: parseFloat(averageRating?.average || 0).toFixed(2),
        ratingDistribution: ratingStats.reduce((acc, stat) => {
          acc[stat.rating] = parseInt(stat.count);
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Get review stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch review statistics",
    });
  }
};

// Helper function to update product rating statistics
const updateProductRatingStats = async (productId) => {
  try {
    const stats = await review.findOne({
      where: {
        productId: parseInt(productId),
        status: "approved",
        isActive: true,
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "reviewCount"],
        [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
      ],
      raw: true,
    });

    // Note: This assumes the product model has reviewCount and averageRating fields
    // If not, you may need to remove this or adjust accordingly
    try {
      await product.update(
        {
          reviewCount: parseInt(stats?.reviewCount || 0),
          averageRating: parseFloat(stats?.averageRating || 0).toFixed(2),
        },
        {
          where: { id: parseInt(productId) },
        },
      );
    } catch (updateError) {
      // Product model might not have these fields, which is okay
      console.log("Product rating stats update skipped:", updateError.message);
    }
  } catch (error) {
    console.error("Update product rating stats error:", error);
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  updateReviewApproval,
  deleteReview,
  getProductReviews,
  getReviewStats,
};
