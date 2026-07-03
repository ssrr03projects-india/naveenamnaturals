-- Add shipping breakdown fields on orders for admin visibility
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_quoted_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS shipping_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Backfill old rows so quote mirrors charged shipping by default
UPDATE orders
SET
  shipping_quoted_amount = COALESCE(shipping_quoted_amount, shippingAmount, 0),
  shipping_discount_amount = COALESCE(
    shipping_discount_amount,
    GREATEST(COALESCE(shipping_quoted_amount, shippingAmount, 0) - COALESCE(shippingAmount, 0), 0),
    0
  );

-- Remove package dimension columns from products/variants tables
ALTER TABLE products
  DROP COLUMN IF EXISTS length,
  DROP COLUMN IF EXISTS width,
  DROP COLUMN IF EXISTS height;

ALTER TABLE product_variants
  DROP COLUMN IF EXISTS length,
  DROP COLUMN IF EXISTS width,
  DROP COLUMN IF EXISTS height;
