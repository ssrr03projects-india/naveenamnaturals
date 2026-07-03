const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // 🧍 Basic Info
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true, // null for guest users
      },

      // 🏠 Address Info (Single Address)
      address: {
        type: DataTypes.JSON, // { name, phone, email?, address, city, state, pincode, country }
        allowNull: true,
      },

      // ⚙️ Account Info
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      verificationCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },

      // 🛍️ Order Summary
      totalOrders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      totalSpent: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      lastOrderDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // 🏷️ Customer Tag
      tag: {
        type: DataTypes.STRING(50), // e.g., "loyal", "new", "vip"
        allowNull: true,
      },

      // 🌿 Preferences
      subscribedToNewsletter: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      wishlist: {
        type: DataTypes.JSON, // [productId, productId, ...]
        allowNull: true,
        defaultValue: [],
      },

      // 📅 Activity
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      // 🔐 Password Reset
      resetPasswordToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "customers",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["email"] },
        { fields: ["phone"] },
        { fields: ["isVerified"] },
        { fields: ["tag"] },
        { fields: ["isActive"] },
      ],
    }
  );

  return Customer;
};
