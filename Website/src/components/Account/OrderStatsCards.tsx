"use client";
import React from "react";
import { OrderStats } from "./types";

interface OrderStatsCardsProps {
  stats: OrderStats;
  loading: boolean;
}

const OrderStatsCards: React.FC<OrderStatsCardsProps> = ({
  stats,
  loading,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-1">Awaiting Pickup</div>
        <div className="text-2xl font-semibold text-gray-900 numeric-contrast">
          {loading ? "..." : stats.awaitingPickup}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-1">Cancelled</div>
        <div className="text-2xl font-semibold text-gray-900 numeric-contrast">
          {loading ? "..." : stats.cancelledOrders}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-1">Total Orders</div>
        <div className="text-2xl font-semibold text-gray-900 numeric-contrast">
          {loading ? "..." : stats.totalOrders}
        </div>
      </div>
    </div>
  );
};

export default OrderStatsCards;
