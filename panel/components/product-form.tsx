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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconX, IconUpload, IconPlus, IconTrash } from "@tabler/icons-react";
import { createProduct, updateProduct, type Product, type ProductVariant } from "@/lib/products-api";
import { toast } from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import { VariantManager } from "./variant-manager";
import { bulkCreateVariants } from "@/lib/variants-api";
import { fetchCategories, type Category } from "@/lib/categories-api";


interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
}

// Helper to parse JSON fields
const parseJsonField = (value: any, defaultValue: any = null): any => {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(defaultValue) && Array.isArray(parsed)) return parsed;
      if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return parsed;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};

// Helper to migrate old size format to new size pricing format
function migrateSizesToPricing(sizes: any): Array<{ size: string; price: number | string; mrpPrice?: number | string }> {
  if (!sizes || sizes.length === 0) return [];

  // If already in new format (has price property)
  if (Array.isArray(sizes) && sizes.length > 0 && typeof sizes[0] === 'object' && sizes[0].price !== undefined) {
    return sizes;
  }

  // Old format (array of strings) - convert to new format with empty prices
  if (Array.isArray(sizes)) {
    return sizes.map((size: string) => ({
      size: typeof size === 'string' ? size : String(size),
      price: '',
      mrpPrice: ''
    }));
  }

  return [];
}

// Helper to ensure images is always an array
const ensureImagesArray = (images: any): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Helper to get backend image URL
const getBackendImageUrl = (url: string): string => {
  if (!url) return '';

  // If it's already a full URL or data URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005';
  return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Array Editor Component
const ArrayEditor: React.FC<{
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  itemMaxLength?: number;
}> = ({
  label,
  value,
  onChange,
  placeholder = "Enter item",
  maxItems,
  itemMaxLength,
}) => {
  const handleAdd = () => {
    if (maxItems !== undefined && value.length >= maxItems) {
      toast.error(`Maximum ${maxItems} ${label.toLowerCase()} allowed`);
      return;
    }
    onChange([...value, '']);
  };
  const handleRemove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const handleChange = (index: number, newValue: string) => {
    const newItems = [...value];
    newItems[index] =
      itemMaxLength !== undefined
        ? newValue.slice(0, itemMaxLength)
        : newValue;
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}{" "}
        {maxItems !== undefined && (
          <span className="text-muted-foreground">({value.length}/{maxItems})</span>
        )}
      </Label>
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={placeholder}
                maxLength={itemMaxLength}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {itemMaxLength !== undefined && (
              <p className="text-xs text-muted-foreground text-right">
                {item.length}/{itemMaxLength}
              </p>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="w-full"
          disabled={maxItems !== undefined && value.length >= maxItems}
        >
          <IconPlus className="h-4 w-4 mr-2" />
          Add {label}{" "}
          {maxItems !== undefined && value.length >= maxItems && `(Max ${maxItems})`}
        </Button>
      </div>
    </div>
  );
};

// Object Array Editor Component
const ObjectArrayEditor: React.FC<{
  label: string;
  value: Record<string, any>[];
  onChange: (value: Record<string, any>[]) => void;
  fields: { name: string; label: string; type?: 'text' | 'number' | 'textarea' }[];
}> = ({ label, value, onChange, fields }) => {
  const handleAdd = () => {
    const newItem: Record<string, any> = {};
    fields.forEach(field => {
      newItem[field.name] = field.type === 'number' ? 0 : '';
    });
    onChange([...value, newItem]);
  };
  const handleRemove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const handleChange = (index: number, fieldName: string, fieldValue: any) => {
    const newItems = [...value];
    newItems[index] = { ...newItems[index], [fieldName]: fieldValue };
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{label} {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {fields.map((field) => (
                <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <Label className="text-xs">{field.label}</Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={item[field.name] || ''}
                      onChange={(e) => handleChange(index, field.name, e.target.value)}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={field.type || 'text'}
                      value={item[field.name] || ''}
                      onChange={(e) => handleChange(
                        index,
                        field.name,
                        field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={handleAdd} className="w-full">
          <IconPlus className="h-4 w-4 mr-2" />
          Add {label}
        </Button>
      </div>
    </div>
  );
};

// Usage Steps Editor Component (Max 5, auto-numbered)
const UsageStepsEditor: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
}> = ({ value, onChange }) => {
  const MAX_STEPS = 5;

  const handleAdd = () => {
    if (value.length >= MAX_STEPS) {
      toast.error(`Maximum ${MAX_STEPS} usage steps allowed`);
      return;
    }
    onChange([...value, '']);
  };

  const handleRemove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const handleChange = (index: number, newValue: string) => {
    const newItems = [...value];
    newItems[index] = newValue;
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <Label>Usage Steps {value.length > 0 && <span className="text-muted-foreground">({value.length}/{MAX_STEPS})</span>}</Label>
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Step {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <textarea
              value={item}
              onChange={(e) => handleChange(index, e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="Enter usage instruction"
              rows={3}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="w-full"
          disabled={value.length >= MAX_STEPS}
        >
          <IconPlus className="h-4 w-4 mr-2" />
          Add Step {value.length >= MAX_STEPS && `(Max ${MAX_STEPS})`}
        </Button>
      </div>
    </div>
  );
};

// Common Questions Editor Component (Max 3, auto-numbered)
const CommonQuestionsEditor: React.FC<{
  value: Array<{ question: string; answer: string }>;
  onChange: (value: Array<{ question: string; answer: string }>) => void;
}> = ({ value, onChange }) => {
  const MAX_QUESTIONS = 3;

  const handleAdd = () => {
    if (value.length >= MAX_QUESTIONS) {
      toast.error(`Maximum ${MAX_QUESTIONS} common questions allowed`);
      return;
    }
    onChange([...value, { question: '', answer: '' }]);
  };

  const handleRemove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const handleChange = (index: number, field: 'question' | 'answer', fieldValue: string) => {
    const newItems = [...value];
    newItems[index] = { ...newItems[index], [field]: fieldValue };
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <Label>Common Questions {value.length > 0 && <span className="text-muted-foreground">({value.length}/{MAX_QUESTIONS})</span>}</Label>
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Question {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Question</Label>
                <Input
                  value={item.question || ''}
                  onChange={(e) => handleChange(index, 'question', e.target.value)}
                  placeholder="Enter question"
                />
              </div>
              <div>
                <Label className="text-xs">Answer</Label>
                <textarea
                  value={item.answer || ''}
                  onChange={(e) => handleChange(index, 'answer', e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="Enter answer"
                  rows={3}
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="w-full"
          disabled={value.length >= MAX_QUESTIONS}
        >
          <IconPlus className="h-4 w-4 mr-2" />
          Add Question {value.length >= MAX_QUESTIONS && `(Max ${MAX_QUESTIONS})`}
        </Button>
      </div>
    </div>
  );
};

// Key Ingredients Editor Component
const KeyIngredientsEditor: React.FC<{
  value: Array<{ name: string; benefits: string; image: string }>;
  onChange: (value: Array<{ name: string; benefits: string; image: string }>) => void;
  onImageChange?: (index: number, file: File) => void;
  imageFiles?: Map<number, File>;
}> = ({ value, onChange, onImageChange, imageFiles }) => {
  const MAX_INGREDIENTS = 16;
  const BENEFITS_MAX_LENGTH = 50;
  const [imagePreviews, setImagePreviews] = React.useState<Map<number, string>>(new Map());

  const handleAdd = () => {
    if (value.length >= MAX_INGREDIENTS) {
      toast.error(`Maximum ${MAX_INGREDIENTS} key ingredients allowed`);
      return;
    }
    onChange([...value, { name: '', benefits: '', image: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    // Remove preview and file
    const newPreviews = new Map(imagePreviews);
    newPreviews.delete(index);
    setImagePreviews(newPreviews);
  };

  const handleChange = (index: number, field: string, fieldValue: string) => {
    const newItems = [...value];
    const nextFieldValue =
      field === "benefits"
        ? fieldValue.slice(0, BENEFITS_MAX_LENGTH)
        : fieldValue;
    newItems[index] = { ...newItems[index], [field]: nextFieldValue };
    onChange(newItems);
  };

  const handleImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Validate image dimensions (400x400px)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width !== 400 || img.height !== 400) {
        toast.error('Image must be exactly 400x400 pixels');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        const newPreviews = new Map(imagePreviews);
        newPreviews.set(index, preview);
        setImagePreviews(newPreviews);
      };
      reader.readAsDataURL(file);

      // Store file for upload
      if (onImageChange) {
        onImageChange(index, file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error('Failed to load image');
    };

    img.src = objectUrl;

    // Clear the input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const newPreviews = new Map(imagePreviews);
    newPreviews.delete(index);
    setImagePreviews(newPreviews);

    // Update the ingredient to remove image URL
    handleChange(index, 'image', '');

    // Clear file if exists
    if (onImageChange) {
      // We'll handle this by not including the file in FormData
    }
  };

  // Load existing image previews on mount or when value changes
  React.useEffect(() => {
    const newPreviews = new Map<number, string>();
    value.forEach((item, index) => {
      if (item.image && !imagePreviews.has(index) && !imageFiles?.has(index)) {
        // Only show URL preview if it's not a data URL and we don't have a file preview
        if (item.image.startsWith('http') || item.image.startsWith('/')) {
          newPreviews.set(index, getBackendImageUrl(item.image));
        }
      }
    });
    if (newPreviews.size > 0) {
      setImagePreviews(prev => new Map([...Array.from(prev.entries()), ...Array.from(newPreviews.entries())]));
    }
  }, [value, imagePreviews, imageFiles]);

  return (
    <div className="space-y-2">
      <Label>Key Ingredients {value.length > 0 && <span className="text-muted-foreground">({value.length}/{MAX_INGREDIENTS})</span>}</Label>
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Ingredient {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Ingredient Name</Label>
                <Input
                  value={item.name || ''}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
                  placeholder="e.g., Aloe Vera"
                />
              </div>
              <div>
                <Label className="text-xs">Benefits</Label>
                <Input
                  value={item.benefits || ''}
                  onChange={(e) => handleChange(index, 'benefits', e.target.value)}
                  maxLength={BENEFITS_MAX_LENGTH}
                  placeholder="e.g., Moisturizes and soothes skin"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {(item.benefits || "").length}/{BENEFITS_MAX_LENGTH}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Image</Label>
                <div className="space-y-2">
                  {imagePreviews.has(index) ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreviews.get(index)}
                        alt={`Ingredient ${index + 1} preview`}
                        className="h-20 w-20 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => removeImage(index)}
                      >
                        <IconX className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageSelect(index, e)}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Upload 400x400px image (Max 5MB)</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="w-full"
          disabled={value.length >= MAX_INGREDIENTS}
        >
          <IconPlus className="h-4 w-4 mr-2" />
          Add Ingredient {value.length >= MAX_INGREDIENTS && `(Max ${MAX_INGREDIENTS})`}
        </Button>
      </div>
    </div>
  );
};

export function ProductForm({
  product,
  onClose,
  onSuccess,
  token,
}: ProductFormProps) {
  const DESCRIPTION_MAX_LENGTH = 550;
  const [loading, setLoading] = React.useState(false);


  const [formData, setFormData] = React.useState({
    name: '',
    slug: '',
    description: '',
    lowStockThreshold: '5',
    trackQuantity: true,
    length: '',
    width: '',
    height: '',

    categoryId: '',
    variants: [] as ProductVariant[],
    keyIngredients: [] as Array<{ name: string; benefits: string; image: string }>,
    benefits: [] as string[],
    usageSteps: [] as string[],
    commonQuestions: [] as Array<{ question: string; answer: string }>,
    isActive: true,
    tag: '',
  });

  const [images, setImages] = React.useState<string[]>([]);
  const [newImages, setNewImages] = React.useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const [keyIngredientImageFiles, setKeyIngredientImageFiles] = React.useState<Map<number, File>>(new Map());
  const [categories, setCategories] = React.useState<Category[]>([]);

  // Fetch categories
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetchCategories(token);
        if (response.success) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, [token]);

  // Generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Load product data
  React.useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        lowStockThreshold: String((product as any).lowStockThreshold || 5),
        trackQuantity: (product as any).trackQuantity !== false,
        length: (product as any).length ? String((product as any).length) : '',
        width: (product as any).width ? String((product as any).width) : '',
        height: (product as any).height ? String((product as any).height) : '',

        categoryId: String((product as any).categoryId || ''),
        variants: product.variants || [],
        keyIngredients: parseJsonField((product as any).keyIngredients, []),
        benefits: parseJsonField((product as any).benefits, []),
        usageSteps: parseJsonField((product as any).usageSteps, []),
        commonQuestions: parseJsonField((product as any).commonQuestions, []),
        isActive: (product as any).isActive !== false,
        tag: product.tag || '',
      });
      setImages(ensureImagesArray(product.images));
      setKeyIngredientImageFiles(new Map());
    } else {
      // Reset form
      setFormData({
        name: '',
        slug: '',
        description: '',
        lowStockThreshold: '5',
        trackQuantity: true,
        length: '',
        width: '',
        height: '',

        categoryId: '',
        variants: [],
        keyIngredients: [],
        benefits: [],
        usageSteps: [],
        commonQuestions: [],
        isActive: true,
        tag: '',
      });
      setImages([]);
      setNewImages([]);
      setImagePreviews([]);
      setKeyIngredientImageFiles(new Map());
    }
  }, [product]);

  // Auto-generate slug when name changes
  React.useEffect(() => {
    if (formData.name && !product) {
      setFormData(prev => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, product]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const nextValue =
      name === "description" ? value.slice(0, DESCRIPTION_MAX_LENGTH) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const dimensions = { width: img.width, height: img.height };
        URL.revokeObjectURL(objectUrl);
        resolve(dimensions);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image"));
      };

      img.src = objectUrl;
    });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_IMAGES = 5;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const REQUIRED_WIDTH = 1000;
    const REQUIRED_HEIGHT = 1000;
    e.target.value = "";

    if (files.length === 0) {
      return;
    }

    // Check total image count
    const totalImages = images.length + newImages.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    // Validate each file
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not a valid image file`);
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return;
      }
      try {
        const { width, height } = await getImageDimensions(file);
        if (width !== REQUIRED_WIDTH || height !== REQUIRED_HEIGHT) {
          toast.error(`${file.name} must be exactly 1000x1000 pixels`);
          return;
        }
      } catch {
        toast.error(`Failed to read dimensions for ${file.name}`);
        return;
      }
    }

    setNewImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviews((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    if (index < images.length) {
      setImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      const newIndex = index - images.length;
      setNewImages((prev) => prev.filter((_, i) => i !== newIndex));
      setImagePreviews((prev) => prev.filter((_, i) => i !== newIndex));
    }
  };

  const handleKeyIngredientImageChange = (index: number, file: File) => {
    setKeyIngredientImageFiles((prev) => {
      const newMap = new Map(prev);
      newMap.set(index, file);
      return newMap;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Product name is required");
      return;
    }

    if (!formData.categoryId) {
      toast.error("Product category is required");
      return;
    }

    if (newImages.length === 0 && images.length === 0 && !product) {
      toast.error("Please upload at least one product image");
      return;
    }

    // Validate that at least one variant is added
    if (formData.variants.length === 0) {
      toast.error("Please add at least one product variant");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Basic fields
      formDataToSend.append("name", formData.name);
      if (formData.slug) formDataToSend.append("slug", formData.slug);
      formDataToSend.append("description", formData.description);

      // Note: price, mrpPrice, quantity are now managed by variants
      formDataToSend.append("lowStockThreshold", formData.lowStockThreshold);
      formDataToSend.append("trackQuantity", formData.trackQuantity.toString());
      formDataToSend.append("length", formData.length);
      formDataToSend.append("width", formData.width);
      formDataToSend.append("height", formData.height);

      if (formData.categoryId) formDataToSend.append("categoryId", formData.categoryId);
      if (formData.variants && formData.variants.length > 0) {
        formDataToSend.append("variants", JSON.stringify(formData.variants));
      }
      formDataToSend.append("tag", formData.tag);
      formDataToSend.append("isActive", formData.isActive.toString());

      // Array fields as JSON (always append so updates can clear existing values)
      const normalizedKeyIngredients = formData.keyIngredients.map((item) => ({
        ...item,
        name: (item?.name || "").trim(),
        benefits: (item?.benefits || "").trim(),
      }));
      const normalizedBenefits = formData.benefits
        .map((item) => item.trim())
        .filter(Boolean);
      const normalizedUsageSteps = formData.usageSteps
        .map((step) => step.trim())
        .filter(Boolean);
      const normalizedCommonQuestions = formData.commonQuestions
        .map((item) => ({
          question: (item.question || "").trim(),
          answer: (item.answer || "").trim(),
        }))
        .filter((item) => item.question || item.answer);

      formDataToSend.append(
        "keyIngredients",
        JSON.stringify(normalizedKeyIngredients),
      );
      formDataToSend.append("benefits", JSON.stringify(normalizedBenefits));
      formDataToSend.append("usageSteps", JSON.stringify(normalizedUsageSteps));
      formDataToSend.append(
        "commonQuestions",
        JSON.stringify(normalizedCommonQuestions),
      );

      // Existing images if editing
      if (product && images.length > 0) {
        formDataToSend.append("existingImages", JSON.stringify(images));
      }

      // New images
      newImages.forEach((file) => {
        formDataToSend.append("images", file);
      });

      // Key ingredient images
      keyIngredientImageFiles.forEach((file, index) => {
        formDataToSend.append(`keyIngredientImage_${index}`, file);
      });

      if (product) {
        await updateProduct(product.id.toString(), formDataToSend, token);
        toast.success("Product updated successfully");
      } else {
        await createProduct(formDataToSend, token);
        toast.success("Product created successfully");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[95vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Update product information"
              : "Fill in the details to create a new product"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  disabled
                  placeholder="Auto-generated from name"
                />
                <p className="text-xs text-muted-foreground">Auto-generated from product name</p>
              </div>


              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.categoryId || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, categoryId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Product category for organization</p>
              </div>

              <div className="space-y-2">
                <Label>Tag</Label>
                <Select
                  value={formData.tag === "" ? "auto" : formData.tag} // Display "auto" if tag is empty
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, tag: value === "auto" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Detect based on pricing)</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="bestseller">Bestseller</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  "Auto" will automatically apply "Sale" tag if MRP &gt; Price.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                maxLength={DESCRIPTION_MAX_LENGTH}
                className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Enter product description"
                rows={5}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.description.length}/{DESCRIPTION_MAX_LENGTH}
              </p>
            </div>
          </div>

          <Separator />

          {/* Inventory */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Inventory</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="trackQuantity"
                checked={formData.trackQuantity}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, trackQuantity: !!checked }))
                }
              />
              <Label htmlFor="trackQuantity" className="cursor-pointer">
                Track Quantity
              </Label>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Default Package Dimensions (cm)</Label>
                <p className="text-xs text-muted-foreground">
                  Used as the product-level fallback when a variant does not have its own dimensions.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Length (cm)</Label>
                  <Input
                    id="length"
                    name="length"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.length}
                    onChange={handleInputChange}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width">Width (cm)</Label>
                  <Input
                    id="width"
                    name="width"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.width}
                    onChange={handleInputChange}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    name="height"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.height}
                    onChange={handleInputChange}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Product Content</h3>
            <div className="space-y-4">
              <VariantManager
                productSlug={formData.slug}
                variants={formData.variants}
                onChange={(value) => setFormData(prev => ({ ...prev, variants: value }))}
              />
              <KeyIngredientsEditor
                value={formData.keyIngredients}
                onChange={(value) => setFormData(prev => ({ ...prev, keyIngredients: value }))}
                onImageChange={handleKeyIngredientImageChange}
                imageFiles={keyIngredientImageFiles}
              />
              <ArrayEditor
                label="Benefits"
                value={formData.benefits}
                onChange={(value) => setFormData(prev => ({ ...prev, benefits: value }))}
                placeholder="e.g., Moisturizes skin"
                maxItems={6}
                itemMaxLength={70}
              />
              <UsageStepsEditor
                value={formData.usageSteps}
                onChange={(value) => setFormData(prev => ({ ...prev, usageSteps: value }))}
              />
              <CommonQuestionsEditor
                value={formData.commonQuestions}
                onChange={(value) => setFormData(prev => ({ ...prev, commonQuestions: value }))}
              />
            </div>
          </div>

          <Separator />

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Product Images</h3>
            <div className="space-y-2">
              <Label>Upload Images {!product && <span className="text-destructive">*</span>}</Label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Upload maximum 5 images. Required: 1000 x 1000px, Max 5MB per image
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {Array.isArray(images) && images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={getBackendImageUrl(image)}
                    alt={`Product ${index + 1}`}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6"
                    onClick={() => removeImage(index)}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {Array.isArray(imagePreviews) && imagePreviews.map((preview, index) => (
                <div key={`preview-${index}`} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6"
                    onClick={() => removeImage(images.length + index)}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status & Visibility</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: !!checked }))
                }
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Product is active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : product
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
