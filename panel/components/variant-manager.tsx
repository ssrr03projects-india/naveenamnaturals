"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPlus, IconTrash, IconEdit, IconCheck, IconX } from "@tabler/icons-react";
import { toast } from "react-hot-toast";
import type { ProductVariant } from "@/lib/variants-api";
import { generateVariantSKU } from "@/lib/variants-api";

interface VariantManagerProps {
    productSlug: string;
    variants: ProductVariant[];
    onChange: (variants: ProductVariant[]) => void;
    readOnly?: boolean;
}

interface VariantFormData {
    name: string;
    sku: string;
    price: string;
    mrpPrice: string;
    gstPercentage: string;
    stock: string;
    customStock: string;
    weight: string;
    length: string;
    width: string;
    height: string;
    sortOrder: number;
    isActive: boolean;
}

const MAX_VARIANTS = 10;
const CUSTOM_STOCK_MAX_LENGTH = 40;
const GST_OPTIONS = [5, 12, 18, 28] as const;

const sanitizeCustomStock = (value: string): string => {
    return value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, CUSTOM_STOCK_MAX_LENGTH);
};

const normalizeGstForUi = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return "";
    return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
};

export function VariantManager({
    productSlug,
    variants,
    onChange,
    readOnly = false,
}: VariantManagerProps) {
    const [editingId, setEditingId] = React.useState<number | null>(null);
    const [isAdding, setIsAdding] = React.useState(false);
    const [formData, setFormData] = React.useState<VariantFormData>({
        name: "",
        sku: "",
        price: "",
        mrpPrice: "",
        gstPercentage: "",
        stock: "0",
        customStock: "",
        weight: "",
        length: "",
        width: "",
        height: "",
        sortOrder: variants.length,
        isActive: true,
    });

    // Auto-generate SKU when name changes
    React.useEffect(() => {
        if ((isAdding || editingId !== null) && formData.name && productSlug) {
            const generatedSKU = generateVariantSKU(productSlug, formData.name);
            setFormData((prev) => ({ ...prev, sku: generatedSKU }));
        }
    }, [formData.name, productSlug, isAdding, editingId]);

    const resetForm = () => {
        setFormData({
            name: "",
            sku: "",
            price: "",
            mrpPrice: "",
            gstPercentage: "",
            stock: "0",
            customStock: "",
            weight: "",
            length: "",
            width: "",
            height: "",
            sortOrder: variants.length,
            isActive: true,
        });
        setIsAdding(false);
        setEditingId(null);
    };

    const validateForm = (): string | null => {
        if (!formData.weight.trim()) {
            return "Weight/Size is required";
        }
        if (!formData.sku.trim()) {
            return "SKU is required";
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            return "Price must be greater than 0";
        }
        if (formData.mrpPrice && parseFloat(formData.price) > parseFloat(formData.mrpPrice)) {
            return "Price cannot be greater than MRP";
        }
        if (!formData.gstPercentage) {
            return "Please select GST";
        }
        if (formData.customStock && !/^[a-zA-Z0-9 ]+$/.test(formData.customStock)) {
            return "Custom message allows only letters, numbers, and spaces";
        }
        for (const field of ["length", "width", "height"] as const) {
            if (formData[field] && Number(formData[field]) <= 0) {
                return "Variant dimensions must be positive numbers";
            }
        }

        // Check for duplicate SKU
        const isDuplicate = variants.some(
            (v) => v.sku === formData.sku && v.id !== editingId
        );
        if (isDuplicate) {
            return "SKU already exists";
        }

        return null;
    };

    const handleAdd = () => {
        if (variants.length >= MAX_VARIANTS) {
            toast.error(`Maximum ${MAX_VARIANTS} variants allowed`);
            return;
        }
        setIsAdding(true);
        setFormData({
            name: "",
            sku: "",
            price: "",
            mrpPrice: "",
            gstPercentage: "",
            stock: "0",
            customStock: "",
            weight: "",
            length: "",
            width: "",
            height: "",
            sortOrder: variants.length,
            isActive: true,
        });
    };

    const handleEdit = (variant: ProductVariant) => {
        setEditingId(variant.id);
        setFormData({
            name: variant.name,
            sku: variant.sku,
            price: variant.price.toString(),
            mrpPrice: variant.mrpPrice?.toString() || "",
            gstPercentage: normalizeGstForUi(variant.gstPercentage),
            stock: variant.stock.toString(),
            customStock: variant.customStock || "",
            weight: variant.weight || "",
            length: variant.length ? String(variant.length) : "",
            width: variant.width ? String(variant.width) : "",
            height: variant.height ? String(variant.height) : "",
            sortOrder: variant.sortOrder,
            isActive: variant.isActive,
        });
    };

    const handleSave = () => {
        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        const variantData: ProductVariant = {
            id: editingId || Date.now(), // Temporary ID for new variants
            productId: 0, // Will be set when product is created
            name: formData.name,
            sku: formData.sku,
            price: parseFloat(formData.price),
            mrpPrice: formData.mrpPrice ? parseFloat(formData.mrpPrice) : null,
            gstPercentage: formData.gstPercentage ? parseInt(formData.gstPercentage, 10) : null,
            stock: parseInt(formData.stock) || 0,
            customStock: formData.customStock.trim() || null,
            sold: 0,
            weight: formData.weight || null,
            length: formData.length ? parseFloat(formData.length) : null,
            width: formData.width ? parseFloat(formData.width) : null,
            height: formData.height ? parseFloat(formData.height) : null,
            sortOrder: formData.sortOrder,
            isActive: formData.isActive,
        };

        if (editingId) {
            // Update existing variant
            const updated = variants.map((v) => (v.id === editingId ? variantData : v));
            onChange(updated);
            toast.success("Variant updated");
        } else {
            // Add new variant
            onChange([...variants, variantData]);
            toast.success("Variant added");
        }

        resetForm();
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this variant?")) {
            const updated = variants.filter((v) => v.id !== id);
            onChange(updated);
            toast.success("Variant deleted");
        }
    };

    const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
    const totalSold = variants.reduce((sum, v) => sum + v.sold, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-base">
                        Product Variants{" "}
                        <span className="text-muted-foreground">
                            ({variants.length}/{MAX_VARIANTS})
                        </span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                        Total Stock: {totalStock} | Total Sold: {totalSold}
                    </p>
                </div>
                {!readOnly && !isAdding && !editingId && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAdd}
                        disabled={variants.length >= MAX_VARIANTS}
                    >
                        <IconPlus className="h-4 w-4 mr-2" />
                        Add Variant
                    </Button>
                )}
            </div>

            {/* Variant List */}
            <div className="space-y-2">
                {variants.map((variant) => {
                    const gstDisplay = normalizeGstForUi((variant as unknown as { gstPercentage?: unknown }).gstPercentage);
                    return (
                    <div
                        key={variant.id}
                        className={`border rounded-lg p-3 ${editingId === variant.id ? "border-primary" : ""
                            }`}
                    >
                        {editingId === variant.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Weight/Size *</Label>
                                        <Input
                                            value={formData.weight}
                                            onChange={(e) =>
                                                setFormData({ ...formData, weight: e.target.value, name: e.target.value })
                                            }
                                            placeholder="e.g., 50ml, 100g"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">SKU (Auto-generated)</Label>
                                        <Input
                                            value={formData.sku}
                                            readOnly
                                            disabled
                                            className="bg-muted"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Price (₹) *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) =>
                                                setFormData({ ...formData, price: e.target.value })
                                            }
                                            placeholder="299"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">MRP (₹)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.mrpPrice}
                                            onChange={(e) =>
                                                setFormData({ ...formData, mrpPrice: e.target.value })
                                            }
                                            placeholder="399"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Stock</Label>
                                        <Input
                                            type="number"
                                            value={formData.stock}
                                            onChange={(e) =>
                                                setFormData({ ...formData, stock: e.target.value })
                                            }
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">GST</Label>
                                        <select
                                            value={formData.gstPercentage}
                                            onChange={(e) =>
                                                setFormData({ ...formData, gstPercentage: e.target.value })
                                            }
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                        >
                                            <option value="">Select GST</option>
                                            {GST_OPTIONS.map((value) => (
                                                <option key={value} value={value}>
                                                    {value}%
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Custom message</Label>
                                        <Input
                                            value={formData.customStock}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    customStock: sanitizeCustomStock(e.target.value),
                                                })
                                            }
                                            maxLength={CUSTOM_STOCK_MAX_LENGTH}
                                            placeholder=""
                                        />
                                        <p className="text-xs text-muted-foreground text-right">
                                            {formData.customStock.length}/{CUSTOM_STOCK_MAX_LENGTH}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Length (cm)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.length}
                                            onChange={(e) =>
                                                setFormData({ ...formData, length: e.target.value })
                                            }
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Width (cm)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.width}
                                            onChange={(e) =>
                                                setFormData({ ...formData, width: e.target.value })
                                            }
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Height (cm)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.height}
                                            onChange={(e) =>
                                                setFormData({ ...formData, height: e.target.value })
                                            }
                                            placeholder="Optional"
                                        />
                                    </div>

                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSave}
                                    >
                                        <IconCheck className="h-4 w-4 mr-1" />
                                        Save
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={resetForm}
                                    >
                                        <IconX className="h-4 w-4 mr-1" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div className="flex items-center justify-between">
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div>
                                        <span className="font-medium">{variant.weight || variant.name}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                        SKU: {variant.sku}
                                    </div>
                                    <div>
                                        <span className="font-medium">₹{variant.price}</span>
                                        {variant.mrpPrice && (
                                            <span className="text-muted-foreground line-through ml-2">
                                                ₹{variant.mrpPrice}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        Stock: <span className="font-medium">{variant.stock}</span>
                                        {variant.sold > 0 && (
                                            <span className="text-muted-foreground ml-1">
                                                (Sold: {variant.sold})
                                            </span>
                                        )}
                                    </div>
                                    {gstDisplay && (
                                        <div className="text-muted-foreground">
                                            GST: <span className="font-medium">{gstDisplay}%</span>
                                        </div>
                                    )}
                                    {variant.customStock && (
                                        <div className="text-muted-foreground">
                                            Custom Message: <span className="font-medium">{variant.customStock}</span>
                                        </div>
                                    )}
                                    {(variant.length || variant.width || variant.height) && (
                                        <div className="text-muted-foreground md:col-span-2">
                                            Dimensions:{" "}
                                            <span className="font-medium">
                                                {variant.length || "-"} x {variant.width || "-"} x {variant.height || "-"} cm
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {!readOnly && (
                                    <div className="flex gap-1 ml-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(variant)}
                                        >
                                            <IconEdit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(variant.id)}
                                        >
                                            <IconTrash className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    );
                })}

                {/* Add New Variant Form */}
                {isAdding && (
                    <div className="border border-primary rounded-lg p-3 bg-muted/50">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-medium">New Variant</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Weight/Size *</Label>
                                    <Input
                                        value={formData.weight}
                                        onChange={(e) =>
                                            setFormData({ ...formData, weight: e.target.value, name: e.target.value })
                                        }
                                        placeholder="e.g., 50ml, 100g"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">SKU (Auto-generated)</Label>
                                    <Input
                                        value={formData.sku}
                                        readOnly
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Price (₹) *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) =>
                                            setFormData({ ...formData, price: e.target.value })
                                        }
                                        placeholder="299"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">MRP (₹)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.mrpPrice}
                                        onChange={(e) =>
                                            setFormData({ ...formData, mrpPrice: e.target.value })
                                        }
                                        placeholder="399"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Stock</Label>
                                    <Input
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) =>
                                            setFormData({ ...formData, stock: e.target.value })
                                        }
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">GST</Label>
                                    <select
                                        value={formData.gstPercentage}
                                        onChange={(e) =>
                                            setFormData({ ...formData, gstPercentage: e.target.value })
                                        }
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    >
                                        <option value="">Select GST</option>
                                        {GST_OPTIONS.map((value) => (
                                            <option key={value} value={value}>
                                                {value}%
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs">Custom Message</Label>
                                    <Input
                                        value={formData.customStock}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                customStock: sanitizeCustomStock(e.target.value),
                                            })
                                        }
                                        maxLength={CUSTOM_STOCK_MAX_LENGTH}
                                        placeholder=""
                                    />
                                    <p className="text-xs text-muted-foreground text-right">
                                        {formData.customStock.length}/{CUSTOM_STOCK_MAX_LENGTH}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs">Length (cm)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.length}
                                        onChange={(e) =>
                                            setFormData({ ...formData, length: e.target.value })
                                        }
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Width (cm)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.width}
                                        onChange={(e) =>
                                            setFormData({ ...formData, width: e.target.value })
                                        }
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Height (cm)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.height}
                                        onChange={(e) =>
                                            setFormData({ ...formData, height: e.target.value })
                                        }
                                        placeholder="Optional"
                                    />
                                </div>

                            </div>
                            <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={handleSave}>
                                    <IconCheck className="h-4 w-4 mr-1" />
                                    Add Variant
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={resetForm}
                                >
                                    <IconX className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {variants.length === 0 && !isAdding && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No variants added yet</p>
                    <p className="text-sm mt-1">Click "Add Variant" to create product variants</p>
                </div>
            )}
        </div>
    );
}
