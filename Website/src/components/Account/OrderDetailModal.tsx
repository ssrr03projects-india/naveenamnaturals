"use client";
import React from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { Order } from "./types";
import { getBackendAssetUrl } from "@/lib/media";
import TrackingStatus from "@/components/Tracking/TrackingStatus";

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const address =
    typeof order.address === "string"
      ? (() => {
        try {
          return JSON.parse(order.address);
        } catch {
          return {};
        }
      })()
      : order.address || {};

  const parseImages = (images: string[] | string | undefined): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === "string") {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [images];
      } catch {
        return [images];
      }
    }
    return [];
  };

  const subtotalAmount = Number(
    order.subtotal ||
    order.items?.reduce(
      (sum, item) => sum + (Number(item.totalPrice) || 0),
      0,
    ) ||
    Number(order.totalAmount) +
    Number(order.discountAmount || 0) -
    Number(order.shippingAmount || 0),
  );

  const gstBreakdown = order.gstBreakdown;
  const gstAmount = Number(gstBreakdown?.totalGst ?? order.taxAmount ?? 0);
  const showCouponBreakdown = Boolean(gstBreakdown?.couponApplied);
  const displayedSubtotal = Number(
    showCouponBreakdown
      ? gstBreakdown?.subtotalAfterDiscount ?? subtotalAmount
      : subtotalAmount,
  );
  const displayedTotalPaid = Number(
    showCouponBreakdown
      ? Number(gstBreakdown?.subtotalAfterDiscount || 0) +
          Number(gstBreakdown?.totalGst || 0) +
          Number(order.shippingAmount || 0)
      : order.totalAmount,
  );
  const getItemBreakdown = (item: NonNullable<Order["items"]>[number], index: number) => {
    const breakdownItems = gstBreakdown?.items || [];

    return (
      breakdownItems.find((entry) => Number(entry.itemId) === item.id) ||
      breakdownItems.find(
        (entry) =>
          Number(entry.productId) === Number(item.product?.id) &&
          Number(entry.quantity) === Number(item.quantity),
      ) ||
      breakdownItems[index]
    );
  };
  const normalizedOrderStatus = String(order.status || "").toLowerCase();
  const normalizedShippingStatus = String(order.shippingLatestStatus || "").toLowerCase();
  const trackingNumber = order.trackingNumber || null;
  const hasActiveTracking =
    Boolean(trackingNumber) &&
    normalizedOrderStatus !== "cancelled" &&
    !normalizedShippingStatus.includes("cancel");

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity opacity-100 pointer-events-auto p-2 pb-20 lg:p-4 lg:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1000px] max-h-[85vh] lg:max-h-[90vh] overflow-y-auto bg-surface rounded-2xl shadow-2xl border border-outline"
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-3 pt-3 pb-0 md:px-4 md:pt-4">
          <button
            type="button"
            aria-label="Close order details"
            onClick={onClose}
            className="rounded-full p-2 text-secondary hover:bg-surface-variant transition-colors"
          >
            <Icon.X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-4 md:p-8 border-b lg:border-b-0 lg:border-r border-outline">
            <h5 className="text-base md:text-xl font-semibold text-primary mb-3 md:mb-6">
              Order Details
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
              <div>
                <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                  Contact Information
                </div>
                <div className="text-sm text-primary font-medium">
                  {address?.name || "N/A"}
                </div>
                <div className="text-sm text-secondary mt-1">
                  {address?.phone || "N/A"}
                </div>
                <div className="text-sm text-secondary mt-1">
                  {address?.email || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                  Payment method
                </div>
                <div className="text-sm text-primary font-medium capitalize">
                  {order.paymentMethod || "N/A"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                  Shipping Address
                </div>
                <div className="text-sm text-primary whitespace-pre-line leading-relaxed">
                  {address?.address || "N/A"}
                </div>
                <div className="text-sm text-secondary mt-1">
                  {address?.city && `${address.city}, `}
                  {address?.state && `${address.state} `}
                  {address?.postalCode || ""}
                </div>
                <div className="text-sm text-secondary">
                  {address?.country || ""}
                </div>
              </div>
              {hasActiveTracking && trackingNumber ? (
                <div className="sm:col-span-2 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                      Shipping Status
                    </div>
                    <div className="text-sm text-primary font-medium">
                      {order.shippingCourierName ||
                        order.shippingCarrier ||
                        "Shiprocket"}{" "}
                      AWB: {trackingNumber}
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      Exact Shiprocket status is shown below.
                    </div>
                  </div>
                  <TrackingStatus awbNumber={trackingNumber} />
                </div>
              ) : trackingNumber && normalizedOrderStatus === "cancelled" ? (
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                    Shipping Status
                  </div>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                    <div className="text-sm font-medium text-red-700">
                      Shipment cancelled
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      This shipment was cancelled, so live tracking is no longer available.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="p-4 md:p-8">
            <h5 className="text-base md:text-xl font-semibold text-primary mb-3 md:mb-6">
              Order Items
            </h5>
            <div className="space-y-4">
              {order.items?.map((item, index) => {
                const itemBreakdown = getItemBreakdown(item, index);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-outline last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
                        <img
                          src={(() => {
                            const itemImages = parseImages(item.product?.images);
                            return itemImages.length > 0
                              ? getBackendAssetUrl(itemImages[0])
                              : "/images/product/default.png";
                          })()}
                          alt={
                            item.product?.name || item.productName || "Product"
                          }
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-primary">
                          {item.product?.name || item.productName || "Product"}
                        </div>
                        <div className="text-xs text-secondary mt-0.5">
                          Qty:{" "}
                          <span className="numeric-contrast">{item.quantity}</span>
                        </div>
                        {showCouponBreakdown && (
                          <div className="mt-2 space-y-1 text-[11px] text-secondary">
                            <div>
                              <span className="line-through opacity-70 numeric-contrast">
                                ₹{Number(itemBreakdown?.baseAmount || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-red-500 numeric-contrast">
                              Coupon discount: -₹
                              {Number(itemBreakdown?.allocatedDiscount || 0).toFixed(2)}
                            </div>
                            <div className="numeric-contrast">
                              Price after discount: ₹
                              {Number(itemBreakdown?.taxableAmount || 0).toFixed(2)}
                            </div>
                            <div className="numeric-contrast">
                              GST @
                              {Number(itemBreakdown?.gstRate || 0).toFixed(0)}%: ₹
                              {Number(itemBreakdown?.gstAmount || 0).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {showCouponBreakdown ? (
                        <>
                          <div className="text-sm font-semibold text-primary numeric-contrast">
                            ₹
                            {Number(itemBreakdown?.lineTotal || 0).toFixed(2)}
                          </div>
                          <div className="text-[11px] text-secondary mt-1">
                            Line total
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-primary numeric-contrast">
                            &#8377;
                            {Number(
                              itemBreakdown?.baseAmount || item.totalPrice || 0,
                            ).toFixed(2)}
                          </div>
                          <div className="text-[11px] text-secondary mt-1">
                            GST (
                            <span className="numeric-contrast">
                              {Number(itemBreakdown?.gstRate || 0).toFixed(0)}
                            </span>
                            %)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 md:mt-6 space-y-2 md:space-y-3 pt-4 md:pt-6 border-t border-outline">
              {(order.items?.length ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">
                    {showCouponBreakdown
                      ? "Subtotal (after discount)"
                      : "Subtotal"}
                  </span>
                  <span className="text-primary font-medium numeric-contrast">
                    ₹{displayedSubtotal.toFixed(2)}
                  </span>
                </div>
              )}

              {showCouponBreakdown && (
                <div className="flex justify-between text-sm text-red-500">
                  <span className="flex items-center gap-2">
                    Coupon saving
                    {(order.couponCode || order.coupon?.code) && (
                      <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wider text-red-600 font-bold border border-red-200">
                        {order.couponCode || order.coupon?.code}
                      </span>
                    )}
                  </span>
                  <span className="font-medium numeric-contrast">
                    -₹
                    {Number(
                      gstBreakdown?.couponDiscount ?? order.discountAmount ?? 0,
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              {showCouponBreakdown ? (
                <>
                  {gstBreakdown?.groupedByRate?.map((group) => (
                    <div key={group.gstRate} className="flex justify-between text-sm">
                      <span className="text-secondary">
                        GST @ {Number.isInteger(group.gstRate)
                          ? group.gstRate
                          : group.gstRate.toFixed(2)}
                        %
                      </span>
                      <span className="text-primary font-medium numeric-contrast">
                        ₹{group.gstAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Total GST</span>
                    <span className="text-primary font-medium numeric-contrast">
                      ₹{gstAmount.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">GST</span>
                  <span className="text-primary font-medium numeric-contrast">
                    &#8377;{gstAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-secondary">Shipping</span>
                <span className="text-primary font-medium">
                  {Number(order.shippingAmount) > 0
                    ? <span className="numeric-contrast">₹{Number(order.shippingAmount).toFixed(2)}</span>
                    : "Free"}
                </span>
              </div>

              {!showCouponBreakdown &&
                (Number(order.discountAmount) > 0 ||
                order.couponCode ||
                order.coupon?.code) && (
                <div className="flex justify-between text-sm text-red-500">
                  <span className="flex items-center gap-2">
                    Discount
                    {(order.couponCode || order.coupon?.code) && (
                      <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wider text-red-600 font-bold border border-red-200">
                        {order.couponCode || order.coupon?.code}
                      </span>
                    )}
                  </span>
                  <span className="font-medium numeric-contrast">
                    -₹{Number(order.discountAmount || 0).toFixed(2)}
                  </span>
                </div>
                )}

              <div className="flex justify-between text-base md:text-lg font-bold pt-3 md:pt-4 border-t border-outline mt-2">
                <span className="text-primary">Total Paid</span>
                <span className="text-success text-2xl numeric-contrast">
                  ₹{displayedTotalPaid.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-4 pb-4 pt-2 md:px-8 md:pb-8 border-t border-outline">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
