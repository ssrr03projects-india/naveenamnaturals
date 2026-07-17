const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const {
  customer,
  order,
  orderItem,
  product,
  coupon,
  review,
} = require("../models");
const { calculateGSTBreakdown } = require("../utils/gstCalculator");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here";

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseProductSnapshot = (snapshot) => {
  if (!snapshot) return {};
  if (typeof snapshot === "string") {
    try {
      return JSON.parse(snapshot);
    } catch {
      return {};
    }
  }
  return snapshot;
};

const buildGstOrderItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const snapshot = parseProductSnapshot(item?.productSnapshot);

    return {
      itemId: item?.id ?? null,
      productId: item?.productId ?? null,
      productName:
        item?.productName || item?.product?.name || snapshot?.name || "Product",
      basePrice: toFiniteNumber(item?.unitPrice || snapshot?.price),
      gstRate: toFiniteNumber(snapshot?.gstPercentage),
      quantity: toFiniteNumber(item?.quantity),
    };
  });

const attachGstBreakdownToOrder = (orderRecord) => {
  if (!orderRecord) return orderRecord;

  const plainOrder =
    typeof orderRecord.toJSON === "function"
      ? orderRecord.toJSON()
      : orderRecord;

  return {
    ...plainOrder,
    gstBreakdown: calculateGSTBreakdown(
      buildGstOrderItems(plainOrder.items),
      plainOrder.discountAmount,
    ),
  };
};

const normalizePhoneDigits = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(-10);

const parseAddressObject = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const lookupCustomerForCheckout = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const phoneDigits = normalizePhoneDigits(req.body?.phone || req.body?.phoneNumber);

    if (!email && !phoneDigits) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const customerAttributes = [
      "id",
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "totalOrders",
      "totalSpent",
      "lastOrderDate",
    ];

    // Important: when email is present, prefer exact email match.
    // Fallback to phone only if no email match was found.
    let matchedCustomer = null;

    if (email) {
      matchedCustomer = await customer.findOne({
        where: { email },
        attributes: customerAttributes,
        order: [["updatedAt", "DESC"]],
      });
    }

    if (!matchedCustomer && phoneDigits) {
      matchedCustomer = await customer.findOne({
        where: {
          phone: { [Op.like]: `%${phoneDigits}` },
        },
        attributes: customerAttributes,
        order: [["updatedAt", "DESC"]],
      });
    }

    if (!matchedCustomer) {
      return res.json({
        success: true,
        data: {
          matched: false,
        },
      });
    }

    const recentOrders = await order.findAll({
      where: { customerId: matchedCustomer.id },
      attributes: ["id", "orderNumber", "status", "totalAmount", "createdAt", "address"],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    const customerAddress = parseAddressObject(matchedCustomer.address);
    const lastOrderAddress = parseAddressObject(recentOrders[0]?.address);
    const shippingAddress = customerAddress || lastOrderAddress || null;

    return res.json({
      success: true,
      data: {
        matched: true,
        customer: {
          id: matchedCustomer.id,
          firstName: matchedCustomer.firstName,
          lastName: matchedCustomer.lastName,
          email: matchedCustomer.email,
          phone: matchedCustomer.phone,
          totalOrders: matchedCustomer.totalOrders || recentOrders.length,
          totalSpent: matchedCustomer.totalSpent,
          lastOrderDate: matchedCustomer.lastOrderDate,
        },
        shippingAddress,
        recentOrders: recentOrders.map((entry) => ({
          id: entry.id,
          orderNumber: entry.orderNumber,
          status: entry.status,
          totalAmount: entry.totalAmount,
          createdAt: entry.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Checkout customer lookup error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to lookup customer details",
    });
  }
};

// Generate JWT token for customer
const generateCustomerToken = (customerData) => {
  return jwt.sign(
    {
      id: customerData.id,
      email: customerData.email,
      type: "customer",
    },
    JWT_SECRET,
    { expiresIn: "30d" }, // Longer expiry for customers
  );
};

// Get all customers with pagination and search
const getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: customers } = await customer.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: {
        include: [
          [
            require("sequelize").literal(
              `(SELECT COUNT(*) FROM orders WHERE orders.customerId = Customer.id)`,
            ),
            "orderCount",
          ],
        ],
      },
    });

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customerData = await customer.findByPk(id, {
      include: [
        {
          model: order,
          as: "orders",
          limit: 5,
          order: [["createdAt", "DESC"]],
          attributes: [
            "id",
            "orderNumber",
            "status",
            "totalAmount",
            "createdAt",
          ],
        },
      ],
    });

    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    let {
      firstName,
      lastName,
      name, // Backward compatibility: handle old 'name' field
      email,
      phone,
      password,
      address,
      isVerified,
      verificationCode,
      tag,
      subscribedToNewsletter,
      wishlist,
    } = req.body;

    // Backward compatibility: if 'name' is provided instead of 'firstName', split it
    if (name && !firstName) {
      const nameParts = name.trim().split(/\s+/);
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || null;
    }

    if (!firstName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name and email are required",
      });
    }

    // Check if email already exists
    const existingCustomer = await customer.findOne({
      where: { email: email },
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this email already exists",
      });
    }

    const newCustomer = await customer.create({
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
      password: password || null,
      address: address || null,
      isVerified: isVerified || false,
      verificationCode: verificationCode || null,
      tag: tag || null,
      subscribedToNewsletter: subscribedToNewsletter || false,
      wishlist: wishlist || [],
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: newCustomer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customerData = await customer.findByPk(id);

    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if email is being changed and if it already exists
    if (updateData.email && updateData.email !== customerData.email) {
      const existingCustomer = await customer.findOne({
        where: { email: updateData.email },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this email already exists",
        });
      }
    }

    await customerData.update(updateData);

    res.json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customerData = await customer.findByPk(id);

    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if customer has orders
    const ordersCount = await order.count({
      where: { customerId: id },
    });

    if (ordersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer. They have ${ordersCount} order(s). Customers with order history cannot be deleted to maintain order integrity.`,
      });
    }

    // Check if customer has reviews
    const reviewsCount = await review.count({
      where: { customerId: parseInt(id) },
    });

    if (reviewsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer. They have ${reviewsCount} review(s). Please delete or reassign reviews first.`,
      });
    }

    // Permanently delete from database (only if no dependencies exist)
    await customerData.destroy();

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get customer statistics
const getCustomerStats = async (req, res) => {
  try {
    const totalCustomers = await customer.count();
    const activeCustomers = await customer.count({ where: { isActive: true } });
    const newCustomersThisMonth = await customer.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1,
          ),
        },
      },
    });

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers,
        newCustomersThisMonth,
      },
    });
  } catch (error) {
    console.error("Get customer stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer statistics",
    });
  }
};

// Sync customer statistics with actual order data
const syncCustomerStats = async (req, res) => {
  try {
    const { Op } = require("sequelize");

    const customers = await customer.findAll();
    let updated = 0;

    for (const customerData of customers) {
      // Count non-cancelled orders
      const orders = await order.findAll({
        where: {
          customerId: customerData.id,
          status: { [Op.ne]: "cancelled" },
        },
      });

      const totalOrders = orders.length;
      const totalSpent = orders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0,
      );
      const lastOrder = orders.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )[0];

      await customerData.update({
        totalOrders,
        totalSpent: totalSpent.toFixed(2),
        lastOrderDate: lastOrder ? lastOrder.createdAt : null,
      });

      updated++;
    }

    res.json({
      success: true,
      message: `Successfully synced statistics for ${updated} customers`,
      data: { customersUpdated: updated },
    });
  } catch (error) {
    console.error("Sync customer stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync customer statistics",
    });
  }
};

// Customer Login
const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find customer by email
    const customerData = await customer.findOne({
      where: {
        email: email,
        isActive: true,
      },
    });

    if (!customerData) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if customer has a password set
    if (!customerData.password) {
      return res.status(401).json({
        success: false,
        message: "Account not set up. Please register first.",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      customerData.password,
    );
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    await customerData.update({ lastLogin: new Date() });

    // Generate token
    const token = generateCustomerToken(customerData);

    // Set httpOnly cookie for token (secure against XSS)
    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      sameSite: "lax", // Better for localhost with different ports
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/", // Available site-wide
    };
    res.cookie("customer_token", token, cookieOptions);

    // Return customer data without password and token
    const customerResponse = customerData.toJSON();
    delete customerResponse.password;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        customer: customerResponse,
        // Token still returned for backward compatibility, but cookie is primary
        token: process.env.NODE_ENV === "development" ? token : undefined,
      },
    });
  } catch (error) {
    console.error("Customer login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Customer Register
const customerRegister = async (req, res) => {
  try {
    let {
      firstName,
      lastName,
      name, // Backward compatibility: handle old 'name' field
      email,
      password,
      phone,
      address,
      subscribedToNewsletter,
    } = req.body;

    // Backward compatibility: if 'name' is provided instead of 'firstName', split it
    if (name && !firstName) {
      const nameParts = name.trim().split(/\s+/);
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || null;
    }

    if (!firstName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if email already exists
    const existingCustomer = await customer.findOne({
      where: { email: email },
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new customer
    const newCustomer = await customer.create({
      firstName,
      lastName: lastName || null,
      email,
      password: hashedPassword,
      phone: phone || null,
      address: address || null,
      subscribedToNewsletter: subscribedToNewsletter || false,
      isActive: true,
    });

    // Generate token
    const token = generateCustomerToken(newCustomer);

    // Set httpOnly cookie for token (secure against XSS)
    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      sameSite: "lax", // Better for localhost with different ports
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/", // Available site-wide
    };
    res.cookie("customer_token", token, cookieOptions);

    // Return customer data without password and token
    const customerResponse = newCustomer.toJSON();
    delete customerResponse.password;

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        customer: customerResponse,
        // Token still returned for backward compatibility, but cookie is primary
        token: process.env.NODE_ENV === "development" ? token : undefined,
      },
    });
  } catch (error) {
    console.error("Customer registration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register customer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get Customer Profile (authenticated)
const getCustomerProfile = async (req, res) => {
  try {
    // Customer is already attached to req by middleware
    const customerData = await customer.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: order,
          as: "orders",
          limit: 5,
          order: [["createdAt", "DESC"]],
          attributes: [
            "id",
            "orderNumber",
            "status",
            "totalAmount",
            "createdAt",
          ],
        },
      ],
    });

    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    console.error("Get customer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer profile",
    });
  }
};

// Update Customer Profile (authenticated)
const updateCustomerProfile = async (req, res) => {
  try {
    const customerData = await customer.findByPk(req.user.id);

    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const updateData = { ...req.body };

    // Handle password update separately
    if (updateData.password) {
      if (updateData.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Check if email is being changed and if it already exists
    if (updateData.email && updateData.email !== customerData.email) {
      const existingCustomer = await customer.findOne({
        where: { email: updateData.email },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this email already exists",
        });
      }
    }

    await customerData.update(updateData);

    // Get updated customer without password
    const updatedCustomer = await customer.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error("Update customer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer profile",
    });
  }
};

// Get Customer Orders (authenticated)
const getCustomerOrders = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      page = 1,
      limit = 10,
      status = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const customerId = req.user.id;

    let whereClause = { customerId };

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // First get the count separately to avoid issues with distinct
    const totalCount = await order.count({
      where: whereClause,
      distinct: true,
      col: "id",
    });

    // Then get the orders
    const orders = await order.findAll({
      where: whereClause,
      include: [
        {
          model: orderItem,
          as: "items",
          required: false,
          attributes: [
            "id",
            "orderId",
            "productId",
            "productName",
            "productSku",
            "quantity",
            "unitPrice",
            "totalPrice",
            "taxAmount",
            "discountAmount",
            "productSnapshot",
          ],
          include: [
            {
              model: product,
              as: "product",
              required: false,
              attributes: ["id", "name", "images"],
            },
          ],
        },
        {
          model: coupon,
          as: "coupon",
          attributes: ["id", "code", "name"],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        orders: orders.map(attachGstBreakdownToOrder),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get customer orders error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get Customer Order by ID (authenticated)
const getCustomerOrderById = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const customerId = req.user.id;

    const orderData = await order.findOne({
      where: {
        id: id,
        customerId: customerId, // Ensure order belongs to customer
      },
      include: [
        {
          model: orderItem,
          as: "items",
          required: false,
          attributes: [
            "id",
            "orderId",
            "productId",
            "productName",
            "productSku",
            "quantity",
            "unitPrice",
            "totalPrice",
            "taxAmount",
            "discountAmount",
            "productSnapshot",
          ],
          include: [
            {
              model: product,
              as: "product",
              required: false,
              attributes: ["id", "name", "images"],
            },
          ],
        },
        {
          model: coupon,
          as: "coupon",
          attributes: ["id", "code", "name", "type", "value"],
          required: false,
        },
      ],
    });

    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: attachGstBreakdownToOrder(orderData),
    });
  } catch (error) {
    console.error("Get customer order error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get Customer Order Statistics (authenticated)
const getCustomerOrderStats = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const customerId = req.user.id;

    const totalOrders = await order.count({
      where: { customerId },
    });

    const awaitingPickup = await order.count({
      where: {
        customerId,
        status: { [Op.in]: ["confirmed", "processing", "shipped"] },
      },
    });

    const cancelledOrders = await order.count({
      where: {
        customerId,
        status: "cancelled",
      },
    });

    const deliveredOrders = await order.count({
      where: {
        customerId,
        status: "delivered",
      },
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        awaitingPickup,
        cancelledOrders,
        deliveredOrders,
      },
    });
  } catch (error) {
    console.error("Get customer order stats error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer order statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Customer Logout
const customerLogout = async (req, res) => {
  try {
    // Clear httpOnly cookie
    res.clearCookie("customer_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Customer logout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

// Create email transporter for password reset
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Forgot Password - Send reset email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find customer by email
    const customerData = await customer.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address. Please register.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token expiry to 1 hour
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await customerData.update({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: resetExpires,
    });

    // Create reset URL
    const frontendUrl =
      process.env.FRONTEND_URL || "https://naveenamnaturals.com";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Email content
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Naveenam Naturals</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${customerData.firstName || "Customer"},</h2>
          
          <p style="color: #4b5563;">We received a request to reset your password for your Naveenam Naturals account. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3);">Reset Password</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563;">${resetUrl}</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
              <strong>Note:</strong> This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #9ca3af; font-size: 13px; margin: 10px 0 0 0;">
              If you didn't request a password reset, please ignore this email or contact our support team.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Naveenam Naturals. All rights reserved.</p>
          <p>Nature's Touch, Science's Precision</p>
        </div>
      </body>
      </html>
    `;

    // Send email
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Naveenam Naturals" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - Naveenam Naturals",
      html: emailContent,
    });

    res.json({
      success: true,
      message:
        "Password reset email sent successfully! Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });

    // More specific error messages
    let errorMessage =
      "Failed to send password reset email. Please try again later.";
    if (error.code === "EAUTH") {
      errorMessage =
        "Email authentication failed. Please check email credentials.";
    } else if (error.code === "ECONNECTION" || error.code === "ENOTFOUND") {
      errorMessage =
        "Could not connect to email server. Please try again later.";
    } else if (error.code === "ESOCKET") {
      errorMessage = "Email server connection timed out.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      // Include error code in development for debugging
      ...(process.env.NODE_ENV === "development" && {
        errorCode: error.code,
        errorDetail: error.message,
      }),
    });
  }
};

// Reset Password - Update password with token
const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, email, and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find customer with valid token
    const customerData = await customer.findOne({
      where: {
        email: email.toLowerCase(),
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!customerData) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token. Please request a new password reset.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await customerData.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    // Send confirmation email
    const transporter = createTransporter();
    const confirmationEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed Successfully</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Naveenam Naturals</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Changed Successfully</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${customerData.firstName || "Customer"},</h2>
          
          <p style="color: #4b5563;">Your password has been successfully changed. You can now log in with your new password.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "https://naveenamnaturals.com"}/login" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3);">Login to Your Account</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #dc2626; font-size: 13px; margin: 0;">
              <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Naveenam Naturals. All rights reserved.</p>
          <p>Nature's Touch, Science's Precision</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Naveenam Naturals" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Changed Successfully - Naveenam Naturals",
      html: confirmationEmail,
    });

    res.json({
      success: true,
      message:
        "Password has been reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password. Please try again later.",
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  syncCustomerStats,
  customerLogin,
  customerRegister,
  customerLogout,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerOrders,
  getCustomerOrderById,
  getCustomerOrderStats,
  lookupCustomerForCheckout,
  forgotPassword,
  resetPassword,
};
