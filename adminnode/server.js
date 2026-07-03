require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const app = express();

// Security middleware simplified
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3000",
      "https://dashboard.naveenamnaturals.com",
      "https://www.naveenamnaturals.com",
      "https://www.dashboard.naveenamnaturals.com",
      "https://naveenamnaturals.com",
      process.env.FRONTEND_URL,
    ].filter(Boolean), // Remove any undefined values
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Accept",
    ],
  }),
);
//app.options("*", cors());
// Cookie parser middleware (must be before routes)
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy for accurate IP addresses (important for rate limiting)
// Set this if you're behind a reverse proxy (nginx, load balancer, etc.)
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// CSRF protection middleware (for state-changing operations)
const { verifyCSRFTokenSimple } = require("./src/middlewares/csrf.middleware");
// Apply CSRF protection to all POST, PUT, PATCH, DELETE requests
app.use((req, res, next) => {
  // Skip CSRF for public endpoints that use service authentication
  if (
    req.path.startsWith("/api/orders/public") ||
    req.path.startsWith("/api/coupons/public") ||
    req.path.startsWith("/api/coupons/validate")
  ) {
    return next();
  }
  return verifyCSRFTokenSimple(req, res, next);
});

// Serve static files from uploads directory with CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    // Set CORS headers for static files
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept",
    );
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "uploads")),
);

const db = require("./src/models");
const seedDatabase = require("./src/utils/seed");

const ensureProductVariantGstColumn = async () => {
  try {
    const [rows] = await db.sequelize.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'product_variants'
        AND COLUMN_NAME = 'gstPercentage'
    `);

    const hasGstColumn = Number(rows?.[0]?.count || 0) > 0;
    if (hasGstColumn) {
      console.log("GST column check: gstPercentage already exists");
      return;
    }

    await db.sequelize.query(`
      ALTER TABLE product_variants
      ADD COLUMN gstPercentage DECIMAL(5,2) NULL AFTER mrpPrice
    `);
    console.log("GST column check: added gstPercentage to product_variants");
  } catch (error) {
    console.warn(
      "GST column check failed for product_variants:",
      error.message,
    );
  }
};

const ensureOrderPackingStatusColumn = async () => {
  try {
    const [rows] = await db.sequelize.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME = 'packingStatus'
    `);

    const hasColumn = Number(rows?.[0]?.count || 0) > 0;
    if (hasColumn) {
      console.log("Packing status column check: packingStatus already exists");
      return;
    }

    await db.sequelize.query(`
      ALTER TABLE orders
      ADD COLUMN packingStatus ENUM('unpacked', 'packed') DEFAULT 'unpacked' AFTER paymentStatus
    `);
    console.log("Packing status column check: added packingStatus to orders");
  } catch (error) {
    console.warn(
      "Packing status column check failed for orders:",
      error.message,
    );
  }
};

const ensureOrderEmailColumns = async () => {
  const columns = [
    {
      name: "customerMailSentAt",
      definition: "DATETIME NULL",
      after: "refundedAt",
    },
    {
      name: "adminMailSentAt",
      definition: "DATETIME NULL",
      after: "customerMailSentAt",
    },
    {
      name: "customerMailError",
      definition: "TEXT NULL",
      after: "adminMailSentAt",
    },
    {
      name: "adminMailError",
      definition: "TEXT NULL",
      after: "customerMailError",
    },
  ];

  for (const column of columns) {
    try {
      const [rows] = await db.sequelize.query(`
        SELECT COUNT(*) AS count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND COLUMN_NAME = '${column.name}'
      `);

      const hasColumn = Number(rows?.[0]?.count || 0) > 0;
      if (hasColumn) {
        continue;
      }

      await db.sequelize.query(`
        ALTER TABLE orders
        ADD COLUMN ${column.name} ${column.definition} AFTER ${column.after}
      `);
      console.log(`Order email column check: added ${column.name} to orders`);
    } catch (error) {
      console.warn(
        `Order email column check failed for ${column.name}:`,
        error.message,
      );
    }
  }
};

const normalizeLegacyCouponPerCustomerLimit = async () => {
  try {
    const [result] = await db.sequelize.query(`
      UPDATE coupons
      SET usageLimitPerCustomer = NULL
      WHERE usageLimitPerCustomer = 1
    `);

    const affectedRows = Number(
      result?.affectedRows ?? result?.changedRows ?? 0,
    );

    if (affectedRows > 0) {
      console.log(
        `Coupon usage limit normalization: set ${affectedRows} legacy coupon(s) to unlimited per customer`,
      );
    } else {
      console.log(
        "Coupon usage limit normalization: no legacy per-customer defaults found",
      );
    }
  } catch (error) {
    console.warn("Coupon usage limit normalization failed:", error.message);
  }
};

// E-commerce Routes (Register routes first, then sync database)
const adminRoutes = require("./src/routes/admin.routes");
app.use("/api/admin", adminRoutes);
console.log("✅ Admin routes registered at /api/admin");

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Test route working" });
});
console.log("✅ Test route registered at /api/test");

const customerRoutes = require("./src/routes/customer.routes");
app.use("/api/customers", customerRoutes);
console.log("✅ Customer routes registered at /api/customers");

const productRoutes = require("./src/routes/product.routes");
app.use("/api/products", productRoutes);
console.log("✅ Product routes registered at /api/products");

const orderRoutes = require("./src/routes/order.routes");
app.use("/api/orders", orderRoutes);
console.log("✅ Order routes registered at /api/orders");

const couponRoutes = require("./src/routes/coupon.routes");
app.use("/api/coupons", couponRoutes);
console.log("✅ Coupon routes registered at /api/coupons");

const reviewRoutes = require("./src/routes/review.routes");
app.use("/api/reviews", reviewRoutes);
console.log("✅ Review routes registered at /api/reviews");

const dashboardRoutes = require("./src/routes/dashboard.routes");
app.use("/api/dashboard", dashboardRoutes);
console.log("✅ Dashboard routes registered at /api/dashboard");

const emailRoutes = require("./src/routes/email.routes");
app.use("/api/email", emailRoutes);
console.log("✅ Email routes registered at /api/email");

const homepageRoutes = require("./src/routes/homepage.routes");
app.use("/api/home", homepageRoutes);
console.log("✅ Homepage routes registered at /api/home");

const reportsRoutes = require("./src/routes/reports.routes");
app.use("/api/reports", reportsRoutes);
console.log("✅ Reports routes registered at /api/reports");

const categoryRoutes = require("./src/routes/category.routes");
app.use("/api/categories", categoryRoutes);
console.log("✅ Category routes registered at /api/categories");

const variantRoutes = require("./src/routes/variant.routes");
app.use("/api/variants", variantRoutes);
console.log("✅ Variant routes registered at /api/variants");

const shippingRoutes = require("./src/routes/shipping.routes");
app.use("/api/shipping", shippingRoutes);
console.log("✅ Shipping routes registered at /api/shipping");

const settingRoutes = require("./src/routes/setting.routes");
app.use("/api/settings", settingRoutes);
console.log("✅ Setting routes registered at /api/settings");

const trackingRoutes = require("./src/routes/tracking.routes");
app.use("/api/tracking", trackingRoutes);
console.log("✅ Tracking routes registered at /api/tracking");

const exportRoutes = require("./src/routes/export.routes");
app.use("/api/export", exportRoutes);
console.log("✅ Export routes registered at /api/export");

// Swagger Documentation
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./src/config/swagger");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
console.log("✅ Swagger docs available at /api-docs");

app.get("/", (req, res) => {
  res.send("Naveenam Naturals E-commerce API Server is running!");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Naveenam Naturals API is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler - log detailed errors but return generic messages
app.use((err, req, res, next) => {
  // Log detailed error information server-side
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    // Only log sensitive data in development
    ...(process.env.NODE_ENV === "development" && {
      body: req.body,
      query: req.query,
      params: req.params,
    }),
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Return generic error message to client (never expose sensitive details)
  const response = {
    success: false,
    message: "An error occurred while processing your request",
  };

  // Only include error details in development mode (and only non-sensitive ones)
  if (process.env.NODE_ENV === "development") {
    // Only include safe error information
    if (
      err.message &&
      !err.message.includes("password") &&
      !err.message.includes("secret") &&
      !err.message.includes("token")
    ) {
      response.error = err.message;
    }
  }

  res.status(statusCode).json(response);
});

// Database sync and server start
const PORT = process.env.PORT || 5001;

db.sequelize
  .sync({ alter: false, force: false }) // Don't alter tables to avoid index conflicts
  .then(async () => {
    console.log("✅ Tables synced");
    await ensureProductVariantGstColumn();
    await ensureOrderPackingStatusColumn();
    await ensureOrderEmailColumns();
    await normalizeLegacyCouponPerCustomerLimit();
    // Seed database with initial data
    await seedDatabase();

    // Start server after database is ready
    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database sync error:", err);

    // Check if it's the "too many keys" error
    if (
      err.name === "SequelizeDatabaseError" &&
      err.original &&
      err.original.code === "ER_TOO_MANY_KEYS"
    ) {
      console.error(
        "\n⚠️  ERROR: Too many indexes on a table (max 64 allowed)",
      );
      console.error(
        "   This usually happens when there are duplicate indexes.",
      );
      console.error(
        "   Solution: Manually remove duplicate indexes from the database.",
      );
      console.error(
        "   The server will continue to run, but table structure won't be synced.\n",
      );

      // Continue running the server even if sync fails
      app.listen(PORT, () => {
        console.log(
          `🚀 Server is running at http://localhost:${PORT} (with sync warning)`,
        );
      });
    } else {
      // For other errors, exit
      process.exit(1);
    }
  });
