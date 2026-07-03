import { NextRequest, NextResponse } from "next/server";

// Proxy the request to the real backend, which calls Shiprocket.
const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";
const WAREHOUSE_PINCODE = process.env.WAREHOUSE_PINCODE || "636010";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pincode = searchParams.get("pincode");

    if (!pincode) {
      return NextResponse.json(
        { success: false, message: "Pincode is required" },
        { status: 400 },
      );
    }

    // Validate Indian pincode format (6 digits, non-zero start)
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(pincode)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid pincode format. Please enter a valid 6-digit pincode",
        },
        { status: 400 },
      );
    }

    // Call the real backend which connects to Shiprocket.
    const backendRes = await fetch(
      `${BACKEND_API_URL}/api/shipping/check-pincode`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originPincode: WAREHOUSE_PINCODE,
          destPincode: pincode,
        }),
      },
    );

    if (!backendRes.ok) {
      throw new Error(`Backend returned ${backendRes.status}`);
    }

    const data = await backendRes.json();

    if (data.success && data.data?.serviceable) {
      return NextResponse.json({
        success: true,
        data: {
          serviceable: true,
          estimatedDays: data.data?.estimatedDays || 4,
          shippingRate: data.data?.shippingRate,
          provider: data.data?.provider,
          courierName: data.data?.courierName,
          courierCompanyId: data.data?.courierCompanyId,
          zone: data.data?.zone,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        serviceable: false,
        message: "Delivery not available to this pincode",
      },
    });
  } catch (error: unknown) {
    console.error("Shipping check proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        data: {
          serviceable: false,
          message: "Unable to verify shipping availability right now.",
        },
      },
      { status: 502 },
    );
  }
}
