const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value) => Number(toFiniteNumber(value).toFixed(2));

function calculateGSTBreakdown(orderItems = [], couponDiscount = 0) {
  const normalizedItems = Array.isArray(orderItems)
    ? orderItems.map((item) => {
        const basePrice = toFiniteNumber(item?.basePrice);
        const quantity = Math.max(0, toFiniteNumber(item?.quantity));
        const gstRate = Math.max(0, toFiniteNumber(item?.gstRate));
        const baseAmount = basePrice * quantity;

        return {
          itemId: item?.itemId ?? null,
          productId: item?.productId ?? null,
          productName: item?.productName || "Product",
          quantity,
          basePrice,
          gstRate,
          baseAmount,
        };
      })
    : [];

  const subtotalBase = normalizedItems.reduce(
    (sum, item) => sum + item.baseAmount,
    0,
  );
  const boundedCouponDiscount = Math.min(
    Math.max(0, toFiniteNumber(couponDiscount)),
    subtotalBase,
  );

  const itemCount = normalizedItems.length;
  let allocatedDiscountTotal = 0;

  const items = normalizedItems.map((item, index) => {
    let allocatedDiscount = 0;

    if (boundedCouponDiscount > 0 && subtotalBase > 0) {
      if (index === itemCount - 1) {
        allocatedDiscount = boundedCouponDiscount - allocatedDiscountTotal;
      } else {
        allocatedDiscount = roundCurrency(
          boundedCouponDiscount * (item.baseAmount / subtotalBase),
        );
      }
    }

    allocatedDiscount = Math.min(item.baseAmount, allocatedDiscount);
    allocatedDiscountTotal += allocatedDiscount;

    const taxableAmount = Math.max(0, item.baseAmount - allocatedDiscount);
    const gstAmount = roundCurrency((taxableAmount * item.gstRate) / 100);
    const discountedUnitPrice =
      item.quantity > 0 ? roundCurrency(taxableAmount / item.quantity) : 0;
    const lineTotal = roundCurrency(taxableAmount + gstAmount);

    return {
      itemId: item.itemId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      basePrice: roundCurrency(item.basePrice),
      baseAmount: roundCurrency(item.baseAmount),
      gstRate: roundCurrency(item.gstRate),
      allocatedDiscount: roundCurrency(allocatedDiscount),
      discountedUnitPrice,
      taxableAmount: roundCurrency(taxableAmount),
      gstAmount,
      lineTotal,
    };
  });

  const groupedByRateMap = new Map();
  for (const item of items) {
    if (item.gstRate <= 0 || item.gstAmount <= 0) continue;
    groupedByRateMap.set(
      item.gstRate,
      roundCurrency((groupedByRateMap.get(item.gstRate) || 0) + item.gstAmount),
    );
  }

  const groupedByRate = [...groupedByRateMap.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([gstRate, gstAmount]) => ({
      gstRate: roundCurrency(gstRate),
      gstAmount: roundCurrency(gstAmount),
    }));

  const totalGst = roundCurrency(
    groupedByRate.reduce((sum, group) => sum + group.gstAmount, 0),
  );
  const subtotalAfterDiscount = roundCurrency(
    items.reduce((sum, item) => sum + item.taxableAmount, 0),
  );

  return {
    couponApplied: boundedCouponDiscount > 0,
    couponDiscount: roundCurrency(boundedCouponDiscount),
    subtotalBase: roundCurrency(subtotalBase),
    subtotalAfterDiscount,
    items,
    groupedByRate,
    totalGst,
  };
}

module.exports = {
  calculateGSTBreakdown,
};
