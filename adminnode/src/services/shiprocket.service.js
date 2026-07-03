const axios = require("axios");

const BASE_URL =
  process.env.SHIPROCKET_API_BASE_URL ||
  "https://apiv2.shiprocket.in/v1/external";
const AUTH_URL = `${BASE_URL}/auth/login`;
const SERVICEABILITY_URL = `${BASE_URL}/courier/serviceability/`;
const CREATE_ORDER_URL = `${BASE_URL}/orders/create/adhoc`;
const ASSIGN_AWB_URL = `${BASE_URL}/courier/assign/awb`;
const GENERATE_PICKUP_URL = `${BASE_URL}/courier/generate/pickup`;
const GENERATE_LABEL_URL = `${BASE_URL}/courier/generate/label`;
const CANCEL_ORDER_URL = `${BASE_URL}/orders/cancel`;
const TRACK_BY_AWB_URL = `${BASE_URL}/courier/track/awb`;
const PICKUP_LOCATIONS_URL = `${BASE_URL}/settings/company/pickup`;

const PROVIDER_NAME = "shiprocket";
const PROVIDER_LABEL = "Shiprocket";
const BOOKING_STAGE_NOT_CREATED = "not_created";
const BOOKING_STAGE_ORDER_CREATED = "order_created";
const BOOKING_STAGE_BOOKED = "booked";
const DEFAULT_WEIGHT_KG = 0.5;
const PICKUP_CACHE_TTL_MS = 5 * 60 * 1000;

const SHIPROCKET_STATUS_LABELS = {
  1: "AWB Assigned",
  2: "Label Generated",
  3: "Pickup Scheduled",
  4: "Pickup Queued",
  5: "Manifest Generated",
  6: "Shipped",
  7: "Delivered",
  8: "Cancelled",
  9: "RTO Initiated",
  10: "RTO Delivered",
  11: "Pending",
  12: "Lost",
  13: "Damaged",
  14: "Pickup Error",
  15: "RTO Acknowledged",
  16: "Cancellation Requested",
  17: "Out For Delivery",
  18: "In Transit",
  19: "Out For Pickup",
  20: "Pickup Exception",
  21: "Undelivered",
  22: "Delayed",
  23: "Partial Delivered",
  24: "Destroyed",
  25: "Damaged In Transit",
  26: "Reached Warehouse",
  27: "Pickup Booked",
  38: "Reached Destination Hub",
  39: "Misrouted",
  40: "RTO In Transit",
  41: "RTO Out For Delivery",
  42: "Picked Up",
  43: "Booked",
  44: "Self Fulfilled",
  45: "Cancellation Processed",
  46: "Customer Unavailable",
  47: "Shipment Delayed",
  48: "Shipment Held",
  49: "Shipment Packed",
  50: "Shipment Manifested",
  51: "Pickup Completed",
  52: "Shipment Booked",
  53: "NDR Raised",
  54: "NDR Resolved",
  55: "Reached Pickup Hub",
  56: "Reached Delivery Hub",
  57: "Shipment Exception",
  58: "Ready To Ship",
  59: "AWB Generated",
  60: "Pickup Requested",
  61: "Pickup Reattempt Requested",
  62: "Pickup Rescheduled",
  63: "Pickup Cancelled",
  64: "Pickup Delayed",
  65: "Pickup Failed",
  66: "Pickup Resolved",
  67: "Shipment Confirmed",
};

const CONFIRMED_STATUS_CODES = new Set([
  1, 2, 3, 4, 5, 11, 19, 27, 43, 49, 50, 52, 58, 59, 60, 61, 62, 67,
]);
const SHIPPED_STATUS_CODES = new Set([
  6, 9, 10, 12, 13, 14, 15, 17, 18, 20, 21, 22, 23, 24, 25, 26, 38, 39, 40, 41,
  42, 46, 47, 48, 51, 53, 54, 55, 56, 57,
]);
const CANCELLED_STATUS_CODES = new Set([8, 16, 45]);

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeAddressLine = (value, fallback = "") => {
  const cleaned = cleanString(value).replace(/\r?\n+/g, ", ");
  return (
    cleaned
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s{2,}/g, " ")
      .trim() || fallback
  );
};

const compactString = (value, fallback = "") => {
  const cleaned = cleanString(value);
  return cleaned || fallback;
};

const sanitizePhone = (value, fallback = "0000000000") => {
  const digits = cleanString(value).replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return fallback;
};

const toNumericField = (value, fallback = null) => {
  const digits = cleanString(value).replace(/\D/g, "");
  if (!digits) return fallback;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeWeight = (value, fallback = DEFAULT_WEIGHT_KG) => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  return Math.max(DEFAULT_WEIGHT_KG, Number(parsed.toFixed(3)));
};

const formatOrderDate = (input = new Date()) => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const extractResponsePayload = (payload) => payload?.data || payload || {};

const normalizeOrderId = (value) => compactString(value, "");

const buildShiprocketError = (fallbackMessage, error) => {
  const responseData = error?.response?.data;
  const message =
    responseData?.message ||
    responseData?.error ||
    responseData?.errors?.[0] ||
    error?.message ||
    fallbackMessage;
  const wrappedError = new Error(message);
  wrappedError.details = responseData || error;
  return wrappedError;
};

let cachedToken = null;
let pickupLocationCache = null;
let pickupLocationCacheAt = 0;

const authenticate = async () => {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Shiprocket credentials are missing. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.",
    );
  }

  try {
    const response = await axios.post(
      AUTH_URL,
      { email, password },
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    const token = response.data?.token;
    if (!token) {
      throw new Error("Shiprocket authentication did not return a token.");
    }
    cachedToken = token;
    return token;
  } catch (error) {
    throw buildShiprocketError(
      "Failed to authenticate with Shiprocket.",
      error,
    );
  }
};

const shiprocketRequest = async (config, allowRetry = true) => {
  const token = cachedToken || (await authenticate());

  try {
    return await axios({
      ...config,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(config.headers || {}),
      },
    });
  } catch (error) {
    const isUnauthorized = error?.response?.status === 401;
    if (isUnauthorized && allowRetry) {
      cachedToken = null;
      return shiprocketRequest(config, false);
    }
    throw error;
  }
};

const getCourierRate = (courier) => {
  const totalCharge = toFiniteNumber(courier?.total_charge);
  if (totalCharge !== null) return totalCharge;

  const rate = toFiniteNumber(courier?.rate);
  if (rate !== null) return rate;

  const freightCharge = toFiniteNumber(courier?.freight_charge) || 0;
  const codCharge = toFiniteNumber(courier?.cod_charges) || 0;
  return freightCharge + codCharge;
};

const extractCouriers = (payload) => {
  const body = extractResponsePayload(payload);
  const rawCouriers =
    body?.available_courier_companies ||
    body?.data?.available_courier_companies ||
    body?.courier_data ||
    [];

  return Array.isArray(rawCouriers) ? rawCouriers : [];
};

const pickCheapestCourier = (couriers) =>
  [...couriers]
    .filter((courier) => courier && courier.courier_company_id)
    .sort((left, right) => getCourierRate(left) - getCourierRate(right))[0] ||
  null;

const sortCouriersByRate = (couriers = []) =>
  [...couriers]
    .filter((courier) => courier && courier.courier_company_id)
    .sort((left, right) => getCourierRate(left) - getCourierRate(right));

const getCourierPreferenceScore = (courier = {}) => {
  const recommendedFlags = [
    courier.recommended,
    courier.is_recommended,
    courier.recommendation,
    courier.best_courier,
  ];

  if (
    recommendedFlags.some(
      (value) => value === true || value === 1 || value === "1",
    )
  ) {
    return 0;
  }

  const rank = toFiniteNumber(
    courier.rank ||
      courier.rating_rank ||
      courier.courier_priority ||
      courier.priority,
  );
  if (rank !== null) {
    return rank;
  }

  return 9999;
};

const sortCouriersForAssignment = (couriers = []) =>
  [...couriers]
    .filter((courier) => courier && courier.courier_company_id)
    .sort((left, right) => {
      const preferenceDelta =
        getCourierPreferenceScore(left) - getCourierPreferenceScore(right);
      if (preferenceDelta !== 0) return preferenceDelta;
      return getCourierRate(left) - getCourierRate(right);
    });

const getPickupLocationName = async (originDetails = {}) => {
  const cacheIsFresh =
    pickupLocationCache &&
    Date.now() - pickupLocationCacheAt < PICKUP_CACHE_TTL_MS;
  if (!cacheIsFresh) {
    const response = await shiprocketRequest({
      method: "GET",
      url: PICKUP_LOCATIONS_URL,
    });
    const payload = extractResponsePayload(response.data);
    pickupLocationCache =
      payload?.shipping_address || payload?.data?.shipping_address || [];
    pickupLocationCacheAt = Date.now();
  }

  const originPincode = cleanString(
    originDetails.pincode || process.env.WAREHOUSE_PINCODE,
  );
  const originCity = cleanString(
    originDetails.city || process.env.WAREHOUSE_CITY,
  );

  const pickupLocations = Array.isArray(pickupLocationCache)
    ? pickupLocationCache
    : [];

  const configuredLocation = cleanString(
    process.env.SHIPROCKET_PICKUP_LOCATION,
  );
  if (configuredLocation) {
    const configuredMatch = pickupLocations.find((location) => {
      const pickupName = cleanString(
        location?.pickup_location || location?.address_name,
      );
      return pickupName.toLowerCase() === configuredLocation.toLowerCase();
    });

    if (!configuredMatch) {
      const availableLocations = pickupLocations
        .map((location) =>
          cleanString(location?.pickup_location || location?.address_name),
        )
        .filter(Boolean);
      throw new Error(
        `Configured SHIPROCKET_PICKUP_LOCATION "${configuredLocation}" does not match any Shiprocket pickup location. Available locations: ${availableLocations.join(", ") || "none"}`,
      );
    }

    return cleanString(
      configuredMatch.pickup_location || configuredMatch.address_name,
    );
  }

  const matchingLocation =
    pickupLocations.find(
      (location) =>
        cleanString(location.pin_code || location.postcode) === originPincode,
    ) ||
    pickupLocations.find(
      (location) =>
        cleanString(location.city).toLowerCase() === originCity.toLowerCase(),
    ) ||
    pickupLocations[0];

  const pickupLocationName = cleanString(
    matchingLocation?.pickup_location || matchingLocation?.address_name,
  );

  if (!pickupLocationName) {
    throw new Error(
      "No Shiprocket pickup location found. Configure SHIPROCKET_PICKUP_LOCATION or add a pickup location in Shiprocket.",
    );
  }

  return pickupLocationName;
};

const normalizeLineItem = (item, index = 0) => {
  const snapshot = item?.productSnapshot || {};
  const quantity = Math.max(1, Number(item?.quantity) || 1);
  const basePrice = toFiniteNumber(item?.unitPrice || snapshot?.price) || 0;
  const explicitSellingPrice = toFiniteNumber(item?.selling_price);
  const lineTaxAmount = toFiniteNumber(item?.taxAmount || item?.tax || 0) || 0;
  const discount =
    toFiniteNumber(item?.discountAmount || item?.discount || 0) || 0;
  const unitTaxAmount =
    quantity > 0 ? Number((lineTaxAmount / quantity).toFixed(2)) : 0;
  const finalSellingPrice =
    explicitSellingPrice !== null
      ? explicitSellingPrice
      : Number((basePrice + unitTaxAmount).toFixed(2));

  return {
    name: compactString(
      item?.productName || snapshot?.name || item?.name,
      `Item ${index + 1}`,
    ),
    sku: compactString(
      item?.productSku || snapshot?.sku || item?.sku,
      `SKU-${index + 1}`,
    ),
    units: quantity,
    // Send the customer-facing final line price directly so Shiprocket's
    // invoice/label shows the same amount the customer sees in our app.
    selling_price: finalSellingPrice.toFixed(2),
    discount: discount.toFixed(2),
    tax: "0.00",
  };
};

const buildOrderItems = (consignmentData = {}) => {
  const orderItems =
    consignmentData.order_items ||
    consignmentData.items ||
    consignmentData.products;
  if (Array.isArray(orderItems) && orderItems.length > 0) {
    return orderItems.map(normalizeLineItem);
  }

  return [
    {
      name: compactString(consignmentData.description, "Package"),
      sku: compactString(
        consignmentData.invoice_number || consignmentData.order_id,
        "PACKAGE",
      ),
      units: Math.max(1, Number(consignmentData.num_pieces) || 1),
      selling_price: (
        toFiniteNumber(consignmentData.declared_value) ||
        toFiniteNumber(consignmentData.sub_total) ||
        0
      ).toFixed(2),
      discount: "0.00",
      tax: "0.00",
    },
  ];
};

const validateOrderPayload = (payload = {}) => {
  const requiredFields = [
    ["billing_address", payload.billing_address],
    ["billing_city", payload.billing_city],
    ["billing_state", payload.billing_state],
    ["billing_pincode", payload.billing_pincode],
    ["billing_phone", payload.billing_phone],
    ["billing_email", payload.billing_email],
  ];

  if (!payload.shipping_is_billing) {
    requiredFields.push(
      ["shipping_address", payload.shipping_address],
      ["shipping_city", payload.shipping_city],
      ["shipping_state", payload.shipping_state],
      ["shipping_pincode", payload.shipping_pincode],
      ["shipping_phone", payload.shipping_phone],
    );
  }

  const missingFields = requiredFields
    .filter(([, value]) => !cleanString(value))
    .map(([field]) => field);

  if (missingFields.length > 0) {
    throw new Error(
      `Shiprocket address validation failed. Missing required fields: ${missingFields.join(", ")}`,
    );
  }
};

const logOrderAddressPayload = (
  payload = {},
  contextLabel = "Shiprocket order",
) => {
  console.log(
    `[${contextLabel}] Address payload:`,
    JSON.stringify(
      {
        order_id: payload.order_id,
        order_date: payload.order_date,
        pickup_location: payload.pickup_location,
        payment_method: payload.payment_method,
        billing_customer_name: payload.billing_customer_name,
        billing_last_name: payload.billing_last_name,
        billing_address: payload.billing_address,
        billing_address_2: payload.billing_address_2,
        billing_city: payload.billing_city,
        billing_state: payload.billing_state,
        billing_pincode: payload.billing_pincode,
        billing_country: payload.billing_country,
        billing_phone: payload.billing_phone,
        billing_email: payload.billing_email,
        shipping_is_billing: payload.shipping_is_billing,
        shipping_customer_name: payload.shipping_customer_name,
        shipping_last_name: payload.shipping_last_name,
        shipping_address: payload.shipping_address,
        shipping_address_2: payload.shipping_address_2,
        shipping_city: payload.shipping_city,
        shipping_state: payload.shipping_state,
        shipping_pincode: payload.shipping_pincode,
        shipping_country: payload.shipping_country,
        shipping_phone: payload.shipping_phone,
        shipping_email: payload.shipping_email,
        order_items: payload.order_items,
        weight: payload.weight,
      },
      null,
      2,
    ),
  );
};

const logProviderPayload = (
  payload = {},
  contextLabel = "Shiprocket payload",
) => {
  console.log(`[${contextLabel}] Payload:`, JSON.stringify(payload, null, 2));
};

const isRetryableCourierAssignmentError = (error) => {
  const message = cleanString(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message,
  ).toLowerCase();

  return (
    message.includes("courier not serviceable") ||
    message.includes("not serviceable") ||
    message.includes("serviceable") ||
    message.includes("assign awb")
  );
};

const createShiprocketOrderPayload = async (consignmentData = {}) => {
  const origin = consignmentData.origin_details || {};
  const destination = consignmentData.destination_details || {};
  const billingName = compactString(destination.name, "Customer");
  const billingParts = billingName.split(/\s+/).filter(Boolean);
  const firstName = billingParts.shift() || "Customer";
  const lastName = billingParts.join(" ");
  const pickupLocation = await getPickupLocationName(origin);
  const orderItems = buildOrderItems(consignmentData);
  const itemTotal =
    toFiniteNumber(consignmentData.sub_total) ||
    orderItems.reduce(
      (sum, item) =>
        sum +
        (toFiniteNumber(item.selling_price) || 0) * (Number(item.units) || 1),
      0,
    );
  const totalPaidAmount =
    toFiniteNumber(consignmentData.total_amount) ||
    toFiniteNumber(consignmentData.declared_value) ||
    itemTotal + (toFiniteNumber(consignmentData.shipping_charges) || 0);

  const billingAddress = normalizeAddressLine(
    destination.address_line_1 || destination.address,
    "Address unavailable",
  );
  const billingAddress2 = normalizeAddressLine(destination.address_line_2);
  const billingCity = compactString(destination.city, "Unknown City");
  const billingPincode =
    toNumericField(
      destination.pincode || destination.postalCode || destination.zip,
      0,
    ) || 0;
  const billingState = compactString(destination.state, "Unknown State");
  const billingCountry = compactString(destination.country, "India");
  const billingEmail = compactString(
    destination.email,
    process.env.WAREHOUSE_EMAIL || "support@naveenamnaturals.com",
  );
  const billingPhone = toNumericField(sanitizePhone(destination.phone), 0) || 0;

  return {
    order_id: compactString(consignmentData.order_id, `SR-${Date.now()}`),
    order_date: formatOrderDate(consignmentData.order_date),
    pickup_location: pickupLocation,
    channel_id: cleanString(process.env.SHIPROCKET_CHANNEL_ID) || undefined,
    comment: compactString(
      consignmentData.notes || consignmentData.description,
    ),
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: billingAddress,
    billing_address_2: billingAddress2,
    billing_city: billingCity,
    billing_pincode: billingPincode,
    billing_state: billingState,
    billing_country: billingCountry,
    billing_email: billingEmail,
    billing_phone: billingPhone,
    shipping_is_billing: true,
    shipping_customer_name: "",
    shipping_last_name: "",
    shipping_address: "",
    shipping_address_2: "",
    shipping_city: "",
    shipping_pincode: "",
    shipping_country: "",
    shipping_state: "",
    shipping_email: "",
    shipping_phone: "",
    order_items: orderItems,
    payment_method:
      Number(consignmentData.cod_amount || 0) > 0 ||
      String(consignmentData.payment_method || "").toLowerCase() === "cod"
        ? "COD"
        : "Prepaid",
    // Keep Shiprocket's label "Order Total" equal to the final paid amount.
    // We flatten shipping into the subtotal for provider-facing documents.
    shipping_charges: 0,
    giftwrap_charges: toFiniteNumber(consignmentData.giftwrap_charges) || 0,
    transaction_charges:
      toFiniteNumber(consignmentData.transaction_charges) || 0,
    total_discount: toFiniteNumber(consignmentData.total_discount) || 0,
    sub_total: Number(totalPaidAmount.toFixed(2)),
    length: cleanString(consignmentData.length || 10),
    breadth: cleanString(
      consignmentData.width || consignmentData.breadth || 10,
    ),
    height: cleanString(consignmentData.height || 10),
    weight: String(sanitizeWeight(consignmentData.weight)),
  };
};

const normalizeTrackingEvent = (event) => ({
  status: compactString(
    event?.status_code || event?.status || event?.activity_status,
    "",
  ),
  label: compactString(
    event?.activity ||
      event?.sr_status_label ||
      event?.["sr-status-label"] ||
      event?.status,
    "Update",
  ),
  location: compactString(
    event?.location || event?.activity_location || event?.city || "",
  ),
  timestamp: compactString(
    event?.date ||
      event?.event_time ||
      event?.created_at ||
      event?.activity_date,
    "",
  ),
  remarks: compactString(
    event?.remarks || event?.current_status || event?.sr_status || "",
  ),
});

const normalizeShiprocketTracking = (payload, awbNumber) => {
  const data = extractResponsePayload(payload);
  const trackingData = data?.tracking_data || data;
  const shipmentTrack = Array.isArray(trackingData?.shipment_track)
    ? trackingData.shipment_track[0] || {}
    : trackingData?.shipment_track || {};
  const activities = Array.isArray(trackingData?.shipment_track_activities)
    ? trackingData.shipment_track_activities
    : [];

  const rawStatusCode =
    toFiniteNumber(
      trackingData?.shipment_status ||
        shipmentTrack?.shipment_status ||
        trackingData?.status_code,
    ) || null;
  const latestStatusLabel = compactString(
    shipmentTrack?.current_status ||
      SHIPROCKET_STATUS_LABELS[rawStatusCode] ||
      trackingData?.status ||
      data?.message,
    "Unknown",
  );
  const carrier = compactString(
    shipmentTrack?.courier_name ||
      shipmentTrack?.courier ||
      trackingData?.courier_name,
    PROVIDER_LABEL,
  );

  return {
    provider: PROVIDER_NAME,
    awbNumber: compactString(
      shipmentTrack?.awb_code || trackingData?.awb_code || awbNumber,
      awbNumber,
    ),
    carrier,
    shipmentId: compactString(
      shipmentTrack?.shipment_id || trackingData?.shipment_id,
      "",
    ),
    providerOrderId: compactString(
      shipmentTrack?.order_id || trackingData?.order_id,
      "",
    ),
    courierCompanyId: shipmentTrack?.courier_company_id || null,
    latestStatus:
      rawStatusCode !== null ? String(rawStatusCode) : latestStatusLabel,
    latestStatusLabel,
    events: activities.map(normalizeTrackingEvent),
    raw: data,
  };
};

const extractAwbFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") return "";

  const candidates = [
    payload.awb_code,
    payload.awb,
    payload.data?.awb_code,
    payload.data?.awb,
    payload.response?.awb_code,
    payload.response?.awb,
    payload.response?.data?.awb_code,
    payload.response?.data?.awb,
    payload.shipment_data?.awb_code,
    payload.shipment_data?.awb,
  ];

  for (const candidate of candidates) {
    const normalized = compactString(candidate, "");
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

const extractShipmentIdFromPayload = (payload) =>
  compactString(
    payload?.shipment_id ||
      payload?.shipmentId ||
      payload?.data?.shipment_id ||
      payload?.data?.shipmentId ||
      payload?.response?.shipment_id ||
      payload?.response?.shipmentId,
    "",
  );

const extractProviderOrderIdFromPayload = (payload, fallback = "") =>
  compactString(
    payload?.order_id ||
      payload?.orderId ||
      payload?.data?.order_id ||
      payload?.data?.orderId ||
      payload?.response?.order_id ||
      payload?.response?.orderId,
    fallback,
  );

const mapTrackingToOrderStatus = (trackingData = {}) => {
  const statusCode = toFiniteNumber(trackingData.latestStatus);
  const statusLabel = cleanString(trackingData.latestStatusLabel).toLowerCase();

  if (statusCode !== null) {
    if (statusCode === 7) return "delivered";
    if (CANCELLED_STATUS_CODES.has(statusCode)) return "cancelled";
    if (statusCode === 63 || statusCode === 65) return "confirmed";
    if (CONFIRMED_STATUS_CODES.has(statusCode)) return "confirmed";
    if (SHIPPED_STATUS_CODES.has(statusCode)) return "shipped";
  }

  if (statusLabel.includes("delivered")) return "delivered";
  if (
    statusLabel.includes("pickup cancelled") ||
    statusLabel.includes("pickup canceled") ||
    statusLabel.includes("pickup failed")
  ) {
    return "confirmed";
  }
  if (statusLabel.includes("cancel")) return "cancelled";
  if (
    statusLabel.includes("booked") ||
    statusLabel.includes("ready to ship") ||
    statusLabel.includes("pickup scheduled") ||
    statusLabel.includes("awb")
  ) {
    return "confirmed";
  }
  if (
    statusLabel.includes("pickup") ||
    statusLabel.includes("transit") ||
    statusLabel.includes("delivery") ||
    statusLabel.includes("rto") ||
    statusLabel.includes("exception")
  ) {
    return "shipped";
  }

  return null;
};

const extractOrderIdsFromPayload = (payload, collector = new Set()) => {
  if (!payload || typeof payload !== "object") {
    return collector;
  }

  Object.entries(payload).forEach(([key, value]) => {
    const keyLower = cleanString(key).toLowerCase();
    const couldContainOrderIds =
      keyLower === "ids" ||
      keyLower === "id" ||
      keyLower === "order_id" ||
      keyLower === "order_ids" ||
      keyLower.includes("order");

    if (couldContainOrderIds) {
      if (Array.isArray(value)) {
        value
          .map((entry) => normalizeOrderId(entry))
          .filter(Boolean)
          .forEach((orderId) => collector.add(orderId));
      } else if (typeof value === "string" || typeof value === "number") {
        const orderId = normalizeOrderId(value);
        if (orderId) collector.add(orderId);
      }
    }

    if (value && typeof value === "object") {
      extractOrderIdsFromPayload(value, collector);
    }
  });

  return collector;
};

const inferCancelledOrderIds = (payload, requestedOrderIds = []) => {
  const requested = requestedOrderIds
    .map((orderId) => normalizeOrderId(orderId))
    .filter(Boolean);
  const requestedSet = new Set(requested);
  const explicitOrderIds = [...extractOrderIdsFromPayload(payload)].filter(
    (orderId) => requestedSet.has(orderId),
  );

  if (explicitOrderIds.length > 0) {
    return explicitOrderIds;
  }

  const payloadText = cleanString(JSON.stringify(payload)).toLowerCase();
  const looksSuccessful =
    payloadText.includes("cancelled successfully") ||
    payloadText.includes("canceled successfully") ||
    payloadText.includes('"success":true') ||
    payloadText.includes('"status":"success"') ||
    payloadText.includes('"status":1');
  const looksPartialOrFailed =
    payloadText.includes("partial") ||
    payloadText.includes("failed") ||
    payloadText.includes("error") ||
    payloadText.includes("unable") ||
    payloadText.includes("not found");

  if (requested.length === 1 && looksSuccessful && !looksPartialOrFailed) {
    return requested;
  }

  return [];
};

const checkServiceability = async (
  originPincode,
  destPincode,
  options = {},
) => {
  try {
    const weight = Math.max(
      DEFAULT_WEIGHT_KG,
      toFiniteNumber(options.weight) || DEFAULT_WEIGHT_KG,
    );
    const response = await shiprocketRequest({
      method: "GET",
      url: SERVICEABILITY_URL,
      params: {
        pickup_postcode: originPincode,
        delivery_postcode: destPincode,
        cod: options.cod ? 1 : 0,
        weight: Number(weight.toFixed(3)),
        declared_value: toFiniteNumber(options.declaredValue) || undefined,
      },
    });

    const couriers = extractCouriers(response.data);
    const selectedCourier = sortCouriersForAssignment(couriers)[0] || null;

    if (!selectedCourier) {
      return {
        serviceable: false,
        shippingRate: 0,
        provider: PROVIDER_NAME,
        estimatedDays: null,
        courierName: null,
        courierCompanyId: null,
        details: response.data,
      };
    }

    return {
      serviceable: true,
      shippingRate: getCourierRate(selectedCourier),
      provider: PROVIDER_NAME,
      estimatedDays:
        toFiniteNumber(
          selectedCourier.estimated_delivery_days || selectedCourier.etd,
        ) || null,
      courierName: compactString(
        selectedCourier.courier_name || selectedCourier.courier_company_name,
        PROVIDER_LABEL,
      ),
      courierCompanyId: selectedCourier.courier_company_id,
      courier: selectedCourier,
      details: response.data,
    };
  } catch (error) {
    throw buildShiprocketError(
      "Failed to check Shiprocket serviceability.",
      error,
    );
  }
};

const createProviderOrder = async (consignmentData = {}) => {
  try {
    const orderPayload = await createShiprocketOrderPayload(consignmentData);
    validateOrderPayload(orderPayload);
    logOrderAddressPayload(orderPayload, "Shiprocket createProviderOrder");

    const createOrderResponse = await shiprocketRequest({
      method: "POST",
      url: CREATE_ORDER_URL,
      data: orderPayload,
    });

    const createPayload = extractResponsePayload(createOrderResponse.data);
    const providerOrderId = extractProviderOrderIdFromPayload(
      createPayload,
      orderPayload.order_id,
    );
    const shipmentId = extractShipmentIdFromPayload(createPayload);

    if (!shipmentId) {
      throw new Error("Shiprocket order was created without a shipment ID.");
    }

    return {
      provider: PROVIDER_NAME,
      providerOrderId,
      shipmentId,
      latestStatus: BOOKING_STAGE_ORDER_CREATED,
      latestStatusLabel: "Shiprocket Order Created",
      raw: {
        order: createOrderResponse.data,
      },
    };
  } catch (error) {
    if (error?.config?.data) {
      try {
        const payload =
          typeof error.config.data === "string"
            ? JSON.parse(error.config.data)
            : error.config.data;
        logOrderAddressPayload(
          payload,
          "Shiprocket createProviderOrder failed",
        );
      } catch {
        // Ignore logging parse issues.
      }
    }
    throw buildShiprocketError("Failed to create Shiprocket order.", error);
  }
};

const bookProviderShipment = async (consignmentData = {}) => {
  try {
    const originPincode = compactString(
      consignmentData.origin_details?.pincode || process.env.WAREHOUSE_PINCODE,
      "",
    );
    const destinationPincode = compactString(
      consignmentData.destination_details?.pincode ||
        consignmentData.destination_details?.postalCode ||
        consignmentData.destination_details?.zip,
      "",
    );

    const serviceability = await checkServiceability(
      originPincode,
      destinationPincode,
      {
        weight: sanitizeWeight(consignmentData.weight),
        cod: Number(consignmentData.cod_amount || 0) > 0,
        declaredValue: consignmentData.declared_value,
      },
    );

    if (!serviceability.serviceable || !serviceability.courierCompanyId) {
      throw new Error("Shiprocket does not service this destination pincode.");
    }

    const availableCouriers = sortCouriersForAssignment(
      extractCouriers(serviceability.details),
    );
    const courierCandidates = availableCouriers.length
      ? availableCouriers
      : [
          {
            courier_company_id: serviceability.courierCompanyId,
            courier_name: serviceability.courierName,
          },
        ];

    let shipmentId = compactString(
      consignmentData.shipment_id || consignmentData.shipmentId,
      "",
    );
    let providerOrderId = compactString(
      consignmentData.providerOrderId || consignmentData.provider_order_id,
      compactString(consignmentData.order_id, ""),
    );
    let createOrderResponse = null;

    if (!shipmentId) {
      const providerOrder = await createProviderOrder(consignmentData);
      shipmentId = compactString(providerOrder.shipmentId, "");
      providerOrderId = compactString(
        providerOrder.providerOrderId,
        providerOrderId,
      );
      createOrderResponse = providerOrder.raw?.order || null;
    }

    if (!shipmentId) {
      throw new Error("Shiprocket shipment ID is required before booking.");
    }

    let assignAwbResponse = null;
    let assignAwbPayload = null;
    let awbNumber = "";
    let assignedCourier = null;
    let lastAssignError = null;

    for (const courier of courierCandidates) {
      try {
        assignAwbResponse = await shiprocketRequest({
          method: "POST",
          url: ASSIGN_AWB_URL,
          data: {
            shipment_id: Number(shipmentId),
            courier_id: Number(courier.courier_company_id),
          },
        });

        assignAwbPayload = extractResponsePayload(assignAwbResponse.data);
        logProviderPayload(
          assignAwbResponse.data,
          `Shiprocket assign AWB (${compactString(courier.courier_name, courier.courier_company_id)})`,
        );
        awbNumber = extractAwbFromPayload(assignAwbPayload);

        if (awbNumber) {
          assignedCourier = courier;
          break;
        }

        lastAssignError = new Error(
          `Shiprocket did not return an AWB for courier ${courier.courier_company_id}.`,
        );
      } catch (assignError) {
        lastAssignError = assignError;
        logProviderPayload(
          assignError?.response?.data || { message: assignError.message },
          `Shiprocket assign AWB failed (${compactString(courier.courier_name, courier.courier_company_id)})`,
        );

        if (!isRetryableCourierAssignmentError(assignError)) {
          throw assignError;
        }
      }
    }

    if (!awbNumber) {
      throw (
        lastAssignError ||
        new Error(
          `Shiprocket did not return an AWB for shipment ${shipmentId}. Review the logged assign-AWB payload.`,
        )
      );
    }

    const pickupResponse = await shiprocketRequest({
      method: "POST",
      url: GENERATE_PICKUP_URL,
      data: {
        shipment_id: [Number(shipmentId)],
      },
    });

    const pickupPayload = extractResponsePayload(pickupResponse.data);
    const providerStatus = compactString(
      pickupPayload?.pickup_status ||
        pickupPayload?.message ||
        SHIPROCKET_STATUS_LABELS[27],
      "Pickup Booked",
    );

    return {
      provider: PROVIDER_NAME,
      providerOrderId,
      shipmentId: String(shipmentId),
      awbNumber,
      courierCompanyId: Number(
        assignedCourier?.courier_company_id || serviceability.courierCompanyId,
      ),
      courierName:
        compactString(
          assignedCourier?.courier_name ||
            assignedCourier?.courier_company_name,
          "",
        ) || serviceability.courierName,
      estimatedDays: serviceability.estimatedDays,
      shippingRate: getCourierRate(assignedCourier || serviceability.courier),
      latestStatus: "27",
      latestStatusLabel: providerStatus,
      raw: {
        serviceability: serviceability.details,
        order: createOrderResponse,
        awb: assignAwbResponse.data,
        pickup: pickupResponse.data,
      },
    };
  } catch (error) {
    if (error?.config?.data) {
      try {
        const payload =
          typeof error.config.data === "string"
            ? JSON.parse(error.config.data)
            : error.config.data;
        logOrderAddressPayload(payload, "Shiprocket createShipment failed");
      } catch {
        // Ignore logging parse issues.
      }
    }
    throw buildShiprocketError("Failed to book Shiprocket shipment.", error);
  }
};

const createShipment = async (consignmentData = {}) =>
  bookProviderShipment(consignmentData);

const getShippingLabel = async (shipmentId) => {
  try {
    const response = await shiprocketRequest({
      method: "POST",
      url: GENERATE_LABEL_URL,
      data: {
        shipment_id: [Number(shipmentId)],
      },
    });

    const payload = extractResponsePayload(response.data);
    const labelUrl = compactString(
      payload?.label_url ||
        payload?.data?.label_url ||
        payload?.response?.label_url,
      "",
    );

    if (!labelUrl) {
      throw new Error("Shiprocket did not return a label URL.");
    }

    const labelResponse = await axios.get(labelUrl, {
      responseType: "arraybuffer",
    });

    return labelResponse.data;
  } catch (error) {
    throw buildShiprocketError(
      "Failed to fetch Shiprocket shipping label.",
      error,
    );
  }
};

const cancelOrders = async (orderIds = []) => {
  const requestedOrderIds = orderIds
    .map((orderId) => normalizeOrderId(orderId))
    .filter(Boolean);

  if (requestedOrderIds.length === 0) {
    throw new Error("At least one Shiprocket order id is required.");
  }

  try {
    const response = await shiprocketRequest({
      method: "POST",
      url: CANCEL_ORDER_URL,
      data: {
        ids: requestedOrderIds,
      },
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 204,
    });

    const payload = response.data || {
      success: true,
      message: "Orders cancelled successfully.",
    };
    const providerCancelledOrderIds = inferCancelledOrderIds(
      payload,
      requestedOrderIds,
    );
    const cancelledSet = new Set(providerCancelledOrderIds);

    return {
      payload,
      providerCancelledOrderIds,
      notCancelledOrderIds: requestedOrderIds.filter(
        (orderId) => !cancelledSet.has(orderId),
      ),
    };
  } catch (error) {
    throw buildShiprocketError("Failed to cancel Shiprocket order.", error);
  }
};

const trackShipment = async (awbNumber) => {
  try {
    const response = await shiprocketRequest({
      method: "GET",
      url: `${TRACK_BY_AWB_URL}/${encodeURIComponent(awbNumber)}`,
    });

    return normalizeShiprocketTracking(response.data, awbNumber);
  } catch (error) {
    const providerMessage = cleanString(
      error?.response?.data?.message || error?.message,
    ).toLowerCase();

    if (providerMessage.includes("awb has been cancelled")) {
      return {
        awbNumber: compactString(awbNumber, ""),
        carrier: PROVIDER_LABEL,
        latestStatus: "8",
        latestStatusLabel: SHIPROCKET_STATUS_LABELS[8],
        shipmentId: null,
        providerOrderId: null,
        courierCompanyId: null,
        events: [],
        raw: error?.response?.data || null,
      };
    }

    throw buildShiprocketError(
      "Failed to fetch Shiprocket tracking details.",
      error,
    );
  }
};

module.exports = {
  PROVIDER_NAME,
  PROVIDER_LABEL,
  BOOKING_STAGE_NOT_CREATED,
  BOOKING_STAGE_ORDER_CREATED,
  BOOKING_STAGE_BOOKED,
  SHIPROCKET_STATUS_LABELS,
  mapTrackingToOrderStatus,
  checkServiceability,
  createProviderOrder,
  bookProviderShipment,
  createShipment,
  getShippingLabel,
  cancelOrders,
  trackShipment,
};
