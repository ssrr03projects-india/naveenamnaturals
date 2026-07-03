import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";
const ORDER_SERVICE_SECRET =
  process.env.ORDER_SERVICE_SECRET || process.env.SERVICE_API_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment parameters", verified: false },
        { status: 400 },
      );
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    const isSignatureValid = generatedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Invalid payment signature", verified: false },
        { status: 400 },
      );
    }

    // If order data is provided, create order in database
    if (orderData) {
      if (!ORDER_SERVICE_SECRET) {
        console.error("ORDER_SERVICE_SECRET is not configured");
        return NextResponse.json(
          {
            success: false,
            verified: true,
            error: "Server configuration error",
            message: "Order service secret not configured",
          },
          { status: 500 },
        );
      }

      try {
        // Prepare order payload
        const orderPayload = {
          ...orderData,
          paymentId: razorpay_payment_id,
          paymentMethod: "online",
          paymentStatus: "paid",
        };

	console.log("Creating order with payload:", JSON.stringify(orderPayload, null, 2));
        console.log("API URL:", `${API_BASE_URL}/orders/public`);
        console.log("Headers:", {
          "Content-Type": "application/json",
          "x-service-secret": ORDER_SERVICE_SECRET ? "***configured***" : "***missing***",
        });

        // Create order in backend
        const orderResponse = await axios.post(
          `${API_BASE_URL}/orders/public`,
          orderPayload,
          {
            headers: {
              "Content-Type": "application/json",
              "x-service-secret": ORDER_SERVICE_SECRET,
            },
          },
        );

        if (orderResponse.data.success) {
          const orderInfo = orderResponse.data.data;
          return NextResponse.json({
            success: true,
            verified: true,
            orderId: orderInfo.orderId,
            orderNumber: orderInfo.orderNumber,
            paymentId: razorpay_payment_id,
            totalAmount: orderInfo.totalAmount,
            subtotal: orderInfo.subtotal,
            discountAmount: orderInfo.discountAmount,
            taxAmount: orderInfo.taxAmount,
            shippingAmount: orderInfo.shippingAmount,
            couponCode: orderInfo.couponCode,
            gstBreakdown: orderInfo.gstBreakdown,
            trackingNumber: orderInfo.trackingNumber || null,
            shippingCarrier: orderInfo.shippingCarrier || null,
            shippingProvider: orderInfo.shippingProvider || null,
            shippingShipmentId: orderInfo.shippingShipmentId || null,
            shippingProviderOrderId: orderInfo.shippingProviderOrderId || null,
            shippingCourierName: orderInfo.shippingCourierName || null,
            shippingLatestStatus: orderInfo.shippingLatestStatus || null,
            message: "Payment verified and order created successfully",
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              verified: true,
              error: "Payment verified but order creation failed",
              message: orderResponse.data.message || "Failed to create order",
            },
            { status: 500 },
          );
        }
      } catch (orderError: any) {
       console.error("Order creation error - Full Details:", {
          message: orderError.message,
          status: orderError.response?.status,
          statusText: orderError.response?.statusText,
          data: orderError.response?.data,
          config: {
            url: orderError.config?.url,
            method: orderError.config?.method,
            headers: orderError.config?.headers,
          }
        });
        // Payment is verified but order creation failed
        return NextResponse.json(
          {
            success: false,
            verified: true,
            error: "Payment verified but order creation failed",
            message:
              orderError.response?.data?.message ||
              orderError.message ||
              "Failed to create order",
          },
          { status: 500 },
        );
      }
    }

    // If no order data, just return verification success
    return NextResponse.json({
      success: true,
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify payment",
        message: error.message || "Unknown error",
        verified: false,
      },
      { status: 500 },
    );
  }
}
