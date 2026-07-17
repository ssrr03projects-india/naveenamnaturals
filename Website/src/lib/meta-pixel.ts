type MetaTrackableItem = {
  id?: string | number;
  name?: string;
  price?: number | string | null;
  quantity?: number | string | null;
  quantityPurchase?: number | string | null;
  selectedSize?: string | null;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const META_CURRENCY = "INR";

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getItemQuantity = (item: MetaTrackableItem) => {
  return Math.max(
    1,
    toPositiveNumber(item.quantity) || toPositiveNumber(item.quantityPurchase) || 1,
  );
};

const buildMetaContents = (items: MetaTrackableItem[]) => {
  return items
    .map((item) => {
      const id = item.id;
      if (id === undefined || id === null || id === "") {
        return null;
      }

      return {
        id: String(id),
        quantity: getItemQuantity(item),
        item_price: toPositiveNumber(item.price),
      };
    })
    .filter(
      (item): item is { id: string; quantity: number; item_price: number } =>
        Boolean(item),
    );
};

const getPayloadValue = (items: MetaTrackableItem[], explicitValue?: number) => {
  if (typeof explicitValue === "number" && Number.isFinite(explicitValue) && explicitValue >= 0) {
    return Number(explicitValue.toFixed(2));
  }

  const derivedValue = items.reduce((total, item) => {
    return total + toPositiveNumber(item.price) * getItemQuantity(item);
  }, 0);

  return Number(derivedValue.toFixed(2));
};

const trackMetaEvent = (
  eventName: "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase",
  parameters: Record<string, unknown>,
) => {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  window.fbq("track", eventName, parameters);
};

const buildCartEventPayload = (items: MetaTrackableItem[], explicitValue?: number) => {
  const contents = buildMetaContents(items);
  const value = getPayloadValue(items, explicitValue);

  return {
    content_ids: contents.map((item) => item.id),
    content_name:
      items
        .map((item) => item.name)
        .filter((name): name is string => Boolean(name))
        .join(", ") || undefined,
    content_type: "product",
    contents,
    currency: META_CURRENCY,
    num_items: contents.reduce((total, item) => total + item.quantity, 0),
    value,
  };
};

export const getMetaCheckoutSignature = (
  items: MetaTrackableItem[],
  totalValue: number,
) => {
  return JSON.stringify({
    items: items.map((item) => ({
      id: item.id,
      price: toPositiveNumber(item.price),
      quantity: getItemQuantity(item),
      selectedSize: item.selectedSize || "",
    })),
    totalValue: Number(totalValue.toFixed(2)),
  });
};

export const trackMetaAddToCart = (item: MetaTrackableItem) => {
  trackMetaEvent("AddToCart", buildCartEventPayload([item]));
};

export const trackMetaInitiateCheckout = (
  items: MetaTrackableItem[],
  totalValue: number,
) => {
  trackMetaEvent("InitiateCheckout", buildCartEventPayload(items, totalValue));
};

export const trackMetaAddPaymentInfo = (
  items: MetaTrackableItem[],
  totalValue: number,
) => {
  trackMetaEvent("AddPaymentInfo", buildCartEventPayload(items, totalValue));
};

export const trackMetaPurchase = (
  items: MetaTrackableItem[],
  totalValue: number,
  orderId?: string | number,
) => {
  trackMetaEvent("Purchase", {
    ...buildCartEventPayload(items, totalValue),
    order_id: orderId ? String(orderId) : undefined,
  });
};