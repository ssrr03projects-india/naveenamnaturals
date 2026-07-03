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
import { Checkbox } from "@/components/ui/checkbox";
import type { CreateCouponData } from "@/lib/coupons-api";
import { fetchProducts } from "@/lib/products-api";
import { useAuth } from "@/components/providers/auth-provider";
import { IconChevronDown } from "@tabler/icons-react";

interface SimpleProduct {
  id: number;
  name: string;
}

interface AddCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCouponData) => Promise<void>;
  isLoading?: boolean;
}

export function AddCouponModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: AddCouponModalProps) {
  const { token } = useAuth();
  const [products, setProducts] = React.useState<SimpleProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = React.useState<number[]>([]);
  const [productsDropdownOpen, setProductsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [formData, setFormData] = React.useState<CreateCouponData>({
    code: "",
    name: "",
    description: "",
    type: "percentage",
    value: 0,
    minimumAmount: undefined,
    usageLimitPerCustomer: undefined,
    expiresAt: undefined,
    isActive: true,
  });

  // Fetch products when modal opens
  React.useEffect(() => {
    if (isOpen && token) {
      fetchProducts({ limit: 200 }, token)
        .then((res) => {
          if (res.success && res.data?.products) {
            setProducts(
              res.data.products.map((p) => ({ id: p.id, name: p.name }))
            );
          }
        })
        .catch(() => { });
    }
  }, [isOpen, token]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) => (prev.includes(id) ? [] : [id]));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? undefined : parseFloat(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value || undefined }));
    }
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      type: value as "percentage" | "fixed",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code || !formData.value) {
      return;
    }

    try {
      const submitData: CreateCouponData = {
        ...formData,
        value: formData.value,
        minimumAmount: formData.minimumAmount ?? null,
        usageLimit: null,
        usageLimitPerCustomer: formData.usageLimitPerCustomer ?? null,
        expiresAt: formData.expiresAt || null,
        applicableProducts: selectedProductIds.length > 0 ? selectedProductIds : [],
      };

      await onSubmit(submitData);
      setFormData({
        code: "",
        name: "",
        description: "",
        type: "percentage",
        value: 0,
        minimumAmount: undefined,
        usageLimitPerCustomer: undefined,
        expiresAt: undefined,
        isActive: true,
      });
      setSelectedProductIds([]);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const selectedLabel = React.useMemo(() => {
    if (selectedProductIds.length === 0) return "Select a product";
    const p = products.find((pr) => pr.id === selectedProductIds[0]);
    return p?.name || "1 product selected";
  }, [selectedProductIds, products]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Coupon</DialogTitle>
          <DialogDescription>
            Create a new discount coupon for your customers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">
                  Coupon Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Summer Sale 20% Off"
                />
              </div>
              <div>
                <Label htmlFor="code">
                  Coupon Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  placeholder="e.g., SAVE20, WELCOME10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Customers will enter this code at checkout
                </p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the coupon"
                />
              </div>
            </div>
          </div>

          {/* Discount Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Discount Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">
                  Discount Type <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.type} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">
                  Discount Value <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value || ""}
                    onChange={handleChange}
                    required
                    placeholder={formData.type === "percentage" ? "20" : "100"}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-sm text-muted-foreground">
                      {formData.type === "percentage"
                        ? "%"
                        : formData.type === "fixed"
                          ? "₹"
                          : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="minimumAmount">Minimum Order Amount</Label>
                <div className="relative">
                  <Input
                    id="minimumAmount"
                    name="minimumAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimumAmount || ""}
                    onChange={handleChange}
                    placeholder="0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-sm text-muted-foreground">₹</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum order amount required to use this coupon
                </p>
              </div>
              {/* Applicable Products */}
              <div className="md:col-span-2" ref={dropdownRef}>
                <Label>Applicable Products</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProductsDropdownOpen((v) => !v)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <span className={selectedProductIds.length === 0 ? "text-muted-foreground" : ""}>
                      {selectedLabel}
                    </span>
                    <IconChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                  {productsDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                      <div className="max-h-60 overflow-y-auto">
                        {/* Individual products */}
                        {products.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                          >
                            <Checkbox
                              checked={selectedProductIds.includes(p.id)}
                              onCheckedChange={() => toggleProduct(p.id)}
                            />
                            {p.name}
                          </label>
                        ))}
                        {products.length === 0 && (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            No products found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the product this coupon applies to.
                </p>
              </div>
            </div>
          </div>

          {/* Usage Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Usage Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usageLimitPerCustomer">Usage Limit Per Customer</Label>
                <Input
                  id="usageLimitPerCustomer"
                  name="usageLimitPerCustomer"
                  type="number"
                  min="1"
                  value={formData.usageLimitPerCustomer || ""}
                  onChange={handleChange}
                  placeholder="No limit"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of times one customer can use this coupon
                </p>
              </div>
              <div>
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  name="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt || ""}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for no expiry
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: !!checked }))
                }
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (coupon can be used immediately)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
