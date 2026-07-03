"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPlus, IconTrash, IconGripVertical } from "@tabler/icons-react";
import { toast } from "react-hot-toast";

interface SizePrice {
    size: string;
    price: number | string;
    mrpPrice?: number | string;
}

interface SizePricingEditorProps {
    value: SizePrice[];
    onChange: (value: SizePrice[]) => void;
}

export const SizePricingEditor: React.FC<SizePricingEditorProps> = ({ value, onChange }) => {
    const MAX_SIZES = 10;

    const handleAdd = () => {
        if (value.length >= MAX_SIZES) {
            toast.error(`Maximum ${MAX_SIZES} sizes allowed`);
            return;
        }
        onChange([...value, { size: '', price: '', mrpPrice: '' }]);
    };

    const handleRemove = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: keyof SizePrice, fieldValue: string | number) => {
        const newItems = [...value];
        newItems[index] = { ...newItems[index], [field]: fieldValue };
        onChange(newItems);
    };

    const calculateDiscount = (price: number | string, mrpPrice: number | string): number => {
        const p = parseFloat(price.toString());
        const mrp = parseFloat(mrpPrice.toString());
        if (isNaN(p) || isNaN(mrp) || mrp === 0) return 0;
        return Math.floor(((mrp - p) / mrp) * 100);
    };

    const validatePrice = (index: number): string | null => {
        const item = value[index];
        const price = parseFloat(item.price.toString());
        const mrpPrice = item.mrpPrice ? parseFloat(item.mrpPrice.toString()) : null;

        if (isNaN(price) || price <= 0) {
            return "Invalid price";
        }

        if (mrpPrice !== null && !isNaN(mrpPrice) && price > mrpPrice) {
            return "Price cannot be greater than MRP";
        }

        return null;
    };

    return (
        <div className="space-y-2">
            <Label>
                Size Pricing {value.length > 0 && <span className="text-muted-foreground">({value.length}/{MAX_SIZES})</span>}
            </Label>
            <p className="text-xs text-muted-foreground">
                Set individual prices for each size variant. Leave MRP empty to use base MRP.
            </p>
            <div className="space-y-3">
                {value.map((item, index) => {
                    const error = validatePrice(index);
                    const discount = item.mrpPrice ? calculateDiscount(item.price, item.mrpPrice) : 0;

                    return (
                        <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <IconGripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                    <span className="text-sm font-medium">Size {index + 1}</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemove(index)}
                                >
                                    <IconTrash className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Size Name *</Label>
                                    <Input
                                        value={item.size || ''}
                                        onChange={(e) => handleChange(index, 'size', e.target.value)}
                                        placeholder="e.g., 50ml, 100gms"
                                        className="h-9"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">MRP (₹)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.mrpPrice || ''}
                                        onChange={(e) => handleChange(index, 'mrpPrice', e.target.value)}
                                        placeholder="Optional"
                                        className="h-9"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Price (₹) *</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.price || ''}
                                            onChange={(e) => handleChange(index, 'price', e.target.value)}
                                            placeholder="0.00"
                                            className={`h-9 ${error ? 'border-destructive' : ''}`}
                                        />
                                        {discount > 0 && (
                                            <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                                                {discount}% OFF
                                            </span>
                                        )}
                                    </div>
                                    {error && <p className="text-xs text-destructive">{error}</p>}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAdd}
                    className="w-full"
                    disabled={value.length >= MAX_SIZES}
                >
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add Size {value.length >= MAX_SIZES && `(Max ${MAX_SIZES})`}
                </Button>
            </div>
        </div>
    );
};
