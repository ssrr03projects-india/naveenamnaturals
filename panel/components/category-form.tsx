"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { createCategory, updateCategory, type Category } from "@/lib/categories-api";

interface CategoryFormProps {
    category: Category | null;
    categories: Category[]; // For parent selector
    token: string | null;
    onSuccess: () => void;
    onClose: () => void;
}

export function CategoryForm({
    category,
    categories,
    token,
    onSuccess,
    onClose,
}: CategoryFormProps) {
    const [loading, setLoading] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: "",
        slug: "",
        description: "",
        parentId: "root", // "root" means no parent
        image: "",
        sortOrder: "0",
        isActive: true,
    });

    // Load category data when editing
    React.useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || "",
                slug: category.slug || "",
                description: category.description || "",
                parentId: category.parentId ? String(category.parentId) : "root",
                image: category.image || "",
                sortOrder: String(category.sortOrder || 0),
                isActive: category.isActive !== false,
            });
        } else {
            // Reset form
            setFormData({
                name: "",
                slug: "",
                description: "",
                parentId: "root",
                image: "",
                sortOrder: "0",
                isActive: true,
            });
        }
    }, [category]);

    // Auto-generate slug from name
    React.useEffect(() => {
        if (formData.name && !category) {
            const slug = formData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");
            setFormData((prev) => ({ ...prev, slug }));
        }
    }, [formData.name, category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.slug) {
            toast.error("Name and slug are required");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                slug: formData.slug,
                description: formData.description,
                parentId: formData.parentId === "root" ? null : Number(formData.parentId),
                image: formData.image,
                sortOrder: Number(formData.sortOrder),
                isActive: formData.isActive,
            };

            if (category) {
                await updateCategory(category.id, payload, token);
                toast.success("Category updated successfully");
            } else {
                await createCategory(payload, token);
                toast.success("Category created successfully");
            }

            onSuccess();
        } catch (error: any) {
            console.error("Error saving category:", error);
            toast.error(error.message || "Failed to save category");
        } finally {
            setLoading(false);
        }
    };

    // Filter out category itself from parent options (prevent circular reference)
    const parentOptions = categories.filter(c => !category || c.id !== category.id);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {category ? "Edit Category" : "Add New Category"}
                    </DialogTitle>
                    <DialogDescription>
                        {category
                            ? "Update category details"
                            : "Fill in the details to create a new category"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Category Name <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Hair Care"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug <span className="text-red-500">*</span></Label>
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            placeholder="e.g., hair-care"
                        />
                        <p className="text-xs text-muted-foreground">URL-friendly identifier</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="parent">Parent Category</Label>
                        <Select
                            value={formData.parentId}
                            onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select parent (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="root">None (Root Category)</SelectItem>
                                {parentOptions.map((cat) => (
                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sortOrder">Sort Order</Label>
                            <Input
                                id="sortOrder"
                                type="number"
                                value={formData.sortOrder}
                                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 pt-8">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData((prev) => ({ ...prev, isActive: !!checked }))
                                    }
                                />
                                <Label htmlFor="isActive" className="cursor-pointer">
                                    Active
                                </Label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : category ? "Update Category" : "Create Category"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
