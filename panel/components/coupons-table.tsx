"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconSearch,
  IconEye,
  IconEdit,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Coupon, CouponFilters } from "@/lib/coupons-api";

interface CouponsTableProps {
  coupons: Coupon[];
  loading: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: CouponFilters;
  onFiltersChange: (filters: CouponFilters) => void;
  onDelete: (id: string) => void;
}

export function CouponsTable({
  coupons,
  loading,
  pagination,
  filters,
  onFiltersChange,
  onDelete,
}: CouponsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState(filters.search || "");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [couponToDelete, setCouponToDelete] = React.useState<{
    id: string;
    code: string;
  } | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === "percentage") {
      return `${coupon.value}%`;
    } else {
      return `₹${coupon.value}`;
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value, page: 1 });
  };

  const handleDeleteClick = (id: string, code: string) => {
    setCouponToDelete({ id, code });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (couponToDelete) {
      onDelete(couponToDelete.id);
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Coupons ({pagination.totalItems})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-64"
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.type || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  type: value === "all" ? undefined : value,
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading coupons...</div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No coupons found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="font-medium">{coupon.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-semibold text-sm">
                          {coupon.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {coupon.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatDiscount(coupon)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {coupon.usedCount || 0} used
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Per customer: {coupon.usageLimitPerCustomer || "∞"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {coupon.expiresAt
                            ? formatDate(coupon.expiresAt)
                            : "No expiry"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={coupon.isActive ? "default" : "secondary"}
                        >
                          {coupon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/coupons/${coupon.id}`}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors"
                            title="View Details"
                          >
                            <IconEye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/coupons/${coupon.id}/edit`}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors"
                            title="Edit Coupon"
                          >
                            <IconEdit className="h-4 w-4" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleDeleteClick(
                                coupon.id.toString(),
                                coupon.code,
                              )
                            }
                            title="Delete Coupon"
                          >
                            <IconTrash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <div className="grid gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete coupon &quot;{couponToDelete?.code}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
