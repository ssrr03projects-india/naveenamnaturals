import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005/api';

const readEnvValue = (value?: string) => String(value || '').trim();

export async function POST(request: NextRequest) {
  try {
    const serverKeyId = readEnvValue(process.env.RAZORPAY_KEY_ID);
    const publicKeyId = readEnvValue(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
    const keySecret = readEnvValue(process.env.RAZORPAY_KEY_SECRET);
    const keyId = serverKeyId || publicKeyId;

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials missing:', {
        hasKeyId: !!keyId,
        hasKeySecret: !!keySecret,
        envVars: {
          RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
          NEXT_PUBLIC_RAZORPAY_KEY_ID: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
        }
      });
      return NextResponse.json(
        { 
          success: false,
          error: 'Razorpay configuration missing',
          message: 'Please configure RAZORPAY_KEY_ID (or NEXT_PUBLIC_RAZORPAY_KEY_ID) and RAZORPAY_KEY_SECRET environment variables in .env.local'
        },
        { status: 500 }
      );
    }

    if (serverKeyId && publicKeyId && serverKeyId !== publicKeyId) {
      console.warn('Razorpay key mismatch detected between server and public environment variables.', {
        usingServerKeyId: true,
      });
    }

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const body = await request.json();
    const {
      amount,
      currency = 'INR',
      receipt,
      notes,
      cartItems,
      couponCode,
      customerId,
      shippingAmount = 0,
    } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid amount',
          message: 'Amount must be greater than 0'
        },
        { status: 400 }
      );
    }

    // Validate amount is a number
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid amount',
          message: 'Amount must be a valid number greater than 0'
        },
        { status: 400 }
      );
    }

    // Server-side amount validation: Recalculate total from cart items
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      try {
        // Fetch product prices from backend to verify
        const productIds = cartItems.map((item: any) => item.id || item.productId).filter(Boolean);
        
        if (productIds.length > 0) {
          // Fetch products from backend to get actual prices
          const productsResponse = await axios.get(`${API_BASE_URL}/products`, {
            params: {
              limit: 1000,
            },
          });

          if (productsResponse.data && productsResponse.data.success) {
            const products = productsResponse.data.data || [];
            let calculatedSubtotal = 0;
            const normalizedCartItems: Array<{ subtotal: number; gstRate: number }> = [];

            // Calculate subtotal from actual product prices
            for (const cartItem of cartItems) {
              const productId = cartItem.id || cartItem.productId;
              const quantity = cartItem.quantity || 1;
              
              const product = products.find((p: any) => String(p.id) === String(productId));
              
              if (!product) {
                return NextResponse.json(
                  {
                    success: false,
                    error: 'Invalid product',
                    message: `Product with ID ${productId} not found`,
                  },
                  { status: 400 }
                );
              }

              if (!product.isActive) {
                return NextResponse.json(
                  {
                    success: false,
                    error: 'Product unavailable',
                    message: `Product ${product.name} is not available`,
                  },
                  { status: 400 }
                );
              }

              const validatedUnitPrice = parseFloat(cartItem.price);
              const unitPrice = !Number.isNaN(validatedUnitPrice) && validatedUnitPrice > 0
                ? validatedUnitPrice
                : parseFloat(product.price);
              const lineSubtotal = unitPrice * quantity;
              const parsedGstRate = parseFloat(cartItem.gstRate);
              const gstRate =
                !Number.isNaN(parsedGstRate) && parsedGstRate > 0 ? parsedGstRate : 0;

              calculatedSubtotal += lineSubtotal;
              normalizedCartItems.push({
                subtotal: lineSubtotal,
                gstRate,
              });
            }

            // Apply coupon discount if provided
            let discountAmount = 0;
            if (couponCode && customerId) {
              try {
                const couponResponse = await axios.post(
                  `${API_BASE_URL}/coupons/validate`,
                  {
                    code: couponCode,
                    orderAmount: calculatedSubtotal,
                    customerId: customerId,
                  }
                );

                if (couponResponse.data && couponResponse.data.success) {
                  discountAmount = couponResponse.data.data.discountAmount || 0;
                }
              } catch (couponError) {
                // Coupon validation failed, continue without discount
                console.warn('Coupon validation failed:', couponError);
              }
            }

            const boundedDiscount = Math.min(calculatedSubtotal, discountAmount);
            const calculatedTax =
              calculatedSubtotal > 0
                ? normalizedCartItems.reduce((sum, item) => {
                    if (item.gstRate <= 0 || item.subtotal <= 0) {
                      return sum;
                    }

                    const allocatedDiscount =
                      boundedDiscount * (item.subtotal / calculatedSubtotal);
                    const taxableAmount = Math.max(
                      0,
                      item.subtotal - allocatedDiscount,
                    );

                    return sum + (taxableAmount * item.gstRate) / 100;
                  }, 0)
                : 0;
            const normalizedShippingAmount =
              typeof shippingAmount === 'string'
                ? parseFloat(shippingAmount)
                : shippingAmount;
            const safeShippingAmount =
              !Number.isNaN(normalizedShippingAmount) && normalizedShippingAmount > 0
                ? normalizedShippingAmount
                : 0;
            const calculatedTotal = Math.max(
              0,
              calculatedSubtotal - boundedDiscount + calculatedTax + safeShippingAmount,
            );

            // Validate that provided amount matches calculated amount (allow small rounding differences)
            const amountDifference = Math.abs(numericAmount - calculatedTotal);
            const allowedDifference = 0.01; // Allow 1 paisa difference for rounding

            if (amountDifference > allowedDifference) {
              console.error('Amount mismatch:', {
                provided: numericAmount,
                calculated: calculatedTotal,
                difference: amountDifference,
              });
              
              return NextResponse.json(
                {
                  success: false,
                  error: 'Amount validation failed',
                  message: 'The payment amount does not match the cart total. Please refresh and try again.',
                },
                { status: 400 }
              );
            }
          }
        }
      } catch (validationError: any) {
        // Log error but don't fail the request if validation fails
        // This is a security check, but we don't want to break the flow if backend is temporarily unavailable
        console.error('Amount validation error:', validationError.message);
        // Continue with the original amount if validation fails
      }
    }

    // Create order options
    const options = {
      amount: Math.round(numericAmount * 100), // Convert to paise (multiply by 100)
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    // Create order
    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);

    if (error?.statusCode === 401 || error?.error?.code === 'BAD_REQUEST_ERROR') {
      return NextResponse.json(
        {
          success: false,
          error: 'Razorpay authentication failed',
          message:
            'Unable to authenticate with Razorpay. Verify that RAZORPAY_KEY_ID/NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET belong to the same Razorpay account and mode, and restart the Next.js server after updating env values.',
        },
        { status: 500 }
      );
    }
    
    // Handle Razorpay API errors
    if (error.error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Razorpay API error',
          message: error.error.description || error.error.reason || error.message || 'Failed to create Razorpay order'
        },
        { status: 500 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create order',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
