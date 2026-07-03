"use client";
import React from "react";
import { OrderStats, Order } from "./types";
import OrderStatsCards from "./OrderStatsCards";
import RecentOrdersTable from "./RecentOrdersTable";

interface DashboardTabProps {
  orderStats: OrderStats;
  recentOrders: Order[];
  loading: boolean;
  onOrderClick: (orderId: number) => void;
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  orderStats,
  recentOrders,
  loading,
  onOrderClick,
}) => {
  return (
    <div className="tab text-content w-full">
      <OrderStatsCards stats={orderStats} loading={loading} />
      <RecentOrdersTable
        orders={recentOrders}
        loading={loading}
        onOrderClick={onOrderClick}
      />
    </div>
  );
};

export default DashboardTab;
