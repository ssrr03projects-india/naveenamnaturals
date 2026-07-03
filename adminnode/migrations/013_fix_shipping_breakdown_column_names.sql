-- Create camelCase columns expected by Sequelize models
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shippingQuotedAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS shippingDiscountAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Backfill from snake_case columns (if present), else from existing charged shipping
UPDATE orders
SET
  shippingQuotedAmount = COALESCE(shippingQuotedAmount, shipping_quoted_amount, shippingAmount, 0),
  shippingDiscountAmount = COALESCE(
    shippingDiscountAmount,
    shipping_discount_amount,
    GREATEST(COALESCE(shippingQuotedAmount, shipping_quoted_amount, shippingAmount, 0) - COALESCE(shippingAmount, 0), 0),
    0
  );

-- Drop old snake_case columns to avoid future confusion
ALTER TABLE orders
  DROP COLUMN IF EXISTS shipping_quoted_amount,
  DROP COLUMN IF EXISTS shipping_discount_amount;
