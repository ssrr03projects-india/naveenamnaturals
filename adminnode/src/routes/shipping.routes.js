const express = require("express");
const router = express.Router();
const shippingController = require("../controllers/shipping.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Public routes (if any needed, e.g. serviceability check for customers?)
// For now, let's keep checkServiceability public-ish or authenticated.
// Usually checkout needs it, so it might need to be accessible.
// But mostly these are admin operations, except checking if delivery is possible.

// Check Serviceability (Pincode) - could be public for checkout
/**
 * @swagger
 * tags:
 *   name: Shipping
 *   description: Shipping management API (Shiprocket)
 */

/**
 * @swagger
 * /api/shipping/check-pincode:
 *   post:
 *     summary: Check serviceability for a pincode
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destPincode
 *             properties:
 *               originPincode:
 *                 type: string
 *                 description: Origin pincode (optional, defaults to warehouse)
 *                 example: "110046"
 *               destPincode:
 *                 type: string
 *                 description: Destination pincode
 *                 example: "641666"
 *     responses:
 *       200:
 *         description: Serviceability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     serviceable:
 *                       type: boolean
 *                     shippingRate:
 *                       type: number
 */
router.post("/check-pincode", shippingController.checkServiceability);

// Protected Routes
router.use(authMiddleware.authenticateToken);

/**
 * @swagger
 * /api/shipping/create-shipment:
 *   post:
 *     summary: Create a shipment with Shiprocket
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_id:
 *                 type: string
 *               description:
 *                 type: string
 *               declared_value:
 *                 type: string
 *               weight:
 *                 type: string
 *               origin_details:
 *                 type: object
 *               destination_details:
 *                 type: object
 *               order_items:
 *                 type: array
 *     responses:
 *       200:
 *         description: Shipment created successfully
 */
router.post("/create-shipment", shippingController.createShipment);
router.post("/create-provider-order", shippingController.createProviderOrder);

/**
 * @swagger
 * /api/shipping/label:
 *   get:
 *     summary: Get shipping label PDF
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: referenceNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: AWB or Reference Number
 *     responses:
 *       200:
 *         description: PDF Label
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/label", shippingController.getShippingLabel);

/**
 * @swagger
 * /api/shipping/cancel:
 *   post:
 *     summary: Cancel a shipment
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1268409135]
 *     responses:
 *       200:
 *         description: Shiprocket order cancelled successfully
 */
router.post("/cancel", shippingController.cancelShipment);

/**
 * @swagger
 * /api/shipping/track:
 *   get:
 *     summary: Track a shipment
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: awbNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: AWB Number
 *     responses:
 *       200:
 *         description: Tracking information
 */
router.get("/track", shippingController.trackShipment);

module.exports = router;
