"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { CustomersTable } from "@/components/customers-table";
import { AddCustomerModal } from "@/components/add-customer-modal";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  fetchCustomers,
  createCustomer,
  syncCustomerStats,
  type Customer,
  type CustomerFilters,
  type CreateCustomerData,
} from "@/lib/customers-api";
import { toast } from "sonner";

function CustomersPageContent() {
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 20,
  });
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadCustomers();
    }
  }, [mounted, filters]);

  // Auto-sync customer stats on initial load
  useEffect(() => {
    if (mounted && !hasSynced) {
      syncCustomerStats(token)
        .then(() => {
          console.log("Customer stats synced automatically");
          setHasSynced(true);
        })
        .catch((error) => {
          console.error("Failed to sync customer stats:", error);
          setHasSynced(true); // Set to true to prevent infinite retries
        });
    }
  }, [mounted, hasSynced, token]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetchCustomers(filters, token);
      if (response.success) {
        setCustomers(response.data.customers);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (data: CreateCustomerData) => {
    try {
      await createCustomer(data, token);
      toast.success("Customer created successfully");
      loadCustomers();
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast.error(error.message || "Failed to create customer");
      throw error;
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
                    <h1 className="text-2xl font-bold">Customers</h1>
                    <p className="text-muted-foreground mt-2">
                      Manage customer accounts and information
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                <CustomersTable
                  customers={customers}
                  loading={loading}
                  pagination={pagination}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateCustomer}
      />
    </SidebarProvider>
  );
}

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <CustomersPageContent />
    </ProtectedRoute>
  );
}
