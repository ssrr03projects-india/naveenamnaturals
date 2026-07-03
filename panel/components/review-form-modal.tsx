"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconStar, IconSearch } from "@tabler/icons-react";
import type { CreateReviewData, UpdateReviewData, Review } from "@/lib/reviews-api";
import { fetchCustomers, type Customer } from "@/lib/customers-api";
import { fetchProducts, type Product } from "@/lib/products-api";
import { useAuth } from "@/components/providers/auth-provider";

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReviewData | UpdateReviewData) => Promise<void>;
  review?: Review | null;
  isLoading?: boolean;
}

export function ReviewFormModal({
  isOpen,
  onClose,
  onSubmit,
  review,
  isLoading = false,
}: ReviewFormModalProps) {
  const { token } = useAuth();
  const [formData, setFormData] = React.useState<CreateReviewData | UpdateReviewData>({
    customerName: "",
    customerEmail: "",
    productId: 0,
    rating: 5,
    comment: "",
    images: [],
  });

  const [adminReply, setAdminReply] = React.useState("");
  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">("pending");

  // Customer and Product data
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [productSearch, setProductSearch] = React.useState("");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [selectedProductId, setSelectedProductId] = React.useState<string>("");

  const loadCustomers = React.useCallback(async () => {
    try {
      setLoadingCustomers(true);
      const response = await fetchCustomers(
        { limit: 100, search: customerSearch || undefined },
        token
      );
      if (response.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  }, [customerSearch, token]);

  const loadProducts = React.useCallback(async () => {
    try {
      setLoadingProducts(true);
      const response = await fetchProducts(
        { limit: 100, search: productSearch || undefined, isActive: "true" },
        token
      );
      if (response.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, [productSearch, token]);

  // Fetch customers when modal opens
  React.useEffect(() => {
    if (isOpen && !review) {
      loadCustomers();
      loadProducts();
    }
  }, [isOpen, review, loadCustomers, loadProducts]);

  // Debounce customer search
  React.useEffect(() => {
    if (!isOpen || review) return;
    const timeout = setTimeout(() => {
      loadCustomers();
    }, 500);
    return () => clearTimeout(timeout);
  }, [customerSearch, isOpen, review, loadCustomers]);

  // Debounce product search
  React.useEffect(() => {
    if (!isOpen || review) return;
    const timeout = setTimeout(() => {
      loadProducts();
    }, 500);
    return () => clearTimeout(timeout);
  }, [productSearch, isOpen, review, loadProducts]);

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id.toString() === customerId);
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        customerName: `${customer.firstName} ${customer.lastName || ""}`.trim(),
        customerEmail: customer.email,
        customerId: customer.id,
      }));
    }
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setFormData((prev) => ({
      ...prev,
      productId: parseInt(productId),
    }));
  };

  React.useEffect(() => {
    if (review) {
      // Editing existing review
      setFormData({
        customerName: review.customerName,
        customerEmail: review.customerEmail,
        productId: review.productId,
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
      });
      setAdminReply(review.adminReply || "");
      setStatus(review.status);
    } else {
      // Creating new review
      setFormData({
        customerName: "",
        customerEmail: "",
        productId: 0,
        rating: 5,
        comment: "",
        images: [],
      });
      setAdminReply("");
      setStatus("pending");
      setSelectedCustomerId("");
      setSelectedProductId("");
      setCustomerSearch("");
      setProductSearch("");
    }
  }, [review, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value === "" ? 0 : parseInt(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (review) {
      // Update review
      const updateData: UpdateReviewData = {
        status,
        adminReply: adminReply || undefined,
      };
      await onSubmit(updateData);
    } else {
      // Create review
      if (!selectedCustomerId || !selectedProductId || !(formData as CreateReviewData).comment) {
        return;
      }
      const submitData: CreateReviewData = {
        ...(formData as CreateReviewData),
        customerId: parseInt(selectedCustomerId),
      };
      await onSubmit(submitData);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setFormData(prev => ({ ...prev, rating: star }))}
            className={interactive ? "cursor-pointer" : "cursor-default"}
          >
            <IconStar
              className={`h-5 w-5 ${star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
                }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {review ? "Edit Review" : "Add New Review"}
          </DialogTitle>
          <DialogDescription>
            {review
              ? "Update review information and status"
              : "Create a new product review"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {review ? (
            // Edit mode - show status and admin reply
            <>
              <div className="space-y-2">
                <Label>Customer</Label>
                <div className="p-2 bg-muted rounded-md">
                  <div className="font-medium">{review.customerName}</div>
                  <div className="text-sm text-muted-foreground">{review.customerEmail}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <div className="p-2 bg-muted rounded-md">
                  <div className="font-medium">{review.productName}</div>
                  <div className="text-sm text-muted-foreground">ID: {review.productId}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="p-2 bg-muted rounded-md">
                  {renderStars(review.rating)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Comment</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {review.comment}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminReply">Admin Reply</Label>
                <textarea
                  id="adminReply"
                  name="adminReply"
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="Enter admin reply (optional)"
                  rows={4}
                />
              </div>
            </>
          ) : (
            // Create mode
            <>
              <div className="space-y-2">
                <Label htmlFor="customer">Select Customer *</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <IconSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-8 mb-2"
                    />
                  </div>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={handleCustomerSelect}
                    disabled={loadingCustomers}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {customer.firstName} {customer.lastName || ""}
                            </span>
                            <span className="text-xs text-muted-foreground">{customer.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {customers.length === 0 && !loadingCustomers && (
                        <SelectItem value="no-customers" disabled>
                          No customers found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCustomerId && (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    <div className="font-medium">{(formData as CreateReviewData).customerName}</div>
                    <div className="text-muted-foreground">{(formData as CreateReviewData).customerEmail}</div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Select Product *</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <IconSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-8 mb-2"
                    />
                  </div>
                  <Select
                    value={selectedProductId}
                    onValueChange={handleProductSelect}
                    disabled={loadingProducts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select a product"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ₹{parseFloat(product.price).toLocaleString()} • ID: {product.id}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {products.length === 0 && !loadingProducts && (
                        <SelectItem value="no-products" disabled>
                          No products found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProductId && (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    <div className="font-medium">
                      {products.find((p) => p.id.toString() === selectedProductId)?.name || "Product"}
                    </div>
                    <div className="text-muted-foreground">ID: {selectedProductId}</div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Rating *</Label>
                {renderStars((formData as CreateReviewData).rating, true)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment *</Label>
                <textarea
                  id="comment"
                  name="comment"
                  value={(formData as CreateReviewData).comment}
                  onChange={handleChange}
                  className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="Enter review comment"
                  required
                  rows={5}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : review
                  ? "Update Review"
                  : "Create Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
