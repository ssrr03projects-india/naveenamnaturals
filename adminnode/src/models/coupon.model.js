const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Coupon = sequelize.define(
    "Coupon",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM("percentage", "fixed"),
        allowNull: false,
      },
      value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      minimumAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
        },
      },
      usedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      usageLimitPerCustomer: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        validate: {
          min: 1,
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      startsAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      applicableProducts: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      applicableCategories: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      excludedProducts: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      excludedCategories: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      customerEligibility: {
        type: DataTypes.ENUM(
          "all",
          "new_customers",
          "existing_customers",
          "specific_customers",
        ),
        defaultValue: "all",
      },
      eligibleCustomers: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      freeShipping: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      stackable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "coupons",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["code"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["startsAt"],
        },
        {
          fields: ["expiresAt"],
        },
        {
          fields: ["type"],
        },
      ],
    },
  );

  return Coupon;
};
