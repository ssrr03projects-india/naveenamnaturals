"use client";
import React from "react";
import { Order } from "./types";
import { getStatusColor, formatStatus } from "./utils";
import { trackingApi } from "@/lib/api";

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  activeFilter: string | undefined;
  onFilterChange: (filter: string) => void;
  onOrderClick: (orderId: number) => void;
}

const MAX_LIVE_STATUS_LOOKUPS = 5;
const getShipmentCancelledLabel = (order: Order) => {
  const status = String(order.status || "").toLowerCase();
  const shippingStatus = String(order.shippingLatestStatus || "").toLowerCase();
  if (
    Boolean(order.trackingNumber) &&
    status !== "cancelled" &&
    status !== "canceled" &&
    shippingStatus.includes("cancel")
  ) {
    return "Shipment Cancelled";
  }
  return "";
};

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  loading,
  activeFilter,
  onFilterChange,
  onOrderClick,
}) => {
  const [exactStatuses, setExactStatuses] = React.useState<Record<number, string>>(
    {},
  );

  React.useEffect(() => {
    let cancelled = false;

    const trackedOrders = orders
      .filter(
        (order) =>
          Boolean(order.trackingNumber) &&
          String(order.status || "").toLowerCase() !== "cancelled",
      )
      .slice(0, MAX_LIVE_STATUS_LOOKUPS);

    if (trackedOrders.length === 0) {
      setExactStatuses({});
      return;
    }

    const loadExactStatuses = async () => {
      const results = await Promise.allSettled(
        trackedOrders.map(async (order) => {
          const response = await trackingApi.getTracking(order.trackingNumber!, {
            sync: false,
          });
          const label =
            (response.data?.data as { latestStatusLabel?: string } | undefined)
              ?.latestStatusLabel || "";
          return { orderId: order.id, label };
        }),
      );

      if (cancelled) return;

      setExactStatuses((current) => {
        const next = { ...current };

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value.label) {
            next[result.value.orderId] = result.value.label;
          }
        });

        return next;
      });
    };

    loadExactStatuses().catch(() => {
      // Exact tracking is best-effort on the list view.
    });

    return () => {
      cancelled = true;
    };
  }, [orders]);

  const getExactStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();

    if (statusLower.includes("deliver")) return "bg-success text-black";
    if (
      statusLower.includes("cancel") ||
      statusLower.includes("rto") ||
      statusLower.includes("return") ||
      statusLower.includes("ndr") ||
      statusLower.includes("exception")
    ) {
      return "bg-red text-black";
    }
    if (
      statusLower.includes("pickup") ||
      statusLower.includes("transit") ||
      statusLower.includes("ship") ||
      statusLower.includes("delivery")
    ) {
      return "bg-purple text-black";
    }

    return "bg-yellow text-black";
  };

  return (
    <div className="tab text-content w-full bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <h6 className="text-lg font-semibold text-gray-900 mb-4">Your Orders</h6>
      <div className="w-full overflow-x-auto mb-4">
        <div className="flex gap-2 border-b border-gray-200">
          {["all", "pending", "delivery", "completed", "canceled"].map(
            (item, index) => (
              <button
                key={index}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeFilter === item
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => onFilterChange(item)}
              >
                {item}
              </button>
            )
          )}
        </div>
      </div>
      <div className="list_order">
        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No orders found</div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="order_item mt-4 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Order:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {order.orderNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                    {exactStatuses[order.id] ? (
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-medium ${getExactStatusColor(
                          exactStatuses[order.id],
                        )}`}
                      >
                        {exactStatuses[order.id]}
                      </span>
                    ) : getShipmentCancelledLabel(order) ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-red text-black">
                        {getShipmentCancelledLabel(order)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="list_prd px-4 md:px-5">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => {
                    const productName = item.product?.name || "Product";
                    const productSlug = item.product?.slug || item.product?.id;
                    const productLink = productSlug
                      ? `/product/${productSlug}`
                      : "/product";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 border-b border-gray-200"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-gray-200 rounded"></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qty: {item.quantity}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{parseFloat(item.price as string).toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-gray-500 text-center">
                    No items in this order
                  </div>
                )}
              </div>
              <div className="flex gap-3 p-4 bg-gray-50 rounded-b-lg">
                <button
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
                  onClick={() => onOrderClick(order.id)}
                >
                  View Details
                </button>
                {order.status !== "cancelled" &&
                  order.status !== "delivered" && (
                    <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors">
                      Cancel
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
