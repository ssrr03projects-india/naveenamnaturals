const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrderItem = sequelize.define(
    "OrderItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
      },
      variantId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "product_variants",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      productName: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      productSku: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      productSnapshot: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "order_items",
      timestamps: true,
      indexes: [
        {
          fields: ["orderId"],
        },
        {
          fields: ["productId"],
        },
      ],
    }
  );

  return OrderItem;
};
