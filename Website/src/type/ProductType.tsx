export interface VariantType {
  id: string | number;
  productId: string | number;
  name: string;
  sku: string;
  price: number;
  mrpPrice?: number | null;
  gstPercentage?: number | null;
  stock: number;
  customStock?: string | null;
  sold: number;
  weight?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductType {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  category: string;
  categoryId?: number | null;
  quantity: number;
  sold: number;
  sizes: Array<string> | Array<{ size: string; price: number; mrpPrice?: number }> | string;
  keyIngredients?: Array<string> | Array<{ name?: string; benefits?: string; image?: string }> | string;
  benefits?: Array<string> | string;
  images: Array<string> | string;
  thumbImage?: Array<string> | string;
  variants?: VariantType[];
  categoryData?: {
    id: number;
    name: string;
    slug: string;
  };

  tag?: string | null;
  usageSteps?: Array<string> | string;
  commonQuestions?: Array<any> | string;
  isActive?: boolean;
  lowStockThreshold?: number;
  trackQuantity?: boolean;
  createdAt?: string;
  updatedAt?: string;
  rate?: number;
  price?: number; 
  originPrice?: number | null; 
  mrpPrice?: number | null; 
  gstPercentage?: number | null; 
  discount?: number;
  selectedSize?: string;
  quantityPurchase: number;
  variation?: string;
  brand?: string;
  type?: string;
  sale?: boolean;
  action?: string;
  new?: boolean;
  netWeight?: string;
  pricePerUnit?: string;
  gender?: string;
  variantId?: string | number; // Added for CartItem compatibility
}
