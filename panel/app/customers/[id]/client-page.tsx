"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { fetchCustomer, type Customer } from "@/lib/customers-api";
import { fetchOrders, type Order } from "@/lib/orders-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function CustomerDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const customerId = params.id as string;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && customerId) {
      loadCustomer();
    }
  }, [mounted, customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetchCustomer(customerId, token);
      if (response.success) {
        let customerData = response.data;
        // Parse address if it is a string
        if (customerData.address && typeof customerData.address === "string") {
          try {
            const parsedAddress = JSON.parse(customerData.address);
            customerData = { ...customerData, address: parsedAddress };
          } catch (e) {
            console.error("Failed to parse address:", e);
          }
        }
        setCustomer(customerData);
      }
    } catch (error) {
      console.error("Error loading customer:", error);
      toast.error("Failed to load customer");
      router.push("/customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && customer) {
      loadOrders(customer);
    }
  }, [mounted, customer]);

  const loadOrders = async (activeCustomer: Customer) => {
    try {
      setOrdersLoading(true);
      const response = await fetchOrders(
        {
          page: 1,
          limit: 200,
        },
        token,
      );
      if (response.success) {
        const filtered = response.data.orders.filter((order) => {
          if (order.customerId) {
            return order.customerId === activeCustomer.id;
          }
          if (order.customer?.id) {
            return order.customer.id === activeCustomer.id;
          }
          const orderEmail = order.customer?.email || order.email;
          return (
            orderEmail?.toLowerCase() === activeCustomer.email.toLowerCase()
          );
        });
        setOrders(filtered);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateOptional = (dateString?: string) => {
    if (!dateString) return "-";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (dateString: string) => {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const ordersByDay = useMemo(() => {
    const totals = new Map<string, number>();
    orders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
      const amount = Number(order.totalAmount || 0);
      totals.set(
        dateKey,
        (totals.get(dateKey) || 0) + (Number.isFinite(amount) ? amount : 0),
      );
    });
    return Array.from(totals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([date, amount]) => ({
        date,
        amount,
      }));
  }, [orders]);

  const orderChartConfig = {
    orders: {
      label: "Order Value",
      color: "var(--chart-2)",
    },
    label: {
      color: "var(--background)",
    },
  } as const;

  const barData = ordersByDay.map((entry) => ({
    label: formatShortDate(entry.date),
    orders: entry.amount,
  }));

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
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
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Loading customer...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!customer) {
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
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The customer you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push("/customers")}>
                Back to Customers
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
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
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/customers")}
                  >
                    <IconArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {customer.firstName} {customer.lastName || ""}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Customer Profile
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              First Name
                            </div>
                            <div className="font-medium">
                              {customer.firstName}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Last Name
                            </div>
                            <div className="font-medium">
                              {customer.lastName || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Email
                            </div>
                            <div className="font-medium">{customer.email}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Phone
                            </div>
                            <div className="font-medium">
                              {customer.phone || "-"}
                            </div>
                          </div>
                          {customer.gender && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Gender
                              </div>
                              <div className="font-medium capitalize">
                                {customer.gender}
                              </div>
                            </div>
                          )}
                          {customer.dateOfBirth && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Date of Birth
                              </div>
                              <div className="font-medium">
                                {formatDateOptional(customer.dateOfBirth)}
                              </div>
                            </div>
                          )}
                          {customer.tag && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Tag
                              </div>
                              <Badge variant="outline">{customer.tag}</Badge>
                            </div>
                          )}
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Status
                            </div>
                            <Badge
                              variant={
                                customer.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {customer.status || "active"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Address Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Address
                            </div>
                            <div className="font-medium whitespace-pre-line">
                              {customer.address?.street || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Pincode
                            </div>
                            <div className="font-medium">
                              {customer.address?.pincode ||
                                orders[0]?.address?.postalCode ||
                                "-"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Statistics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Total Orders
                            </div>
                            <div className="text-2xl font-bold">
                              {orders.length ||
                                customer.orderCount ||
                                customer.ordersCount ||
                                0}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Newsletter
                            </div>
                            <div className="font-medium">
                              {customer.subscribedToNewsletter ? (
                                <Badge variant="default">Subscribed</Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Not Subscribed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {ordersLoading ? (
                          <div className="text-muted-foreground">
                            Loading orders...
                          </div>
                        ) : orders.length === 0 ? (
                          <div className="text-muted-foreground">
                            No orders found.
                          </div>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Order</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Start Payment</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orders.map((order) => (
                                  <TableRow key={order.id}>
                                    <TableCell className="font-medium">
                                      {order.orderNumber || `#${order.id}`}
                                    </TableCell>
                                    <TableCell>
                                      {formatDateOptional(order.createdAt)}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      <Badge
                                        variant="outline"
                                        className="capitalize"
                                      >
                                        {order.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {order.paymentStatus}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Order Value</CardTitle>
                        <div className="text-sm text-muted-foreground">
                          Last {Math.min(barData.length, 6)} order days
                        </div>
                      </CardHeader>
                      <CardContent>
                        {ordersLoading ? (
                          <div className="text-muted-foreground">
                            Loading orders...
                          </div>
                        ) : barData.length === 0 ? (
                          <div className="text-muted-foreground">
                            No order data available.
                          </div>
                        ) : (
                          <ChartContainer config={orderChartConfig}>
                            <BarChart
                              accessibilityLayer
                              data={barData.slice(-6)}
                              layout="vertical"
                              margin={{ right: 16 }}
                            >
                              <CartesianGrid horizontal={false} />
                              <YAxis
                                dataKey="label"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                hide
                              />
                              <XAxis dataKey="orders" type="number" hide />
                              <ChartTooltip
                                cursor={false}
                                content={
                                  <ChartTooltipContent indicator="line" />
                                }
                              />
                              <Bar
                                dataKey="orders"
                                layout="vertical"
                                fill="var(--color-orders)"
                                radius={4}
                              >
                                <LabelList
                                  dataKey="label"
                                  position="insideLeft"
                                  offset={8}
                                  className="fill-background"
                                  fontSize={12}
                                />
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Customer ID
                          </div>
                          <div className="font-mono text-sm">
                            #{customer.id}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Joined
                          </div>
                          <div className="text-sm">
                            {formatDate(customer.createdAt)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Last Updated
                          </div>
                          <div className="text-sm">
                            {formatDate(customer.updatedAt)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function CustomerDetailPage() {
  return (
    <ProtectedRoute>
      <CustomerDetailContent />
    </ProtectedRoute>
  );
}
