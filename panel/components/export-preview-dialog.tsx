"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  fetchOrders,
  type Order,
  type OrderFilters,
} from "@/lib/orders-api";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import {
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconLoader2,
} from "@tabler/icons-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: OrderFilters;
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  filters,
}: ExportPreviewDialogProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [previewOrders, setPreviewOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);
        // Fetch only 5 records for preview
        const previewFilters = { ...filters, limit: 5, page: 1 };
        const response = await fetchOrders(previewFilters, token);

        if (response.success) {
          setPreviewOrders(response.data.orders);
          setTotalCount(response.data.pagination.totalItems);
        }
      } catch (error) {
        console.error("Failed to load export preview", error);
        toast.error("Failed to load preview");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadPreview();
    }
  }, [open, filters, token]);

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0";
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  const getProductsSummary = (order: Order) =>
    order.items
      ?.map(
        (i) =>
          `${i.product?.name || i.productName || "Product"} (x${i.quantity})`,
      )
      .join(", ") || "-";

  const getSubtotalAfterDiscount = (order: Order) =>
    order.gstBreakdown?.couponApplied
      ? Number(order.gstBreakdown?.subtotalAfterDiscount || 0)
      : Number(order.subtotal || 0);

  const getGstBreakdown = (order: Order) => {
    const breakdown = order.gstBreakdown;

    if (breakdown?.couponApplied) {
      const groupedText = breakdown.groupedByRate
        .map(
          (group) =>
            `GST @ ${formatPercent(group.gstRate)}% = ₹${group.gstAmount.toFixed(2)}`,
        )
        .join(" | ");
      return groupedText
        ? `${groupedText} | Total GST = ₹${breakdown.totalGst.toFixed(2)}`
        : `Total GST = ₹${breakdown.totalGst.toFixed(2)}`;
    }

    return (
      breakdown?.items
        ?.map((item) => `${item.productName}: ${formatPercent(item.gstRate)}%`)
        .join(", ") || "-"
    );
  };

  const getGstBreakdownForPdf = (order: Order) => {
    const breakdown = order.gstBreakdown;
    if (!breakdown) return "-";

    if (breakdown.couponApplied) {
      const grouped = breakdown.groupedByRate
        .map(
          (group) =>
            `GST @ ${formatPercent(group.gstRate)}% = ${formatCurrencyPDF(group.gstAmount)}`,
        )
        .join("\n");

      const totalLine = `Total GST = ${formatCurrencyPDF(breakdown.totalGst)}`;
      return grouped ? `${grouped}\n${totalLine}` : totalLine;
    }

    const plain =
      breakdown.items
        ?.map((item) => `${item.productName}: ${formatPercent(item.gstRate)}%`)
        .join("\n") || "-";

    return plain.replace(/₹/g, "Rs.");
  };

  const getDisplayedGstAmount = (order: Order) =>
    order.gstBreakdown?.totalGst ?? (order.taxAmount || 0);

  const getDisplayedTotalAmount = (order: Order) =>
    order.gstBreakdown?.couponApplied
      ? Number(order.gstBreakdown?.subtotalAfterDiscount || 0) +
        Number(order.gstBreakdown?.totalGst || 0) +
        Number(order.shippingAmount || 0)
      : Number(order.totalAmount || 0);

  const formatCurrencyPDF = (amount: number) =>
    `Rs. ${new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))}`;

  const parseAddressForExport = (order: Order) => {
    let addressValue: unknown = order.address || {};
    if (typeof addressValue === "string") {
      try {
        addressValue = JSON.parse(addressValue);
      } catch {
        addressValue = {};
      }
    }

    const address =
      addressValue && typeof addressValue === "object"
        ? (addressValue as Record<string, unknown>)
        : {};

    const addrLine =
      (address.address as string) ||
      (address.address_line_1 as string) ||
      (address.street as string) ||
      "";
    const city = (address.city as string) || "";
    const state =
      (address.state as string) || (address.stateCode as string) || "";
    const zip =
      (address.postalCode as string) || (address.pincode as string) || "";

    return [addrLine, city, state, zip].filter(Boolean).join(", ");
  };

  const exportPdfInBrowser = async () => {
    const exportFilters = { ...filters, limit: 10000, page: 1 };
    const response = await fetchOrders(exportFilters, token);

    if (!response.success || response.data.orders.length === 0) {
      toast.warning("No orders found to export");
      return false;
    }

    const orders = response.data.orders;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Naveenam Naturals", 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Order List Export", 14, 22);
    doc.setFontSize(8);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-IN")}  |  Count: ${orders.length} Orders`,
      14,
      28,
    );

    const rows = orders.map((order) => {
      const date = new Date(order.createdAt);
      const dateTime = `${date.toLocaleDateString("en-IN")} ${date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const customerName = order.customer
        ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() ||
          "Guest"
        : "Guest";

      const gstColumn = `${formatCurrencyPDF(getDisplayedGstAmount(order))}\nIncluded:\n${getGstBreakdownForPdf(order)}`;

      return [
        order.orderNumber || "-",
        dateTime,
        customerName,
        parseAddressForExport(order) || "-",
        (order.status || "-").toUpperCase(),
        (order.paymentStatus || "-").toUpperCase(),
        getProductsSummary(order),
        formatCurrencyPDF(getSubtotalAfterDiscount(order)),
        formatCurrencyPDF(order.shippingAmount || 0),
        gstColumn,
        formatCurrencyPDF(order.discountAmount || 0),
        formatCurrencyPDF(getDisplayedTotalAmount(order)),
      ];
    });

    autoTable(doc, {
      startY: 33,
      theme: "grid",
      head: [
        [
          "Order #",
          "Date & Time",
          "Customer",
          "Shipping Address",
          "Status",
          "Payment",
          "Products",
          "Subtotal After Discount",
          "Ship",
          "GST",
          "Disc",
          "Total",
        ],
      ],
      body: rows,
      styles: {
        font: "helvetica",
        fontSize: 7,
        textColor: [51, 51, 51],
        cellPadding: 1.8,
        overflow: "linebreak",
        valign: "top",
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: [55, 65, 81],
        fontSize: 7,
        fontStyle: "bold",
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
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { cellWidth: 20 },
        3: { cellWidth: 30 },
        4: { cellWidth: 12 },
        5: { cellWidth: 14 },
        6: { cellWidth: 46 },
        7: { cellWidth: 18, halign: "right" },
        8: { cellWidth: 12, halign: "right" },
        9: { cellWidth: 34 },
        10: { cellWidth: 14, halign: "right" },
        11: { cellWidth: 16, halign: "right" },
      },
      margin: { left: 8, right: 8 },
      didParseCell: (hookData) => {
        // Discount column uses red text similar to previous export.
        if (hookData.section === "body" && hookData.column.index === 10) {
          hookData.cell.styles.textColor = [220, 38, 38];
        }
      },
    });

    doc.save(`orders_export_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success(`Successfully exported ${orders.length} orders to PDF`);
    return true;
  };

  const handleExcelExport = async () => {
    try {
      setExportingExcel(true);
      toast.info("Preparing Excel export...");

      // Fetch ALL matching records (limit 10000)
      const exportFilters = { ...filters, limit: 10000, page: 1 };
      const response = await fetchOrders(exportFilters, token);

      if (response.success && response.data.orders.length > 0) {
        const orders = response.data.orders;

        // Prepare data for Excel
        const data = orders.map((order) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let address: any = order.address || {};
          // Handle JSON string case
          if (typeof address === "string") {
            try {
              address = JSON.parse(address);
            } catch {
              address = {};
            }
          }

          const addrLine =
            address.address || address.address_line_1 || address.street || "";
          const city = address.city || "";
          const state = address.state || address.stateCode || "";
          const zip = address.postalCode || address.pincode || "";

          const formattedAddress = [
            addrLine,
            city,
            `${state} - ${zip}`,
            address.country,
          ]
            .filter((part) => part && part !== " - ") // Filter out empty parts
            .join(", ");

          return {
            "Order ID": order.id,
            "Order Number": order.orderNumber,
            Date: new Date(order.createdAt).toLocaleDateString(),
            Time: new Date(order.createdAt).toLocaleTimeString(),
            "Customer Name": order.customer
              ? `${order.customer.firstName} ${order.customer.lastName}`
              : "Guest",
            Email: order.customer?.email || order.email || "",
            Phone: order.customer?.phone || address?.phone || "",
            Status: order.status,
            "Payment Status": order.paymentStatus,
            Products: getProductsSummary(order),
            "Subtotal After Discount": getSubtotalAfterDiscount(order),
            "Shipping Cost": order.shippingAmount || 0,
            GST: getDisplayedGstAmount(order),
            "GST %": getGstBreakdown(order),
            Discount: order.discountAmount || 0,
            "Total Amount": getDisplayedTotalAmount(order),
            "Items Count": order.items?.length || 0,
            "Shipping Address": formattedAddress,
            "Billing Address": order.billingAddress
              ? `${order.billingAddress.address}, ${order.billingAddress.city}, ${order.billingAddress.postalCode}`
              : order.address
                ? "Same as Shipping"
                : "",
            "Tracking Number": order.trackingNumber || "",
          };
        });

        // Create workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet["!cols"] = [
          { wch: 10 }, // Order ID
          { wch: 18 }, // Order Number
          { wch: 12 }, // Date
          { wch: 12 }, // Time
          { wch: 22 }, // Customer Name
          { wch: 26 }, // Email
          { wch: 14 }, // Phone
          { wch: 14 }, // Status
          { wch: 16 }, // Payment Status
          { wch: 44 }, // Products
          { wch: 20 }, // Subtotal After Discount
          { wch: 14 }, // Shipping Cost
          { wch: 14 }, // GST
          { wch: 44 }, // GST Included %
          { wch: 14 }, // Discount
          { wch: 14 }, // Total Amount
          { wch: 12 }, // Items Count
          { wch: 50 }, // Shipping Address
          { wch: 40 }, // Billing Address
          { wch: 20 }, // Tracking Number
        ];
        worksheet["!autofilter"] = { ref: worksheet["!ref"] as string };
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

        // Generate file
        XLSX.writeFile(
          workbook,
          `orders_export_${new Date().toISOString().split("T")[0]}.xlsx`,
        );

        toast.success(`Successfully exported ${orders.length} orders to Excel`);
        onOpenChange(false);
      } else {
        toast.warning("No orders found to export");
      }
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const handlePDFExport = async () => {
    try {
      setExportingPDF(true);
      toast.info("Generating PDF... this may take a moment");
      const exported = await exportPdfInBrowser();
      if (!exported) return;

      onOpenChange(false);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export PDF",
      );
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Orders</DialogTitle>
          <DialogDescription>
            Preview the data to be exported. Only the first 5 records are shown
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
            <div className="text-sm font-medium">
              Total Records Matching Filters:{" "}
              <span className="text-primary text-lg ml-1">
                {loading ? "..." : totalCount}
              </span>
            </div>
            {filters.startDate && (
              <Badge variant="outline" className="bg-background">
                Date Range: {new Date(filters.startDate).toLocaleDateString()} -{" "}
                {filters.endDate
                  ? new Date(filters.endDate).toLocaleDateString()
                  : "Now"}
              </Badge>
            )}
          </div>

          <div className="border rounded-md overflow-hidden max-w-full">
            <div className="overflow-x-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Order #</TableHead>
                    <TableHead className="min-w-[140px] whitespace-nowrap">
                      Date & Time
                    </TableHead>
                    <TableHead className="min-w-[140px] whitespace-nowrap">
                      Customer
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="min-w-[220px]">Products</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Subtotal After Discount
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Ship
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      GST
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Disc
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Total
                    </TableHead>
                    <TableHead className="min-w-[250px] max-w-[350px]">
                      Shipping Address
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-24 text-center">
                        <IconLoader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : previewOrders.length > 0 ? (
                    previewOrders.map((order) => {
                      // Address Parsing Logic
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      let address: any = order.address || {};
                      if (typeof address === "string") {
                        try {
                          address = JSON.parse(address);
                        } catch {
                          address = {};
                        }
                      }
                      const addrLine =
                        address.address ||
                        address.address_line_1 ||
                        address.street ||
                        "";
                      const city = address.city || "";
                      const state = address.state || address.stateCode || "";
                      const zip = address.postalCode || address.pincode || "";

                      const formattedAddress = [
                        addrLine,
                        city,
                        state ? `${state} - ${zip}` : zip,
                        address.country,
                      ]
                        .filter((part) => part && part !== " - ")
                        .join(", ");

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>
                                {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>
                                {order.customer
                                  ? `${order.customer.firstName} ${order.customer.lastName}`
                                  : "Guest"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {order.customer?.email || order.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.customer?.phone || address?.phone || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.paymentStatus === "paid"
                                  ? "default"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[260px]">
                            <span
                              className="line-clamp-2"
                              title={getProductsSummary(order)}
                            >
                              {getProductsSummary(order)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(getSubtotalAfterDiscount(order))}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(order.shippingAmount || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                              }).format(getDisplayedGstAmount(order))}
                            </div>
                            <div
                              className="text-[11px] text-muted-foreground text-left"
                              title={getGstBreakdown(order)}
                            >
                              Included: {getGstBreakdown(order)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            -
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(order.discountAmount || 0)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(getDisplayedTotalAmount(order))}
                          </TableCell>
                          <TableCell className="text-xs max-w-[350px]">
                            <span
                              className="line-clamp-2"
                              title={formattedAddress}
                            >
                              {formattedAddress || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No orders found matching current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
            onClick={handleExcelExport}
            disabled={
              loading || totalCount === 0 || exportingExcel || exportingPDF
            }
          >
            {exportingExcel ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconFileSpreadsheet className="h-4 w-4" />
            )}
            Export Excel
          </Button>
          <Button
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePDFExport}
            disabled={
              loading || totalCount === 0 || exportingExcel || exportingPDF
            }
          >
            {exportingPDF ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconFileTypePdf className="h-4 w-4" />
            )}
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
