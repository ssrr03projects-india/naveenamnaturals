"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { CouponsTable } from "@/components/coupons-table";
import { AddCouponModal } from "@/components/add-coupon-modal";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  fetchCoupons,
  createCoupon,
  deleteCoupon,
  type Coupon,
  type CouponFilters,
  type CreateCouponData,
} from "@/lib/coupons-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

function CouponsPageContent() {
  const [mounted, setMounted] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = useState<CouponFilters>({
    page: 1,
    limit: 20,
  });
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadCoupons();
    }
  }, [mounted, filters]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetchCoupons(filters, token);
      if (response.success) {
        setCoupons(response.data.coupons);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error loading coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (data: CreateCouponData) => {
    try {
      await createCoupon(data, token);
      toast.success("Coupon created successfully");
      loadCoupons();
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      toast.error(error.message || "Failed to create coupon");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCoupon(id, token);
      toast.success("Coupon deleted successfully");
      loadCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Failed to delete coupon");
    }
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
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Coupons</h1>
                    <p className="text-muted-foreground mt-2">
                      Create and manage discount coupons
                    </p>
                  </div>
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add Coupon
                  </Button>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                <CouponsTable
                  coupons={coupons}
                  loading={loading}
                  pagination={pagination}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <AddCouponModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateCoupon}
      />
    </SidebarProvider>
  );
}

export default function CouponsPage() {
  return (
    <ProtectedRoute>
      <CouponsPageContent />
    </ProtectedRoute>
  );
}
