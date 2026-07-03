const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { order, customer, orderItem } = require("../models");
const { getLowStockThreshold, getStockAlertLevel } = require("../utils/stockAlert");

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const LOGO_CID = "naveenam-logo";

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const money = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseAddressInput = (input) => {
  if (!input) return null;

  let parsed = input;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {
        address: parsed,
      };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  if (parsed.address && typeof parsed.address === "object" && !Array.isArray(parsed.address)) {
    return {
      ...parsed.address,
      ...parsed,
    };
  }

  return parsed;
};

const resolveShippingAddress = (orderAddress, customerAddress) => {
  const normalizedOrderAddress = parseAddressInput(orderAddress) || {};
  const normalizedCustomerAddress = parseAddressInput(customerAddress) || {};

  const merged = {
    ...normalizedCustomerAddress,
    ...normalizedOrderAddress,
  };

  const parts = [
    merged.name,
    merged.address || merged.address_line_1,
    merged.address_line_2,
    merged.landmark,
    merged.city,
    merged.state,
    merged.postalCode || merged.pincode,
    merged.country,
    merged.phone,
  ]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "Address not available";
  }

  return parts.join(", ");
};

const parseRecipients = (raw = "") =>
  String(raw || "")
    .split(/[,\n;]+/)
    .map((email) => email.trim().replace(/^['"]|['"]$/g, ""))
    .filter((email) => email.length > 0);

const getAdminRecipients = () => {
  // Support common env key variants; prioritize ADMIN_ORDER_EMAIL.
  const configured =
    process.env.ADMIN_ORDER_EMAIL ??
    process.env.ADMIN_ORDER_MAIL ??
    process.env.ADMIN_ORDER_EMAILS ??
    "";

  return parseRecipients(configured);
};

const getLowStockRecipients = () => {
  const configured =
    process.env.ADMIN_LOW_STOCK_EMAIL ??
    process.env.ADMIN_LOW_STOCK_MAIL ??
    process.env.ADMIN_LOW_STOCK_EMAILS ??
    "";

  const recipients = parseRecipients(configured);
  if (recipients.length > 0) {
    return recipients;
  }

  // Fallback to order-alert recipients when dedicated low-stock recipients are not set.
  return getAdminRecipients();
};

const getLogoConfig = () => {
  const configuredUrl = process.env.ORDER_EMAIL_LOGO_URL;
  if (configuredUrl) {
    return {
      logoSrc: configuredUrl,
      attachments: [],
    };
  }

  const logoPathCandidates = [
    path.join(__dirname, "..", "assets", "NaveenamNaturalsLogo.png"),
    path.join(__dirname, "..", "..", "..", "panel", "public", "NaveenamNaturalsLogo.png"),
  ];

  const logoPath = logoPathCandidates.find((candidate) => fs.existsSync(candidate));
  if (logoPath) {
    return {
      logoSrc: `cid:${LOGO_CID}`,
      attachments: [
        {
          filename: "NaveenamNaturalsLogo.png",
          path: logoPath,
          cid: LOGO_CID,
        },
      ],
    };
  }

  return {
    logoSrc: null,
    attachments: [],
  };
};

const buildItemsRows = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return `<tr>
      <td colspan="4" style="padding:12px;border:1px solid #e5e7eb;text-align:center;color:#6b7280;">No items available</td>
    </tr>`;
  }

  return items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const lineTaxAmount = Number(item.taxAmount || 0);
      const inclusiveLineTotal = Number(item.totalPrice || 0) + lineTaxAmount;
      const inclusiveUnitPrice =
        quantity > 0
          ? inclusiveLineTotal / quantity
          : Number(item.unitPrice || 0) + lineTaxAmount;
      const name = escapeHtml(item.productName || "Product");
      return `<tr>
        <td style="padding:10px;border:1px solid #e5e7eb;">${name}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">${quantity}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">&#8377; ${money(inclusiveUnitPrice)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">&#8377; ${money(inclusiveLineTotal)}</td>
      </tr>`;
    })
    .join("");
};

const renderHeader = (logoSrc, title, subtitle) => {
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="Naveenam Naturals" style="height:64px;max-width:220px;object-fit:contain;display:block;margin:0 auto 12px auto;" />`
    : "";

  return `
    <div style="background:#ffffff;padding:24px 20px;border-radius:14px 14px 0 0;color:#000000;text-align:center;">
      ${logoHtml}
      <h2 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(title)}</h2>
      <p style="margin:8px 0 0 0;font-size:14px;opacity:0.95;">${escapeHtml(subtitle)}</p>
    </div>
  `;
};

const renderSummaryCard = (orderData, addressText) => `
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin:0 0 14px 0;">
    <p style="margin:0 0 8px 0;"><strong>Order Number:</strong> ${escapeHtml(orderData.orderNumber || "-")}</p>
    <p style="margin:0 0 8px 0;"><strong>Order Date:</strong> ${escapeHtml(formatDateTime(orderData.createdAt))}</p>
    <p style="margin:0 0 8px 0;"><strong>Payment:</strong> ${escapeHtml(orderData.paymentMethod || "-")} (${escapeHtml(orderData.paymentStatus || "-")})</p>
    <p style="margin:0;"><strong>Shipping Address:</strong> ${escapeHtml(addressText)}</p>
  </div>
`;


const renderAmountCard = (orderData) => `
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-top:14px;">
    <p style="margin:0 0 8px 0;"><strong>Items Total:</strong> &#8377; ${money(Number(orderData.subtotal || 0) + Number(orderData.taxAmount || 0))}</p>
    <p style="margin:0 0 8px 0;"><strong>Shipping:</strong> &#8377; ${money(orderData.shippingAmount)}</p>
    <p style="margin:0 0 8px 0;"><strong>Discount:</strong> &#8377; ${money(orderData.discountAmount)}</p>
    <p style="margin:0;font-size:18px;color:#2f7d32;"><strong>Total Amount: &#8377; ${money(orderData.totalAmount)}</strong></p>
  </div>
`;

const buildCustomerEmailHtml = (orderData, { logoSrc, addressText }) => {
  const customerName =
    [orderData.customer?.firstName, orderData.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Customer";

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:720px;margin:24px auto;padding:0 12px;">
        ${renderHeader(logoSrc, `Order Confirmed - ${orderData.orderNumber}`, "Your order has been placed successfully")}
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:20px;">
          <p style="margin:0 0 14px 0;font-size:15px;">Hi ${escapeHtml(customerName)},</p>
          <p style="margin:0 0 16px 0;font-size:15px;">Thank you for your order. We have confirmed it and started processing.</p>
          ${renderSummaryCard(orderData, addressText)}
          <table style="border-collapse:collapse;width:100%;margin-top:12px;background:#ffffff;">
            <thead>
              <tr style="background:#eff8f0;">
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Item</th>
                <th style="padding:10px;border:1px solid #e5e7eb;">Qty</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Price</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${buildItemsRows(orderData.items)}</tbody>
          </table>
          ${renderAmountCard(orderData)}
          <p style="margin:18px 0 0 0;font-size:14px;color:#374151;">Need help? Reply to this email and we will assist you.</p>
        </div>
      </div>
    </body>
  </html>`;
};

const buildAdminEmailHtml = (orderData, { logoSrc, addressText }) => {
  const customerName =
    [orderData.customer?.firstName, orderData.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Customer";
  const dashboardBase = process.env.ADMIN_DASHBOARD_URL || "http://localhost:3002";
  const orderLink = `${dashboardBase}/orders/${orderData.id}`;

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:720px;margin:24px auto;padding:0 12px;">
        ${renderHeader(logoSrc, `New Confirmed Order - ${orderData.orderNumber}`, "Admin order alert")}
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:20px;">
          <p style="margin:0 0 14px 0;font-size:15px;"><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
          <p style="margin:0 0 8px 0;font-size:14px;"><strong>Email:</strong> ${escapeHtml(orderData.customer?.email || "-")}</p>
          <p style="margin:0 0 8px 0;font-size:14px;"><strong>Phone:</strong> ${escapeHtml(orderData.customer?.phone || "-")}</p>
          ${renderSummaryCard(orderData, addressText)}
          <table style="border-collapse:collapse;width:100%;margin-top:12px;background:#ffffff;">
            <thead>
              <tr style="background:#eff8f0;">
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Item</th>
                <th style="padding:10px;border:1px solid #e5e7eb;">Qty</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Price</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${buildItemsRows(orderData.items)}</tbody>
          </table>
          ${renderAmountCard(orderData)}
          <div style="margin-top:16px;">
            <a href="${orderLink}" style="display:inline-block;background:#2f7d32;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:14px;">Open in Dashboard</a>
          </div>
        </div>
      </div>
    </body>
  </html>`;
};

const buildLowStockEmailHtml = (alertData, { logoSrc, threshold }) => {
  const dashboardBase = process.env.ADMIN_DASHBOARD_URL || "http://localhost:3002";
  const productLink = `${dashboardBase}/products`;
  const variantLabel = alertData.variantName
    ? `${alertData.productName} - ${alertData.variantName}`
    : alertData.productName;
  const alertLevel = getStockAlertLevel(alertData.currentStock);
  const statusText =
    alertLevel === "out_of_stock" ? "Out of stock" : "Low stock threshold reached";

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:720px;margin:24px auto;padding:0 12px;">
        ${renderHeader(logoSrc, "Inventory Alert", statusText)}
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:20px;">
          <p style="margin:0 0 12px 0;font-size:15px;"><strong>Product Variant:</strong> ${escapeHtml(variantLabel || "Unknown variant")}</p>
          <p style="margin:0 0 8px 0;font-size:14px;"><strong>SKU:</strong> ${escapeHtml(alertData.sku || "-")}</p>
          <p style="margin:0 0 8px 0;font-size:14px;"><strong>Previous Stock:</strong> ${escapeHtml(alertData.previousStock)}</p>
          <p style="margin:0 0 8px 0;font-size:14px;"><strong>Current Stock:</strong> ${escapeHtml(alertData.currentStock)}</p>
          <p style="margin:0 0 8px 0;font-size:14px;"><strong>Threshold:</strong> ${escapeHtml(threshold)}</p>
          ${
            alertData.orderNumber
              ? `<p style="margin:0 0 8px 0;font-size:14px;"><strong>Triggered By Order:</strong> ${escapeHtml(alertData.orderNumber)}</p>`
              : ""
          }
          <p style="margin:16px 0 0 0;font-size:14px;color:#374151;">Please replenish this variant to avoid stockouts.</p>
          <div style="margin-top:16px;">
            <a href="${productLink}" style="display:inline-block;background:#2f7d32;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:14px;">Open Products</a>
          </div>
        </div>
      </div>
    </body>
  </html>`;
};

const sendWithRetry = async (label, fn) => {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await fn();
      return { success: true };
    } catch (error) {
      lastError = error;
      console.error(`[OrderMail] ${label} attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }
  return { success: false, error: lastError };
};

const sendOrderConfirmationEmails = async (orderId) => {
  try {
    const orderData = await order.findByPk(orderId, {
      include: [
        {
          model: customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone", "address"],
        },
        {
          model: orderItem,
          as: "items",
          attributes: [
            "id",
            "productName",
            "quantity",
            "unitPrice",
            "totalPrice",
            "taxAmount",
          ],
        },
      ],
    });

    if (!orderData) {
      console.warn(`[OrderMail] Order ${orderId} not found`);
      return;
    }

    const shouldSendOrderEmails =
      orderData.status === "confirmed" || orderData.paymentStatus === "paid";
    if (!shouldSendOrderEmails) {
      return;
    }

    const fromAddress = process.env.FROM_EMAIL || process.env.EMAIL_USER;
    if (!fromAddress || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("[OrderMail] Email credentials missing. Skipping confirmation emails.");
      return;
    }

    const transporter = createTransporter();
    const logoConfig = getLogoConfig();
    const shippingAddressText = resolveShippingAddress(
      orderData.address,
      orderData.customer?.address,
    );

    // Customer email
    if (!orderData.customerMailSentAt && orderData.customer?.email) {
      const customerResult = await sendWithRetry(
        `customer email for order ${orderData.orderNumber}`,
        async () => {
          await transporter.sendMail({
            from: `"Naveenam Naturals" <${fromAddress}>`,
            to: orderData.customer.email,
            subject: `Order Confirmed - ${orderData.orderNumber}`,
            html: buildCustomerEmailHtml(orderData, {
              logoSrc: logoConfig.logoSrc,
              addressText: shippingAddressText,
            }),
            attachments: logoConfig.attachments,
          });
        },
      );

      if (customerResult.success) {
        await orderData.update({
          customerMailSentAt: new Date(),
          customerMailError: null,
        });
      } else {
        await orderData.update({
          customerMailError:
            customerResult.error?.message || "Failed to send customer email",
        });
      }
    }

    // Admin email
    const adminRecipients = getAdminRecipients();
    if (!orderData.adminMailSentAt && adminRecipients.length > 0) {
      console.log(
        `[OrderMail] Admin recipients for ${orderData.orderNumber}: ${adminRecipients.join(", ")}`,
      );
      const adminResult = await sendWithRetry(
        `admin email for order ${orderData.orderNumber}`,
        async () => {
          await transporter.sendMail({
            from: `"Naveenam Naturals" <${fromAddress}>`,
            to: adminRecipients,
            subject: `Confirmed Order Alert - ${orderData.orderNumber}`,
            html: buildAdminEmailHtml(orderData, {
              logoSrc: logoConfig.logoSrc,
              addressText: shippingAddressText,
            }),
            attachments: logoConfig.attachments,
          });
        },
      );

      if (adminResult.success) {
        await orderData.update({
          adminMailSentAt: new Date(),
          adminMailError: null,
        });
      } else {
        await orderData.update({
          adminMailError:
            adminResult.error?.message || "Failed to send admin email",
        });
      }
    }
  } catch (error) {
    console.error(`[OrderMail] Failed to process order ${orderId}:`, error);
  }
};

const sendLowStockAlertEmail = async (alertData) => {
  try {
    const fromAddress = process.env.FROM_EMAIL || process.env.EMAIL_USER;
    if (!fromAddress || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("[OrderMail] Email credentials missing. Skipping low-stock email.");
      return { success: false, message: "Email credentials missing" };
    }

    if (!alertData || typeof alertData !== "object") {
      console.warn("[OrderMail] Invalid low-stock payload. Skipping email.");
      return { success: false, message: "Invalid low-stock payload" };
    }

    const recipients = getLowStockRecipients();
    if (recipients.length === 0) {
      console.warn("[OrderMail] No low-stock recipients configured. Skipping email.");
      return { success: false, message: "No low-stock recipients configured" };
    }

    const threshold = Number.isFinite(alertData.threshold)
      ? alertData.threshold
      : getLowStockThreshold();
    const currentStock = Number(alertData.currentStock || 0);
    const alertLevel = getStockAlertLevel(currentStock);
    const subjectPrefix =
      alertLevel === "out_of_stock" ? "Out of Stock Alert" : "Low Stock Alert";

    const transporter = createTransporter();
    const logoConfig = getLogoConfig();
    const variantLabel = alertData.variantName
      ? `${alertData.productName} - ${alertData.variantName}`
      : alertData.productName || "Unknown Variant";

    await sendWithRetry(`low-stock email for ${variantLabel}`, async () => {
      await transporter.sendMail({
        from: `"Naveenam Naturals" <${fromAddress}>`,
        to: recipients,
        subject: `${subjectPrefix} - ${variantLabel}`,
        html: buildLowStockEmailHtml(
          {
            ...alertData,
            previousStock: Number(alertData.previousStock || 0),
            currentStock,
          },
          {
            logoSrc: logoConfig.logoSrc,
            threshold,
          },
        ),
        attachments: logoConfig.attachments,
      });
    });
    return { success: true, message: "Low-stock email sent" };
  } catch (error) {
    console.error("[OrderMail] Failed to send low-stock email:", error);
    return { success: false, message: error.message || "Failed to send low-stock email" };
  }
};

const queueOrderConfirmationEmails = (orderId) => {
  setImmediate(() => {
    sendOrderConfirmationEmails(orderId).catch((error) => {
      console.error(`[OrderMail] Queue execution failed for order ${orderId}:`, error);
    });
  });
};

const queueLowStockAlertEmail = (alertData) => {
  setImmediate(() => {
    sendLowStockAlertEmail(alertData).catch((error) => {
      console.error("[OrderMail] Queue execution failed for low-stock email:", error);
    });
  });
};

module.exports = {
  sendOrderConfirmationEmails,
  queueOrderConfirmationEmails,
  sendLowStockAlertEmail,
  queueLowStockAlertEmail,
};
