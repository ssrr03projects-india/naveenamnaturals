
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Review = sequelize.define(
    "Review",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // 🧍 Customer Info
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "customers",
          key: "id",
        },
      },
      customerName: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      customerEmail: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      // 🛍️ Product Reference
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      productName: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },

      // 🛒 Order Reference (New)
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "orders",
          key: "id"
        },
        onDelete: "SET NULL"
      },

      // ⭐ Review Details
      rating: {
        type: DataTypes.DECIMAL(2, 1), // e.g., 4.5
        allowNull: false,
        validate: {
          min: 0,
          max: 5,
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      images: {
        type: DataTypes.JSON, // ["review1.jpg", "review2.jpg"]
        allowNull: true,
        defaultValue: [],
      },

      // 🧠 Admin Reply / Moderation
      adminReply: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      moderatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "admins",
          key: "id"
        },
        onDelete: "SET NULL"
      },

      // ⚙️ Meta
      helpfulCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "reviews",
      timestamps: true,
      indexes: [
        { fields: ["productId"] },
        { fields: ["customerId"] },
        { fields: ["rating"] },
        { fields: ["status"] },
        // Composite index for approved reviews per product
        { fields: ["productId", "status"] }
      ],
    }
  );

  return Review;
};
