-- Expand customStock length for product variants
-- Allows letters, numbers, and spaces, max 60 chars
ALTER TABLE product_variants
MODIFY COLUMN customStock VARCHAR(60) NULL;
