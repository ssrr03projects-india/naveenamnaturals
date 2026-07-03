"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  fetchOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  type Order,
} from "@/lib/orders-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import {
  createProviderOrder,
  createShipment,
  getShippingLabel,
  cancelShipment,
  trackShipment,
} from "@/lib/shipping-api";
import {
  IconTruck,
  IconDownload,
  IconX as IconXmark,
  IconCurrencyRupee,
  IconRefresh,
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrackingStatus } from "@/components/tracking-status";

function OrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingShipment, setProcessingShipment] = useState(false);
  const [cancellingShipment, setCancellingShipment] = useState(false);
  const [syncingShipment, setSyncingShipment] = useState(false);
  const [markingRefunded, setMarkingRefunded] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const orderId = params.id as string;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && orderId) {
      loadOrder();
    }
  }, [mounted, orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await fetchOrder(orderId, token);
      if (response.success) {
        setOrder(response.data);
        // Auto-sync status from the shipping provider and silently re-fetch.
        const awb = response.data?.trackingNumber;
        if (awb) {
          trackShipment(awb, token)
            .then(async () => {
              // Re-fetch silently to pick up any status change written by backend
              const refreshed = await fetchOrder(orderId, token).catch(
                () => null,
              );
              if (refreshed?.success) setOrder(refreshed.data);
            })
            .catch(() => {
              // Non-fatal: tracking failure should not block the page
            });
        }
      }
    } catch (error) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order");
      router.push("/orders");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount?: number) => {
    const safeAmount = Number(amount || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Number.isFinite(safeAmount) ? safeAmount : 0);
  };

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0";
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  let address = order?.address || order?.billingAddress;

  if (typeof address === "string") {
    try {
      address = JSON.parse(address);
    } catch (e) {
      console.error("Error parsing address JSON:", e);
    }
  }

  const customerName = order?.customer
    ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() ||
      "Guest"
    : "Guest";
  const showCouponBreakdown = Boolean(order?.gstBreakdown?.couponApplied);
  const shippingStage = order?.shippingBookingStage || "not_created";
  const displayedTotalPaid = showCouponBreakdown
    ? Number(order?.gstBreakdown?.subtotalAfterDiscount || 0) +
      Number(order?.gstBreakdown?.totalGst || 0) +
      Number(order?.shippingAmount || 0)
    : Number(order?.totalAmount || 0);
  const shippingChargedAmount = Number(order?.shippingAmount || 0);
  const shippingQuotedAmount = Number(
    order?.shippingQuotedAmount ?? shippingChargedAmount,
  );
  const hasShippingWaiver =
    Number.isFinite(shippingQuotedAmount) &&
    shippingQuotedAmount > shippingChargedAmount;
  const shippingStageMeta =
    shippingStage === "booked" || order?.trackingNumber
      ? {
          label: order?.shippingLatestStatus || "Booked / Pickup Scheduled",
          className: "border-green-200 bg-green-50 text-green-700",
        }
      : shippingStage === "order_created"
        ? {
            label: "Shiprocket Order Created",
            className: "border-blue-200 bg-blue-50 text-blue-700",
          }
        : order?.shippingLatestStatus
          ? {
              label: "Provider Error",
              className: "border-red-200 bg-red-50 text-red-700",
              detail: order.shippingLatestStatus,
            }
          : {
              label: "Awaiting Booking",
              className: "border-amber-200 bg-amber-50 text-amber-700",
            };
  const canCreateProviderOrder =
    !order?.trackingNumber &&
    order?.packingStatus !== "packed" &&
    (shippingStage === "not_created" || !order?.shippingShipmentId);
  const canBookShipment =
    !order?.trackingNumber &&
    order?.packingStatus === "packed" &&
    (shippingStage === "order_created" ||
      shippingStage === "not_created" ||
      Boolean(order?.shippingShipmentId));
  const getItemBreakdown = (
    item: NonNullable<Order["items"]>[number],
    index: number,
  ) => {
    const breakdownItems = order?.gstBreakdown?.items || [];

    return (
      breakdownItems.find((entry) => Number(entry.itemId) === item.id) ||
      breakdownItems.find(
        (entry) =>
          Number(entry.productId) === Number(item.productId) &&
          Number(entry.quantity) === Number(item.quantity),
      ) ||
      breakdownItems[index]
    );
  };

  const handleCreateShipment = async () => {
    if (!order) return;
    try {
      setProcessingShipment(true);
      const result = await createShipment({ order_id: order.orderNumber }, token);
      if (result.success) {
        toast.success("Shipment booked and pickup scheduled successfully");
        await loadOrder();
      } else {
        toast.error("Failed to create shipment");
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Error creating shipment";
      console.error(error);
      toast.error(msg);
    } finally {
      setProcessingShipment(false);
    }
  };

  const handleCreateProviderOrder = async () => {
    if (!order) return;
    try {
      setProcessingShipment(true);
      const result = await createProviderOrder({ order_id: order.orderNumber }, token);
      if (result.success) {
        toast.success("Shiprocket order created successfully");
        await loadOrder();
      } else {
        toast.error("Failed to create Shiprocket order");
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to create Shiprocket order";
      toast.error(msg);
    } finally {
      setProcessingShipment(false);
    }
  };

  const handleDownloadLabel = async () => {
    if (!order?.trackingNumber) return;
    try {
      const blob = await getShippingLabel(order.trackingNumber, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `label-${order.trackingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download label");
    }
  };

  const handleMarkRefunded = async () => {
    if (!order) return;
    const confirmed = window.confirm(
      `Mark payment for order ${order.orderNumber} as refunded? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      setMarkingRefunded(true);
      await updateOrderPaymentStatus(order.id.toString(), "refunded", token);
      await updateOrderStatus(order.id.toString(), "refunded", token);
      toast.success("Payment marked as refunded");
      loadOrder();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to mark as refunded";
      toast.error(msg);
    } finally {
      setMarkingRefunded(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!order?.shippingProviderOrderId) return;
    const confirmed = window.confirm(
      `Cancel Shiprocket order ${order.shippingProviderOrderId}? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      setCancellingShipment(true);
      const response = await cancelShipment([order.shippingProviderOrderId], token);
      const providerCancelledOrderIds = Array.isArray(
        response.providerCancelledOrderIds,
      )
        ? response.providerCancelledOrderIds.map(String)
        : [];

      if (
        !providerCancelledOrderIds.includes(String(order.shippingProviderOrderId))
      ) {
        toast.error(
          response.message ||
            "Shiprocket has not confirmed cancellation for this order yet.",
        );
        void loadOrder();
        return;
      }

      setOrder((current) =>
        current
          ? {
              ...current,
              trackingNumber: undefined,
              shippingCarrier: undefined,
              shippingCourierName: undefined,
              shippingShipmentId: undefined,
              shippingProviderOrderId: undefined,
              shippingLatestStatus: "Cancelled",
              status: "cancelled",
              cancelledAt: current.cancelledAt || new Date().toISOString(),
              cancelledReason:
                current.cancelledReason || "Shipment cancelled via admin panel",
            }
          : current,
      );
      toast.success("Shiprocket order cancelled successfully");
      void loadOrder();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to cancel shipment";
      toast.error(msg);
    } finally {
      setCancellingShipment(false);
    }
  };

  const handleSyncShipmentStatus = async () => {
    if (!order?.trackingNumber) return;
    try {
      setSyncingShipment(true);
      await trackShipment(order.trackingNumber, token);
      await loadOrder();
      toast.success("Shipment status synced from Shiprocket");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to sync shipment status";
      toast.error(msg);
      void loadOrder();
    } finally {
      setSyncingShipment(false);
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
              <p className="text-muted-foreground">Loading order...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!order) {
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
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The order you&apos;re looking for doesn&apos;t exist.
              </p>
              <Button onClick={() => router.push("/orders")}>
                Back to Orders
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
                    onClick={() => router.push("/orders")}
                  >
                    <IconArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {order.orderNumber || `Order #${order.id}`}
                    </h1>
                    <p className="text-muted-foreground mt-1">Order Details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Items</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {order.items && order.items.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Qty</TableHead>
                                  {showCouponBreakdown ? (
                                    <>
                                      <TableHead className="text-right">
                                        Original
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Discount
                                      </TableHead>
                                      <TableHead className="text-right">
                                        After Discount
                                      </TableHead>
                                      <TableHead className="text-right">
                                        GST
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Line Total
                                      </TableHead>
                                    </>
                                  ) : (
                                    <>
                                      <TableHead className="text-right">
                                        Unit
                                      </TableHead>
                                      <TableHead className="text-right">
                                        GST
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Total
                                      </TableHead>
                                    </>
                                  )}
                                  <TableHead className="w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.items.map((item, index) => {
                                  const itemBreakdown = getItemBreakdown(
                                    item,
                                    index,
                                  );
                                  let snapshot = item.productSnapshot;
                                  if (typeof snapshot === "string") {
                                    try {
                                      snapshot = JSON.parse(snapshot);
                                    } catch {
                                      snapshot = {};
                                    }
                                  }
                                  const itemBasePrice = Number(
                                    itemBreakdown?.basePrice ||
                                      item.unitPrice ||
                                      0,
                                  );
                                  const itemBaseAmount = Number(
                                    itemBreakdown?.baseAmount ||
                                      itemBasePrice * Number(item.quantity || 0),
                                  );
                                  const itemDiscountAmount = Number(
                                    itemBreakdown?.allocatedDiscount || 0,
                                  );
                                  const itemTaxableAmount = Number(
                                    itemBreakdown?.taxableAmount ||
                                      Math.max(
                                        0,
                                        itemBaseAmount - itemDiscountAmount,
                                      ),
                                  );
                                  const itemTaxAmount = Number(
                                    itemBreakdown?.gstAmount ||
                                      item.taxAmount ||
                                      0,
                                  );
                                  const itemGstPercent = Number(
                                    itemBreakdown?.gstRate ||
                                      snapshot?.gstPercentage ||
                                      0,
                                  );
                                  const itemLineTotal = Number(
                                    itemBreakdown?.lineTotal ||
                                      item.totalPrice ||
                                      itemTaxableAmount + itemTaxAmount,
                                  );
                                  const isExpanded = expandedItemId === item.id;

                                  return (
                                    <Fragment key={item.id}>
                                      <TableRow
                                        className="cursor-pointer hover:bg-muted/40"
                                        onClick={() =>
                                          setExpandedItemId(
                                            isExpanded ? null : item.id,
                                          )
                                        }
                                      >
                                        <TableCell>
                                          <div className="font-medium">
                                            {item.product?.name ||
                                              item.productName ||
                                              "Product"}
                                          </div>
                                          {item.productSku && (
                                            <div className="text-xs text-muted-foreground">
                                              SKU: {item.productSku}
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        {showCouponBreakdown ? (
                                          <>
                                            <TableCell className="text-right">
                                              {formatCurrency(
                                                itemBaseAmount,
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                              -{" "}
                                              {formatCurrency(
                                                itemDiscountAmount,
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(
                                                itemTaxableAmount,
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div>{formatCurrency(itemTaxAmount)}</div>
                                              <div className="text-xs text-muted-foreground">
                                                @ {formatPercent(itemGstPercent)}%
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                              {formatCurrency(itemLineTotal)}
                                            </TableCell>
                                          </>
                                        ) : (
                                          <>
                                            <TableCell className="text-right">
                                              {formatCurrency(itemBasePrice)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(itemTaxAmount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div>{formatCurrency(itemLineTotal)}</div>
                                              <div className="text-xs text-muted-foreground">
                                                GST ({formatPercent(itemGstPercent)}
                                                %): {formatCurrency(itemTaxAmount)}
                                              </div>
                                            </TableCell>
                                          </>
                                        )}
                                        <TableCell className="text-right">
                                          {isExpanded ? (
                                            <IconChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
                                          ) : (
                                            <IconChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
                                          )}
                                        </TableCell>
                                      </TableRow>
                                      {isExpanded && (
                                        <TableRow>
                                          <TableCell
                                            colSpan={showCouponBreakdown ? 8 : 6}
                                            className="bg-muted/30"
                                          >
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                              <div>
                                                <span className="text-muted-foreground">
                                                  Product:
                                                </span>{" "}
                                                {item.product?.name ||
                                                  item.productName ||
                                                  "Product"}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  Quantity:
                                                </span>{" "}
                                                {item.quantity}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  {showCouponBreakdown
                                                    ? "Original Price:"
                                                    : "Unit Price:"}
                                                </span>{" "}
                                                {formatCurrency(
                                                  showCouponBreakdown
                                                    ? itemBaseAmount
                                                    : itemBasePrice,
                                                )}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  {showCouponBreakdown
                                                    ? "Coupon Discount:"
                                                    : "GST:"}
                                                </span>{" "}
                                                {showCouponBreakdown
                                                  ? `- ${formatCurrency(
                                                      itemDiscountAmount,
                                                    )}`
                                                  : `${formatPercent(
                                                      itemGstPercent,
                                                    )}% (${formatCurrency(
                                                      itemTaxAmount,
                                                    )})`}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  {showCouponBreakdown
                                                    ? "Price After Discount:"
                                                    : "Line Total:"}
                                                </span>{" "}
                                                {formatCurrency(
                                                  showCouponBreakdown
                                                    ? itemTaxableAmount
                                                    : itemLineTotal,
                                                )}
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">
                                                  {showCouponBreakdown
                                                    ? "GST:"
                                                    : "Product ID:"}
                                                </span>{" "}
                                                {showCouponBreakdown
                                                  ? `${formatPercent(
                                                      itemGstPercent,
                                                    )}% (${formatCurrency(
                                                      itemTaxAmount,
                                                    )})`
                                                  : item.productId || "-"}
                                              </div>
                                              {showCouponBreakdown && (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    Line Total:
                                                  </span>{" "}
                                                  {formatCurrency(itemLineTotal)}
                                                </div>
                                              )}
                                              {showCouponBreakdown && (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    Product ID:
                                                  </span>{" "}
                                                  {item.productId || "-"}
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            No items found.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Payment Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {showCouponBreakdown
                              ? "Subtotal (after discount)"
                              : "Subtotal"}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              showCouponBreakdown
                                ? order.gstBreakdown?.subtotalAfterDiscount
                                : order.subtotal,
                            )}
                          </span>
                        </div>

                        {order.gstBreakdown?.couponApplied &&
                        (order.gstBreakdown?.items?.length || 0) > 0 ? (
                          <>
                            <div className="flex justify-between items-center text-sm text-red-600">
                              <span className="flex items-center gap-2">
                                Coupon Saving
                                {(order.couponCode || order.coupon?.code) && (
                                  <Badge
                                    variant="outline"
                                    className="text-red-600 border-red-200 bg-red-50 text-[10px] py-0 h-5"
                                  >
                                    {order.couponCode || order.coupon?.code}
                                  </Badge>
                                )}
                              </span>
                              <span className="font-medium">
                                -{" "}
                                {formatCurrency(
                                  order.gstBreakdown?.couponDiscount ||
                                    Number(order.discountAmount),
                                )}
                              </span>
                            </div>
                            {order.gstBreakdown?.groupedByRate.map((group) => (
                              <div
                                key={group.gstRate}
                                className="flex justify-between items-center text-sm"
                              >
                                <span className="text-muted-foreground">
                                  GST @ {formatPercent(group.gstRate)}%
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(group.gstAmount)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                Total GST
                              </span>
                              <span className="font-medium">
                                {formatCurrency(order.gstBreakdown?.totalGst)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Tax</span>
                            <span className="font-medium">
                              {formatCurrency(
                                order.gstBreakdown?.totalGst ?? order.taxAmount,
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Shipping
                          </span>
                          <span className="font-medium">
                            {hasShippingWaiver ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="line-through text-muted-foreground">
                                  {formatCurrency(shippingQuotedAmount)}
                                </span>
                                <span>{formatCurrency(shippingChargedAmount)}</span>
                                <span className="text-green-600 text-xs">(Free)</span>
                              </span>
                            ) : (
                              formatCurrency(shippingChargedAmount)
                            )}
                          </span>
                        </div>

                        {!showCouponBreakdown &&
                          (order.couponCode ||
                          order.coupon?.code ||
                          (Number(order.discountAmount) || 0) > 0) && (
                          <div className="flex justify-between items-center text-sm text-red-600">
                            <span className="flex items-center gap-2">
                              Discount
                              {(order.couponCode || order.coupon?.code) && (
                                <Badge
                                  variant="outline"
                                  className="text-red-600 border-red-200 bg-red-50 text-[10px] py-0 h-5"
                                >
                                  {order.couponCode || order.coupon?.code}
                                </Badge>
                              )}
                            </span>
                            <span className="font-medium">
                              - {formatCurrency(Number(order.discountAmount))}
                            </span>
                          </div>
                          )}

                        <div className="border-t pt-4 mt-4 flex justify-between items-center">
                          <span className="font-bold text-lg">Total Paid</span>
                          <span className="font-bold text-2xl text-primary">
                            {formatCurrency(displayedTotalPaid)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t mt-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Payment Status
                            </div>
                            <Badge
                              className={
                                order.paymentStatus === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : order.paymentStatus === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                              }
                            >
                              {order.paymentStatus.toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Method
                            </div>
                            <div className="font-medium capitalize">
                              {order.paymentMethod || "-"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Shipping Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Shipping</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {order.status === "cancelled" ||
                        order.status === "refunded" ? (
                          <div className="flex flex-col gap-4">
                            <div
                              className={`flex items-center justify-center p-3 rounded-md text-sm font-medium border ${
                                order.status === "refunded"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {order.status === "refunded" ? (
                                <IconCurrencyRupee className="mr-2 h-4 w-4" />
                              ) : (
                                <IconXmark className="mr-2 h-4 w-4" />
                              )}
                              Order is{" "}
                              {order.status.charAt(0).toUpperCase() +
                                order.status.slice(1)}
                            </div>
                            {order.paymentStatus !== "refunded" && (
                              <Button
                                variant="outline"
                                className="w-full border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                                onClick={handleMarkRefunded}
                                disabled={markingRefunded}
                              >
                                <IconCurrencyRupee className="mr-2 h-4 w-4" />
                                {markingRefunded
                                  ? "Processing..."
                                  : "Mark Payment as Refunded"}
                              </Button>
                            )}
                          </div>
                        ) : !order.trackingNumber ? (
                          <div className="space-y-3">
                            <Badge
                              variant="outline"
                              className={shippingStageMeta.className}
                            >
                              {shippingStageMeta.label}
                            </Badge>
                            {shippingStageMeta.detail && (
                              <div className="text-xs text-muted-foreground">
                                {shippingStageMeta.detail}
                              </div>
                            )}
                            {shippingStage === "order_created" &&
                              order.packingStatus !== "packed" && (
                                <div className="text-xs text-muted-foreground">
                                  Shiprocket order is ready. AWB assignment and
                                  pickup will start when this order is marked as
                                  packed.
                                </div>
                              )}
                            {canCreateProviderOrder && (
                              <Button
                                className="w-full"
                                onClick={handleCreateProviderOrder}
                                disabled={processingShipment}
                              >
                                {processingShipment
                                  ? "Creating..."
                                  : order.shippingLatestStatus
                                    ? "Retry Shiprocket Order"
                                    : "Create Shiprocket Order"}
                                <IconTruck className="ml-2 h-4 w-4" />
                              </Button>
                            )}
                            {canBookShipment && (
                              <Button
                                className="w-full"
                                onClick={handleCreateShipment}
                                disabled={processingShipment}
                              >
                                {processingShipment
                                  ? "Booking..."
                                  : shippingStage === "not_created"
                                    ? "Create & Book Shipment"
                                    : "Retry Booking"}
                                <IconTruck className="ml-2 h-4 w-4" />
                              </Button>
                            )}
                            {shippingStage === "order_created" &&
                              order.shippingProviderOrderId &&
                              order.status !== "delivered" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={handleCancelShipment}
                                  disabled={cancellingShipment}
                                >
                                  <IconXmark className="mr-2 h-4 w-4" />
                                  {cancellingShipment
                                    ? "Cancelling..."
                                    : "Cancel Shiprocket Order"}
                                </Button>
                              )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-sm font-medium">
                              {order.shippingCourierName ||
                                order.shippingCarrier ||
                                "Shiprocket"}{" "}
                              AWB: {order.trackingNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Exact Shiprocket status is shown below.
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSyncShipmentStatus}
                                disabled={syncingShipment}
                              >
                                <IconRefresh className="mr-2 h-4 w-4" />
                                {syncingShipment
                                  ? "Syncing..."
                                  : "Sync from Shiprocket"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadLabel}
                              >
                                <IconDownload className="mr-2 h-4 w-4" />
                                Label
                              </Button>
                            </div>

                            {/* Cancel Shipment â€” only for active orders */}
                            {order.status !== "delivered" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={handleCancelShipment}
                                disabled={cancellingShipment}
                              >
                                <IconXmark className="mr-2 h-4 w-4" />
                                {cancellingShipment
                                  ? "Cancelling..."
                                  : "Cancel Shipment"}
                              </Button>
                            )}

                            <TrackingStatus
                              awbNumber={order.trackingNumber}
                              token={token}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Order Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Order ID
                          </div>
                          <div className="font-mono text-sm">#{order.id}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Placed On
                          </div>
                          <div className="text-sm">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Status
                          </div>
                          <Badge className="capitalize">{order.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Customer</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="font-medium">{customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.customer?.email || order.email || "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.customer?.phone || address?.phone || "-"}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Shipping Address</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="font-medium">
                          {address?.name || customerName}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {address?.address || "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {address?.city || "-"}, {address?.state || "-"}{" "}
                          {address?.postalCode || ""}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {address?.country || "-"}
                        </div>
                      </CardContent>
                    </Card>
                    {order.notes && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground whitespace-pre-line">
                          {order.notes}
                        </CardContent>
                      </Card>
                    )}
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

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <OrderDetailContent />
    </ProtectedRoute>
  );
}
