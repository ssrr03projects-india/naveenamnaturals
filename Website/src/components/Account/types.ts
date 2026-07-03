export interface GstBreakdownItem {
  itemId?: number | null;
  productId?: number | null;
  productName: string;
  quantity: number;
  basePrice: number;
  baseAmount: number;
  gstRate: number;
  allocatedDiscount: number;
  discountedUnitPrice: number;
  taxableAmount: number;
  gstAmount: number;
  lineTotal: number;
}

export interface GstBreakdownGroup {
  gstRate: number;
  gstAmount: number;
}

export interface GstBreakdown {
  couponApplied: boolean;
  couponDiscount: number;
  subtotalBase: number;
  subtotalAfterDiscount: number;
  items: GstBreakdownItem[];
  groupedByRate: GstBreakdownGroup[];
  totalGst: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount: string | number;
  subtotal?: string | number;
  shippingAmount?: string | number;
  discountAmount?: string | number;
  couponCode?: string;
  coupon?: {
    code: string;
  };
  gstBreakdown?: GstBreakdown;
  shippingCarrier?: string | null;
  shippingProvider?: string | null;
  shippingShipmentId?: string | null;
  shippingProviderOrderId?: string | null;
  shippingCourierName?: string | null;
  shippingLatestStatus?: string | null;
  trackingNumber?: string | null;
  cancelledReason?: string;
  createdAt: string;
  address?: any;
  items?: Array<{
    id: number;
    quantity: number;
    unitPrice?: string | number;
    price: string | number;
    totalPrice: string | number;
    taxAmount?: string | number;
    productName?: string;
    product?: {
      id: number;
      name: string;
      images?: string[] | string;

      sku?: string;
      slug?: string;
    };
  }>;
  taxAmount?: string | number;
}

export interface OrderStats {
  totalOrders: number;
  awaitingPickup: number;
  cancelledOrders: number;
  deliveredOrders: number;
}
