const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const getLowStockThreshold = () => {
  const parsed = Number.parseInt(process.env.LOW_STOCK_THRESHOLD || "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
  return parsed;
};

const shouldTriggerLowStockAlert = ({
  previousStock,
  currentStock,
  threshold = getLowStockThreshold(),
}) => {
  if (!Number.isFinite(previousStock) || !Number.isFinite(currentStock)) {
    return false;
  }

  // Trigger only when crossing from healthy stock into low-stock/out-of-stock.
  return previousStock > threshold && currentStock <= threshold;
};

const getStockAlertLevel = (stock) => (stock <= 0 ? "out_of_stock" : "low_stock");

module.exports = {
  getLowStockThreshold,
  shouldTriggerLowStockAlert,
  getStockAlertLevel,
};
