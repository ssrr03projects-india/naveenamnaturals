const express = require("express");
const router = express.Router();
const trackingController = require("../controllers/tracking.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Tracking routes - can be public (GET) or protected depending on implementation.
// Usually tracking is public if you have the AWB.
// For security, customers might only track their own orders, but usually shipping carriers allow public tracking.
// We'll keep it open for now, or use basic protection if required.

/**
 * @swagger
 * /api/tracking/{awb}:
 *   get:
 *     summary: Track shipment by AWB
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: awb
 *         required: true
 *         schema:
 *           type: string
 *         description: AWB Number
 *     responses:
 *       200:
 *         description: Tracking details
 */
router.get("/:awb", trackingController.getTracking);

/**
 * @swagger
 * /api/tracking:
 *   get:
 *     summary: Track shipment by query param (awb)
 *     tags: [Shipping]
 *     parameters:
 *       - in: query
 *         name: awb
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking details
 */
router.get("/", trackingController.getTracking);

module.exports = router;
