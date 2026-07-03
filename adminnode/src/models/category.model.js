const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        slug: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'categories',
                key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
        },
        image: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    }, {
        tableName: 'categories',
        timestamps: true,
    });

    Category.associate = (models) => {
        // Self-referencing for hierarchy
        Category.belongsTo(models.Category, {
            as: 'parent',
            foreignKey: 'parentId',
        });
        Category.hasMany(models.Category, {
            as: 'children',
            foreignKey: 'parentId',
        });

        // Products association
        Category.hasMany(models.Product, {
            foreignKey: 'categoryId',
            as: 'products',
        });
    };

    return Category;
};
