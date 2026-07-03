const verifyServiceSecret = (req, res, next) => {
  try {
    const serviceSecret = process.env.SERVICE_API_SECRET;
    const incomingSecret =
      req.headers["x-service-secret"] || req.headers["X-Service-Secret"];

    if (!serviceSecret) {
      console.error(
        "SERVICE_API_SECRET is not configured on the server. Rejecting request."
      );
      return res.status(500).json({
        success: false,
        message: "Service authentication is not configured",
      });
    }

    if (!incomingSecret || incomingSecret !== serviceSecret) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized service request",
      });
    }

    next();
  } catch (error) {
    console.error("Service auth error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to authenticate service request",
    });
  }
};

module.exports = {
  verifyServiceSecret,
};

