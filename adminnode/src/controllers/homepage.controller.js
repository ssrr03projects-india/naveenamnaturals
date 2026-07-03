const { Op } = require("sequelize");
const { homeSlider } = require("../models");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { deleteFile } = require("../utils/fileHelper");
const { imageSizeFromFile } = require("image-size/fromFile");

const REQUIRED_HOMEPAGE_IMAGE_WIDTH = 1920;
const REQUIRED_HOMEPAGE_IMAGE_HEIGHT = 800;

const validateHomepageSliderImageDimensions = async (file) => {
  if (!file) return;

  try {
    const dimensions = await imageSizeFromFile(file.path);
    if (
      dimensions.width !== REQUIRED_HOMEPAGE_IMAGE_WIDTH ||
      dimensions.height !== REQUIRED_HOMEPAGE_IMAGE_HEIGHT
    ) {
      await deleteFile(`/uploads/homepage/${file.filename}`);
      const error = new Error(
        `Homepage banner image must be exactly ${REQUIRED_HOMEPAGE_IMAGE_WIDTH}x${REQUIRED_HOMEPAGE_IMAGE_HEIGHT} pixels.`,
      );
      error.statusCode = 400;
      throw error;
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    await deleteFile(`/uploads/homepage/${file.filename}`);
    const readError = new Error(
      `Unable to read image dimensions. Homepage banner image must be exactly ${REQUIRED_HOMEPAGE_IMAGE_WIDTH}x${REQUIRED_HOMEPAGE_IMAGE_HEIGHT} pixels.`,
    );
    readError.statusCode = 400;
    throw readError;
  }
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/homepage/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
    }
  },
});

// Home Slider Management
const createSlider = async (req, res) => {
  try {
    const { link, sortOrder } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }
    await validateHomepageSliderImageDimensions(req.file);

    // Auto-generate sortOrder if not provided
    let finalSortOrder = 0;
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== "") {
      finalSortOrder = parseInt(sortOrder);
    } else {
      // Get the maximum sortOrder and add 1
      const maxSlider = await homeSlider.findOne({
        order: [["sortOrder", "DESC"]],
        attributes: ["sortOrder"],
      });
      finalSortOrder = maxSlider ? maxSlider.sortOrder + 1 : 0;
    }

    const sliderData = await homeSlider.create({
      image: `/uploads/homepage/${req.file.filename}`,
      link: link || null,
      sortOrder: finalSortOrder,
    });

    res.status(201).json({
      success: true,
      message: "Slider created successfully",
      data: sliderData,
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Create slider error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create slider",
    });
  }
};

const getSliders = async (req, res) => {
  try {
    const sliders = await homeSlider.findAll({
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json({
      success: true,
      data: sliders,
    });
  } catch (error) {
    console.error("Error details:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sliders",
      error: error.message,
    });
  }
};

const updateSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const { link, sortOrder } = req.body;

    const slider = await homeSlider.findByPk(id);
    if (!slider) {
      // Delete uploaded file if slider not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    const updateData = {};

    // Handle image update
    if (req.file) {
      await validateHomepageSliderImageDimensions(req.file);
      // Delete old image
      if (slider.image) {
        await deleteFile(slider.image);
      }
      updateData.image = `/uploads/homepage/${req.file.filename}`;
    }

    // Handle link and sortOrder
    if (link !== undefined) {
      updateData.link = link || null;
    }
    if (sortOrder !== undefined) {
      updateData.sortOrder = parseInt(sortOrder) || 0;
    }

    await slider.update(updateData);

    res.json({
      success: true,
      message: "Slider updated successfully",
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Update slider error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update slider",
    });
  }
};

const deleteSlider = async (req, res) => {
  try {
    const { id } = req.params;

    const slider = await homeSlider.findByPk(id);
    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    const oldImage = slider.image;
    await slider.destroy();

    // Delete file from disk after hard delete
    if (oldImage) {
      await deleteFile(oldImage);
    }

    res.json({
      success: true,
      message: "Slider deleted successfully",
    });
  } catch (error) {
    console.error("Delete slider error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete slider",
    });
  }
};

// Restore soft-deleted slider
const restoreSlider = async (req, res) => {
  try {
    const { id } = req.params;

    const slider = await homeSlider.findByPk(id, { paranoid: false });
    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    await slider.restore();

    res.json({
      success: true,
      message: "Slider restored successfully",
      data: slider,
    });
  } catch (error) {
    console.error("Restore slider error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore slider",
    });
  }
};

module.exports = {
  upload,
  createSlider,
  getSliders,
  updateSlider,
  deleteSlider,
  restoreSlider,
};
