"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  fetchCoupon,
  updateCoupon,
  type CreateCouponData,
} from "@/lib/coupons-api";
import { fetchProducts } from "@/lib/products-api";
import { toast } from "sonner";
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
import { IconArrowLeft, IconChevronDown } from "@tabler/icons-react";

interface SimpleProduct {
  id: number;
  name: string;
}

function CouponEditPageContent() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<CreateCouponData>({
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

  useEffect(() => {
    if (params.id && token) {
      loadData();
    }
  }, [params.id, token]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [couponRes, productsRes] = await Promise.all([
        fetchCoupon(params.id as string, token),
        fetchProducts({ limit: 200 }, token),
      ]);

      if (couponRes.success) {
        const coupon = couponRes.data;
        setFormData({
          code: coupon.code,
          name: coupon.name,
          description: coupon.description || "",
          type: coupon.type,
          value: coupon.value,
          minimumAmount: coupon.minimumAmount,
          usageLimitPerCustomer: coupon.usageLimitPerCustomer,
          expiresAt: coupon.expiresAt
            ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
            : undefined,
          isActive: coupon.isActive,
        });
        // Pre-select applicable products
        if (coupon.applicableProducts) {
          let ids: number[] = [];
          if (Array.isArray(coupon.applicableProducts)) {
            ids = coupon.applicableProducts
              .map((id: unknown) => Number(id))
              .filter((id: number) => Number.isInteger(id) && id > 0);
          } else if (typeof coupon.applicableProducts === "string") {
            try {
              const parsed = JSON.parse(coupon.applicableProducts);
              if (Array.isArray(parsed)) {
                ids = parsed
                  .map((id: unknown) => Number(id))
                  .filter((id: number) => Number.isInteger(id) && id > 0);
              }
            } catch {
              // ignore parse error
            }
          }
          setSelectedProductIds(ids);
        }
      }

      if (productsRes.success && productsRes.data?.products) {
        setProducts(
          productsRes.data.products.map((p) => ({ id: p.id, name: p.name }))
        );
      }
    } catch (error) {
      console.error("Error loading coupon:", error);
      toast.error("Failed to load coupon");
      router.push("/coupons");
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) => (prev.includes(id) ? [] : [id]));
  };

  const selectedLabel = useMemo(() => {
    if (selectedProductIds.length === 0) return "Select a product";
    const p = products.find((pr) => pr.id === selectedProductIds[0]);
    return p?.name || "1 product selected";
  }, [selectedProductIds, products]);

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
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const submitData: Partial<CreateCouponData> = {
        ...formData,
        value: formData.value,
        minimumAmount: formData.minimumAmount ?? null,
        usageLimit: null,
        usageLimitPerCustomer: formData.usageLimitPerCustomer ?? null,
        expiresAt: formData.expiresAt || null,
        applicableProducts: selectedProductIds.length > 0 ? selectedProductIds : [],
      };

      await updateCoupon(params.id as string, submitData, token);
      toast.success("Coupon updated successfully");
      router.push(`/coupons/${params.id}`);
    } catch (error: unknown) {
      console.error("Error updating coupon:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update coupon";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading coupon...</p>
        </div>
      </div>
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
                    variant="outline"
                    size="icon"
                    onClick={() => router.push(`/coupons/${params.id}`)}
                  >
                    <IconArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">Edit Coupon</h1>
                    <p className="text-muted-foreground mt-1">
                      Update coupon information
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                  {/* Basic Information */}
                  <div className="bg-card border rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">
                          Coupon Name{" "}
                          <span className="text-destructive">*</span>
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
                          Coupon Code{" "}
                          <span className="text-destructive">*</span>
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
                  <div className="bg-card border rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-semibold">Discount Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">
                          Discount Type{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.type}
                          onValueChange={handleTypeChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              Percentage
                            </SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="value">
                          Discount Value{" "}
                          <span className="text-destructive">*</span>
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
                            placeholder={
                              formData.type === "percentage" ? "20" : "100"
                            }
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
                        <Label htmlFor="minimumAmount">
                          Minimum Order Amount
                        </Label>
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
                            <span className="text-sm text-muted-foreground">
                              ₹
                            </span>
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
                  <div className="bg-card border rounded-lg p-6 space-y-4">
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
                  <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        name="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: !!checked,
                          }))
                        }
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">
                        Active (coupon can be used immediately)
                      </Label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/coupons/${params.id}`)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Updating..." : "Update Coupon"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function CouponEditPage() {
  return (
    <ProtectedRoute>
      <CouponEditPageContent />
    </ProtectedRoute>
  );
}
