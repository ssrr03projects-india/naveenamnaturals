const { Op } = require("sequelize");
const { order, customer, product, orderItem, sequelize } = require("../models");

// Sales Report - Customer-based
const getSalesReport = async (req, res) => {
  try {
    const { period, startDate: startDateParam, endDate: endDateParam } = req.query;

    let startDate, endDate;

    // If custom date range is provided, use it
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Otherwise use period-based calculation
      const daysAgo = parseInt(period || "30");
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Get customer sales data with most ordered product
    const customerSales = await sequelize.query(
      `
      SELECT 
        c.id,
        CONCAT(c.firstName, ' ', COALESCE(c.lastName, '')) as name,
        c.email,
        c.phone,
        JSON_UNQUOTE(JSON_EXTRACT(COALESCE(c.address, '{}'), '$.address')) as address,
        JSON_UNQUOTE(JSON_EXTRACT(COALESCE(c.address, '{}'), '$.city')) as city,
        JSON_UNQUOTE(JSON_EXTRACT(COALESCE(c.address, '{}'), '$.state')) as state,
        JSON_UNQUOTE(JSON_EXTRACT(COALESCE(c.address, '{}'), '$.pincode')) as pincode,
        COUNT(DISTINCT o.id) as totalOrders,
        SUM(o.totalAmount) as totalSpent,
        (
          SELECT p.name 
          FROM order_items oi2
          JOIN orders o2 ON oi2.orderId = o2.id
          JOIN products p ON oi2.productId = p.id
          WHERE o2.customerId = c.id 
            AND o2.createdAt >= :startDate 
            AND o2.createdAt <= :endDate
            AND o2.status != 'cancelled'
          GROUP BY p.id, p.name
          ORDER BY SUM(oi2.quantity) DESC
          LIMIT 1
        ) as mostOrderedProduct
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customerId 
        AND o.createdAt >= :startDate 
        AND o.createdAt <= :endDate
        AND o.status != 'cancelled'
      GROUP BY c.id, c.firstName, c.lastName, c.email, c.phone, c.address
      HAVING totalOrders > 0
      ORDER BY totalOrders DESC, totalSpent DESC
      `,
      {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Calculate summary stats
    const totalCustomers = customerSales.length;
    const totalOrders = customerSales.reduce(
      (sum, item) => sum + parseInt(item.totalOrders || 0),
      0
    );
    const totalRevenue = customerSales.reduce(
      (sum, item) => sum + parseFloat(item.totalSpent || 0),
      0
    );
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate previous period for growth
    const dateRange = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate);
    prevEndDate.setTime(prevEndDate.getTime() - 1); // One millisecond before start
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setTime(prevStartDate.getTime() - dateRange);

    const prevOrders = await order.count({
      where: {
        createdAt: {
          [Op.between]: [prevStartDate, prevEndDate],
        },
        status: {
          [Op.ne]: 'cancelled',
        },
      },
    });

    const prevRevenue =
      (await order.sum("totalAmount", {
        where: {
          createdAt: {
            [Op.between]: [prevStartDate, prevEndDate],
          },
          status: {
            [Op.ne]: 'cancelled',
          },
        },
      })) || 0;

    const revenueGrowth =
      prevRevenue > 0
        ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
        : 0;
    const ordersGrowth =
      prevOrders > 0
        ? (((totalOrders - prevOrders) / prevOrders) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      data: {
        customerSales,
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders,
        totalCustomers,
        avgOrderValue: avgOrderValue.toFixed(2),
        revenueGrowth,
        ordersGrowth,
      },
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate sales report",
    });
  }
};

// Product Performance Report
const getProductPerformanceReport = async (req, res) => {
  try {
    const { period, startDate: startDateParam, endDate: endDateParam, limit = 10 } = req.query;

    let startDate, endDate;

    // If custom date range is provided, use it
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Otherwise use period-based calculation
      const daysAgo = parseInt(period || "30");
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Top products by revenue and quantity
    const topProducts = await sequelize.query(
      `
      SELECT 
        p.id,
        p.name,
        SUM(oi.quantity) as quantity,
        SUM(oi.totalPrice) as revenue
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.createdAt >= :startDate 
        AND o.createdAt <= :endDate
        AND o.status != 'cancelled'
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT :limit
      `,
      {
        replacements: { startDate, endDate, limit: parseInt(limit) },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: {
        topProducts,
      },
    });
  } catch (error) {
    console.error("Product performance report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate product performance report",
    });
  }
};

// Customer Insights Report
const getCustomerInsightsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // Customer acquisition over time
    const customerAcquisition = await customer.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
          "month",
        ],
        [sequelize.fn("COUNT", sequelize.col("id")), "newCustomers"],
      ],
      where: whereClause,
      group: [sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m")],
      order: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
          "ASC",
        ],
      ],
      raw: true,
    });

    // Top customers by spending
    const topCustomers = await customer.findAll({
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "totalOrders",
        "totalSpent",
        "lastOrderDate",
      ],
      include: [
        {
          model: order,
          as: "orders",
          where: {
            paymentStatus: "paid",
            status: {
              [Op.ne]: 'cancelled',
            },
          },
          attributes: [
            [sequelize.fn("COUNT", sequelize.col("id")), "paidOrders"],
            [sequelize.fn("SUM", sequelize.col("totalAmount")), "totalPaid"],
          ],
          required: false,
        },
      ],
      group: ["customer.id"],
      order: [
        [sequelize.fn("SUM", sequelize.col("orders.totalAmount")), "DESC"],
      ],
      limit: 20,
    });

    // Customer demographics
    const customerDemographics = await customer.findAll({
      attributes: [
        "state",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: whereClause,
      group: ["state"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      raw: true,
    });

    // Customer lifetime value analysis
    const customerLifetimeValue = await sequelize.query(
      `
      SELECT 
        CASE 
          WHEN totalSpent >= 10000 THEN 'High Value'
          WHEN totalSpent >= 5000 THEN 'Medium Value'
          WHEN totalSpent >= 1000 THEN 'Low Value'
          ELSE 'New Customer'
        END as customerSegment,
        COUNT(*) as customerCount,
        AVG(totalSpent) as averageSpent,
        AVG(totalOrders) as averageOrders
      FROM customers
      GROUP BY customerSegment
      ORDER BY averageSpent DESC
    `,
      { type: sequelize.QueryTypes.SELECT }
    );

    // Repeat customer rate
    const repeatCustomerRate = await sequelize.query(
      `
      SELECT 
        COUNT(*) as totalCustomers,
        SUM(CASE WHEN totalOrders > 1 THEN 1 ELSE 0 END) as repeatCustomers,
        ROUND(SUM(CASE WHEN totalOrders > 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as repeatRate
      FROM customers
    `,
      { type: sequelize.QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        customerAcquisition,
        topCustomers,
        customerDemographics,
        customerLifetimeValue,
        repeatCustomerRate: repeatCustomerRate[0],
      },
    });
  } catch (error) {
    console.error("Customer insights report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate customer insights report",
    });
  }
};

module.exports = {
  getSalesReport,
  getProductPerformanceReport,
  getCustomerInsightsReport,
};
