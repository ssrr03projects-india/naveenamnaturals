const { Op } = require("sequelize");
const db = require("../models");
const { product, productVariant, category, orderItem, review, sequelize } = db;
const { deleteFile } = require("../utils/fileHelper");
const { imageSizeFromFile } = require("image-size/fromFile");
const { queueLowStockAlertEmail } = require("../services/orderEmail.service");
const {
  getLowStockThreshold,
  shouldTriggerLowStockAlert,
} = require("../utils/stockAlert");

const REQUIRED_PRODUCT_IMAGE_WIDTH = 1000;
const REQUIRED_PRODUCT_IMAGE_HEIGHT = 1000;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const normalizeCustomStock = (value) => {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim().replace(/\s+/g, " ");
  if (cleaned === "") return null;
  if (!/^[A-Za-z0-9 ]{1,60}$/.test(cleaned)) return null;
  return cleaned;
};

const normalizeGstPercentage = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return [5, 12, 18, 28].includes(parsed) ? parsed : null;
};

const normalizeDimension = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(2));
};

const getVariantInclude = ({
  includeCustomStock = true,
  includeGstPercentage = true,
  onlyActive = false,
} = {}) => ({
  model: productVariant,
  as: "variants",
  attributes: [
    "id",
    "name",
    "sku",
    "price",
    "mrpPrice",
    ...(includeGstPercentage ? ["gstPercentage"] : []),
    "stock",
    ...(includeCustomStock ? ["customStock"] : []),
    "sold",
    "weight",
    "length",
    "width",
    "height",
    "sortOrder",
    "isActive",
  ],
  ...(onlyActive ? { where: { isActive: true }, required: false } : {}),
});

const isMissingVariantColumnError = (error) =>
  error &&
  (error.original?.code === "ER_BAD_FIELD_ERROR" ||
    error.parent?.code === "ER_BAD_FIELD_ERROR") &&
  ["customStock", "gstPercentage", "length", "width", "height"].some((field) =>
    String(error.original?.sqlMessage || error.message || "").includes(field),
  );

const removeMissingVariantFields = (variant, error) => {
  const message = String(error?.original?.sqlMessage || error?.message || "");
  const cleaned = { ...variant };
  if (message.includes("customStock")) {
    delete cleaned.customStock;
  }
  if (message.includes("gstPercentage")) {
    delete cleaned.gstPercentage;
  }
  if (message.includes("length")) {
    delete cleaned.length;
  }
  if (message.includes("width")) {
    delete cleaned.width;
  }
  if (message.includes("height")) {
    delete cleaned.height;
  }
  return cleaned;
};

const getUploadedProductImageFiles = (files) => {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  if (Array.isArray(files.images)) return files.images;
  return [];
};

const validateProductImageDimensions = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) return;

  const invalidFiles = [];

  for (const file of files) {
    try {
      const dimensions = await imageSizeFromFile(file.path);
      if (
        dimensions.width !== REQUIRED_PRODUCT_IMAGE_WIDTH ||
        dimensions.height !== REQUIRED_PRODUCT_IMAGE_HEIGHT
      ) {
        invalidFiles.push({
          name: file.originalname || file.filename,
          width: dimensions.width,
          height: dimensions.height,
          uploadPath: `/uploads/${file.filename}`,
        });
      }
    } catch (error) {
      invalidFiles.push({
        name: file.originalname || file.filename,
        width: null,
        height: null,
        uploadPath: `/uploads/${file.filename}`,
      });
    }
  }

  if (invalidFiles.length > 0) {
    await deleteFile(invalidFiles.map((file) => file.uploadPath));

    const invalidDetails = invalidFiles
      .map((file) =>
        Number.isFinite(file.width) && Number.isFinite(file.height)
          ? `${file.name} (${file.width}x${file.height})`
          : `${file.name} (unable to read dimensions)`,
      )
      .join(", ");

    const error = new Error(
      `Product image must be exactly ${REQUIRED_PRODUCT_IMAGE_WIDTH}x${REQUIRED_PRODUCT_IMAGE_HEIGHT} pixels. Invalid file(s): ${invalidDetails}`,
    );
    error.statusCode = 400;
    throw error;
  }
};

const normalizeLowStockThreshold = (value, fallback = DEFAULT_LOW_STOCK_THRESHOLD) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const normalizeBoolean = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return Boolean(value);
};

// Helper function to auto-detect product tag based on sizes
// Only checks for "sale" tag when any size has MRP pricing
const autoDetectTag = (sizes, createdAt) => {
  try {
    // Parse sizes if it's a string
    let sizesArray = sizes;
    if (typeof sizes === "string") {
      try {
        sizesArray = JSON.parse(sizes);
      } catch (e) {
        sizesArray = [];
      }
    }

    // Check if any size has MRP pricing (sale tag)
    if (Array.isArray(sizesArray) && sizesArray.length > 0) {
      const hasSale = sizesArray.some((size) => {
        const price = Number(size.price);
        const mrpPrice = Number(size.mrpPrice);
        return mrpPrice && price && mrpPrice > price;
      });

      if (hasSale) return "sale";
    }

    return null; // No tag
  } catch (error) {
    console.error("Error in autoDetectTag:", error);
    return null;
  }
};

// Test endpoint to check if products exist
const testProducts = async (req, res) => {
  try {
    const productCount = await product.count();
    const firstProduct = await product.findOne();

    res.json({
      success: true,
      data: {
        count: productCount,
        firstProduct: firstProduct,
      },
    });
  } catch (error) {
    console.error("Test products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test products",
      error: error.message,
    });
  }
};

// Test update endpoint
const testUpdate = async (req, res) => {
  try {
    console.log("Test update request:", {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      files: req.files
        ? Array.isArray(req.files)
          ? req.files.map((f) => ({
              filename: f.filename,
              fieldname: f.fieldname,
              size: f.size,
            }))
          : Object.keys(req.files).reduce((acc, key) => {
              acc[key] = Array.isArray(req.files[key])
                ? req.files[key].map((f) => ({
                    filename: f.filename,
                    fieldname: f.fieldname,
                    size: f.size,
                  }))
                : req.files[key];
              return acc;
            }, {})
        : "no files",
      params: req.params,
    });

    res.json({
      success: true,
      message: "Test update received",
      receivedData: {
        body: req.body,
        files: req.files
          ? Array.isArray(req.files)
            ? req.files.length
            : Object.keys(req.files).reduce((total, key) => {
                return (
                  total +
                  (Array.isArray(req.files[key]) ? req.files[key].length : 1)
                );
              }, 0)
          : 0,
        params: req.params,
      },
    });
  } catch (error) {
    console.error("Test update error:", error);
    res.status(500).json({
      success: false,
      message: "Test update failed",
      error: error.message,
    });
  }
};

// Get all products with pagination, search, and filters
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category = "",
      type = "",
      tag = "",
      isActive = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
      minPrice = "",
      maxPrice = "",
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Category filter
    if (category) {
      const isNumericId = /^\d+$/.test(String(category));

      if (isNumericId) {
        whereClause.categoryId = parseInt(category, 10);
      } else {
        // Find category by slug first
        const foundCategory = await db.category.findOne({
          where: { slug: category },
        });

        if (foundCategory) {
          whereClause.categoryId = foundCategory.id;
        } else {
          // If category slug not found, force empty result
          whereClause.categoryId = -1;
        }
      }
    }

    // Type filter
    if (type) {
      whereClause.type = type;
    }

    // Tag filter
    if (tag) {
      whereClause.tag = tag;
    }

    // Active filter
    if (isActive !== "") {
      whereClause.isActive = isActive === "true";
    }

    // Price range filter
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    let productQueryResult;
    try {
      productQueryResult = await product.findAndCountAll({
        where: whereClause,
        include: [
          getVariantInclude({ includeCustomStock: true, onlyActive: true }),
          {
            model: db.category,
            as: "categoryData",
            attributes: ["id", "name", "slug"],
            required: false, // Make category optional
          },
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true,
      });
    } catch (queryError) {
      if (!isMissingVariantColumnError(queryError)) {
        throw queryError;
      }

      console.warn(
        "customStock column missing in product_variants. Falling back without customStock.",
      );
      productQueryResult = await product.findAndCountAll({
        where: whereClause,
        include: [
          getVariantInclude({
            includeCustomStock: !String(
              queryError.original?.sqlMessage || queryError.message || "",
            ).includes("customStock"),
            includeGstPercentage: !String(
              queryError.original?.sqlMessage || queryError.message || "",
            ).includes("gstPercentage"),
            onlyActive: true,
          }),
          {
            model: db.category,
            as: "categoryData",
            attributes: ["id", "name", "slug"],
            required: false, // Make category optional
          },
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true,
      });
    }

    const { count, rows: products } = productQueryResult;

    // Get product IDs for rating calculation
    const productIds = products.map((p) => parseInt(p.id));

    // Fetch all average ratings in one query (optimized)
    const ratings =
      productIds.length > 0
        ? await review.findAll({
            where: {
              productId: { [Op.in]: productIds },
              status: "approved",
              isActive: true,
            },
            attributes: [
              "productId",
              [sequelize.fn("AVG", sequelize.col("rating")), "average"],
            ],
            group: ["productId"],
            raw: true,
          })
        : [];

    // Create a map of productId to average rating (normalize to integer keys)
    const ratingMap = {};
    ratings.forEach((r) => {
      const pid = parseInt(r.productId);
      ratingMap[pid] = r.average ? parseFloat(r.average).toFixed(1) : 0;
    });

    // Format products with ratings, variants, and calculated stock
    const productsWithRating = products.map((prod) => {
      const productData = prod.toJSON();

      // Get average rating from map (normalize product ID to integer)
      const pid = parseInt(productData.id);
      const rate = ratingMap[pid] || 0;

      // Calculate total stock and sold from variants
      const variants = productData.variants || [];
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const totalSold = variants.reduce((sum, v) => sum + (v.sold || 0), 0);

      // Determine if product has sale (any variant with MRP > price)
      const hasSale = variants.some(
        (v) => v.mrpPrice && parseFloat(v.mrpPrice) > parseFloat(v.price),
      );
      const finalTag = productData.tag || (hasSale ? "sale" : null);

      // Get price range from variants
      const prices = variants
        .map((v) => parseFloat(v.price))
        .filter((p) => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        ...productData,
        totalStock,
        totalSold,
        priceRange:
          minPrice === maxPrice
            ? `₹${minPrice.toFixed(2)}`
            : `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`,
        rate: parseFloat(rate),
        tag: finalTag,
        variants: variants.sort((a, b) => a.sortOrder - b.sortOrder),
      };
    });

    res.json({
      success: true,
      data: {
        products: productsWithRating,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message, // Add error message for debugging
    });
  }
};

// Get product by ID or slug
const getProductById = async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const isNumericId = /^\d+$/.test(String(idOrSlug));

    let productData;
    if (isNumericId) {
      try {
        productData = await product.findByPk(idOrSlug, {
          include: [
            getVariantInclude({ includeCustomStock: true }),
            {
              model: db.category,
              as: "categoryData",
              attributes: ["id", "name", "slug"],
              required: false,
            },
          ],
        });
      } catch (queryError) {
        if (!isMissingVariantColumnError(queryError)) {
          throw queryError;
        }

        console.warn(
          "customStock column missing in product_variants. Falling back without customStock.",
        );
        productData = await product.findByPk(idOrSlug, {
        include: [
            getVariantInclude({
              includeCustomStock: !String(
                queryError.original?.sqlMessage || queryError.message || "",
              ).includes("customStock"),
              includeGstPercentage: !String(
                queryError.original?.sqlMessage || queryError.message || "",
              ).includes("gstPercentage"),
            }),
            {
              model: db.category,
              as: "categoryData",
              attributes: ["id", "name", "slug"],
              required: false,
            },
          ],
        });
      }
    } else {
      try {
        productData = await product.findOne({
          where: { slug: idOrSlug },
          include: [
            getVariantInclude({ includeCustomStock: true }),
            {
              model: db.category,
              as: "categoryData",
              attributes: ["id", "name", "slug"],
              required: false,
            },
          ],
        });
      } catch (queryError) {
        if (!isMissingVariantColumnError(queryError)) {
          throw queryError;
        }

        console.warn(
          "customStock column missing in product_variants. Falling back without customStock.",
        );
        productData = await product.findOne({
          where: { slug: idOrSlug },
        include: [
            getVariantInclude({
              includeCustomStock: !String(
                queryError.original?.sqlMessage || queryError.message || "",
              ).includes("customStock"),
              includeGstPercentage: !String(
                queryError.original?.sqlMessage || queryError.message || "",
              ).includes("gstPercentage"),
            }),
            {
              model: db.category,
              as: "categoryData",
              attributes: ["id", "name", "slug"],
              required: false,
            },
          ],
        });
      }
    }

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productId = productData.id;

    // Get average rating from reviews
    const avgRating = await review.findAll({
      where: {
        productId: parseInt(productId),
        status: "approved",
        isActive: true,
      },
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "average"]],
      group: ["productId"],
      raw: true,
    });

    const rate =
      avgRating && avgRating.length > 0 && avgRating[0].average
        ? parseFloat(avgRating[0].average).toFixed(1)
        : 0;

    // Format product data
    const formattedProduct = productData.toJSON();

    // Calculate total stock and sold from variants
    const variants = formattedProduct.variants || [];
    const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const totalSold = variants.reduce((sum, v) => sum + (v.sold || 0), 0);

    // Determine if product has sale
    const hasSale = variants.some(
      (v) => v.mrpPrice && parseFloat(v.mrpPrice) > parseFloat(v.price),
    );
    const finalTag = formattedProduct.tag || (hasSale ? "sale" : null);

    // Get price range from variants
    const prices = variants
      .map((v) => parseFloat(v.price))
      .filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const response = {
      ...formattedProduct,
      totalStock,
      totalSold,
      priceRange:
        minPrice === maxPrice
          ? `₹${minPrice.toFixed(2)}`
          : `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`,
      rate: parseFloat(rate),
      tag: finalTag,
      variants: variants.sort((a, b) => a.sortOrder - b.sortOrder),
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      mrpPrice,
      quantity,
      lowStockThreshold,
      trackQuantity,
      length,
      width,
      height,
      categoryId,
      type,
      sizes,
      keyIngredients,
      benefits,
      usageSteps,
      commonQuestions,
      images,
      isActive,
      metaTitle,
      metaDescription,
      seoKeywords,
      tag,
    } = req.body;

    // Handle uploaded images
    let imageUrls = [];
    if (req.files) {
      const uploadedProductImageFiles = getUploadedProductImageFiles(req.files);
      if (uploadedProductImageFiles.length > 0) {
        await validateProductImageDimensions(uploadedProductImageFiles);
      }

      // Handle both array format (old) and fields format (new)
      if (Array.isArray(req.files)) {
        // Old format: upload.array("images", 10)
        imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
      } else if (req.files.images) {
        // New format: upload.fields([{ name: "images", maxCount: 10 }, ...])
        imageUrls = req.files.images.map((file) => `/uploads/${file.filename}`);
      }
    } else if (images) {
      // Handle images passed as JSON string
      try {
        imageUrls = typeof images === "string" ? JSON.parse(images) : images;
      } catch (e) {
        imageUrls = [];
      }
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Helper function to parse JSON fields
    const parseJsonField = (field) => {
      if (!field) return field;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch (e) {
          return field;
        }
      }
      return field;
    };

    // Helper function to validate and parse size pricing
    const validateSizePricing = (sizes) => {
      if (!sizes || sizes.length === 0) return [];

      // Check if it's the new format (array of objects with price)
      if (
        Array.isArray(sizes) &&
        sizes.length > 0 &&
        typeof sizes[0] === "object" &&
        sizes[0].price !== undefined
      ) {
        // Validate each size entry
        for (const sizeEntry of sizes) {
          if (!sizeEntry.size || sizeEntry.size.trim() === "") {
            throw new Error("Each size must have a size name");
          }
          if (!sizeEntry.price || isNaN(parseFloat(sizeEntry.price))) {
            throw new Error(`Size "${sizeEntry.size}" must have a valid price`);
          }
          if (sizeEntry.mrpPrice && !isNaN(parseFloat(sizeEntry.mrpPrice))) {
            if (parseFloat(sizeEntry.price) > parseFloat(sizeEntry.mrpPrice)) {
              throw new Error(
                `Price cannot be greater than MRP for size "${sizeEntry.size}"`,
              );
            }
          }
        }
        return sizes;
      }

      // Old format (array of strings) - keep as is for backward compatibility
      return sizes;
    };

    // Handle key ingredient images
    let parsedKeyIngredients = parseJsonField(keyIngredients) || [];
    if (req.files && !Array.isArray(req.files)) {
      // Process key ingredient image files
      for (let i = 0; i < 10; i++) {
        const fieldName = `keyIngredientImage_${i}`;
        if (req.files[fieldName] && req.files[fieldName].length > 0) {
          const file = req.files[fieldName][0];
          const imageUrl = `/uploads/${file.filename}`;
          // Update the corresponding ingredient's image URL
          if (parsedKeyIngredients[i]) {
            parsedKeyIngredients[i].image = imageUrl;
          }
        }
      }
    }

    // Generate slug from product name only (no timestamps or IDs)
    const {
      generateUniqueSlug,
      generateSlugFromName,
    } = require("../utils/slugGenerator");
    let finalSlug = slug;

    // If slug is provided, validate it's clean (no timestamps/IDs)
    if (finalSlug) {
      // Remove any trailing numbers/timestamps that might have been added
      finalSlug = finalSlug.replace(/-\d+$/, "").replace(/-\d{13,}$/, ""); // Remove trailing numbers/timestamps
      // Regenerate clean slug from name if provided slug seems to have extra data
      const cleanNameSlug = generateSlugFromName(name);
      if (finalSlug !== cleanNameSlug) {
        finalSlug = await generateUniqueSlug(name);
      } else {
        // Check if provided slug already exists
        const existingProduct = await product.findOne({
          where: { slug: finalSlug },
        });
        if (existingProduct) {
          finalSlug = await generateUniqueSlug(name);
        }
      }
    } else {
      // Auto-generate slug from product name
      finalSlug = await generateUniqueSlug(name);
    }

    // NOTE: price, mrpPrice, quantity, sold are managed per-variant.
    const newProduct = await product.create({
      name,
      slug: finalSlug,
      description,
      lowStockThreshold: normalizeLowStockThreshold(lowStockThreshold),
      trackQuantity: normalizeBoolean(trackQuantity, true),
      length: normalizeDimension(length),
      width: normalizeDimension(width),
      height: normalizeDimension(height),
      categoryId: categoryId || null,
      sizes: validateSizePricing(parseJsonField(sizes)) || [],
      keyIngredients: parsedKeyIngredients,
      benefits: parseJsonField(benefits) || [],
      usageSteps: parseJsonField(usageSteps) || [],
      commonQuestions: parseJsonField(commonQuestions) || [],
      images: imageUrls,
      tag: tag
        ? tag
        : autoDetectTag(
            validateSizePricing(parseJsonField(sizes, [])),
            new Date(),
          ),
      isActive: isActive !== undefined ? isActive : true,
    });

    // Handle Variants Creation
    let variantsData = [];
    if (req.body.variants) {
      variantsData = parseJsonField(req.body.variants);
    }

    if (Array.isArray(variantsData) && variantsData.length > 0) {
      const variantsToCreate = variantsData.map((v, index) => ({
        productId: newProduct.id,
        name: v.name, // e.g. "50ml"
        sku: v.sku || `${newProduct.slug}-${v.name}`,
        price: v.price,
        mrpPrice: v.mrpPrice,
        gstPercentage: normalizeGstPercentage(v.gstPercentage),
        stock: v.stock || 0,
        customStock: normalizeCustomStock(v.customStock),
        weight: v.weight,
        length: normalizeDimension(v.length),
        width: normalizeDimension(v.width),
        height: normalizeDimension(v.height),
        sortOrder: index,
        isActive: true,
      }));
      try {
        await productVariant.bulkCreate(variantsToCreate);
      } catch (error) {
        if (!isMissingVariantColumnError(error)) {
          throw error;
        }
        console.warn(
          "A variant column is missing in product_variants. Creating variants without unavailable fields.",
        );
        await productVariant.bulkCreate(
          variantsToCreate.map((variant) =>
            removeMissingVariantFields(variant, error),
          ),
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    console.error("Create product error:", error);
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Update product request:", {
      id,
      body: req.body,
      files: req.files
        ? Array.isArray(req.files)
          ? req.files.map((f) => ({
              filename: f.filename,
              fieldname: f.fieldname,
            }))
          : Object.keys(req.files).reduce((acc, key) => {
              acc[key] = Array.isArray(req.files[key])
                ? req.files[key].map((f) => ({
                    filename: f.filename,
                    fieldname: f.fieldname,
                  }))
                : req.files[key];
              return acc;
            }, {})
        : "no files",
    });

    const {
      name,
      slug,
      description,
      price,
      mrpPrice,
      quantity,
      lowStockThreshold,
      trackQuantity,
      length,
      width,
      height,
      categoryId,
      type,
      sizes,
      keyIngredients,
      benefits,
      usageSteps,
      commonQuestions,
      legalMetrology,
      images,
      existingImages,
      isActive,
      metaTitle,
      metaDescription,
      seoKeywords,
      tag,
    } = req.body;

    const productData = await product.findByPk(id);

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Handle uploaded images - merge existing images with new ones
    let imageUrls = [];

    // First, get existing images (sent as existingImages JSON string from frontend after user's deletions)
    if (existingImages) {
      try {
        imageUrls =
          typeof existingImages === "string"
            ? JSON.parse(existingImages)
            : existingImages;
        // Ensure it's an array
        if (!Array.isArray(imageUrls)) {
          imageUrls = [];
        }
      } catch (e) {
        imageUrls = [];
      }
    } else {
      // If no existingImages field sent, keep all existing images
      imageUrls = productData.images || [];
      if (typeof imageUrls === "string") {
        try {
          imageUrls = JSON.parse(imageUrls);
        } catch (e) {
          imageUrls = [];
        }
      }
      if (!Array.isArray(imageUrls)) {
        imageUrls = [];
      }
    }
    // Add new uploaded images to the existing ones
    if (req.files) {
      const uploadedProductImageFiles = getUploadedProductImageFiles(req.files);
      if (uploadedProductImageFiles.length > 0) {
        await validateProductImageDimensions(uploadedProductImageFiles);
      }

      if (Array.isArray(req.files)) {
        const newImageUrls = req.files.map(
          (file) => `/uploads/${file.filename}`,
        );
        imageUrls = [...imageUrls, ...newImageUrls];
      } else if (req.files.images) {
        const newImageUrls = req.files.images.map(
          (file) => `/uploads/${file.filename}`,
        );
        imageUrls = [...imageUrls, ...newImageUrls];
      }
    }

    // Identify and delete removed images from disk
    let oldImages = productData.images || [];
    if (typeof oldImages === "string") {
      try {
        oldImages = JSON.parse(oldImages);
      } catch (e) {
        oldImages = [];
      }
    }
    if (!Array.isArray(oldImages)) {
      oldImages = [];
    }

    const removedImages = oldImages.filter((img) => !imageUrls.includes(img));
    if (removedImages.length > 0) {
      await deleteFile(removedImages);
    }

    // Generate or update slug from product name only
    const {
      generateUniqueSlug,
      generateSlugFromName,
    } = require("../utils/slugGenerator");
    let finalSlug = slug;

    // Check if existing slug has timestamp pattern (13+ digit number at the end)
    const hasTimestampPattern = /-\d{13,}$/.test(productData.slug);

    // If name is being updated, regenerate slug from new name
    if (name && name !== productData.name) {
      finalSlug = await generateUniqueSlug(name, id);
    } else if (slug && slug !== productData.slug) {
      // If slug is being changed manually, clean it and ensure uniqueness
      // Remove any trailing numbers/timestamps
      finalSlug = slug.replace(/-\d+$/, "").replace(/-\d{13,}$/, "");

      // If cleaned slug doesn't match name-based slug, regenerate from name
      const nameBasedSlug = generateSlugFromName(productData.name);
      if (finalSlug !== nameBasedSlug) {
        finalSlug = await generateUniqueSlug(productData.name, id);
      } else {
        // Check if slug already exists
        const existingProduct = await product.findOne({
          where: {
            slug: finalSlug,
            id: { [Op.ne]: id },
          },
        });
        if (existingProduct) {
          finalSlug = await generateUniqueSlug(productData.name, id);
        }
      }
    } else if (!slug) {
      // If existing slug has timestamp, clean it automatically
      if (hasTimestampPattern) {
        // Remove timestamp and regenerate clean slug from name
        finalSlug = await generateUniqueSlug(productData.name, id);
      } else {
        // Keep existing slug if it's already clean
        finalSlug = productData.slug;
      }
    }

    // Helper function to parse JSON fields
    const parseJsonField = (field, defaultValue) => {
      if (field === undefined || field === null) return defaultValue;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch (e) {
          return field;
        }
      }
      return field;
    };

    // Helper function to validate and parse size pricing
    const validateSizePricing = (sizes) => {
      if (!sizes || sizes.length === 0) return [];

      // Check if it's the new format (array of objects with price)
      if (
        Array.isArray(sizes) &&
        sizes.length > 0 &&
        typeof sizes[0] === "object" &&
        sizes[0].price !== undefined
      ) {
        // Validate each size entry
        for (const sizeEntry of sizes) {
          if (!sizeEntry.size || sizeEntry.size.trim() === "") {
            throw new Error("Each size must have a size name");
          }
          if (!sizeEntry.price || isNaN(parseFloat(sizeEntry.price))) {
            throw new Error(`Size "${sizeEntry.size}" must have a valid price`);
          }
          if (sizeEntry.mrpPrice && !isNaN(parseFloat(sizeEntry.mrpPrice))) {
            if (parseFloat(sizeEntry.price) > parseFloat(sizeEntry.mrpPrice)) {
              throw new Error(
                `Price cannot be greater than MRP for size "${sizeEntry.size}"`,
              );
            }
          }
        }
        return sizes;
      }

      // Old format (array of strings) - keep as is for backward compatibility
      return sizes;
    };

    // Handle key ingredient images
    let parsedKeyIngredients =
      keyIngredients !== undefined
        ? parseJsonField(keyIngredients, [])
        : parseJsonField(productData.keyIngredients, []);

    if (req.files && !Array.isArray(req.files)) {
      // Process key ingredient image files
      for (let i = 0; i < 10; i++) {
        const fieldName = `keyIngredientImage_${i}`;
        if (req.files[fieldName] && req.files[fieldName].length > 0) {
          const file = req.files[fieldName][0];
          const imageUrl = `/uploads/${file.filename}`;
          // Update the corresponding ingredient's image URL
          if (parsedKeyIngredients[i]) {
            parsedKeyIngredients[i].image = imageUrl;
          }
        }
      }
    }

    // Prepare update data
    // NOTE: price, mrpPrice, quantity, sold are managed per-variant.
    const updateData = {
      name: name !== undefined ? name : productData.name,
      slug: finalSlug,
      description:
        description !== undefined ? description : productData.description,
      lowStockThreshold:
        lowStockThreshold !== undefined
          ? normalizeLowStockThreshold(
              lowStockThreshold,
              normalizeLowStockThreshold(productData.lowStockThreshold),
            )
          : normalizeLowStockThreshold(productData.lowStockThreshold),
      trackQuantity:
        trackQuantity !== undefined
          ? normalizeBoolean(trackQuantity, productData.trackQuantity !== false)
          : productData.trackQuantity !== false,
      length:
        length !== undefined
          ? normalizeDimension(length)
          : normalizeDimension(productData.length),
      width:
        width !== undefined
          ? normalizeDimension(width)
          : normalizeDimension(productData.width),
      height:
        height !== undefined
          ? normalizeDimension(height)
          : normalizeDimension(productData.height),
      categoryId:
        categoryId !== undefined ? categoryId : productData.categoryId,
      sizes:
        sizes !== undefined
          ? validateSizePricing(parseJsonField(sizes, []))
          : parseJsonField(productData.sizes, []),
      keyIngredients: parsedKeyIngredients,
      benefits:
        benefits !== undefined
          ? parseJsonField(benefits, [])
          : parseJsonField(productData.benefits, []),
      usageSteps:
        usageSteps !== undefined
          ? parseJsonField(usageSteps, [])
          : parseJsonField(productData.usageSteps, []),
      commonQuestions:
        commonQuestions !== undefined
          ? parseJsonField(commonQuestions, [])
          : parseJsonField(productData.commonQuestions, []),
      images: imageUrls,
      // Use manual tag if provided (non-empty), otherwise auto-detect
      tag:
        tag !== undefined
          ? tag === ""
            ? autoDetectTag(
                sizes !== undefined
                  ? validateSizePricing(parseJsonField(sizes, []))
                  : parseJsonField(productData.sizes, []),
                productData.createdAt,
              )
            : tag
          : productData.tag,
      isActive:
        isActive !== undefined
          ? normalizeBoolean(isActive, productData.isActive)
          : productData.isActive,
    };

    await productData.update(updateData);

    // Handle Variants Update (Sync)
    if (req.body.variants) {
      let variantsData = parseJsonField(req.body.variants);

      if (Array.isArray(variantsData)) {
        const lowStockThreshold = normalizeLowStockThreshold(
          updateData.lowStockThreshold,
          getLowStockThreshold(),
        );
        const trackQuantityEnabled = updateData.trackQuantity !== false;
        const existingVariants = await productVariant.findAll({
          where: { productId: id },
          attributes: ["id", "name", "sku", "stock"],
        });
        const existingVariantIds = existingVariants.map((v) => v.id);
        const existingVariantsById = new Map(
          existingVariants.map((variant) => [variant.id, variant]),
        );

        // IDs present in the payload (to be kept/updated)
        const incomingVariantIds = variantsData
          .filter((v) => v.id)
          .map((v) => parseInt(v.id)); // Ensure integer comparison

        // Find variants to delete (existing but not in payload)
        const idsToDelete = existingVariantIds.filter(
          (id) => !incomingVariantIds.includes(id),
        );

        if (idsToDelete.length > 0) {
          await productVariant.destroy({ where: { id: idsToDelete } });
        }

        // Create or Update
        for (const [index, v] of variantsData.entries()) {
          const variantPayload = {
            productId: id,
            name: v.name,
            sku: v.sku || `${finalSlug}-${v.name}`, // Use updated slug
            price: v.price,
            mrpPrice: v.mrpPrice,
            gstPercentage: normalizeGstPercentage(v.gstPercentage),
            stock: v.stock || 0,
            customStock: normalizeCustomStock(v.customStock),
            weight: v.weight,
            length: normalizeDimension(v.length),
            width: normalizeDimension(v.width),
            height: normalizeDimension(v.height),
            sortOrder: index,
            isActive: v.isActive !== undefined ? v.isActive : true,
          };
          const variantPayloadWithoutUnavailableFields = (error) =>
            removeMissingVariantFields(variantPayload, error);

          if (v.id && existingVariantIds.includes(parseInt(v.id))) {
            const existingVariant = existingVariantsById.get(parseInt(v.id));
            const previousStock = Number(existingVariant?.stock || 0);
            const parsedCurrentStock = Number.parseInt(v.stock, 10);
            const currentStock = Number.isFinite(parsedCurrentStock)
              ? parsedCurrentStock
              : previousStock;

            try {
              await productVariant.update(variantPayload, {
                where: { id: v.id },
              });
            } catch (error) {
              if (!isMissingVariantColumnError(error)) {
                throw error;
              }
              console.warn(
                "A variant column is missing in product_variants. Updating variant without unavailable fields.",
              );
              await productVariant.update(
                variantPayloadWithoutUnavailableFields(error),
                {
                where: { id: v.id },
                  },
              );
            }

            if (
              trackQuantityEnabled &&
              shouldTriggerLowStockAlert({
                previousStock,
                currentStock,
                threshold: lowStockThreshold,
              })
            ) {
              queueLowStockAlertEmail({
                productId: productData.id,
                productName: updateData.name || productData.name,
                variantId: parseInt(v.id),
                variantName: v.name || existingVariant?.name || "Variant",
                sku: v.sku || existingVariant?.sku || `${finalSlug}-${v.name}`,
                previousStock,
                currentStock,
                threshold: lowStockThreshold,
                source: "product_update",
              });
            }
          } else {
            try {
              await productVariant.create(variantPayload);
            } catch (error) {
              if (!isMissingVariantColumnError(error)) {
                throw error;
              }
              console.warn(
                "A variant column is missing in product_variants. Creating variant without unavailable fields.",
              );
              await productVariant.create(
                variantPayloadWithoutUnavailableFields(error),
              );
            }
          }
        }
      }
    }

    // Reload product to get updated data including createdAt
    await productData.reload();

    res.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Update product error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const productData = await product.findByPk(id);

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product is referenced in order_items
    const orderItemsCount = await orderItem.count({
      where: { productId: id },
    });

    if (orderItemsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It is referenced in ${orderItemsCount} order item(s). Products that have been ordered cannot be deleted to maintain order history integrity.`,
      });
    }

    // Check if product has reviews
    const reviewsCount = await review.count({
      where: { productId: parseInt(id) },
    });

    if (reviewsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It has ${reviewsCount} review(s). Please delete or reassign reviews first.`,
      });
    }

    // Permanently delete from database (only if no dependencies exist)
    const allImagesToDelete = [...(productData.images || [])];

    // Also add images from key ingredients if they exist
    if (
      productData.keyIngredients &&
      Array.isArray(productData.keyIngredients)
    ) {
      productData.keyIngredients.forEach((item) => {
        if (item.image) allImagesToDelete.push(item.image);
      });
    }

    await productData.destroy();

    // Delete files from disk after successful database deletion
    if (allImagesToDelete.length > 0) {
      await deleteFile(allImagesToDelete);
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get best selling products
const getBestSellingProducts = async (req, res) => {
  try {
    let bestSellingProducts = [];
    try {
      bestSellingProducts = await orderItem.findAll({
        attributes: [
          "productId",
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalSold"],
          [sequelize.fn("SUM", sequelize.col("totalPrice")), "totalRevenue"],
        ],
        include: [
          {
            model: product,
            as: "product",
            attributes: [
              "id",
              "name",
              "price",
              "images",
              "category",
              "type",
              "tag",
              "quantity",
              "sold",
              "isActive",
            ],
          },
        ],
        group: ["productId"],
        order: [[sequelize.fn("SUM", sequelize.col("quantity")), "DESC"]],
        limit: 10,
      });
    } catch (error) {
      console.log("No order items found, returning empty array");
      bestSellingProducts = [];
    }

    res.json({
      success: true,
      data: bestSellingProducts,
    });
  } catch (error) {
    console.error("Get best selling products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch best selling products",
    });
  }
};

// Get product statistics
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await product.count();
    const activeProducts = await product.count({ where: { isActive: true } });
    const lowStockProducts = await product.count({
      where: {
        quantity: { [Op.lte]: sequelize.col("lowStockThreshold") },
        trackQuantity: true,
      },
    });

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("Get product stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product statistics",
    });
  }
};

module.exports = {
  testProducts,
  testUpdate,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getBestSellingProducts,
  getProductStats,
};
