const { Op } = require("sequelize");
const { product, productVariant, sequelize } = require("../models");
const {
    queueLowStockAlertEmail,
    sendLowStockAlertEmail,
} = require("../services/orderEmail.service");
const {
    getLowStockThreshold,
    shouldTriggerLowStockAlert,
} = require("../utils/stockAlert");

const normalizeCustomStock = (value) => {
    if (value === undefined || value === null) return null;
    const cleaned = String(value).trim().replace(/\s+/g, " ");
    if (cleaned === "") return null;
    if (!/^[A-Za-z0-9 ]{1,60}$/.test(cleaned)) {
        return "__INVALID__";
    }
    return cleaned;
};

const normalizeGstPercentage = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "__INVALID__";
    if (![5, 12, 18, 28].includes(parsed)) return "__INVALID__";
    return parsed;
};

const normalizeDimension = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return "__INVALID__";
    return Number(parsed.toFixed(2));
};

const isMissingVariantColumnError = (error) =>
    error &&
    (error.original?.code === "ER_BAD_FIELD_ERROR" ||
        error.parent?.code === "ER_BAD_FIELD_ERROR") &&
    ["customStock", "gstPercentage", "length", "width", "height"].some((field) =>
        String(error.original?.sqlMessage || error.message || "").includes(field)
    );

const removeMissingVariantFields = (payload, error) => {
    const message = String(error?.original?.sqlMessage || error?.message || "");
    const cleaned = { ...payload };
    if (message.includes("customStock")) delete cleaned.customStock;
    if (message.includes("gstPercentage")) delete cleaned.gstPercentage;
    if (message.includes("length")) delete cleaned.length;
    if (message.includes("width")) delete cleaned.width;
    if (message.includes("height")) delete cleaned.height;
    return cleaned;
};

// Get all variants for a product
const getProductVariants = async (req, res) => {
    try {
        const { productId } = req.params;

        const variants = await productVariant.findAll({
            where: { productId },
            order: [["sortOrder", "ASC"], ["name", "ASC"]],
        });

        res.json({
            success: true,
            data: variants,
        });
    } catch (error) {
        console.error("Get product variants error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch product variants",
        });
    }
};

// Create variant for a product
const createVariant = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, sku, price, mrpPrice, gstPercentage, stock, customStock, weight, length, width, height, sortOrder, isActive } = req.body;

        // Verify product exists
        const productData = await product.findByPk(productId);
        if (!productData) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Validate required fields
        if (!name || !sku || !price) {
            return res.status(400).json({
                success: false,
                message: "Name, SKU, and price are required",
            });
        }

        // Check if SKU already exists
        const existingVariant = await productVariant.findOne({ where: { sku } });
        if (existingVariant) {
            return res.status(400).json({
                success: false,
                message: "SKU already exists",
            });
        }

        // Validate price logic
        if (mrpPrice && parseFloat(price) > parseFloat(mrpPrice)) {
            return res.status(400).json({
                success: false,
                message: "Price cannot be greater than MRP",
            });
        }

        const normalizedCustomStock = normalizeCustomStock(customStock);
        if (normalizedCustomStock === "__INVALID__") {
            return res.status(400).json({
                success: false,
                message: "Custom stock must be max 60 chars and only letters, numbers, spaces",
            });
        }
        const normalizedGstPercentage = normalizeGstPercentage(gstPercentage);
        if (normalizedGstPercentage === "__INVALID__") {
            return res.status(400).json({
                success: false,
                message: "GST must be one of: 5, 12, 18, 28",
            });
        }
        const normalizedLength = normalizeDimension(length);
        const normalizedWidth = normalizeDimension(width);
        const normalizedHeight = normalizeDimension(height);
        if (
            normalizedLength === "__INVALID__" ||
            normalizedWidth === "__INVALID__" ||
            normalizedHeight === "__INVALID__"
        ) {
            return res.status(400).json({
                success: false,
                message: "Length, width, and height must be positive numbers",
            });
        }

        const variantPayload = {
            productId,
            name,
            sku,
            price: parseFloat(price),
            mrpPrice: mrpPrice ? parseFloat(mrpPrice) : null,
            gstPercentage: normalizedGstPercentage,
            stock: stock ? parseInt(stock) : 0,
            customStock: normalizedCustomStock,
            sold: 0,
            weight: weight || null,
            length: normalizedLength,
            width: normalizedWidth,
            height: normalizedHeight,
            sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
            isActive: isActive !== undefined ? isActive : true,
        };

        let newVariant;
        try {
            newVariant = await productVariant.create(variantPayload);
        } catch (error) {
            if (!isMissingVariantColumnError(error)) {
                throw error;
            }
            console.warn(
                "A variant column is missing in product_variants. Creating variant without unavailable fields.",
            );
            newVariant = await productVariant.create(removeMissingVariantFields(variantPayload, error));
        }

        res.status(201).json({
            success: true,
            message: "Variant created successfully",
            data: newVariant,
        });
    } catch (error) {
        console.error("Create variant error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create variant",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Update variant
const updateVariant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, price, mrpPrice, gstPercentage, stock, customStock, weight, length, width, height, sortOrder, isActive } = req.body;

        const variant = await productVariant.findByPk(id);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found",
            });
        }

        // If SKU is being changed, check uniqueness
        if (sku && sku !== variant.sku) {
            const existingVariant = await productVariant.findOne({
                where: {
                    sku,
                    id: { [Op.ne]: id },
                },
            });
            if (existingVariant) {
                return res.status(400).json({
                    success: false,
                    message: "SKU already exists",
                });
            }
        }

        // Validate price logic
        const newPrice = price !== undefined ? parseFloat(price) : variant.price;
        const newMrpPrice = mrpPrice !== undefined ? (mrpPrice ? parseFloat(mrpPrice) : null) : variant.mrpPrice;

        if (newMrpPrice && newPrice > newMrpPrice) {
            return res.status(400).json({
                success: false,
                message: "Price cannot be greater than MRP",
            });
        }

        const normalizedCustomStock =
            customStock !== undefined ? normalizeCustomStock(customStock) : variant.customStock;
        if (normalizedCustomStock === "__INVALID__") {
            return res.status(400).json({
                success: false,
                message: "Custom stock must be max 60 chars and only letters, numbers, spaces",
            });
        }
        const normalizedGstPercentage =
            gstPercentage !== undefined
                ? normalizeGstPercentage(gstPercentage)
                : variant.gstPercentage;
        if (normalizedGstPercentage === "__INVALID__") {
            return res.status(400).json({
                success: false,
                message: "GST must be one of: 5, 12, 18, 28",
            });
        }
        const normalizedLength =
            length !== undefined ? normalizeDimension(length) : variant.length;
        const normalizedWidth =
            width !== undefined ? normalizeDimension(width) : variant.width;
        const normalizedHeight =
            height !== undefined ? normalizeDimension(height) : variant.height;
        if (
            normalizedLength === "__INVALID__" ||
            normalizedWidth === "__INVALID__" ||
            normalizedHeight === "__INVALID__"
        ) {
            return res.status(400).json({
                success: false,
                message: "Length, width, and height must be positive numbers",
            });
        }

        const updateData = {
            name: name !== undefined ? name : variant.name,
            sku: sku !== undefined ? sku : variant.sku,
            price: newPrice,
            mrpPrice: newMrpPrice,
            gstPercentage: normalizedGstPercentage,
            stock: stock !== undefined ? parseInt(stock) : variant.stock,
            customStock: normalizedCustomStock,
            weight: weight !== undefined ? weight : variant.weight,
            length: normalizedLength,
            width: normalizedWidth,
            height: normalizedHeight,
            sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : variant.sortOrder,
            isActive: isActive !== undefined ? isActive : variant.isActive,
        };
        const previousStock = Number(variant.stock || 0);
        const currentStock = Number(updateData.stock || 0);

        try {
            await variant.update(updateData);
        } catch (error) {
            if (!isMissingVariantColumnError(error)) {
                throw error;
            }
            console.warn(
                "A variant column is missing in product_variants. Updating variant without unavailable fields.",
            );
            await variant.update(removeMissingVariantFields(updateData, error));
        }

        if (
            Number.isFinite(previousStock) &&
            Number.isFinite(currentStock)
        ) {
            const productData = await product.findByPk(variant.productId, {
                attributes: ["id", "name", "lowStockThreshold", "trackQuantity"],
            });
            const lowStockThreshold = Number.isFinite(
                Number(productData?.lowStockThreshold),
            )
                ? Number(productData.lowStockThreshold)
                : getLowStockThreshold();
            const trackQuantityEnabled = productData?.trackQuantity !== false;

            if (
                !trackQuantityEnabled ||
                !shouldTriggerLowStockAlert({
                    previousStock,
                    currentStock,
                    threshold: lowStockThreshold,
                })
            ) {
                return res.json({
                    success: true,
                    message: "Variant updated successfully",
                    data: variant,
                });
            }

            queueLowStockAlertEmail({
                productId: productData?.id || variant.productId,
                productName: productData?.name || "Product",
                variantId: variant.id,
                variantName: updateData.name || variant.name,
                sku: updateData.sku || variant.sku,
                previousStock,
                currentStock,
                threshold: lowStockThreshold,
                source: "variant_update",
            });
        }

        res.json({
            success: true,
            message: "Variant updated successfully",
            data: variant,
        });
    } catch (error) {
        console.error("Update variant error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update variant",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Send a test low-stock email for a variant without changing stock
const sendLowStockTestEmail = async (req, res) => {
    try {
        const { id } = req.params;

        const variant = await productVariant.findByPk(id);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found",
            });
        }

        const productData = await product.findByPk(variant.productId, {
            attributes: ["id", "name", "lowStockThreshold", "trackQuantity"],
        });

        if (!productData) {
            return res.status(404).json({
                success: false,
                message: "Product not found for this variant",
            });
        }

        const threshold = Number.isFinite(Number(productData.lowStockThreshold))
            ? Number(productData.lowStockThreshold)
            : getLowStockThreshold();

        const simulatedCurrentStock = Math.max(
            0,
            Math.min(Number(variant.stock || 0), threshold),
        );
        const simulatedPreviousStock = Math.max(simulatedCurrentStock + 1, threshold + 1);

        const emailResult = await sendLowStockAlertEmail({
            productId: productData.id,
            productName: productData.name,
            variantId: variant.id,
            variantName: variant.name,
            sku: variant.sku,
            previousStock: simulatedPreviousStock,
            currentStock: simulatedCurrentStock,
            threshold,
            source: "manual_test",
        });

        if (!emailResult?.success) {
            return res.status(400).json({
                success: false,
                message: emailResult?.message || "Low-stock test email could not be sent",
                data: {
                    productId: productData.id,
                    productName: productData.name,
                    variantId: variant.id,
                    variantName: variant.name,
                    sku: variant.sku,
                    threshold,
                    simulatedPreviousStock,
                    simulatedCurrentStock,
                },
            });
        }

        res.json({
            success: true,
            message: emailResult.message || "Low-stock test email triggered",
            data: {
                productId: productData.id,
                productName: productData.name,
                variantId: variant.id,
                variantName: variant.name,
                sku: variant.sku,
                threshold,
                simulatedPreviousStock,
                simulatedCurrentStock,
                trackQuantity: productData.trackQuantity !== false,
            },
        });
    } catch (error) {
        console.error("Send low-stock test email error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to trigger low-stock test email",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Delete variant
const deleteVariant = async (req, res) => {
    try {
        const { id } = req.params;

        const variant = await productVariant.findByPk(id);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found",
            });
        }

        // Check if variant is referenced in any orders
        const { orderItem } = require("../models");
        const orderItemCount = await orderItem.count({
            where: { variantId: id },
        });

        if (orderItemCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete variant. It is referenced in ${orderItemCount} order(s). Consider marking it as inactive instead.`,
            });
        }

        await variant.destroy();

        res.json({
            success: true,
            message: "Variant deleted successfully",
        });
    } catch (error) {
        console.error("Delete variant error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete variant",
        });
    }
};

// Bulk create variants for a product
const bulkCreateVariants = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variants } = req.body;

        // Verify product exists
        const productData = await product.findByPk(productId);
        if (!productData) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (!Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Variants array is required",
            });
        }

        // Validate all variants
        for (const variant of variants) {
            if (!variant.name || !variant.sku || !variant.price) {
                return res.status(400).json({
                    success: false,
                    message: "Each variant must have name, SKU, and price",
                });
            }

            if (variant.mrpPrice && parseFloat(variant.price) > parseFloat(variant.mrpPrice)) {
                return res.status(400).json({
                    success: false,
                    message: `Price cannot be greater than MRP for variant "${variant.name}"`,
                });
            }

            const normalizedCustomStock = normalizeCustomStock(variant.customStock);
            if (normalizedCustomStock === "__INVALID__") {
                return res.status(400).json({
                    success: false,
                    message: `Custom stock invalid for variant "${variant.name}"`,
                });
            }
            const normalizedGstPercentage = normalizeGstPercentage(variant.gstPercentage);
            if (normalizedGstPercentage === "__INVALID__") {
                return res.status(400).json({
                    success: false,
                    message: `GST must be one of: 5, 12, 18, 28 for variant "${variant.name}"`,
                });
            }
            if (
                normalizeDimension(variant.length) === "__INVALID__" ||
                normalizeDimension(variant.width) === "__INVALID__" ||
                normalizeDimension(variant.height) === "__INVALID__"
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Length, width, and height must be positive numbers for variant "${variant.name}"`,
                });
            }
        }

        // Check for duplicate SKUs
        const skus = variants.map(v => v.sku);
        const existingVariants = await productVariant.findAll({
            where: { sku: { [Op.in]: skus } },
        });

        if (existingVariants.length > 0) {
            return res.status(400).json({
                success: false,
                message: `SKU(s) already exist: ${existingVariants.map(v => v.sku).join(", ")}`,
            });
        }

        // Create all variants
        const variantPayloads = variants.map((v, index) => ({
                productId,
                name: v.name,
                sku: v.sku,
                price: parseFloat(v.price),
                mrpPrice: v.mrpPrice ? parseFloat(v.mrpPrice) : null,
                gstPercentage: normalizeGstPercentage(v.gstPercentage),
                stock: v.stock ? parseInt(v.stock) : 0,
                customStock: normalizeCustomStock(v.customStock),
                sold: 0,
                weight: v.weight || null,
                length: normalizeDimension(v.length) === "__INVALID__" ? null : normalizeDimension(v.length),
                width: normalizeDimension(v.width) === "__INVALID__" ? null : normalizeDimension(v.width),
                height: normalizeDimension(v.height) === "__INVALID__" ? null : normalizeDimension(v.height),
                sortOrder: v.sortOrder !== undefined ? parseInt(v.sortOrder) : index,
                isActive: v.isActive !== undefined ? v.isActive : true,
            }));

        let createdVariants;
        try {
            createdVariants = await productVariant.bulkCreate(variantPayloads);
        } catch (error) {
            if (!isMissingVariantColumnError(error)) {
                throw error;
            }
            console.warn(
                "A variant column is missing in product_variants. Bulk creating variants without unavailable fields.",
            );
            createdVariants = await productVariant.bulkCreate(
                variantPayloads.map((payload) => removeMissingVariantFields(payload, error)),
            );
        }

        res.status(201).json({
            success: true,
            message: `${createdVariants.length} variant(s) created successfully`,
            data: createdVariants,
        });
    } catch (error) {
        console.error("Bulk create variants error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create variants",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

module.exports = {
    getProductVariants,
    createVariant,
    updateVariant,
    sendLowStockTestEmail,
    deleteVariant,
    bulkCreateVariants,
};
