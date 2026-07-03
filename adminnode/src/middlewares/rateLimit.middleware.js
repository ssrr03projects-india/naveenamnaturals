const rateLimit = require("express-rate-limit");

// Rate limiter for login attempts (stricter)
// Allows 10 attempts per 1 minute per IP
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts from this IP, please try again after 1 minute",
      retryAfter: Math.ceil(1 * 60),
    });
  },
});

// Rate limiter for admin login
// Allows 8 attempts per 1 minute per IP
const adminLoginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 8,
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts from this IP, please try again after 1 minute",
      retryAfter: Math.ceil(1 * 60),
      remainingAttempts: 0,
    });
  },
});

// Rate limiter for registration attempts
// Allows 3 attempts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: "Too many registration attempts from this IP, please try again after 1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many registration attempts from this IP, please try again after 1 hour",
      retryAfter: Math.ceil(60 * 60),
    });
  },
});

// General API rate limiter (less strict)
// Allows 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later",
      retryAfter: Math.ceil(15 * 60),
    });
  },
});

// Password reset rate limiter
// Allows 5 attempts per hour per IP
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: "Too many password reset attempts from this IP, please try again after 1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many password reset attempts from this IP, please try again after 1 hour",
      retryAfter: Math.ceil(60 * 60),
    });
  },
});

module.exports = {
  loginLimiter,
  adminLoginLimiter,
  registerLimiter,
  apiLimiter,
  passwordResetLimiter,
};
