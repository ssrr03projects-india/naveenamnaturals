const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Setting = sequelize.define(
    "Setting",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      value: {
        type: DataTypes.JSON, // Stores any type of value as JSON
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING, // 'number', 'string', 'boolean', 'json'
        allowNull: false,
        defaultValue: "string",
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "settings",
      timestamps: true,
    },
  );

  return Setting;
};
