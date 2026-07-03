const express = require("express");
const router = express.Router();
const settingController = require("../controllers/setting.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// Public route to get specific setting (e.g. for frontend checkout)
// Depending on security requirements, you might want to restrict which keys are public.
// For now, we'll keep it open or maybe whitelist specific keys if needed in controller.
router.get("/keys/:key", settingController.getSettingByKey);

// Protected routes for admin management
router.get("/", authenticateToken, settingController.getAllSettings);
router.post("/", authenticateToken, settingController.upsertSetting);

module.exports = router;
