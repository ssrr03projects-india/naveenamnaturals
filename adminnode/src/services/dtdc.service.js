const axios = require("axios");
const {
  getStatusDescription,
  getReasonDescription,
} = require("../utils/dtdcCodes");

/**
 * DTDC / Shipsy API Service
 *
 * Provides methods to interact with DTDC's Consignment API for shipment creation.
 */

const IS_PRODUCTION = process.env.SHIPPING_ENV === "production";

// Base URLs as provided by DTDC/Shipsy
const BASE_URL = IS_PRODUCTION
  ? "https://dtdcapi.shipsy.io/api/customer/integration/consignment"
  : "https://alphademodashboardapi.shipsy.io/api/customer/integration/consignment";

const SOFTDATA_URL = `${BASE_URL}/softdata`;
const TRACKING_URL = `${BASE_URL}/track`;
const SERVICEABILITY_URL = `${BASE_URL}/serviceability`;

const API_KEY = process.env.DTDC_API_KEY;
const CUSTOMER_CODE = process.env.DTDC_CUSTOMER_CODE;

/**
 * Creates a single or multi-parcel shipment request.
 *
 * @param {Object} consignmentData - Object containing consignment details
 * @returns {Promise<Object>} API Response
 */
const createConsignment = async (consignmentData) => {
  try {
    if (!API_KEY) {
      throw new Error(
        "DTDC_API_KEY is not configured in environment variables.",
      );
    }

    // Default values and structure adjustment
    const payload = {
      consignments: [
        {
          customer_code:
            CUSTOMER_CODE || consignmentData.customer_code || "CUSTOMER_CODE",
          service_type_id:
            consignmentData.service_type_id ||
            process.env.DTDC_SERVICE_TYPE ||
            "B2C SMART EXPRESS",
          load_type: consignmentData.load_type || "NON-DOCUMENT",
          description: consignmentData.description || "Package",
          dimension_unit: consignmentData.dimension_unit || "cm",
          length: consignmentData.length?.toString() || "10",
          width: consignmentData.width?.toString() || "10",
          height: consignmentData.height?.toString() || "10",
          weight_unit: consignmentData.weight_unit || "kg",
          weight: consignmentData.weight?.toString() || "0.5",
          declared_value: consignmentData.declared_value?.toString() || "0",
          num_pieces: consignmentData.num_pieces?.toString() || "1",

          origin_details: {
            name: consignmentData.origin_details?.name || "NAVEENAM NATURALS",
            phone: consignmentData.origin_details?.phone || "9876543210",
            alternate_phone:
              consignmentData.origin_details?.alternate_phone || "",
            address_line_1:
              consignmentData.origin_details?.address_line_1 ||
              "Naveenam Naturals Warehouse, Salem",
            address_line_2:
              consignmentData.origin_details?.address_line_2 || "",
            pincode:
              consignmentData.origin_details?.pincode ||
              process.env.WAREHOUSE_PINCODE ||
              "636010",
            city: consignmentData.origin_details?.city || "Salem",
            state: consignmentData.origin_details?.state || "Tamil Nadu",
          },

          destination_details: {
            name: consignmentData.destination_details?.name,
            phone: consignmentData.destination_details?.phone,
            alternate_phone:
              consignmentData.destination_details?.alternate_phone || "",
            address_line_1:
              (
                consignmentData.destination_details?.address_line_1 ||
                consignmentData.destination_details?.address ||
                consignmentData.destination_details?.street ||
                ""
              ).length > 3
                ? consignmentData.destination_details?.address_line_1 ||
                  consignmentData.destination_details?.address ||
                  consignmentData.destination_details?.street
                : "Address Details Unavailable",
            address_line_2:
              consignmentData.destination_details?.address_line_2 || "",
            pincode:
              consignmentData.destination_details?.pincode ||
              consignmentData.destination_details?.postalCode ||
              consignmentData.destination_details?.zip ||
              consignmentData.destination_details?.zipCode ||
              "000000",
            city:
              consignmentData.destination_details?.city ||
              consignmentData.destination_details?.cityName ||
              "Unknown City",
            state:
              consignmentData.destination_details?.state ||
              consignmentData.destination_details?.stateName ||
              "Unknown State",
          },

          // Optional return details (usually same as origin or specific warehouse)
          return_details: consignmentData.return_details || {
            name: consignmentData.origin_details?.name || "NAVEENAM NATURALS",
            phone: consignmentData.origin_details?.phone || "9876543210",
            address_line_1:
              consignmentData.origin_details?.address_line_1 ||
              "Naveenam Naturals Warehouse, Salem",
            address_line_2:
              consignmentData.origin_details?.address_line_2 || "",
            pincode:
              consignmentData.origin_details?.pincode ||
              process.env.WAREHOUSE_PINCODE ||
              "636010",
            city_name: consignmentData.origin_details?.city || "Salem",
            state_name: consignmentData.origin_details?.state || "Tamil Nadu",
            email:
              consignmentData.origin_details?.email ||
              "support@naveenamnaturals.com", // Added email as per docs
          },

          customer_reference_number:
            consignmentData.order_id ||
            consignmentData.customer_reference_number,
          cod_collection_mode:
            consignmentData.cod_collection_mode ||
            (consignmentData.cod_amount > 0 ? "CASH" : ""),
          cod_amount: consignmentData.cod_amount?.toString() || "",
          commodity_id: consignmentData.commodity_id || "99",
          eway_bill: consignmentData.eway_bill || "",
          is_risk_surcharge_applicable:
            consignmentData.is_risk_surcharge_applicable === true, // Send as boolean as per "Field Type: Boolean"
          invoice_number:
            consignmentData.invoice_number || consignmentData.order_id || "",
          invoice_date:
            consignmentData.invoice_date ||
            new Date()
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
              .replace(/ /g, " "), // Format: "14 Oct 2022"
          reference_number: consignmentData.awb_number || "", // Optional AWB if pre-assigned

          // Pieces detail for Multi Parcel Shipments (MPS)
          pieces_detail: consignmentData.pieces_detail || [],
        },
      ],
    };

    console.log(`Sending Consignment Request to: ${SOFTDATA_URL}`);
    const response = await axios.post(SOFTDATA_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    console.error("DTDC Service Error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Track a shipment using the reference number (AWB).
 *
 * @param {string} referenceNumber - The AWB or reference number
 * @returns {Promise<Object>} API Response
 */
const trackConsignment = async (referenceNumber) => {
  try {
    if (!API_KEY) {
      throw new Error("DTDC_API_KEY is not configured.");
    }

    const response = await axios.get(TRACKING_URL, {
      params: { reference_number: referenceNumber },
      headers: { "api-key": API_KEY },
    });

    return enhanceTrackingData(response.data);
  } catch (error) {
    console.error(
      "DTDC Tracking Error:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * recursively searches for status/reason codes in the response objects
 * and adds a human-readable description field next to them.
 */
const enhanceTrackingData = (data) => {
  if (!data) return data;

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map((item) => enhanceTrackingData(item));
  }

  // Handle Objects
  if (typeof data === "object") {
    const newData = { ...data };

    // Fields that typically contain Status Codes
    const statusFields = [
      "status",
      "Status",
      "scan_status",
      "action_code",
      "activity_code",
      "current_status",
      "latest_status",
    ];

    // Fields that typically contain Reason Codes
    const reasonFields = [
      "reason_code",
      "failure_reason",
      "ndr_code",
      "undelivered_code",
    ];

    statusFields.forEach((field) => {
      if (newData[field] && typeof newData[field] === "string") {
        const desc = getStatusDescription(newData[field]);
        // Only add if we found a meaningful description
        if (desc && desc !== newData[field]) {
          newData[`${field}_description`] = desc;
        }
      }
    });

    reasonFields.forEach((field) => {
      if (newData[field] && typeof newData[field] === "string") {
        const desc = getReasonDescription(newData[field]);
        if (desc) {
          newData[`${field}_description`] = desc;
        }
      }
    });

    // Recurse into nested objects/arrays (like 'scans', 'events')
    Object.keys(newData).forEach((key) => {
      if (newData[key] && typeof newData[key] === "object") {
        newData[key] = enhanceTrackingData(newData[key]);
      }
    });

    return newData;
  }

  return data;
};

/**
 * Check serviceability between two pincodes.
 *
 * @param {string} originPincode
 * @param {string} destPincode
 * @returns {Promise<Object>} API Response
 */
const checkServiceability = async (originPincode, destPincode) => {
  try {
    if (!API_KEY) {
      throw new Error("DTDC_API_KEY is not configured.");
    }

    const payload = {
      customer_code: CUSTOMER_CODE,
      origin_pincode: originPincode,
      destination_pincode: destPincode,
      service_type_id: process.env.DTDC_SERVICE_TYPE || "B2C SMART EXPRESS",
      load_type: "NON-DOCUMENT",
      doc_type: "NON-DOCUMENT",
    };

    const response = await axios.post(SERVICEABILITY_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    // Log serviceability response
    console.log(
      `DTDC Check From ${originPincode} to ${destPincode}:`,
      JSON.stringify(response.data, null, 2),
    );

    return response.data;
  } catch (error) {
    // If it's a 4xx/5xx error from axios, we want to know
    console.error(
      "DTDC Serviceability Error:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

module.exports = {
  createConsignment,
  trackConsignment,
  checkServiceability,
};
