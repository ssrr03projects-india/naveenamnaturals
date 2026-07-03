const { Op } = require("sequelize");
const { order, customer, product, orderItem, sequelize, productVariant } = require("../models");

const parseDateInput = (value) => {
  if (!value || typeof value !== "string") return null;
  // Validate YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  // Use local timezone to match MySQL server timezone
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
};

const buildDateRangeFilter = (period, startDate, endDate) => {
  if (startDate || endDate || period === "custom") {
    const range = {};

    let parsedStart = parseDateInput(startDate);
    let parsedEnd = parseDateInput(endDate);

    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      const temp = parsedStart;
      parsedStart = parsedEnd;
      parsedEnd = temp;
    }

    if (parsedStart) {
      parsedStart.setHours(0, 0, 0, 0);
      range[Op.gte] = parsedStart;
    }

    if (parsedEnd) {
      parsedEnd.setHours(23, 59, 59, 999);
      range[Op.lte] = parsedEnd;
    }

    const hasKeys = Object.getOwnPropertySymbols(range).length > 0;
    if (hasKeys) {
      console.log("Custom date filter:", {
        start: parsedStart?.toISOString(),
        end: parsedEnd?.toISOString(),
      });
      return range;
    }
    return null;
  }

  if (period === "7d" || period === "30d" || period === "90d") {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    console.log(`Period filter ${period}: from ${start.toISOString()}`);
    return { [Op.gte]: start };
  }

  return null;
};

// Test endpoint
const testDashboard = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Dashboard controller is working",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test dashboard",
    });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const { period = "all", startDate = "", endDate = "" } = req.query;
    console.log("Dashboard stats request:", { period, startDate, endDate });
    const createdAtRange = buildDateRangeFilter(period, startDate, endDate);
    const orderDateWhere = createdAtRange ? { createdAt: createdAtRange } : {};

    // Total Sales (sum of all paid orders)
    let totalSales = 0;
    try {
      totalSales =
        (await order.sum("totalAmount", {
          where: {
            ...orderDateWhere,
            paymentStatus: "paid",
            status: {
              [Op.ne]: 'cancelled',
            },
          },
        })) || 0;
    } catch (error) {
      console.log("No sales data found, returning 0");
      totalSales = 0;
    }

    // Total Orders
    let totalOrders = 0;
    try {
      totalOrders = await order.count({
        where: orderDateWhere,
      });
    } catch (error) {
      console.log("No orders found, returning 0");
      totalOrders = 0;
    }

    // Total Customers (always all-time, not date filtered)
    let totalCustomers = 0;
    try {
      totalCustomers = await customer.count();
    } catch (error) {
      console.log("No customers found, returning 0");
      totalCustomers = 0;
    }

    // Total Products (always all-time, not date filtered)
    let totalProducts = 0;
    try {
      totalProducts = await product.count();
    } catch (error) {
      console.log("No products found, returning 0");
      totalProducts = 0;
    }

    // Best Selling Products by Variant (top 8) - Directly from ProductVariant table
    let bestSellingProducts = [];
    try {
      // Fetch top 6 variants sorted by 'sold' count
      const topVariants = await productVariant.findAll({
        order: [["sold", "DESC"]],
        limit: 6,
        include: [
          {
            model: product,
            as: "product",
            attributes: ["id", "name", "images"], // Fetch minimal product info
          }
        ],
        // Attributes from Variant
        attributes: ["id", "productId", "name", "sold", "price"],
      });

      // Map to the format expected by frontend
      bestSellingProducts = topVariants.map(variant => {
        const v = variant.get ? variant.get({ plain: true }) : variant;
        return {
          productId: v.productId,
          variantId: v.id,
          // v.name is the variant name (e.g. "500ml")
          variantName: v.name,
          productName: v.product ? v.product.name : "Unknown Product",
          totalSold: v.sold || 0,
          // Calculate approximate revenue based on current price * sold count
          totalRevenue: (parseFloat(v.price) || 0) * (v.sold || 0),
          product: v.product || {}
        };
      });

    } catch (error) {
      console.log("Error fetching best selling products from variants:", error);
      bestSellingProducts = [];
    }

    // Recent Orders (always latest 5, not date-filtered)
    let recentOrders = [];
    try {
      recentOrders = await order.findAll({
        include: [
          {
            model: customer,
            as: "customer",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      });
    } catch (error) {
      console.log("No recent orders found, returning empty array");
      recentOrders = [];
    }

    // Orders by Status
    let ordersByStatus = [];
    try {
      ordersByStatus = await order.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: orderDateWhere,
        group: ["status"],
        raw: true,
      });
    } catch (error) {
      console.log("No orders by status data found, returning empty array");
      ordersByStatus = [];
    }

    // Monthly Sales
    let monthlySales = [];
    try {
      monthlySales = await order.findAll({
        attributes: [
          [
            sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
            "month",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "orders"],
          [sequelize.fn("SUM", sequelize.col("totalAmount")), "revenue"],
        ],
        where: {
          ...(createdAtRange
            ? { createdAt: createdAtRange }
            : {
              createdAt: {
                [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 6)),
              },
            }),
          paymentStatus: "paid",
          status: {
            [Op.ne]: 'cancelled',
          },
        },
        group: [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
        ],
        order: [
          [
            sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
            "ASC",
          ],
        ],
        raw: true,
      });
    } catch (error) {
      console.log("No monthly sales data found, returning empty array");
      monthlySales = [];
    }

    // Daily Sales
    let dailySales = [];
    try {
      dailySales = await order.findAll({
        attributes: [
          [
            sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m-%d"),
            "date",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "orders"],
          [sequelize.fn("SUM", sequelize.col("totalAmount")), "revenue"],
        ],
        where: {
          ...(createdAtRange
            ? { createdAt: createdAtRange }
            : {
              createdAt: {
                [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 90)),
              },
            }),
          paymentStatus: "paid",
          status: {
            [Op.ne]: 'cancelled',
          },
        },
        group: [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m-%d"),
        ],
        order: [
          [
            sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m-%d"),
            "ASC",
          ],
        ],
        raw: true,
      });
    } catch (error) {
      console.log("No daily sales data found, returning empty array");
      dailySales = [];
    }

    // Low Stock Products
    let lowStockProducts = [];
    try {
      lowStockProducts = await product.findAll({
        where: {
          stockQuantity: {
            [Op.lte]: sequelize.col("lowStockThreshold"),
          },
          trackQuantity: true,
          isActive: true,
        },
        attributes: ["id", "name", "stockQuantity", "lowStockThreshold"], // Adjusted attributes
        limit: 10,
      });
    } catch (error) {
      console.log("No low stock products found, returning empty array");
      lowStockProducts = [];
    }

    res.json({
      success: true,
      data: {
        totalSales: totalSales || 0,
        totalOrders,
        totalCustomers,
        totalProducts,
        bestSellingProducts,
        recentOrders,
        ordersByStatus,
        monthlySales,
        dailySales,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

module.exports = {
  testDashboard,
  getDashboardStats,
};
