const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const ProductVariant = sequelize.define(
        "ProductVariant",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            productId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "products",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            // Variant name (e.g., "50ml", "100ml", "Small", "Medium")
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            // Unique SKU for this variant
            sku: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
            },
            // Pricing
            price: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: 0,
                },
            },
            mrpPrice: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: 0,
                },
            },
            gstPercentage: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: true,
                validate: {
                    isValidGst(value) {
                        if (value === null || value === undefined || value === "") return;
                        const parsed = Number(value);
                        if (!Number.isFinite(parsed) || ![5, 12, 18, 28].includes(parsed)) {
                            throw new Error("GST must be one of: 5, 12, 18, 28");
                        }
                    },
                },
            },
            // Inventory
            stock: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                validate: {
                    min: 0,
                },
            },
            customStock: {
                type: DataTypes.STRING(60),
                allowNull: true,
                validate: {
                    is: /^[A-Za-z0-9 ]*$/,
                    len: [0, 60],
                },
            },
            sold: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                validate: {
                    min: 0,
                },
            },
            // Weight/Size description
            weight: {
                type: DataTypes.STRING(50),
                allowNull: true,
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
            // Display order
            sortOrder: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            // Status
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
        },
        {
            tableName: "product_variants",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ["sku"],
                },
                {
                    fields: ["productId"],
                },
                {
                    fields: ["isActive"],
                },
                {
                    fields: ["sortOrder"],
                },
            ],
        }
    );

    return ProductVariant;
};
