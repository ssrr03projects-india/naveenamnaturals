"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  IconEdit,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconSearch,
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
import { Card, CardContent } from "@/components/ui/card";
import type { Product, ProductFilters } from "@/lib/products-api";

interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export function ProductsTable({
  products,
  loading,
  pagination,
  filters,
  onFiltersChange,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [searchTerm, setSearchTerm] = React.useState(filters.search || "");

  const columns: ColumnDef<Product>[] = React.useMemo(
    () => [
      {
        accessorKey: "images",
        header: "Image",
        cell: ({ row }) => {
          const images = row.original.images || [];
          const firstImage = process.env.NEXT_PUBLIC_API_BASE_URL + images[0];


          const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

          const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            // Only set placeholder if current src is not already the placeholder
            if (img.src !== placeholderImage) {
              img.src = placeholderImage;
            }
          };

          return (
            <div className="flex items-center">
              <img
                src={firstImage || placeholderImage}
                alt={row.original.name}
                className="h-12 w-12 rounded-md object-cover bg-gray-100"
                onError={handleImageError}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Product Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.category || "-"}
          </div>
        ),
      },
      {
        accessorKey: "priceRange",
        header: "Price Range",
        cell: ({ row }) => {
          const priceRange = row.original.priceRange;
          const variants = row.original.variants;

          if (priceRange) {
            return (
              <div className="font-medium text-green-600 dark:text-green-400">
                {priceRange}
              </div>
            );
          }

          // Fallback: calculate from variants if available
          if (variants && variants.length > 0) {
            const prices = variants.map(v => v.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            if (minPrice === maxPrice) {
              return (
                <div className="font-medium text-green-600 dark:text-green-400">
                  ₹{minPrice.toLocaleString()}
                </div>
              );
            }

            return (
              <div className="font-medium text-green-600 dark:text-green-400">
                ₹{minPrice.toLocaleString()} - ₹{maxPrice.toLocaleString()}
              </div>
            );
          }

          return <div className="text-muted-foreground">N/A</div>;
        },
      },
      {
        accessorKey: "variants",
        header: "Variants",
        cell: ({ row }) => {
          const variants = row.original.variants;
          const count = variants?.length || 0;

          return (
            <div className="text-sm">
              <Badge variant="outline">
                {count} {count === 1 ? 'variant' : 'variants'}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "totalStock",
        header: "Total Stock",
        cell: ({ row }) => {
          const totalStock = row.original.totalStock ?? 0;
          const lowStockThreshold = row.original.lowStockThreshold ?? 5;
          const isLowStock = totalStock <= lowStockThreshold;

          return (
            <div className={isLowStock ? "text-red-600 font-medium" : "font-medium"}>
              {totalStock}
              {isLowStock && totalStock > 0 && (
                <span className="ml-1 text-xs">(Low)</span>
              )}
              {totalStock === 0 && (
                <span className="ml-1 text-xs">(Out)</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={row.original.isActive ? "default" : "outline"}
            className={
              row.original.isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : ""
            }
          >
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(row.original)}
              className="h-8 w-8"
            >
              <IconEdit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(row.original.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete]
  );

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ ...filters, page });
  };

  const handleStatusFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      isActive: value === "all" ? undefined : value,
      page: 1,
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.isActive === undefined ? "all" : filters.isActive}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{" "}
            {Math.min(
              pagination.currentPage * pagination.itemsPerPage,
              pagination.totalItems
            )}{" "}
            of {pagination.totalItems} products
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.currentPage === 1}
            >
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
