-- Add customStock field to product_variants
-- Allows letters, numbers, and spaces, max 20 chars
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS customStock VARCHAR(20) NULL AFTER stock;
