import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";
const ORDER_SERVICE_SECRET =
  process.env.ORDER_SERVICE_SECRET || process.env.SERVICE_API_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    if (!ORDER_SERVICE_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "Order service secret not configured",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || body?.phoneNumber || "").trim();

    if (!email && !phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Email or phone is required",
        },
        { status: 400 },
      );
    }

    const response = await axios.post(
      `${API_BASE_URL}/customers/public/lookup`,
      { email, phone },
      {
        headers: {
          "Content-Type": "application/json",
          "x-service-secret": ORDER_SERVICE_SECRET,
        },
      },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to lookup customer",
      },
      { status: error.response?.status || 500 },
    );
  }
}
