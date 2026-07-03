"use client";
import React from "react";
import { Order } from "./types";
import { getStatusColor, formatStatus } from "./utils";
import { trackingApi } from "@/lib/api";

interface RecentOrdersTableProps {
  orders: Order[];
  loading: boolean;
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

const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  loading,
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
      // Keep recent orders usable even if live tracking is unavailable.
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
    <div className="recent_order bg-white border border-gray-200 rounded-lg p-4 md:p-6 mt-6">
      <h6 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Orders
      </h6>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-semibold text-black">
                Order
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-black">
                Products
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-black">
                Amount
              </th>
              <th className="py-3 px-4 text-right text-xs font-semibold text-black">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-black">
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-black">
                  No orders yet
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const firstItem = order.items?.[0];
                const productName = firstItem?.product?.name || "Product";
                const totalItems =
                  order.items?.reduce(
                    (sum, item) => sum + (item.quantity || 0),
                    0
                  ) || 0;

                return (
                  <tr
                    key={order.id}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onOrderClick(order.id)}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-black">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded"></div>
                        <div>
                          <div className="text-sm font-medium text-black">
                            {productName}
                          </div>
                          <div className="text-xs text-black">
                            <span className="numeric-contrast">{totalItems}</span> {totalItems === 1 ? "item" : "items"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-black numeric-contrast">
                      ₹{parseFloat(order.totalAmount as string).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {formatStatus(order.status)}
                        </span>
                        {exactStatuses[order.id] ? (
                          <span
                            className={`px-2 py-1 rounded text-[11px] font-medium ${getExactStatusColor(
                              exactStatuses[order.id],
                            )}`}
                          >
                            {exactStatuses[order.id]}
                          </span>
                        ) : getShipmentCancelledLabel(order) ? (
                          <span className="px-2 py-1 rounded text-[11px] font-medium bg-red text-black">
                            {getShipmentCancelledLabel(order)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrdersTable;
