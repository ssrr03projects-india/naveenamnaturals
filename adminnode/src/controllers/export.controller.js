const { Op } = require("sequelize");
const { order, customer, orderItem, product } = require("../models");
const puppeteer = require("puppeteer");
const fs = require("fs");
const { calculateGSTBreakdown } = require("../utils/gstCalculator");

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const getItemSnapshot = (item) => {
  let snapshot = item?.productSnapshot;
  if (typeof snapshot === "string") {
    try {
      snapshot = JSON.parse(snapshot);
    } catch {
      snapshot = {};
    }
  }
  return snapshot || {};
};

const buildGstOrderItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const snapshot = getItemSnapshot(item);
    return {
      itemId: item?.id ?? null,
      productId: item?.productId ?? null,
      productName:
        item?.productName || item?.product?.name || snapshot?.name || "Product",
      basePrice: Number(item?.unitPrice || snapshot?.price || 0),
      gstRate: Number(snapshot?.gstPercentage || 0),
      quantity: Number(item?.quantity || 0),
    };
  });

const getItemGstPercent = (item, gstBreakdown) => {
  const snapshot = getItemSnapshot(item);
  const snapshotPercent = Number(snapshot?.gstPercentage || 0);
  if (snapshotPercent > 0) return snapshotPercent;

  const matchedItem = gstBreakdown?.items?.find(
    (gstItem) => String(gstItem.itemId) === String(item?.id),
  );
  return Number(matchedItem?.gstRate || 0);
};

const formatPercent = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

const getDisplayedOrderTotal = (orderData, gstSummary) => {
  if (gstSummary?.couponApplied) {
    return (
      Number(gstSummary?.subtotalAfterDiscount || 0) +
      Number(gstSummary?.totalGst || 0) +
      Number(orderData?.shippingAmount || 0)
    );
  }

  return Number(orderData?.totalAmount || 0);
};

const getSubtotalAfterDiscount = (orderData, gstSummary) =>
  gstSummary?.couponApplied
    ? Number(gstSummary?.subtotalAfterDiscount || 0)
    : Number(orderData?.subtotal || 0);

const PUPPETEER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-zygote",
  "--single-process",
];

const buildLaunchOptions = (executablePath) => {
  const options = {
    headless: "new",
    args: PUPPETEER_ARGS,
    protocolTimeout: 120000,
  };

  if (executablePath) {
    options.executablePath = executablePath;
  }

  return options;
};

const launchPuppeteerBrowser = async () => {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;
  const candidatePaths = [
    configuredPath,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ].filter(Boolean);

  const uniqueCandidates = [...new Set(candidatePaths)];
  const launchErrors = [];

  // First try explicit/system Chromium locations when available.
  for (const path of uniqueCandidates) {
    try {
      if (!fs.existsSync(path)) continue;
      console.log(`Export PDF: trying Chromium executable at ${path}`);
      return await puppeteer.launch(buildLaunchOptions(path));
    } catch (error) {
      launchErrors.push(`${path}: ${error.message}`);
    }
  }

  // Fallback to Puppeteer's bundled browser resolution.
  try {
    console.log("Export PDF: trying bundled Puppeteer Chromium");
    return await puppeteer.launch(buildLaunchOptions());
  } catch (error) {
    launchErrors.push(`bundled: ${error.message}`);
    const details = launchErrors.join(" | ");
    const launchError = new Error(`Unable to launch Chromium for PDF export. ${details}`);
    launchError.name = "PuppeteerLaunchError";
    throw launchError;
  }
};

// Main export function
exports.exportOrdersToPDF = async (req, res) => {
  let browser;
  try {
    const {
      status,
      paymentStatus,
      customerId,
      search,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.body;

    // Build Where Clause
    let whereClause = {};

    // Status filter
    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== "all") {
      whereClause.paymentStatus = paymentStatus;
    }

    // Customer filter
    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { "$customer.firstName$": { [Op.like]: `%${search}%` } },
        { "$customer.lastName$": { [Op.like]: `%${search}%` } },
        { "$customer.email$": { [Op.like]: `%${search}%` } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setUTCHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDateTime;
      }
    }

    console.log("Exporting PDF with filters:", JSON.stringify(whereClause));

    // Fetch Orders
    const orders = await order.findAll({
      where: whereClause,
      include: [
        {
          model: customer,
          as: "customer",
          attributes: ["firstName", "lastName", "email", "phone"],
          required: search ? false : false,
        },
        {
          model: orderItem,
          as: "items",
          attributes: [
            "id",
            "productId",
            "productName",
            "quantity",
            "unitPrice",
            "totalPrice",
            "taxAmount",
            "discountAmount",
            "productSnapshot",
          ],
          include: [
            {
              model: product,
              as: "product",
              attributes: ["name"],
              required: false,
            },
          ],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: 1000, // Limit to prevent timeout
    });

    console.log(`Found ${orders.length} orders for export.`);

    // Generate HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orders Export</title>
        <style>
           body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
           .header { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
           .header h1 { margin: 0; color: #1a1a1a; font-size: 20px; }
           .header p { margin: 2px 0 0; color: #666; font-size: 12px; }
           table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 10px; }
           th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
           th { background-color: #f9fafb; font-weight: 600; color: #374151; text-transform: uppercase; font-size: 8px; letter-spacing: 0.05em; }
           tr:nth-child(even) { background-color: #f9fafb; }
           .status-badge { padding: 1px 4px; border-radius: 3px; font-size: 8px; font-weight: 500; display: inline-block; white-space: nowrap; }
           .status-paid { background-color: #dcfce7; color: #166534; }
           .status-pending { background-color: #fef9c3; color: #854d0e; }
           .status-failed { background-color: #fee2e2; color: #991b1b; }
           .text-right { text-align: right; }
           .address-cell { max-width: 150px; white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="float: right; text-align: right;">
             <p>Generated: ${new Date().toLocaleString("en-IN")}</p>
             <p>Count: ${orders.length} Orders</p>
          </div>
          <h1>Naveenam Naturals</h1>
          <p>Order List Export</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Order #</th>
              <th style="width: 80px;">Date & Time</th>
              <th>Customer</th>
              <th class="address-cell">Shipping Address</th>
              <th style="width: 60px;">Status</th>
              <th style="width: 60px;">Payment</th>
              <th style="width: 160px;">Products</th>
              <th class="text-right">Subtotal After Discount</th>
              <th class="text-right">Ship</th>
              <th class="text-right">GST</th>
              <th class="text-right">Disc</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map((o) => {
                let address = o.address || {};
                // Handle JSON string case
                if (typeof address === "string") {
                  try {
                    address = JSON.parse(address);
                  } catch (e) {
                    address = {};
                  }
                }

                const addrLine =
                  address.address ||
                  address.address_line_1 ||
                  address.street ||
                  "";
                const city = address.city || "";
                const state = address.state || address.stateCode || "";
                const zip = address.postalCode || address.pincode || "";

                const addressStr = [addrLine, city, state, zip]
                  .filter(Boolean)
                  .join(", ");
                const dateStr = new Date(o.createdAt).toLocaleDateString(
                  "en-IN",
                );
                const timeStr = new Date(o.createdAt).toLocaleTimeString(
                  "en-IN",
                  { hour: "2-digit", minute: "2-digit" },
                );
                const productsStr = (o.items || [])
                  .map((item) => {
                    const name =
                      item.productName || item.product?.name || "Product";
                    const qty = Number(item.quantity || 0);
                    return `${name} (x${qty})`;
                  })
                  .join(", ");
                const gstSummary = calculateGSTBreakdown(
                  buildGstOrderItems(o.items),
                  o.discountAmount,
                );
                const displayedOrderTotal = getDisplayedOrderTotal(
                  o,
                  gstSummary,
                );
                const subtotalAfterDiscount = getSubtotalAfterDiscount(o, gstSummary);
                const gstBreakdown =
                  gstSummary.couponApplied && gstSummary.groupedByRate.length > 0
                  ? `${gstSummary.groupedByRate
                      .map(
                        (group) =>
                          `GST @ ${formatPercent(group.gstRate)}% = ₹${group.gstAmount.toFixed(2)}`,
                      )
                      .join(" | ")} | Total GST = ₹${gstSummary.totalGst.toFixed(2)}`
                  : (o.items || [])
                      .map((item) => {
                        const name =
                          item.productName || item.product?.name || "Product";
                        const percent = formatPercent(
                          getItemGstPercent(item, gstSummary),
                        );
                        return `${name}: ${percent}%`;
                      })
                      .join(", ");

                return `
              <tr>
                <td>${o.orderNumber}</td>
                <td>${dateStr}<br/><span style="color:#666; font-size: 8px;">${timeStr}</span></td>
                <td>
                  ${o.customer ? o.customer.firstName + " " + o.customer.lastName : "Guest"}<br/>
                  <span style="color:#666; font-size: 8px;">${o.customer ? o.customer.phone || "" : ""}</span>
                </td>
                <td class="address-cell">${addressStr}</td>
                <td>${o.status.toUpperCase()}</td>
                <td>
                  <span class="status-badge ${o.paymentStatus === "paid" ? "status-paid" : o.paymentStatus === "pending" ? "status-pending" : "status-failed"}">
                    ${o.paymentStatus ? o.paymentStatus.toUpperCase() : "-"}
                  </span>
                </td>
                <td>${productsStr || "-"}</td>
                <td class="text-right">${formatCurrency(subtotalAfterDiscount)}</td>
                <td class="text-right">${formatCurrency(o.shippingAmount || 0)}</td>
                <td class="text-right">
                  ${formatCurrency(gstSummary.totalGst)}
                  <br/>
                  <span style="color:#666; font-size: 8px;">
                    Included: ${gstBreakdown || "-"}
                  </span>
                </td>
                <td class="text-right text-red-600">${o.discountAmount ? "-" + formatCurrency(o.discountAmount) : "0"}</td>
                <td class="text-right" style="font-weight:bold;">${formatCurrency(displayedOrderTotal)}</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Launch Puppeteer
    // Use --no-sandbox args for some server environments (e.g. docker/linux without dedicated user)
    browser = await launchPuppeteerBrowser();

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "15px", right: "15px", bottom: "15px", left: "15px" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=orders-export-${Date.now()}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Export PDF error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF export",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn("Export PDF browser close warning:", closeError.message);
      }
    }
  }
};
