"use client";

import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchSalesReport,
  fetchProductReport,
  fetchCustomerInsights,
  type SalesReportResponse,
  type ProductReportResponse,
  type CustomerInsightsResponse,
} from "@/lib/reports-api";

type PeriodOption = "7" | "30" | "90";

function ReportPageContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodOption>("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [sales, setSales] = useState<SalesReportResponse["data"] | null>(null);
  const [products, setProducts] = useState<ProductReportResponse["data"] | null>(null);
  const [customers, setCustomers] = useState<CustomerInsightsResponse["data"] | null>(null);

  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveFilters = useMemo(() => {
    if (startDate && endDate) {
      return { startDate, endDate };
    }
    return { period };
  }, [startDate, endDate, period]);

  const loadReports = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [salesRes, productRes, customerRes] = await Promise.all([
        fetchSalesReport(effectiveFilters, token),
        fetchProductReport(effectiveFilters, token),
        fetchCustomerInsights({ startDate, endDate }, token),
      ]);
      if (salesRes.success) setSales(salesRes.data);
      if (productRes.success) setProducts(productRes.data);
      if (customerRes.success) setCustomers(customerRes.data);
    } catch (error: any) {
      console.error("Report load error:", error);
      toast.error(error.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && token) {
      loadReports();
    }
  }, [mounted, token, effectiveFilters, startDate, endDate]);

  const summaryCards = [
    { label: "Revenue", value: sales?.totalRevenue ?? "0.00" },
    { label: "Orders", value: sales?.totalOrders ?? 0 },
    { label: "Customers", value: sales?.totalCustomers ?? 0 },
    { label: "Avg Order", value: sales?.avgOrderValue ?? "0.00" },
  ];

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
                <h1 className="text-2xl font-bold">Reports</h1>
                <p className="text-muted-foreground mt-2">
                  Sales, product performance, and customer insights
                </p>
              </div>

              <div className="px-4 lg:px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[160px]"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[160px]"
                  />
                  <Button variant="outline" onClick={loadReports}>
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4 lg:px-6">
                {summaryCards.map((card) => (
                  <div key={card.label} className="rounded-lg border bg-card p-4">
                    <div className="text-sm text-muted-foreground">{card.label}</div>
                    <div className="text-2xl font-semibold">{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="px-4 lg:px-6">
                <Tabs defaultValue="sales">
                  <TabsList>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sales" className="mt-4">
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Total Orders</TableHead>
                            <TableHead>Total Spent</TableHead>
                            <TableHead>Most Ordered</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center">
                                Loading sales data...
                              </TableCell>
                            </TableRow>
                          ) : sales?.customerSales?.length ? (
                            sales.customerSales.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">{row.name}</TableCell>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>{row.totalOrders}</TableCell>
                                <TableCell>₹{row.totalSpent}</TableCell>
                                <TableCell>{row.mostOrderedProduct || "-"}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center">
                                No sales data available.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="products" className="mt-4">
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity Sold</TableHead>
                            <TableHead>Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center">
                                Loading product performance...
                              </TableCell>
                            </TableRow>
                          ) : products?.topProducts?.length ? (
                            products.topProducts.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">{row.name}</TableCell>
                                <TableCell>{row.quantity}</TableCell>
                                <TableCell>₹{row.revenue}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center">
                                No product data available.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="customers" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border">
                        <div className="border-b px-4 py-3 font-semibold">
                          Top Customers
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Orders</TableHead>
                              <TableHead>Total Spent</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                  Loading customers...
                                </TableCell>
                              </TableRow>
                            ) : customers?.topCustomers?.length ? (
                              customers.topCustomers.map((row) => (
                                <TableRow key={row.id}>
                                  <TableCell className="font-medium">
                                    {row.firstName} {row.lastName}
                                  </TableCell>
                                  <TableCell>{row.email}</TableCell>
                                  <TableCell>{row.totalOrders}</TableCell>
                                  <TableCell>₹{row.totalSpent}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                  No customer data available.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="rounded-lg border p-4 space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Repeat Customer Rate
                          </div>
                          <div className="text-2xl font-semibold">
                            {customers?.repeatCustomerRate?.repeatRate ?? 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {customers?.repeatCustomerRate?.repeatCustomers ?? 0} of{" "}
                            {customers?.repeatCustomerRate?.totalCustomers ?? 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Customer Demographics
                          </div>
                          <div className="space-y-2">
                            {customers?.customerDemographics?.length ? (
                              customers.customerDemographics.map((row) => (
                                <div
                                  key={row.state}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{row.state || "Unknown"}</span>
                                  <Badge variant="secondary">{row.count}</Badge>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No demographics available.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function ReportPage() {
  return (
    <ProtectedRoute>
      <ReportPageContent />
    </ProtectedRoute>
  );
}
