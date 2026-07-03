const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded"
        ),
        defaultValue: "pending",
      },
      paymentStatus: {
        type: DataTypes.ENUM(
          "pending",
          "paid",
          "failed",
          "refunded",
          "partially_refunded"
        ),
        defaultValue: "pending",
      },
      packingStatus: {
        type: DataTypes.ENUM("unpacked", "packed"),
        defaultValue: "unpacked",
      },
      paymentMethod: {
        type: DataTypes.ENUM("cod", "online", "upi", "card", "wallet"),
        allowNull: true,
      },
      paymentId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      shippingAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      shippingQuotedAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      shippingDiscountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      couponId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "coupons",
          key: "id",
        },
      },
      couponCode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      couponDiscount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      address: {
        type: DataTypes.JSON, // Address snapshot at checkout
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      trackingNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      shippingCarrier: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      shippingProvider: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      shippingProviderOrderId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      shippingShipmentId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      shippingCourierName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      shippingLatestStatus: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      shippingBookingStage: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: "not_created",
      },
      shippedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      refundAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      refundReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      refundedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      customerMailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      adminMailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      customerMailError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      adminMailError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["orderNumber"],
        },
        {
          fields: ["customerId"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["paymentStatus"],
        },
        {
          fields: ["couponId"],
        },
        {
          fields: ["createdAt"],
        },
      ],
    }
  );

  return Order;
};
