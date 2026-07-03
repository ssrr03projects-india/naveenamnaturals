"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { OrdersTable } from "@/components/orders-table";
import { ExportPreviewDialog } from "@/components/export-preview-dialog";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { fetchOrders, type Order, type OrderFilters } from "@/lib/orders-api";
import { toast } from "sonner";

function OrdersPageContent() {
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 20,
  });
  const [showExportPreview, setShowExportPreview] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadOrders();
    }
  }, [mounted, filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetchOrders(filters, token);
      if (response.success) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    setShowExportPreview(true);
  };

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
                <h1 className="text-2xl font-bold">Orders</h1>
                <p className="text-muted-foreground mt-2">
                  View and manage customer orders
                </p>
              </div>
              <div className="px-4 lg:px-6">
                <OrdersTable
                  orders={orders}
                  loading={loading}
                  pagination={pagination}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onExport={handleExport}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <ExportPreviewDialog
        open={showExportPreview}
        onOpenChange={setShowExportPreview}
        filters={filters}
      />
    </SidebarProvider>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersPageContent />
    </ProtectedRoute>
  );
}
