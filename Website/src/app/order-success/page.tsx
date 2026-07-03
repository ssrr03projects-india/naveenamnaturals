"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";

const ORDER_SUCCESS_STORAGE_KEY = "nn_last_order_success";

type OrderItemSnapshot = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedSize?: string;
  image?: string;
};

type AddressSnapshot = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
};

type StoredOrderData = {
  orderId?: string | number;
  orderNumber?: string;
  paymentMethod?: string;
  paymentId?: string;
  totalAmount?: number;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  couponCode?: string;
  gstBreakdown?: {
    couponApplied?: boolean;
    couponDiscount?: number;
    subtotalAfterDiscount?: number;
    items?: Array<{
      productName: string;
      quantity: number;
      baseAmount: number;
      allocatedDiscount: number;
      taxableAmount: number;
      gstRate: number;
      gstAmount: number;
      lineTotal: number;
    }>;
    groupedByRate?: Array<{
      gstRate: number;
      gstAmount: number;
    }>;
    totalGst?: number;
  };
  shippingAmount?: number;
  paidAmount?: number;
  items?: OrderItemSnapshot[];
  address?: AddressSnapshot;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  shippingProvider?: string | null;
  shippingShipmentId?: string | null;
  shippingProviderOrderId?: string | null;
  shippingCourierName?: string | null;
  shippingLatestStatus?: string | null;
  createdAt?: string;
};

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const OrderSuccessContent = () => {
  const searchParams = useSearchParams();
  const [orderData, setOrderData] = useState<StoredOrderData | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(ORDER_SUCCESS_STORAGE_KEY);
    if (stored) {
      try {
        setOrderData(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse order success data", error);
      }
    }
  }, []);

  const orderNumber = orderData?.orderNumber || searchParams.get("orderNumber");
  const showCouponAdjustedGst =
    Boolean(orderData?.gstBreakdown?.couponApplied);
  const displayedSubtotal =
    orderData?.gstBreakdown?.subtotalAfterDiscount ?? orderData?.subtotal;
  const couponBreakdownItems = orderData?.gstBreakdown?.items || [];
  const displayedTotalPaid = showCouponAdjustedGst
    ? Number(orderData?.gstBreakdown?.subtotalAfterDiscount || 0) +
      Number(orderData?.gstBreakdown?.totalGst || 0) +
      Number(orderData?.shippingAmount || 0)
    : (orderData?.paidAmount ?? orderData?.totalAmount);

  const orderTimestamp = useMemo(() => {
    if (!orderData?.createdAt) return null;
    const date = new Date(orderData.createdAt);
    return date.toLocaleString();
  }, [orderData?.createdAt]);

  return (
    <>
      <TopNavOne
        props="style-one bg-success"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        <Breadcrumb heading="Order Success" subHeading="Order Success" />
      </div>

      <div className="py-8 sm:py-12 bg-white/70">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10">
            <div className="text-center">
              <div className="text-green-600 text-4xl">✓</div>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-4">
                Thank you for your purchase!
              </h1>
              <p className="text-secondary mt-2">
                A confirmation email has been sent to{" "}
                <span className="font-medium">
                  {orderData?.customer?.email ||
                    orderData?.address?.email ||
                    "your inbox"}
                </span>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-10">
              <div className="border border-line rounded-xl p-5">
                <div className="heading6">Order Details</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">Order Number</span>
                    <span className="font-medium">
                      {orderNumber || "Unavailable"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Date</span>
                    <span className="font-medium">
                      {orderTimestamp || new Date().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Payment Method</span>
                    <span className="font-medium capitalize">
                      {orderData?.paymentMethod || "online"}
                    </span>
                  </div>
                  {orderData?.paymentId && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Payment ID</span>
                      <span className="font-medium">{orderData.paymentId}</span>
                    </div>
                  )}
                  <div className="border-t border-line my-3 pt-3">
                    {displayedSubtotal !== undefined && displayedSubtotal !== null && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-secondary">
                          {showCouponAdjustedGst
                            ? "Subtotal (after discount)"
                            : "Subtotal"}
                        </span>
                        <span className="font-medium numeric-contrast">
                          {formatter.format(Number(displayedSubtotal))}
                        </span>
                      </div>
                    )}
                    {showCouponAdjustedGst &&
                      Number(
                        orderData?.gstBreakdown?.couponDiscount ??
                          orderData?.discountAmount ??
                          0,
                      ) > 0 && (
                        <div className="flex justify-between text-sm mb-2 text-red-500">
                          <span className="flex items-center gap-1">
                            Coupon saving
                            {orderData?.couponCode && (
                              <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {orderData?.couponCode}
                              </span>
                            )}
                          </span>
                          <span className="font-medium numeric-contrast">
                            -
                            {formatter.format(
                              Number(
                                orderData?.gstBreakdown?.couponDiscount ??
                                  orderData?.discountAmount ??
                                  0,
                              ),
                            )}
                          </span>
                        </div>
                      )}
                    {showCouponAdjustedGst
                      ? orderData?.gstBreakdown?.groupedByRate?.map((group) => (
                          <div
                            key={group.gstRate}
                            className="flex justify-between text-sm mb-2"
                          >
                            <span className="text-secondary">
                              GST @ {Number.isInteger(group.gstRate)
                                ? group.gstRate
                                : group.gstRate.toFixed(2)}
                              %
                            </span>
                            <span className="font-medium numeric-contrast">
                              {formatter.format(Number(group.gstAmount || 0))}
                            </span>
                          </div>
                        ))
                      : orderData?.taxAmount !== undefined && (
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-secondary">GST</span>
                            <span className="font-medium numeric-contrast">
                              {formatter.format(Number(orderData.taxAmount || 0))}
                            </span>
                          </div>
                        )}
                    {showCouponAdjustedGst && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-secondary">Total GST</span>
                        <span className="font-medium numeric-contrast">
                          {formatter.format(
                            Number(orderData?.gstBreakdown?.totalGst || 0),
                          )}
                        </span>
                      </div>
                    )}

                    {!showCouponAdjustedGst &&
                      orderData?.discountAmount &&
                      Number(orderData.discountAmount) > 0 && (
                        <div className="flex justify-between text-sm mb-2 text-red-500">
                          <span className="flex items-center gap-1">
                            Discount
                            {orderData?.couponCode && (
                              <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {orderData?.couponCode}
                              </span>
                            )}
                          </span>
                          <span className="font-medium numeric-contrast">
                            -
                            {formatter.format(Number(orderData.discountAmount))}
                          </span>
                        </div>
                      )}

                    {orderData?.shippingAmount !== undefined && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-secondary">Shipping</span>
                        <span className="font-medium numeric-contrast">
                          {Number(orderData.shippingAmount) === 0
                            ? "Free"
                            : formatter.format(
                                Number(orderData.shippingAmount),
                              )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-dashed border-gray-200">
                      <span>Total Paid</span>
                      <span className="text-primary numeric-contrast">
                        {displayedTotalPaid
                          ? formatter.format(Number(displayedTotalPaid))
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-line rounded-xl p-5">
                <div className="heading6">Address Information</div>
                {orderData?.address ? (
                  <div className="mt-4 text-sm space-y-1">
                    <div className="font-medium">{orderData.address.name}</div>
                    <div>{orderData.address.address}</div>
                    <div>
                      {orderData.address.city}, {orderData.address.state}{" "}
                      {orderData.address.postalCode}
                    </div>
                    <div>{orderData.address.country}</div>
                    <div className="text-secondary">
                      Phone: {orderData.address.phone}
                    </div>
                    <div className="text-secondary">
                      Email: {orderData.address.email}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-secondary">
                    Address details will be shared via email.
                  </div>
                )}
              </div>
            </div>

            {/* Tracking number card — shown only when auto-shipment succeeded */}
            {orderData?.trackingNumber && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
                <div className="text-green-600 text-3xl mt-0.5">🚚</div>
                <div>
                  <div className="font-semibold text-green-800 text-base">
                    Your shipment has been booked!
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    {orderData.shippingCourierName ||
                      orderData.shippingCarrier ||
                      "Shiprocket"}{" "}
                    AWB Number:{" "}
                    <span className="font-mono font-bold tracking-wide">
                      {orderData.trackingNumber}
                    </span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    You can track your order status in{" "}
                    <Link
                      href="/my-account"
                      className="underline font-medium"
                    >
                      My Orders
                    </Link>
                    .
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10">
              <div className="heading5">Order Summary</div>
              {orderData?.items?.length ? (
                <div className="mt-4 space-y-4">
                  {orderData.items.map((item, index) => {
                    const itemBreakdown = couponBreakdownItems[index];

                    return (
                      <div
                        key={`${item.id}-${item.selectedSize || "default"}`}
                        className="flex items-center justify-between border border-line rounded-xl p-3 sm:p-4"
                      >
                        <div className="flex items-center gap-4">
                          {item.image ? (
                            <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-surface">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-surface flex items-center justify-center text-secondary">
                              {item.name[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {itemBreakdown?.productName || item.name}
                            </div>
                            <div className="text-secondary text-sm">
                              Qty: {item.quantity}{" "}
                              {item.selectedSize && (
                                <>• Size: {item.selectedSize}</>
                              )}
                            </div>
                            {showCouponAdjustedGst && itemBreakdown ? (
                              <div className="mt-2 space-y-1 text-xs text-secondary">
                                <div className="line-through opacity-70 numeric-contrast">
                                  {formatter.format(
                                    Number(itemBreakdown.baseAmount || 0),
                                  )}
                                </div>
                                <div className="text-red-500 numeric-contrast">
                                  Coupon discount: -
                                  {formatter.format(
                                    Number(itemBreakdown.allocatedDiscount || 0),
                                  )}
                                </div>
                                <div className="numeric-contrast">
                                  Price after discount:{" "}
                                  {formatter.format(
                                    Number(itemBreakdown.taxableAmount || 0),
                                  )}
                                </div>
                                <div className="numeric-contrast">
                                  GST @ {Number(itemBreakdown.gstRate || 0)}%:{" "}
                                  {formatter.format(
                                    Number(itemBreakdown.gstAmount || 0),
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="font-semibold numeric-contrast">
                          {showCouponAdjustedGst && itemBreakdown
                            ? formatter.format(Number(itemBreakdown.lineTotal || 0))
                            : formatter.format(item.price * item.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 text-secondary">
                  Order details will be available in your account shortly.
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/product"
                className="button-main button-blue-hover w-full sm:w-auto text-center"
              >
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

const OrderSuccessPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-semibold">
              Loading order details...
            </div>
          </div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
};

export default OrderSuccessPage;
