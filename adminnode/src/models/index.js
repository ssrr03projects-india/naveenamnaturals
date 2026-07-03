const { Sequelize, DataTypes } = require("sequelize");
const dbConfig = require("../config/db.config");

// Setup Sequelize connection
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT,
  port: dbConfig.PORT,
  pool: dbConfig.pool,
  dialectOptions: dbConfig.dialectOptions,
  logging: dbConfig.logging,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
});

// Test Connection
sequelize
  .authenticate()
  .then(() => console.log("✅ MySQL Connected"))
  .catch((err) => console.error("❌ Connection error:", err));

// Main DB object
const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ✅ Register E-commerce Models
db.admin = require("./admin.model")(sequelize, DataTypes);
db.customer = require("./customer.model")(sequelize, DataTypes);
db.product = require("./product.model")(sequelize, DataTypes);
db.productVariant = require("./productVariant.model")(sequelize, DataTypes);
db.category = require("./category.model")(sequelize, DataTypes);
db.order = require("./order.model")(sequelize, DataTypes);
db.orderItem = require("./orderItem.model")(sequelize, DataTypes);
db.coupon = require("./coupon.model")(sequelize, DataTypes);
db.review = require("./review.model")(sequelize, DataTypes);
db.couponRedemption = require("./couponRedemption.model")(sequelize, DataTypes);

// ✅ Register Additional Models
db.contact = require("./contact.model")(sequelize, DataTypes);
db.homeSlider = require("./homeSlider.model")(sequelize, DataTypes);
db.setting = require("./setting.model")(sequelize, DataTypes);

// Define Associations

// Category associations (self-referencing hierarchy)
db.category.belongsTo(db.category, { as: "parent", foreignKey: "parentId" });
db.category.hasMany(db.category, { as: "children", foreignKey: "parentId" });

// Product-Category associations
db.product.belongsTo(db.category, {
  foreignKey: "categoryId",
  as: "categoryData",
});
db.category.hasMany(db.product, { foreignKey: "categoryId", as: "products" });

// Product-Variant associations
db.product.hasMany(db.productVariant, {
  foreignKey: "productId",
  as: "variants",
});
db.productVariant.belongsTo(db.product, {
  foreignKey: "productId",
  as: "product",
});

// Order associations
db.order.belongsTo(db.customer, { foreignKey: "customerId", as: "customer" });
db.customer.hasMany(db.order, { foreignKey: "customerId", as: "orders" });

db.order.belongsTo(db.coupon, { foreignKey: "couponId", as: "coupon" });
db.coupon.hasMany(db.order, { foreignKey: "couponId", as: "orders" });

// OrderItem associations
db.orderItem.belongsTo(db.order, { foreignKey: "orderId", as: "order" });
db.order.hasMany(db.orderItem, { foreignKey: "orderId", as: "items" });

db.orderItem.belongsTo(db.product, { foreignKey: "productId", as: "product" });
db.product.hasMany(db.orderItem, { foreignKey: "productId", as: "orderItems" });

db.orderItem.belongsTo(db.productVariant, {
  foreignKey: "variantId",
  as: "variant",
});
db.productVariant.hasMany(db.orderItem, {
  foreignKey: "variantId",
  as: "orderItems",
});

// Review associations
db.review.belongsTo(db.customer, { foreignKey: "customerId", as: "customer" });
db.customer.hasMany(db.review, { foreignKey: "customerId", as: "reviews" });

db.review.belongsTo(db.product, { foreignKey: "productId", as: "product" });
db.product.hasMany(db.review, { foreignKey: "productId", as: "reviews" });

db.review.belongsTo(db.order, { foreignKey: "orderId", as: "order" }); // [NEW]
db.order.hasMany(db.review, { foreignKey: "orderId", as: "reviews" }); // [NEW]

db.review.belongsTo(db.admin, { foreignKey: "moderatedBy", as: "moderator" }); // [NEW]
db.admin.hasMany(db.review, {
  // [NEW]
  foreignKey: "moderatedBy",
  as: "moderatedReviews",
});

// CouponRedemption Associations
db.couponRedemption.belongsTo(db.coupon, {
  foreignKey: "couponId",
  as: "coupon",
});
db.coupon.hasMany(db.couponRedemption, {
  foreignKey: "couponId",
  as: "redemptions",
});

db.couponRedemption.belongsTo(db.order, { foreignKey: "orderId", as: "order" });
db.order.hasOne(db.couponRedemption, {
  foreignKey: "orderId",
  as: "couponRedemption",
});

db.couponRedemption.belongsTo(db.customer, {
  foreignKey: "customerId",
  as: "customer",
});
db.customer.hasMany(db.couponRedemption, {
  foreignKey: "customerId",
  as: "couponRedemptions",
});

module.exports = db;
