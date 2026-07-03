
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const CouponRedemption = sequelize.define(
        "CouponRedemption",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            couponId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "coupons",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            orderId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "orders",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            customerId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "customers",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            discountAmount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            usedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "coupon_redemptions",
            timestamps: true,
            indexes: [
                { unique: true, fields: ["couponId", "orderId"] }
            ],
        }
    );

    return CouponRedemption;
};
