const { setting: Setting } = require("../models");

// Get all settings
const getAllSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch settings" });
  }
};

// Get setting by key
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });

    if (!setting) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    console.error(`Error fetching setting ${req.params.key}:`, error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch setting" });
  }
};

// Create or Update a setting
const upsertSetting = async (req, res) => {
  try {
    const { key, value, type, description } = req.body;

    if (!key) {
      return res
        .status(400)
        .json({ success: false, message: "Key is required" });
    }

    let setting = await Setting.findOne({ where: { key } });

    // Parse value based on type
    let processedValue = value;
    if (type === "number") {
      processedValue = Number(value);
    } else if (type === "boolean") {
      processedValue = value === "true" || value === true;
    } else if (type === "json") {
      try {
        processedValue = typeof value === "string" ? JSON.parse(value) : value;
      } catch (e) {
        processedValue = value;
      }
    }

    if (setting) {
      // Update existing
      setting.value = processedValue;
      if (type) setting.type = type;
      if (description) setting.description = description;
      await setting.save();
    } else {
      // Create new
      setting = await Setting.create({
        key,
        value: processedValue,
        type: type || typeof value,
        description,
      });
    }

    res.json({
      success: true,
      message: "Setting saved successfully",
      data: setting,
    });
  } catch (error) {
    console.error("Error saving setting:", error);
    res.status(500).json({ success: false, message: "Failed to save setting" });
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  upsertSetting,
};
