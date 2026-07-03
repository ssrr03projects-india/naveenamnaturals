const { notification } = require("../models");

/**
 * Create notification helper
 * @param {Object} data - Notification data
 * @param {string} data.type - notification type
 * @param {string} data.title - notification title
 * @param {string} data.message - notification message
 * @param {string} data.link - optional link
 * @param {string} data.icon - optional icon
 * @param {string} data.priority - optional priority (low, medium, high, urgent)
 * @param {number} data.relatedId - optional related entity ID
 * @param {Object} data.metadata - optional metadata
 */
const createNotification = async (data) => {
  try {
    return await notification.create({
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || null,
      icon: data.icon || null,
      priority: data.priority || "medium",
      relatedId: data.relatedId || null,
      metadata: data.metadata || null,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Specific notification creators
const notifyNewOrder = async (order) => {
  const customerName = order.customer
    ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() || "Guest"
    : "Guest";
  return createNotification({
    type: "order",
    title: "New Order Received",
    message: `Order #${order.orderNumber || order.id} from ${customerName} - ₹${order.totalAmount}`,
    link: `/orders/${order.id}`,
    priority: "high",
    relatedId: order.id,
    metadata: {
      orderNumber: order.orderNumber || order.id,
      customerName: customerName,
      amount: order.totalAmount,
    },
  });
};

const notifyOrderStatusChange = async (order, oldStatus, newStatus) => {
  return createNotification({
    type: "order",
    title: "Order Status Updated",
    message: `Order #${
      order.orderNumber || order.id
    } status changed from ${oldStatus} to ${newStatus}`,
    link: `/orders/${order.id}`,
    priority: "medium",
    relatedId: order.id,
    metadata: {
      orderNumber: order.orderNumber || order.id,
      oldStatus,
      newStatus,
    },
  });
};

const notifyNewCustomer = async (customer) => {
  const customerName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Unknown";
  return createNotification({
    type: "customer",
    title: "New Customer Registered",
    message: `${customerName} (${customer.email}) has registered`,
    link: `/customers/${customer.id}`,
    priority: "low",
    relatedId: customer.id,
    metadata: {
      customerName: customerName,
      email: customer.email,
    },
  });
};

const notifyNewReview = async (review, product) => {
  return createNotification({
    type: "review",
    title: "New Product Review",
    message: `New ${review.rating}-star review for ${
      product?.name || "a product"
    }`,
    link: `/reviews/all`,
    priority: "medium",
    relatedId: review.id,
    metadata: {
      productName: product?.name,
      rating: review.rating,
      reviewerName: review.reviewerName,
    },
  });
};

const notifyLowStock = async (product) => {
  return createNotification({
    type: "low_stock",
    title: "Low Stock Alert",
    message: `${product.name} is running low on stock (${product.stockQuantity} remaining)`,
    link: `/products/${product.id}`,
    priority: "urgent",
    relatedId: product.id,
    metadata: {
      productName: product.name,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
    },
  });
};

const notifyOutOfStock = async (product) => {
  return createNotification({
    type: "low_stock",
    title: "Out of Stock",
    message: `${product.name} is out of stock!`,
    link: `/products/${product.id}`,
    priority: "urgent",
    relatedId: product.id,
    metadata: {
      productName: product.name,
      stockQuantity: 0,
    },
  });
};

module.exports = {
  createNotification,
  notifyNewOrder,
  notifyOrderStatusChange,
  notifyNewCustomer,
  notifyNewReview,
  notifyLowStock,
  notifyOutOfStock,
};
