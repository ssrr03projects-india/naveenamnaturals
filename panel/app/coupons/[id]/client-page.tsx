"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { fetchCoupon, type Coupon } from "@/lib/coupons-api";
import { fetchProducts } from "@/lib/products-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconEdit } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

function CouponViewPageContent() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const [coupon, setCoupon] = useState<Coupon | null>(null);
    const [loading, setLoading] = useState(true);
    const [productNames, setProductNames] = useState<Record<number, string>>({});

    const normalizedApplicableProducts = (() => {
        const raw = coupon?.applicableProducts;
        if (!raw) return [];
        if (Array.isArray(raw)) {
            return raw
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0);
        }
        if (typeof raw === "string") {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed
                        .map((id) => Number(id))
                        .filter((id) => Number.isInteger(id) && id > 0);
                }
            } catch {
                return raw
                    .split(",")
                    .map((id) => Number(id.trim()))
                    .filter((id) => Number.isInteger(id) && id > 0);
            }
        }
        return [];
    })();

    useEffect(() => {
        if (params.id) {
            loadCoupon();
        }
    }, [params.id]);

    const loadCoupon = async () => {
        try {
            setLoading(true);
            const [couponRes, productsRes] = await Promise.all([
                fetchCoupon(params.id as string, token),
                fetchProducts({ limit: 200 }, token),
            ]);
            if (couponRes.success) {
                setCoupon(couponRes.data);
            }
            if (productsRes.success && productsRes.data?.products) {
                const nameMap: Record<number, string> = {};
                productsRes.data.products.forEach((p) => {
                    nameMap[p.id] = p.name;
                });
                setProductNames(nameMap);
            }
        } catch (error) {
            console.error("Error loading coupon:", error);
            toast.error("Failed to load coupon");
            router.push("/coupons");
        } finally {
            setLoading(false);
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

    if (!coupon) {
        return null;
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
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => router.push("/coupons")}
                                        >
                                            <IconArrowLeft className="h-4 w-4" />
                                        </Button>
                                        <div>
                                            <h1 className="text-2xl font-bold">Coupon Details</h1>
                                            <p className="text-muted-foreground mt-1">
                                                View coupon information
                                            </p>
                                        </div>
                                    </div>
                                    <Button onClick={() => router.push(`/coupons/${params.id}/edit`)}>
                                        <IconEdit className="h-4 w-4 mr-2" />
                                        Edit Coupon
                                    </Button>
                                </div>

                                <div className="grid gap-6">
                                    {/* Basic Information */}
                                    <div className="bg-card border rounded-lg p-6">
                                        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Coupon Code
                                                </label>
                                                <p className="text-lg font-mono font-semibold mt-1">
                                                    {coupon.code}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Status
                                                </label>
                                                <div className="mt-1">
                                                    <Badge variant={coupon.isActive ? "default" : "secondary"}>
                                                        {coupon.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Name
                                                </label>
                                                <p className="text-base mt-1">{coupon.name}</p>
                                            </div>
                                            {coupon.description && (
                                                <div className="md:col-span-2">
                                                    <label className="text-sm font-medium text-muted-foreground">
                                                        Description
                                                    </label>
                                                    <p className="text-base mt-1">{coupon.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Discount Details */}
                                    <div className="bg-card border rounded-lg p-6">
                                        <h2 className="text-lg font-semibold mb-4">Discount Details</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Type
                                                </label>
                                                <p className="text-base mt-1 capitalize">
                                                    {coupon.type.replace("_", " ")}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Value
                                                </label>
                                                <p className="text-base mt-1">
                                                    {coupon.type === "percentage"
                                                        ? `${coupon.value}%`
                                                        : `₹${coupon.value}`}
                                                </p>
                                            </div>
                                            {coupon.minimumAmount && (
                                                <div>
                                                    <label className="text-sm font-medium text-muted-foreground">
                                                        Minimum Amount
                                                    </label>
                                                    <p className="text-base mt-1">₹{coupon.minimumAmount}</p>
                                                </div>
                                            )}
                                        </div>
                                        {/* Applicable Products */}
                                        <div className="mt-4 pt-4 border-t">
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Applicable Products
                                            </label>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {normalizedApplicableProducts.length > 0 ? (
                                                    normalizedApplicableProducts.map((pid) => (
                                                        <Badge key={pid} variant="outline">
                                                            {productNames[pid] || `Product #${pid}`}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <p className="text-base text-muted-foreground">All Products</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Usage Limits */}
                                    <div className="bg-card border rounded-lg p-6">
                                        <h2 className="text-lg font-semibold mb-4">Usage Limits</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Used Count
                                                </label>
                                                <p className="text-base mt-1">{coupon.usedCount || 0}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Per Customer Limit
                                                </label>
                                                <p className="text-base mt-1">
                                                    {coupon.usageLimitPerCustomer || "Unlimited"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Validity Period */}
                                    <div className="bg-card border rounded-lg p-6">
                                        <h2 className="text-lg font-semibold mb-4">Validity Period</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Starts At
                                                </label>
                                                <p className="text-base mt-1">
                                                    {coupon.startsAt
                                                        ? new Date(coupon.startsAt).toLocaleString()
                                                        : "Immediately"}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Expires At
                                                </label>
                                                <p className="text-base mt-1">
                                                    {coupon.expiresAt
                                                        ? new Date(coupon.expiresAt).toLocaleString()
                                                        : "Never"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="bg-card border rounded-lg p-6">
                                        <h2 className="text-lg font-semibold mb-4">Metadata</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Created At
                                                </label>
                                                <p className="text-base mt-1">
                                                    {new Date(coupon.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Last Updated
                                                </label>
                                                <p className="text-base mt-1">
                                                    {new Date(coupon.updatedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
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

export default function CouponViewPage() {
    return (
        <ProtectedRoute>
            <CouponViewPageContent />
        </ProtectedRoute>
    );
}
