"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { BestSellingProducts } from "@/components/best-selling-products";
import { RecentOrdersTable } from "@/components/recent-orders-table";
import { SiteHeader } from "@/components/site-header";
import { ProtectedRoute } from "@/components/protected-route";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { fetchDashboardStats } from "@/lib/dashboard-api";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import type { DashboardStats } from "@/lib/dashboard-api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<"all" | "7d" | "30d" | "90d" | "custom">("90d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const latestRequestRef = useRef(0);
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const periodLabel = (() => {
    if (period === "7d") return "last 7 days";
    if (period === "30d") return "last 30 days";
    if (period === "90d") return "last 90 days";
    if (period === "custom" && (startDate || endDate)) {
      const from = startDate || "start";
      const to = endDate || "today";
      return `${from} to ${to}`;
    }
    return "all time";
  })();

  const loadDashboardData = useCallback(async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    try {
      setLoading(true);
      const statsResponse = await fetchDashboardStats(
        {
          period,
          ...(period === "custom"
            ? { startDate: startDate || undefined, endDate: endDate || undefined }
            : {}),
        },
        token,
      );

      if (requestId !== latestRequestRef.current) return;

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error: unknown) {
      console.error("Error loading dashboard data:", error);
      const message =
        error instanceof Error ? error.message : "Failed to load dashboard data";
      toast.error(message);
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, [period, startDate, endDate, token]);

  useEffect(() => {
    if (mounted && token) {
      loadDashboardData();
    }
  }, [mounted, token, loadDashboardData]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              
              <div className="px-4 lg:px-6">
                <div className="rounded-lg border p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                    <div>
                      <div className="text-sm font-medium mb-2">Filter</div>
                      <Select
                        value={period}
                        onValueChange={(value: "all" | "7d" | "30d" | "90d" | "custom") =>
                          setPeriod(value)
                        }
                      >
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="custom">Custom Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">From</div>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (period !== "custom") setPeriod("custom");
                        }}
                        className="w-full md:w-44"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">To</div>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          if (period !== "custom") setPeriod("custom");
                        }}
                        className="w-full md:w-44"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <SectionCards
                totalSales={stats?.totalSales || 0}
                totalOrders={stats?.totalOrders || 0}
                totalCustomers={stats?.totalCustomers || 0}
                totalProducts={stats?.totalProducts || 0}
                loading={loading}
              />
              {/* <div className="px-4 lg:px-6">
                <div className="rounded-lg border p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                    <div>
                      <div className="text-sm font-medium mb-2">Filter</div>
                      <Select
                        value={period}
                        onValueChange={(value: "all" | "7d" | "30d" | "90d" | "custom") =>
                          setPeriod(value)
                        }
                      >
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="custom">Custom Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">From</div>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (period !== "custom") setPeriod("custom");
                        }}
                        className="w-full md:w-44"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">To</div>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          if (period !== "custom") setPeriod("custom");
                        }}
                        className="w-full md:w-44"
                      />
                    </div>
                  </div>
                </div>
              </div> */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <ChartAreaInteractive
                  dailySales={stats?.dailySales || []}
                  periodLabel={periodLabel}
                  loading={loading}
                />
                <BestSellingProducts
                  products={stats?.bestSellingProducts || []}
                  loading={loading}
                />
              </div>
              {/* <div className="px-4 lg:px-6">
                <RecentOrdersTable
                  orders={(stats?.recentOrders || []).slice(0, 5)}
                  loading={loading}
                  title="Orders"
                  description="Last 5 orders from customers"
                />
              </div> */}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
