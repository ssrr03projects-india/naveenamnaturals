const { order } = require("../models");
const shiprocketService = require("../services/shiprocket.service");

const getTracking = async (req, res) => {
  try {
    const awbNumber = req.params.awb || req.query.awb;
    const shouldSync = req.query.sync !== "false";

    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB Number is required",
      });
    }

    const trackingData = await shiprocketService.trackShipment(awbNumber);
    const orderRecord = await order.findOne({
      where: { trackingNumber: trackingData.awbNumber || awbNumber },
    });

    if (shouldSync && orderRecord) {
      const mappedStatus = shiprocketService.mapTrackingToOrderStatus(trackingData);
      const updateData = {
        shippingCarrier:
          trackingData.carrier || orderRecord.shippingCarrier || shiprocketService.PROVIDER_LABEL,
      };

      if (mappedStatus === "delivered") {
        updateData.status = "delivered";
        updateData.deliveredAt = orderRecord.deliveredAt || new Date();
      } else if (mappedStatus === "cancelled") {
        if (orderRecord.status !== "delivered") {
          updateData.status = "cancelled";
          updateData.cancelledAt = orderRecord.cancelledAt || new Date();
        }
      } else if (mappedStatus === "shipped") {
        if (["pending", "confirmed", "processing"].includes(orderRecord.status)) {
          updateData.status = "shipped";
          updateData.shippedAt = orderRecord.shippedAt || new Date();
        }
      } else if (mappedStatus === "confirmed") {
        if (["pending", "processing"].includes(orderRecord.status)) {
          updateData.status = "confirmed";
        }
      }

      await orderRecord.update(updateData);
    }

    res.json({
      success: true,
      data: {
        awbNumber: trackingData.awbNumber,
        carrier: trackingData.carrier,
        latestStatus: trackingData.latestStatus,
        latestStatusLabel: trackingData.latestStatusLabel,
        shipmentId: trackingData.shipmentId || null,
        providerOrderId: trackingData.providerOrderId || null,
        courierCompanyId: trackingData.courierCompanyId || null,
        events: trackingData.events || [],
      },
    });
  } catch (error) {
    console.error("Tracking Controller Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tracking details",
      error: error.details || error.message,
    });
  }
};

module.exports = {
  getTracking,
};
