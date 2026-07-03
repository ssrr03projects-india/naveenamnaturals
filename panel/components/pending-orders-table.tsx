"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconChevronsLeft,
  IconChevronsRight,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconLoader2,
  IconSearch,
  IconCheck,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  fetchOrders,
  updatePackingStatus,
  type Order,
  type Address,
  type OrderFilters,
} from "@/lib/orders-api";
import { getShippingLabel } from "@/lib/shipping-api";

export function PendingOrdersTable() {
  const router = useRouter();
  const { token } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingIds, setUpdatingIds] = React.useState<Set<number>>(new Set());
  const [removingIds, setRemovingIds] = React.useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [expandedItemId, setExpandedItemId] = React.useState<number | null>(
    null,
  );
  const [expandedPreviewOrderId, setExpandedPreviewOrderId] = React.useState<
    number | null
  >(null);
  const [expandedMainOrderId, setExpandedMainOrderId] = React.useState<
    number | null
  >(null);
  const [allOrdersPreviewOpen, setAllOrdersPreviewOpen] = React.useState(false);
  const [exportingPDF, setExportingPDF] = React.useState(false);
  const [exportingXLS, setExportingXLS] = React.useState(false);
  const [pagination, setPagination] = React.useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = React.useState<OrderFilters>({
    page: 1,
    limit: 20,
    packingStatus: "unpacked",
    excludeCancelledRefunded: true,
  });

  const loadOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchOrders(filters, token);
      if (response.success) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error loading pending orders:", error);
      toast.error("Failed to load pending orders");
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // PDF-safe currency format (jsPDF default font doesn't support ₹ symbol)
  const formatCurrencyPDF = (amount: number) => {
    return (
      "Rs. " +
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    );
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

  const getShippingStageMeta = (order: Order) => {
    const latestStatus = order.shippingLatestStatus?.trim();

    if (order.trackingNumber || order.shippingBookingStage === "booked") {
      return {
        label: latestStatus || "Booked / Pickup Scheduled",
        className: "border-green-200 bg-green-50 text-green-700",
      };
    }

    if (order.shippingBookingStage === "order_created") {
      return {
        label: "Shiprocket Order Created",
        className: "border-blue-200 bg-blue-50 text-blue-700",
      };
    }

    if (latestStatus) {
      return {
        label: "Provider Error",
        className: "border-red-200 bg-red-50 text-red-700",
        detail: latestStatus,
      };
    }

    return {
      label: "Awaiting Booking",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  };

  const getProductSnapshot = (
    item: NonNullable<Order["items"]>[number],
  ): NonNullable<NonNullable<Order["items"]>[number]["productSnapshot"]> => {
    let snapshot = item.productSnapshot;

    if (typeof snapshot === "string") {
      try {
        snapshot = JSON.parse(snapshot);
      } catch {
        snapshot = {};
      }
    }

    return snapshot || {};
  };

  const getItemBreakdown = (
    order: Order,
    item: NonNullable<Order["items"]>[number],
    index: number,
  ) =>
    order.gstBreakdown?.items?.find((entry) => Number(entry.itemId) === item.id) ||
    order.gstBreakdown?.items?.find(
      (entry) =>
        Number(entry.productId) === Number(item.productId) &&
        Number(entry.quantity) === Number(item.quantity),
    ) ||
    order.gstBreakdown?.items?.[index];

  const getDisplayedItemPricing = (
    order: Order,
    item: NonNullable<Order["items"]>[number],
    index: number,
  ) => {
    const snapshot = getProductSnapshot(item);
    const itemBreakdown = getItemBreakdown(order, item, index);
    const quantity = Number(item.quantity || 0);
    const taxableAmount = Number(itemBreakdown?.taxableAmount || 0);

    const afterDiscountUnitPrice =
      order.gstBreakdown?.couponApplied && quantity > 0
        ? taxableAmount / quantity
        : Number(item.unitPrice || 0);

    return {
      gstPercent: Number(itemBreakdown?.gstRate || snapshot?.gstPercentage || 0),
      gstAmount: Number(itemBreakdown?.gstAmount || item.taxAmount || 0),
      lineTotal: order.gstBreakdown?.couponApplied
        ? Number(itemBreakdown?.lineTotal || item.totalPrice || 0)
        : Number(item.totalPrice || 0),
      afterDiscountUnitPrice,
    };
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      refunded:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      partially_refunded:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[status.toLowerCase()] || colors.pending;
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleOpenAllOrdersPreview = () => {
    setAllOrdersPreviewOpen(true);
  };

  const handleDownloadAllOrdersPDF = () => {
    try {
      setExportingPDF(true);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Naveenam Naturals", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Pending Orders Export", 14, 22);
      doc.setFontSize(8);
      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}  |  Count: ${orders.length} Orders`,
        14,
        28,
      );

      const tableData = orders.map((order) => {
        const address = parseAddress(order);
        const addressStr = [
          address.address,
          address.city,
          address.state,
          address.postalCode || address.pincode,
        ]
          .filter(Boolean)
          .join(", ");

        const itemsStr =
          (order.items || [])
            .map((item, index) => {
              const name = item.product?.name || item.productName || "Product";
              const snapshot = getProductSnapshot(item);
              const itemPricing = getDisplayedItemPricing(order, item, index);
              const variant =
                snapshot?.variantName || snapshot?.selectedSize || "";
              const price = formatCurrencyPDF(itemPricing.afterDiscountUnitPrice);
              const qty = item.quantity || 0;
              const label = variant ? `${name} (${variant})` : name;
              return `${label} x${qty} | ${price} | GST: ${formatPercent(itemPricing.gstPercent)}%`;
            })
            .join("\n") || "-";

        const totalQty = (order.items || []).reduce(
          (sum, item) => sum + (item.quantity || 0),
          0,
        );

        return [
          order.orderNumber || "-",
          new Date(order.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          getCustomerName(order),
          order.customer?.phone || order.customer?.email || order.email || "-",
          order.paymentStatus?.toUpperCase() || "-",
          itemsStr,
          totalQty.toString(),
          formatCurrencyPDF(order.totalAmount || 0),
          order.trackingNumber || "-",
          addressStr || "-",
        ];
      });

      autoTable(doc, {
        startY: 33,
        theme: "grid",
        head: [
          [
            "Order #",
            "Date",
            "Customer",
            "Phone/Email",
            "Payment",
            "Products (After Discount Price | GST%)",
            "Qty",
            "Total",
            "Tracking",
            "Address",
          ],
        ],
        body: tableData,
        styles: {
          font: "helvetica",
          fontSize: 7,
          textColor: [51, 51, 51],
          cellPadding: 2,
          overflow: "linebreak",
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [249, 250, 251],
          fontSize: 7,
          fontStyle: "bold",
          textColor: [55, 65, 81],
          halign: "left",
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        bodyStyles: {
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 18 },
          2: { cellWidth: 22 },
          3: { cellWidth: 30 },
          4: { cellWidth: 16 },
          5: { cellWidth: "auto" },
          6: { cellWidth: 10, halign: "center" },
          7: { cellWidth: 24, halign: "right" },
          8: { cellWidth: 24 },
          9: { cellWidth: "auto" },
        },
        margin: { left: 10, right: 10 },
      });

      doc.save(`pending-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to export PDF";
      toast.error(message);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleDownloadAllOrdersXLS = () => {
    try {
      setExportingXLS(true);
      const allRows = orders.flatMap((order) => {
        const address = parseAddress(order);
        const addressStr = [
          address.address,
          address.city,
          address.state,
          address.postalCode || address.pincode,
          address.country,
        ]
          .filter(Boolean)
          .join(", ");
        const customerName = getCustomerName(order);

        if (order.items && order.items.length > 0) {
          return order.items.map((item, index) => {
            const itemPricing = getDisplayedItemPricing(order, item, index);
            return {
              "Order Number": order.orderNumber,
              "Order ID": order.id,
              Date: new Date(order.createdAt).toLocaleString(),
              Customer: customerName,
              Email: order.customer?.email || order.email || "",
              "Payment Status": order.paymentStatus,
              "Item Name": item.product?.name || item.productName || "Product",
              Quantity: item.quantity || 0,
              "After Discount Price": itemPricing.afterDiscountUnitPrice,
              "GST %": `${formatPercent(itemPricing.gstPercent)}%`,
              "GST Amount": itemPricing.gstAmount,
              "Line Total": itemPricing.lineTotal,
              "Order Total": order.totalAmount || 0,
              Tracking: order.trackingNumber || "",
              Address: addressStr,
            };
          });
        }
        return [
          {
            "Order Number": order.orderNumber,
            "Order ID": order.id,
            Date: new Date(order.createdAt).toLocaleString(),
            Customer: customerName,
            Email: order.customer?.email || order.email || "",
            "Payment Status": order.paymentStatus,
            "Item Name": "-",
            Quantity: 0,
            "After Discount Price": 0,
            "GST %": "0%",
            "GST Amount": 0,
            "Line Total": 0,
            "Order Total": order.totalAmount || 0,
            Tracking: order.trackingNumber || "",
            Address: addressStr,
          },
        ];
      });

      const ws = XLSX.utils.json_to_sheet(allRows);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 10 },
        { wch: 22 },
        { wch: 20 },
        { wch: 28 },
        { wch: 15 },
        { wch: 28 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 20 },
        { wch: 40 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pending Orders");
      XLSX.writeFile(
        wb,
        `pending-orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success("Excel downloaded");
    } catch {
      toast.error("Failed to download Excel");
    } finally {
      setExportingXLS(false);
    }
  };

  const handleMarkPacked = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setUpdatingIds((prev) => new Set(prev).add(order.id));
    try {
      const response = await updatePackingStatus(
        order.id.toString(),
        "packed",
        token,
      );
      if (response.manualRetryRequired) {
        toast.error(
          response.bookingMessage ||
            `Order ${order.orderNumber} packed, but Shiprocket booking failed.`,
        );
      } else if (response.bookingSuccess) {
        toast.success(`Order ${order.orderNumber} packed and booked ✓`);
      } else {
        toast.success(`Order ${order.orderNumber} packed ✓`);
      }

      // Start slide-out animation
      setRemovingIds((prev) => new Set(prev).add(order.id));

      // Remove from list after animation completes
      setTimeout(() => {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
        setPagination((prev) => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1),
        }));
      }, 400);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update packing status";
      toast.error(message);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleOpenOrderDetails = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setExpandedItemId(null);
    setDetailsOpen(true);
  };

  const parseAddress = (order: Order): Partial<Address> => {
    const raw = order.address || order.billingAddress;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as Partial<Address>;
      } catch {
        return {};
      }
    }
    return raw as Partial<Address>;
  };

  const getCustomerName = (order: Order) => {
    if (order.customer) {
      const fullName =
        `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim();
      if (fullName) return fullName;
    }
    return "Guest";
  };

  const handleDownloadSelectedOrderPDF = () => {
    if (!selectedOrder) return;
    try {
      setExportingPDF(true);
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const address = parseAddress(selectedOrder);
      const addressStr = [
        address.address,
        address.city,
        address.state,
        address.postalCode || address.pincode,
        address.country,
      ]
        .filter(Boolean)
        .join(", ");

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Naveenam Naturals", 14, 15);
      doc.setFontSize(12);
      doc.text(`Order: ${selectedOrder.orderNumber}`, 14, 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      let yPos = 33;
      const infoLines = [
        ["Date", new Date(selectedOrder.createdAt).toLocaleString("en-IN")],
        ["Customer", getCustomerName(selectedOrder)],
        ["Email", selectedOrder.customer?.email || selectedOrder.email || "-"],
        ["Phone", selectedOrder.customer?.phone || "-"],
        ["Payment", selectedOrder.paymentStatus?.toUpperCase() || "-"],
        ["Tracking", selectedOrder.trackingNumber || "-"],
        ["Address", addressStr || "-"],
      ];
      for (const [label, value] of infoLines) {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 14, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), 45, yPos);
        yPos += 6;
      }

      yPos += 4;

      const tableData = (selectedOrder.items || []).map((item, index) => {
        const name = item.product?.name || item.productName || "Product";
        const snapshot = getProductSnapshot(item);
        const itemPricing = getDisplayedItemPricing(selectedOrder, item, index);
        const variant = snapshot?.variantName || snapshot?.selectedSize || "";
        const displayName = variant ? `${name} (${variant})` : name;
        return [
          displayName,
          (item.quantity || 0).toString(),
          formatCurrencyPDF(itemPricing.afterDiscountUnitPrice),
          `${formatPercent(itemPricing.gstPercent)}%`,
          formatCurrencyPDF(itemPricing.gstAmount),
          formatCurrencyPDF(itemPricing.lineTotal),
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [["Product", "Qty", "After Discount Price", "GST %", "GST Amt", "Total"]],
        body:
          tableData.length > 0
            ? tableData
            : [["-", "0", "Rs. 0.00", "0%", "Rs. 0.00", "Rs. 0.00"]],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [249, 250, 251],
          fontSize: 9,
          fontStyle: "bold",
          textColor: [55, 65, 81],
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          1: { halign: "center", cellWidth: 18 },
          2: { halign: "right", cellWidth: 30 },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "right", cellWidth: 28 },
          5: { halign: "right", cellWidth: 30 },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 30;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Order Total: ${formatCurrencyPDF(selectedOrder.totalAmount || 0)}`,
        14,
        finalY + 10,
      );

      doc.save(
        `${selectedOrder.orderNumber || `order-${selectedOrder.id}`}.pdf`,
      );
      toast.success("PDF downloaded");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to download PDF";
      toast.error(message);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleDownloadSelectedOrderXLS = () => {
    if (!selectedOrder) return;
    try {
      setExportingXLS(true);
      const address = parseAddress(selectedOrder);
      const rows =
        selectedOrder.items?.map((item, index) => {
          const itemPricing = getDisplayedItemPricing(selectedOrder, item, index);
          return {
            "Order Number": selectedOrder.orderNumber,
            "Order ID": selectedOrder.id,
            Date: new Date(selectedOrder.createdAt).toLocaleString(),
            Customer: getCustomerName(selectedOrder),
            Email: selectedOrder.customer?.email || selectedOrder.email || "",
            "Payment Status": selectedOrder.paymentStatus,
            "Item Name": item.product?.name || item.productName || "Product",
            Quantity: item.quantity || 0,
            "After Discount Price": itemPricing.afterDiscountUnitPrice,
            "GST %": `${formatPercent(itemPricing.gstPercent)}%`,
            "GST Amount": itemPricing.gstAmount,
            "Line Total": itemPricing.lineTotal,
            "Order Total": selectedOrder.totalAmount || 0,
            Tracking: selectedOrder.trackingNumber || "",
            Address: [
              address.address,
              address.city,
              address.state,
              address.postalCode || address.pincode,
              address.country,
            ]
              .filter(Boolean)
              .join(", "),
          };
        }) || [];

      const data =
        rows.length > 0
          ? rows
          : [
              {
                "Order Number": selectedOrder.orderNumber,
                "Order ID": selectedOrder.id,
                Date: new Date(selectedOrder.createdAt).toLocaleString(),
                Customer: getCustomerName(selectedOrder),
                Email:
                  selectedOrder.customer?.email || selectedOrder.email || "",
                "Payment Status": selectedOrder.paymentStatus,
                "Item Name": "-",
                Quantity: 0,
                "After Discount Price": 0,
                "GST %": "0%",
                "GST Amount": 0,
                "Line Total": 0,
                "Order Total": selectedOrder.totalAmount || 0,
                Tracking: selectedOrder.trackingNumber || "",
                Address: [
                  address.address,
                  address.city,
                  address.state,
                  address.postalCode || address.pincode,
                  address.country,
                ]
                  .filter(Boolean)
                  .join(", "),
              },
            ];

      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 10 },
        { wch: 22 },
        { wch: 20 },
        { wch: 28 },
        { wch: 15 },
        { wch: 28 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 20 },
        { wch: 40 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pending Order");
      XLSX.writeFile(
        wb,
        `${selectedOrder.orderNumber || `order-${selectedOrder.id}`}.xlsx`,
      );
      toast.success("Excel downloaded");
    } catch {
      toast.error("Failed to download Excel");
    } finally {
      setExportingXLS(false);
    }
  };

  const onFiltersChange = (newFilters: OrderFilters) => {
    setFilters({
      ...newFilters,
      packingStatus: "unpacked",
      excludeCancelledRefunded: true,
    });
  };

  const handleDownloadShippingLabel = async (
    e: React.MouseEvent,
    trackingNumber: string,
    orderNumber?: string,
  ) => {
    e.stopPropagation();
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
      toast.success("Shipping label downloaded");
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
          <CardTitle>Pending Orders ({pagination.totalItems})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pending orders..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleOpenAllOrdersPreview}
              title="Preview & Download Pending Orders"
            >
              <IconDownload className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">
              Loading pending orders...
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pending orders</p>
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
                    <TableHead>Shipping Label</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center w-20">Packed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isUpdating = updatingIds.has(order.id);
                    const isRemoving = removingIds.has(order.id);
                    const isMainExpanded = expandedMainOrderId === order.id;
                    const showCouponBreakdown = Boolean(
                      order.gstBreakdown?.couponApplied,
                    );
                    const shippingStageMeta = getShippingStageMeta(order);
                    return (
                      <React.Fragment key={order.id}>
                        <TableRow
                          className={`cursor-pointer hover:bg-muted/40 transition-all duration-400 ${
                            isRemoving
                              ? "opacity-0 translate-x-full max-h-0 overflow-hidden"
                              : "opacity-100 translate-x-0"
                          }`}
                          style={{
                            transition:
                              "opacity 0.4s ease, transform 0.4s ease, max-height 0.4s ease",
                          }}
                          onClick={() =>
                            setExpandedMainOrderId(
                              isMainExpanded ? null : order.id,
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
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge
                                  variant="outline"
                                  className={shippingStageMeta.className}
                                >
                                  {shippingStageMeta.label}
                                </Badge>
                              </div>
                              {shippingStageMeta.detail && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {shippingStageMeta.detail}
                                </div>
                              )}
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
                              {order.customer?.email ||
                                order.email ||
                                "No email"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-sm">
                                {order.items?.length || 0} items
                              </span>
                              {isMainExpanded ? (
                                <IconChevronUp className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <IconChevronDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
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
                                    e,
                                    order.trackingNumber!,
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
                              variant="outline"
                              size="icon"
                              disabled={isUpdating || isRemoving}
                              className="h-8 w-8 rounded-full border-green-500 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                              title="Mark as packed"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkPacked(e, order);
                              }}
                            >
                              {isUpdating ? (
                                <span className="animate-spin text-xs">⏳</span>
                              ) : (
                                <IconCheck className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isMainExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-0">
                              <div className="p-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Qty</TableHead>
                                      <TableHead className="text-right">
                                        Unit
                                      </TableHead>
                                      {showCouponBreakdown && (
                                        <TableHead className="text-right">
                                          After Discount
                                        </TableHead>
                                      )}
                                      <TableHead className="text-right">
                                        GST
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Total
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.items && order.items.length > 0 ? (
                                      order.items.map((item, index) => {
                                        const snapshot = getProductSnapshot(item);
                                        const itemBreakdown = getItemBreakdown(
                                          order,
                                          item,
                                          index,
                                        );
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
                                            <TableCell>
                                              {item.quantity || 0}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(
                                                item.unitPrice || 0,
                                              )}
                                            </TableCell>
                                            {showCouponBreakdown && (
                                              <TableCell className="text-right">
                                                {formatCurrency(
                                                  Number(
                                                    itemBreakdown?.taxableAmount || 0,
                                                  ),
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
                  {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}{" "}
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
                    onClick={() => onFiltersChange({ ...filters, page: 1 })}
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
                    disabled={pagination.currentPage === pagination.totalPages}
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
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    <IconChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Pending Order Details - {selectedOrder?.orderNumber || "-"}
            </DialogTitle>
            <DialogDescription>
              Review this pending order and download as PDF or XLS.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Order ID:</span> #
                  {selectedOrder.id}
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {formatDate(selectedOrder.createdAt)}
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  {getCustomerName(selectedOrder)}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {selectedOrder.customer?.email || selectedOrder.email || "-"}
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      {selectedOrder.gstBreakdown?.couponApplied && (
                        <TableHead className="text-right">
                          After Discount
                        </TableHead>
                      )}
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => {
                        const isExpanded = expandedItemId === item.id;
                        const showCouponBreakdown = Boolean(
                          selectedOrder.gstBreakdown?.couponApplied,
                        );
                        const itemBreakdown = getItemBreakdown(
                          selectedOrder,
                          item,
                          index,
                        );
                        return (
                          <React.Fragment key={item.id}>
                            <TableRow
                              className="cursor-pointer hover:bg-muted/40"
                              onClick={() =>
                                setExpandedItemId(isExpanded ? null : item.id)
                              }
                            >
                              <TableCell>
                                {item.product?.name ||
                                  item.productName ||
                                  "Product"}
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
                                {formatCurrency(
                                  Number(
                                    itemBreakdown?.lineTotal ||
                                      item.totalPrice ||
                                      0,
                                  ),
                                )}
                              </TableCell>
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
                                  colSpan={showCouponBreakdown ? 6 : 5}
                                  className="bg-muted/30 text-sm"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                        SKU:
                                      </span>{" "}
                                      {item.productSku || "-"}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Quantity:
                                      </span>{" "}
                                      {item.quantity || 0}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Unit Price:
                                      </span>{" "}
                                      {formatCurrency(item.unitPrice || 0)}
                                    </div>
                                    {showCouponBreakdown && (
                                      <div>
                                        <span className="text-muted-foreground">
                                          After Discount:
                                        </span>{" "}
                                        {formatCurrency(
                                          Number(itemBreakdown?.taxableAmount || 0),
                                        )}
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-muted-foreground">
                                        GST:
                                      </span>{" "}
                                      {formatCurrency(
                                        Number(
                                          itemBreakdown?.gstAmount ||
                                            item.taxAmount ||
                                            0,
                                        ),
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Line Total:
                                      </span>{" "}
                                      {formatCurrency(
                                        Number(
                                          itemBreakdown?.lineTotal ||
                                            item.totalPrice ||
                                            0,
                                        ),
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={selectedOrder.gstBreakdown?.couponApplied ? 6 : 5}
                          className="text-center text-muted-foreground"
                        >
                          No items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadSelectedOrderXLS}
              disabled={!selectedOrder || exportingPDF || exportingXLS}
            >
              {exportingXLS ? (
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IconFileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Download XLS
            </Button>
            <Button
              onClick={handleDownloadSelectedOrderPDF}
              disabled={!selectedOrder || exportingPDF || exportingXLS}
            >
              {exportingPDF ? (
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IconFileTypePdf className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                selectedOrder && router.push(`/orders/${selectedOrder.id}`)
              }
              disabled={!selectedOrder || exportingPDF || exportingXLS}
            >
              Full Details Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Pending Orders Preview Dialog */}
      <Dialog
        open={allOrdersPreviewOpen}
        onOpenChange={setAllOrdersPreviewOpen}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Pending Orders Preview ({orders.length} orders)
            </DialogTitle>
            <DialogDescription>
              Preview all current pending orders. Download as PDF or Excel.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => {
                    const isPreviewExpanded =
                      expandedPreviewOrderId === order.id;
                    const showCouponBreakdown = Boolean(
                      order.gstBreakdown?.couponApplied,
                    );
                    return (
                      <React.Fragment key={order.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() =>
                            setExpandedPreviewOrderId(
                              isPreviewExpanded ? null : order.id,
                            )
                          }
                        >
                          <TableCell>
                            <div className="font-medium text-primary">
                              {order.orderNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              #{order.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {getCustomerName(order)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.customer?.email || order.email || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {order.items?.length || 0} items
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.trackingNumber ? (
                              <span className="font-mono text-xs text-primary">
                                {order.trackingNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isPreviewExpanded ? (
                              <IconChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
                            ) : (
                              <IconChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                        {isPreviewExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-0">
                              <div className="p-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Qty</TableHead>
                                      <TableHead className="text-right">
                                        Unit
                                      </TableHead>
                                      {showCouponBreakdown && (
                                        <TableHead className="text-right">
                                          After Discount
                                        </TableHead>
                                      )}
                                      <TableHead className="text-right">
                                        GST
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Total
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.items && order.items.length > 0 ? (
                                      order.items.map((item, index) => {
                                        const snapshot = getProductSnapshot(item);
                                        const itemBreakdown = getItemBreakdown(
                                          order,
                                          item,
                                          index,
                                        );
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
                                            <TableCell>
                                              {item.quantity || 0}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(
                                                item.unitPrice || 0,
                                              )}
                                            </TableCell>
                                            {showCouponBreakdown && (
                                              <TableCell className="text-right">
                                                {formatCurrency(
                                                  Number(
                                                    itemBreakdown?.taxableAmount || 0,
                                                  ),
                                                )}
                                              </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                              {formatCurrency(gstAmount)}
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
                                                  GST ({formatPercent(gstPercent)}%):{" "}
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
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No pending orders
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadAllOrdersXLS}
              disabled={orders.length === 0 || exportingPDF || exportingXLS}
            >
              {exportingXLS ? (
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IconFileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Download Excel
            </Button>
            <Button
              onClick={handleDownloadAllOrdersPDF}
              disabled={orders.length === 0 || exportingPDF || exportingXLS}
            >
              {exportingPDF ? (
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IconFileTypePdf className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
