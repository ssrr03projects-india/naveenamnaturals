const axios = require("axios");

/**
 * DTDC Tracking Service
 *
 * Handles interaction with DTDC's Tracking API (blktracksvc.dtdc.com).
 * Supports both dynamic authentication (username/password) and static token.
 */

// Configuration
const ENV =
  process.env.DTDC_TRACKING_ENV || process.env.SHIPPING_ENV || "production";
const BASE_URL =
  ENV === "production"
    ? "https://blktracksvc.dtdc.com/dtdc-api"
    : "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api";

const USERNAME = process.env.DTDC_TRACKING_USERNAME;
const PASSWORD = process.env.DTDC_TRACKING_PASSWORD;
const STATIC_TOKEN = process.env.DTDC_TRACKING_API_KEY; // Fallback or override

// Cache token in memory
let cachedToken = STATIC_TOKEN || null;
let tokenExpiry = null; // Optional: Implement expiry if known

/**
 * Authenticate and get Token Access Key
 * URL: /api/dtdc/authenticate?username=...&password=...
 */
const authenticate = async () => {
  // If we have a static token configured and no password, use that
  if (STATIC_TOKEN) {
    return STATIC_TOKEN;
  }

  if (!USERNAME || !PASSWORD) {
    throw new Error(
      "DTDC Tracking: Username and Password are required for authentication.",
    );
  }

  try {
    const authUrl = `${BASE_URL}/api/dtdc/authenticate`;
    console.log(`🔐 Authenticating with DTDC Tracking: ${USERNAME}`);

    const response = await axios.get(authUrl, {
      params: {
        username: USERNAME,
        password: PASSWORD,
      },
    });

    // The documentation says "Will send Token Access key".
    // It's unclear if it's a plain string or JSON.
    // We'll try to detect.
    let token = response.data;

    if (typeof token === "object" && token.access_token) {
      token = token.access_token;
    } else if (typeof token === "object" && token.key) {
      token = token.key;
    }

    // Update cache
    cachedToken = token;
    console.log("✅ DTDC Tracking Authentication Successful");
    return token;
  } catch (error) {
    console.error("❌ DTDC Tracking Authentication Failed:", error.message);
    throw error;
  }
};

/**
 * Get Tracking Details
 * URL: /rest/JSONCnTrk/getTrackDetails
 */
const getTrackingDetails = async (awbNumber, retryCount = 0) => {
  try {
    // Ensure we have a token
    let token = cachedToken;
    if (!token && USERNAME && PASSWORD) {
      token = await authenticate();
    } else if (!token) {
      throw new Error("DTDC Tracking: No authentication token available.");
    }

    const trackUrl = `${BASE_URL}/rest/JSONCnTrk/getTrackDetails`;

    // Payload for JSON tracking
    const payload = {
      trkType: "cnno",
      strcnno: awbNumber,
      addtnlDtl: "Y",
    };

    console.log(`📦 Fetching tracking for AWB: ${awbNumber}`);

    const response = await axios.post(trackUrl, null, {
      params: payload, // Passed as query params based on docs example? wait, docs say "Query request parameters" but Method POST.
      // Usually POST uses body. But "Query request parameters" implies URL params.
      // Let's try sending as query params first as per the docs layout,
      // but often with POST it might expect body or query.
      // The example URL shows `?/rest/JSONCnTrk/getTrackDetails`
      // Example in docs: `getTrackDetails?strcnno=...` so it's definitely query params.
      // HOWEVER, common sense for POST suggests body.
      // Let's follow the query param instruction for now since it lists "Query request parameters".
      headers: {
        "X-Access-Token": token,
      },
    });

    return response.data;
  } catch (error) {
    const isUnauthorized = error.response && error.response.status === 401;

    // If static token is configured and rejected, fail fast (avoid retry loop).
    if (isUnauthorized && STATIC_TOKEN) {
      throw new Error(
        "DTDC Tracking authentication failed: DTDC_TRACKING_API_KEY is invalid or expired.",
      );
    }

    // For username/password auth, retry only once after refreshing token.
    if (isUnauthorized && USERNAME && PASSWORD && retryCount < 1) {
      console.log("🔄 Token expired, re-authenticating...");
      cachedToken = null;
      await authenticate();
      return getTrackingDetails(awbNumber, retryCount + 1);
    }

    console.error(
      "❌ DTDC Tracking Error:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

module.exports = {
  authenticate,
  getTrackingDetails,
};
