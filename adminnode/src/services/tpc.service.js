const axios = require("axios");
const dtdcService = require("./dtdc.service");

const PROVIDER_NAME = "tpc";
const PROVIDER_LABEL = "TPC (The Professional Couriers)";

const BOOKING_STAGE_NOT_CREATED = "not_created";
const BOOKING_STAGE_ORDER_CREATED = "order_created";
const BOOKING_STAGE_BOOKED = "booked";

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const compactString = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
};

const deepFindValue = (payload, keys = []) => {
  const queue = [payload];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;

    if (Array.isArray(node)) {
      node.forEach((entry) => queue.push(entry));
      continue;
    }

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(node, key) && node[key] != null) {
        return node[key];
      }
    }

    Object.values(node).forEach((entry) => {
      if (entry && typeof entry === "object") {
        queue.push(entry);
      }
    });
  }

  return null;
};

const isServiceableFromPayload = (payload) => {
  const explicitBoolean = deepFindValue(payload, [
    "serviceable",
    "is_serviceable",
    "delivery_available",
  ]);

  if (typeof explicitBoolean === "boolean") return explicitBoolean;
  if (typeof explicitBoolean === "string") {
    const normalized = explicitBoolean.toLowerCase();
    if (["true", "yes", "y", "serviceable"].includes(normalized)) return true;
    if (["false", "no", "n", "unserviceable"].includes(normalized)) return false;
  }

  const statusText = compactString(
    deepFindValue(payload, ["status", "message", "remarks"]),
    "",
  ).toLowerCase();

  if (statusText.includes("not serviceable") || statusText.includes("undeliverable")) {
    return false;
  }

  return true;
};

const normalizeEvents = (payload) => {
  const rawEvents =
    deepFindValue(payload, ["events", "scans", "tracking", "tracking_events"]) || [];

  if (!Array.isArray(rawEvents)) return [];

  return rawEvents.map((event) => ({
    status: compactString(event?.status || event?.code || event?.scan_status, ""),
    label: compactString(
      event?.label || event?.description || event?.status_description || event?.activity,
      "Update",
    ),
    location: compactString(event?.location || event?.city || event?.branch, ""),
    timestamp: compactString(
      event?.timestamp || event?.time || event?.date || event?.scan_time,
      "",
    ),
    remarks: compactString(event?.remarks || event?.reason || "", ""),
  }));
};

const mapTrackingToOrderStatus = (trackingData = {}) => {
  const label = compactString(
    trackingData.latestStatusLabel || trackingData.latestStatus,
    "",
  ).toLowerCase();

  if (label.includes("delivered")) return "delivered";
  if (label.includes("cancel")) return "cancelled";
  if (
    label.includes("shipped") ||
    label.includes("in transit") ||
    label.includes("out for delivery")
  ) {
    return "shipped";
  }
  if (
    label.includes("booked") ||
    label.includes("pickup") ||
    label.includes("manifest") ||
    label.includes("confirmed")
  ) {
    return "confirmed";
  }

  return null;
};

const checkServiceability = async (originPincode, destPincode, options = {}) => {
  try {
    const response = await dtdcService.checkServiceability(originPincode, destPincode);
    const serviceable = isServiceableFromPayload(response);

    const shippingRate =
      toFiniteNumber(
        deepFindValue(response, [
          "shippingRate",
          "freight_charge",
          "rate",
          "total_charge",
          "total_amount",
          "freight",
        ]),
      ) || 0;

    const estimatedDays =
      toFiniteNumber(
        deepFindValue(response, [
          "estimatedDays",
          "estimated_delivery_days",
          "tat",
          "etd_days",
        ]),
      ) || null;

    return {
      serviceable,
      shippingRate,
      provider: PROVIDER_NAME,
      estimatedDays,
      courierName: compactString(
        deepFindValue(response, ["courier_name", "service_type_id", "service_name"]),
        PROVIDER_LABEL,
      ),
      courierCompanyId: compactString(
        deepFindValue(response, ["courier_company_id", "courier_id", "service_id"]),
        null,
      ),
      details: response,
      request: {
        originPincode,
        destPincode,
        weight: options.weight,
        cod: options.cod,
      },
    };
  } catch (error) {
    const wrapped = new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Failed to check TPC serviceability.",
    );
    wrapped.details = error?.response?.data || error;
    throw wrapped;
  }
};

const createProviderOrder = async (consignmentData = {}) => {
  try {
    const response = await dtdcService.createConsignment(consignmentData);

    const providerOrderId = compactString(
      deepFindValue(response, [
        "customer_reference_number",
        "order_id",
        "reference_number",
      ]),
      compactString(consignmentData.order_id, `TPC-${Date.now()}`),
    );

    const shipmentId = compactString(
      deepFindValue(response, [
        "consignment_id",
        "shipment_id",
        "reference_number",
        "awb_number",
      ]),
      providerOrderId,
    );

    const awbNumber = compactString(
      deepFindValue(response, ["awb_number", "awb", "waybill", "reference_number"]),
      "",
    );

    return {
      provider: PROVIDER_NAME,
      providerOrderId,
      shipmentId,
      awbNumber: awbNumber || undefined,
      latestStatus: BOOKING_STAGE_ORDER_CREATED,
      latestStatusLabel: "TPC Order Created",
      raw: {
        order: response,
      },
    };
  } catch (error) {
    const wrapped = new Error(
      error?.response?.data?.message || error?.message || "Failed to create TPC order.",
    );
    wrapped.details = error?.response?.data || error;
    throw wrapped;
  }
};

const bookProviderShipment = async (consignmentData = {}) => {
  const providerOrder = await createProviderOrder(consignmentData);

  return {
    provider: PROVIDER_NAME,
    providerOrderId: providerOrder.providerOrderId,
    shipmentId: providerOrder.shipmentId,
    awbNumber: providerOrder.awbNumber || providerOrder.shipmentId,
    courierCompanyId: null,
    courierName: PROVIDER_LABEL,
    estimatedDays: null,
    shippingRate: toFiniteNumber(consignmentData.shipping_charges) || 0,
    latestStatus: BOOKING_STAGE_BOOKED,
    latestStatusLabel: "Shipment Booked",
    raw: providerOrder.raw,
  };
};

const createShipment = async (consignmentData = {}) =>
  bookProviderShipment(consignmentData);

const trackShipment = async (awbNumber) => {
  try {
    const response = await dtdcService.trackConsignment(awbNumber);

    const latestStatusLabel = compactString(
      deepFindValue(response, [
        "latest_status_description",
        "latest_status",
        "status_description",
        "status",
      ]),
      "Unknown",
    );

    const latestStatus = compactString(
      deepFindValue(response, ["latest_status", "status", "status_code", "scan_status"]),
      latestStatusLabel,
    );

    return {
      provider: PROVIDER_NAME,
      awbNumber: compactString(
        deepFindValue(response, ["awb_number", "awb", "reference_number"]),
        awbNumber,
      ),
      carrier: PROVIDER_LABEL,
      shipmentId: compactString(
        deepFindValue(response, ["consignment_id", "shipment_id", "reference_number"]),
        "",
      ),
      providerOrderId: compactString(
        deepFindValue(response, ["customer_reference_number", "order_id", "reference_number"]),
        "",
      ),
      courierCompanyId: null,
      latestStatus,
      latestStatusLabel,
      events: normalizeEvents(response),
      raw: response,
    };
  } catch (error) {
    const wrapped = new Error(
      error?.response?.data?.message || error?.message || "Failed to track TPC shipment.",
    );
    wrapped.details = error?.response?.data || error;
    throw wrapped;
  }
};

const getShippingLabel = async (shipmentId) => {
  const template = compactString(process.env.TPC_LABEL_URL_TEMPLATE, "");
  if (!template) {
    throw new Error(
      "TPC label URL template is not configured. Set TPC_LABEL_URL_TEMPLATE to enable label download.",
    );
  }

  const url = template.replace("{shipmentId}", encodeURIComponent(String(shipmentId)));
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return response.data;
};

const cancelOrders = async (orderIds = []) => {
  const requestedOrderIds = (Array.isArray(orderIds) ? orderIds : [])
    .map((orderId) => compactString(orderId))
    .filter(Boolean);

  return {
    payload: {
      success: false,
      message:
        "TPC cancellation API is not configured. No provider order was cancelled.",
    },
    providerCancelledOrderIds: [],
    notCancelledOrderIds: requestedOrderIds,
  };
};

module.exports = {
  PROVIDER_NAME,
  PROVIDER_LABEL,
  BOOKING_STAGE_NOT_CREATED,
  BOOKING_STAGE_ORDER_CREATED,
  BOOKING_STAGE_BOOKED,
  checkServiceability,
  createProviderOrder,
  bookProviderShipment,
  createShipment,
  getShippingLabel,
  cancelOrders,
  trackShipment,
  mapTrackingToOrderStatus,
};
