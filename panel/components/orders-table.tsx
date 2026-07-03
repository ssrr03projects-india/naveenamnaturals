"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconDownload,
  IconEye,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { getShippingLabel, trackShipment } from "@/lib/shipping-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Order, OrderFilters } from "@/lib/orders-api";

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onExport: () => void;
}

export function OrdersTable({
  orders,
  loading,
  pagination,
  filters,
  onFiltersChange,
  onExport,
}: OrdersTableProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState(filters.search || "");
  const [expandedOrderId, setExpandedOrderId] = React.useState<number | null>(null);
  const [exactStatuses, setExactStatuses] = React.useState<Record<number, string>>(
    {},
  );

  React.useEffect(() => {
    let cancelled = false;

    if (!expandedOrderId) {
      return;
    }

    const expandedOrder = orders.find((order) => order.id === expandedOrderId);

    if (!expandedOrder?.trackingNumber || exactStatuses[expandedOrder.id]) {
      return;
    }

    const loadExactStatuses = async () => {
      const response = await trackShipment(expandedOrder.trackingNumber!, token, {
        sync: false,
      });
      const label =
        (response.data as { latestStatusLabel?: string } | undefined)
          ?.latestStatusLabel || "";

      if (cancelled || !label) return;

      setExactStatuses((current) => ({
        ...current,
        [expandedOrder.id]: label,
      }));
    };

    loadExactStatuses().catch(() => {
      // Keep table usable even if live tracking lookups fail.
    });

    return () => {
      cancelled = true;
    };
  }, [expandedOrderId, exactStatuses, orders, token]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0";
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      confirmed:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      processing:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      shipped:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      delivered:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      refunded:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return colors[status.toLowerCase()] || colors.pending;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      failed:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      refunded:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      partially_refunded:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[status.toLowerCase()] || colors.pending;
  };

  const getExactStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();

    if (statusLower.includes("deliver")) {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
    if (
      statusLower.includes("cancel") ||
      statusLower.includes("rto") ||
      statusLower.includes("return") ||
      statusLower.includes("ndr") ||
      statusLower.includes("exception")
    ) {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
    if (
      statusLower.includes("pickup") ||
      statusLower.includes("transit") ||
      statusLower.includes("ship") ||
      statusLower.includes("delivery")
    ) {
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
    }

    return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value, page: 1 });
  };

  const handleDownloadShippingLabel = async (
    trackingNumber: string,
    orderNumber?: string,
  ) => {
    try {
      const blob = await getShippingLabel(trackingNumber, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `label-${orderNumber || trackingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to download label";
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Orders ({pagination.totalItems})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-auto h-9"
                value={filters.startDate || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    startDate: e.target.value,
                    page: 1,
                  })
                }
                placeholder="Start Date"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                className="w-auto h-9"
                value={filters.endDate || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    endDate: e.target.value,
                    page: 1,
                  })
                }
                placeholder="End Date"
              />
            </div>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value === "all" ? undefined : value,
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.paymentStatus || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  paymentStatus: value === "all" ? undefined : value,
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="partially_refunded">
                  Partially Refunded
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={onExport}
              title="Export Orders"
            >
              <IconDownload className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading orders...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Shipping Label</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const showCouponBreakdown = Boolean(order.gstBreakdown?.couponApplied);
                    return (
                      <React.Fragment key={order.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() =>
                            setExpandedOrderId(
                              isExpanded ? null : order.id,
                            )
                          }
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium text-primary">
                                {order.orderNumber}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                #{order.id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {order.customer
                                ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() ||
                                "Guest"
                                : "Guest"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer?.email || order.email || "No email"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-sm">
                                {order.items?.length || 0} items
                              </span>
                              {isExpanded ? (
                                <IconChevronUp className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <IconChevronDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.totalAmount || 0)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                              {exactStatuses[order.id] ? (
                                <div>
                                  <Badge
                                    variant="outline"
                                    className={getExactStatusColor(
                                      exactStatuses[order.id],
                                    )}
                                  >
                                    {exactStatuses[order.id]}
                                  </Badge>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getPaymentStatusColor(
                                order.paymentStatus,
                              )}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.trackingNumber ? (
                              <span
                                className="font-mono text-xs text-primary"
                                title="View shipment details"
                              >
                                {order.trackingNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.trackingNumber ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Download shipping label"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadShippingLabel(
                                    order.trackingNumber as string,
                                    order.orderNumber,
                                  );
                                }}
                              >
                                <IconDownload className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View order details"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${order.id}`);
                              }}
                            >
                              <IconEye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="bg-muted/30 p-0"
                            >
                              <div className="p-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Qty</TableHead>
                                      <TableHead className="text-right">Unit</TableHead>
                                      {showCouponBreakdown && (
                                        <TableHead className="text-right">
                                          After Discount
                                        </TableHead>
                                      )}
                                      <TableHead className="text-right">GST</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.items && order.items.length > 0 ? (
                                      order.items.map((item, index) => {
                                        let snapshot = item.productSnapshot;
                                        if (typeof snapshot === "string") {
                                          try {
                                            snapshot = JSON.parse(snapshot);
                                          } catch {
                                            snapshot = {};
                                          }
                                        }
                                        const itemBreakdown =
                                          order.gstBreakdown?.items?.find(
                                            (entry) => Number(entry.itemId) === item.id,
                                          ) ||
                                          order.gstBreakdown?.items?.find(
                                            (entry) =>
                                              Number(entry.productId) ===
                                                Number(item.productId) &&
                                              Number(entry.quantity) ===
                                                Number(item.quantity),
                                          ) ||
                                          order.gstBreakdown?.items?.[index];
                                        const gstPercent = Number(
                                          itemBreakdown?.gstRate ||
                                            snapshot?.gstPercentage ||
                                            0,
                                        );
                                        const gstAmount = Number(
                                          itemBreakdown?.gstAmount ||
                                            item.taxAmount ||
                                            0,
                                        );
                                        return (
                                          <TableRow key={item.id}>
                                            <TableCell>
                                              <div className="font-medium">
                                                {item.product?.name || item.productName || "Product"}
                                              </div>
                                              {item.productSku && (
                                                <div className="text-xs text-muted-foreground">
                                                  SKU: {item.productSku}
                                                </div>
                                              )}
                                            </TableCell>
                                            <TableCell>{item.quantity || 0}</TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(item.unitPrice || 0)}
                                            </TableCell>
                                            {showCouponBreakdown && (
                                              <TableCell className="text-right">
                                                {formatCurrency(
                                                  Number(itemBreakdown?.taxableAmount || 0),
                                                )}
                                              </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                              {formatCurrency(gstAmount)}
                                              <div className="text-xs text-muted-foreground">
                                                ({formatPercent(gstPercent)}%)
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div>
                                                {formatCurrency(
                                                  Number(
                                                    itemBreakdown?.lineTotal ||
                                                      item.totalPrice ||
                                                      0,
                                                  ),
                                                )}
                                              </div>
                                              {gstPercent > 0 && (
                                                <div className="text-xs text-muted-foreground">
                                                  Incl. GST ({formatPercent(gstPercent)}%):{" "}
                                                  {formatCurrency(gstAmount)}
                                                </div>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })
                                    ) : (
                                      <TableRow>
                                        <TableCell
                                          colSpan={showCouponBreakdown ? 6 : 5}
                                          className="text-center text-muted-foreground"
                                        >
                                          No items
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {(pagination.currentPage - 1) * pagination.itemsPerPage +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    pagination.currentPage * pagination.itemsPerPage,
                    pagination.totalItems,
                  )}{" "}
                  of {pagination.totalItems} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      onFiltersChange({ ...filters, page: 1 })
                    }
                    disabled={pagination.currentPage === 1}
                  >
                    <IconChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        page: pagination.currentPage - 1,
                      })
                    }
                    disabled={pagination.currentPage === 1}
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm text-muted-foreground px-4">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        page: pagination.currentPage + 1,
                      })
                    }
                    disabled={
                      pagination.currentPage === pagination.totalPages
                    }
                  >
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        page: pagination.totalPages,
                      })
                    }
                    disabled={
                      pagination.currentPage === pagination.totalPages
                    }
                  >
                    <IconChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
