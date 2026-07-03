const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Contact = sequelize.define(
    "Contact",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      subject: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("new", "read", "replied", "archived"),
        defaultValue: "new",
      },
      adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      repliedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "contacts",
      timestamps: true,
      indexes: [
        {
          fields: ["status"],
        },
        {
          fields: ["email"],
        },
        {
          fields: ["createdAt"],
        },
      ],
    }
  );

  return Contact;
};
