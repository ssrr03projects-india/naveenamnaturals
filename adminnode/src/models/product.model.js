
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Product = sequelize.define(
    "Product",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // 🏷️ Basic Info
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // 🪶 Product Info
      // Removed redundant 'category' string field
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      // Inventory moved to variants
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      trackQuantity: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      length: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      width: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      height: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      sizes: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      // 🌿 Product Content
      keyIngredients: {
        type: DataTypes.JSON, // [{ name, benefits, image }]
        allowNull: true,
        defaultValue: [],
      },
      benefits: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      usageSteps: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      commonQuestions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      // 🖼️ Media
      images: {
        type: DataTypes.JSON, // ["image1.png", "image2.png"]
        allowNull: true,
        defaultValue: [],
      },
      // 🏷️ Product Tag (Replaces isNew, isSale, isFeatured)
      tag: {
        type: DataTypes.STRING(50), // e.g., "new", "sale", "bestseller"
        allowNull: true,
      },
      // ⚙️ Status
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "products",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["slug"] },
        { fields: ["categoryId"] },
        { fields: ["isActive"] },
        { fields: ["tag"] },
      ],
    }
  );

  return Product;
};
