"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconSearch,
  IconEye,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer, CustomerFilters } from "@/lib/customers-api";

interface CustomersTableProps {
  customers: Customer[];
  loading: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
}

export function CustomersTable({
  customers,
  loading,
  pagination,
  filters,
  onFiltersChange,
}: CustomersTableProps) {
  const [searchTerm, setSearchTerm] = React.useState(filters.search || "");

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value, page: 1 });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Customers ({pagination.totalItems})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading customers...</div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No customers found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">
                          {customer.firstName} {customer.lastName || ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{customer.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{customer.phone || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.orderCount ?? customer.ordersCount ?? 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors"
                            title="View Details"
                          >
                            <IconEye className="h-4 w-4" />
                          </Link>
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
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{" "}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{" "}
                  {pagination.totalItems} results
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
                    onClick={() => onFiltersChange({ ...filters, page: pagination.currentPage - 1 })}
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
                    onClick={() => onFiltersChange({ ...filters, page: pagination.currentPage + 1 })}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onFiltersChange({ ...filters, page: pagination.totalPages })}
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
    </Card>
  );
}
