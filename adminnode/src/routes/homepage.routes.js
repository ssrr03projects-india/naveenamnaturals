const express = require("express");
const router = express.Router();
const homepageController = require("../controllers/homepage.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum allowed size is 10MB.",
      });
    }
    if (err.message === "Only image files (JPEG, PNG, GIF, WebP) are allowed") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }
  next();
};

// Public routes (no authentication required)
router.post(
  "/slider",
  homepageController.upload.single("image"),
  handleMulterError,
  homepageController.createSlider
);
router.get("/slider", homepageController.getSliders);

// All routes require authentication
router.use(authMiddleware.authenticateToken);



// Slider routes

router.put(
  "/slider/:id",
  homepageController.upload.single("image"),
  handleMulterError,
  homepageController.updateSlider
);
router.delete("/slider/:id", homepageController.deleteSlider);
router.post("/slider/:id/restore", homepageController.restoreSlider);

module.exports = router;
