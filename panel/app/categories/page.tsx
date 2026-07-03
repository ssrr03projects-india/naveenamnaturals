/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/animate-ui/components/radix/sidebar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconEdit,
  IconTrash,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import { toast } from "react-hot-toast";
import { CategoryForm } from "@/components/category-form";
import {
  fetchCategoryTree,
  deleteCategory,
  type Category,
} from "@/lib/categories-api";
import { getAuthToken } from "@/lib/utils";

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(
    null,
  );
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<number>
  >(new Set());

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    React.useState<Category | null>(null);

  const token = getAuthToken();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetchCategoryTree(token);
      if (response.success) {
        setCategories(response.data);
        setFlatCategories(flattenCategories(response.data));
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCategories();
  }, []);

  const flattenCategories = (
    cats: Category[],
    level = 0,
    result: Category[] = [],
  ): Category[] => {
    cats.forEach((cat) => {
      // Add depth property for indentation (not in type but useful for UI)
      (cat as any).depth = level;
      result.push(cat);
      if (cat.children && cat.children.length > 0) {
        flattenCategories(cat.children, level + 1, result);
      }
    });
    return result;
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const confirmDeleteCategory = (category: Category) => {
    if (category.children && category.children.length > 0) {
      toast.error("Cannot delete category with subcategories");
      return;
    }
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategory(categoryToDelete.id, token);
      toast.success("Category deleted successfully");
      loadCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "Failed to delete category");
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  // Helper to check if a category or its children match search term
  const matchesSearch = (cat: Category, term: string): boolean => {
    if (cat.name.toLowerCase().includes(term.toLowerCase())) return true;
    if (cat.children) {
      return cat.children.some((child) => matchesSearch(child, term));
    }
    return false;
  };

  // Render rows recursively
  const renderCategoryRows = (cats: Category[], level = 0) => {
    if (!cats) return null;

    return cats.map((category) => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded =
        expandedCategories.has(category.id) || searchTerm !== "";
      const isMatch = searchTerm === "" || matchesSearch(category, searchTerm);

      // If search is active, we might want to show items that match or have children that match
      if (!isMatch) return null;

      return (
        <React.Fragment key={category.id}>
          <TableRow>
            <TableCell className="font-medium">
              <div
                className="flex items-center gap-2"
                style={{ paddingLeft: `${level * 24}px` }}
              >
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {isExpanded ? (
                      <IconChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <IconChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ) : (
                  <div className="w-6" /> // spacer
                )}
                {category.name}
              </div>
            </TableCell>
            <TableCell>{category.slug}</TableCell>
            <TableCell>{category.description || "-"}</TableCell>
            <TableCell>{category.sortOrder}</TableCell>
            <TableCell>
              <Badge variant={category.isActive ? "default" : "secondary"}>
                {category.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <IconDots className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleEditCategory(category)}
                  >
                    <IconEdit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => confirmDeleteCategory(category)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          {hasChildren &&
            isExpanded &&
            renderCategoryRows(category.children || [], level + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Categories</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between py-4">
            <div className="relative max-w-sm flex-1">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search categories..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleAddCategory}>
              <IconPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading categories...
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No categories found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  renderCategoryRows(categories)
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {isFormOpen && (
          <CategoryForm
            category={editingCategory}
            categories={flatCategories}
            token={token}
            onSuccess={() => {
              setIsFormOpen(false);
              loadCategories();
            }}
            onClose={() => setIsFormOpen(false)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <div className="grid gap-4">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  category &quot;{categoryToDelete?.name}&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCategory}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
