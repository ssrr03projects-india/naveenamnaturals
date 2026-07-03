// Helper function for creating orders with variant support
// This replaces the old createOrder function in order.controller.js

const createOrderWithVariants = async (req, res) => {
    try {
        const {
            customerId,
            items,
            address,
            billingAddress,
            paymentMethod,
            paymentStatus = "pending",
            paymentId = null,
            couponCode,
            notes,
            adminNotes,
        } = req.body;

        if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Customer ID and items are required",
            });
        }

        // Verify customer exists
        const customerData = await customer.findByPk(customerId);
        if (!customerData) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        // Calculate totals
        let subtotal = 0;
        let couponDiscount = 0;
        let couponId = null;

        // Process items and calculate subtotal
        for (const item of items) {
            // Validate variantId is provided
            if (!item.variantId) {
                return res.status(400).json({
                    success: false,
                    message: "variantId is required for each item",
                });
            }

            // Get variant data with product
            const variantData = await productVariant.findByPk(item.variantId, {
                include: [
                    {
                        model: product,
                        as: "product",
                    },
                ],
            });

            if (!variantData) {
                return res.status(400).json({
                    success: false,
                    message: `Variant with ID ${item.variantId} not found`,
                });
            }

            // Check if variant is active
            if (!variantData.isActive) {
                return res.status(400).json({
                    success: false,
                    message: `Variant "${variantData.name}" is not available`,
                });
            }

            // Check stock availability
            if (variantData.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${variantData.product.name} - ${variantData.name}. Available: ${variantData.stock}`,
                });
            }

            // Get pricing from variant
            const unitPrice = parseFloat(variantData.price);
            subtotal += unitPrice * item.quantity;
        }

        // Process coupon if provided
        if (couponCode) {
            const couponData = await coupon.findOne({
                where: {
                    code: couponCode,
                    isActive: true,
                    [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: new Date() } }],
                    [Op.or]: [
                        { expiresAt: null },
                        { expiresAt: { [Op.gte]: new Date() } },
                    ],
                },
            });

            if (couponData) {
                couponId = couponData.id;

                if (couponData.type === "percentage") {
                    couponDiscount = (subtotal * couponData.value) / 100;
                } else if (couponData.type === "fixed") {
                    couponDiscount = couponData.value;
                }
            }
        }

        const taxAmount = 0; // Calculate tax based on your business rules
        const shippingAmount = 0; // Calculate shipping based on your business rules
        const totalAmount = subtotal + taxAmount + shippingAmount - couponDiscount;

        // Create order
        const newOrder = await order.create({
            orderNumber: generateOrderNumber(),
            customerId,
            status: "pending",
            paymentStatus,
            paymentMethod,
            paymentId,
            subtotal,
            taxAmount,
            shippingAmount,
            discountAmount: couponDiscount,
            totalAmount,
            couponId,
            couponCode,
            couponDiscount,
            address,
            billingAddress,
            notes,
            adminNotes,
        });

        // Create order items and update variant stock
        for (const item of items) {
            const variantData = await productVariant.findByPk(item.variantId, {
                include: [
                    {
                        model: product,
                        as: "product",
                    },
                ],
            });

            const unitPrice = parseFloat(variantData.price);
            const mrpPrice = variantData.mrpPrice ? parseFloat(variantData.mrpPrice) : null;

            // Create order item
            await orderItem.create({
                orderId: newOrder.id,
                productId: variantData.productId,
                variantId: variantData.id,
                productName: `${variantData.product.name} - ${variantData.name}`,
                productSku: variantData.sku,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: unitPrice * item.quantity,
                productSnapshot: {
                    productName: variantData.product.name,
                    variantName: variantData.name,
                    sku: variantData.sku,
                    price: unitPrice,
                    mrpPrice: mrpPrice,
                    weight: variantData.weight,
                    images: variantData.product.images,
                },
            });

            // Update variant stock
            await variantData.update({
                stock: variantData.stock - item.quantity,
                sold: (variantData.sold || 0) + item.quantity,
            });
        }

        // Update coupon usage
        if (couponId) {
            const couponData = await coupon.findByPk(couponId);
            await couponData.update({
                usedCount: couponData.usedCount + 1,
            });
        }

        // Update customer statistics
        await customerData.update({
            totalOrders: customerData.totalOrders + 1,
            totalSpent: parseFloat(customerData.totalSpent) + parseFloat(totalAmount),
            lastOrderDate: new Date(),
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: {
                orderId: newOrder.id,
                orderNumber: newOrder.orderNumber,
                totalAmount: newOrder.totalAmount,
            },
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Note: Replace the existing createOrder function in order.controller.js with this version
// Make sure to also update the module.exports to use this function
