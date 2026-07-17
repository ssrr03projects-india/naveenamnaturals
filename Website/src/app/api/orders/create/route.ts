import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005/api';
const ORDER_SERVICE_SECRET =
  process.env.ORDER_SERVICE_SECRET || process.env.SERVICE_API_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    if (!ORDER_SERVICE_SECRET) {
      console.error('ORDER_SERVICE_SECRET is not configured');
      return NextResponse.json(
        {
          success: false,
          message: 'Order service secret not configured on the server',
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const hasCustomerIdentity = Boolean(
      body.customerId || body?.address?.email,
    );

    if (!hasCustomerIdentity || !body.items || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer email (or customerId) and cart information are required',
        },
        { status: 400 }
      );
    }

    const payload = {
      ...body,
      paymentMethod: body.paymentMethod || 'cod',
      paymentStatus:
        body.paymentStatus ||
        (body.paymentMethod === 'cod' ? 'pending' : 'paid'),
    };

    const orderResponse = await axios.post(
      `${API_BASE_URL}/orders/public`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-secret': ORDER_SERVICE_SECRET,
        },
      }
    );

    return NextResponse.json(orderResponse.data);
  } catch (error: any) {
    console.error('Order creation proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Failed to create order',
      },
      { status: error.response?.status || 500 }
    );
  }
}

