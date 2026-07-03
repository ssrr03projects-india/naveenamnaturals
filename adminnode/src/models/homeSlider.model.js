const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const HomeSlider = sequelize.define(
    "HomeSlider",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      link: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: "home_sliders",
      timestamps: true,
      indexes: [
        {
          fields: ["sortOrder"],
        },
      ],
    }
  );

  return HomeSlider;
};
