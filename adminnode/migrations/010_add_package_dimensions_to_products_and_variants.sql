ALTER TABLE products
  ADD COLUMN length DECIMAL(8,2) NULL AFTER trackQuantity,
  ADD COLUMN width DECIMAL(8,2) NULL AFTER length,
  ADD COLUMN height DECIMAL(8,2) NULL AFTER width;

ALTER TABLE product_variants
  ADD COLUMN length DECIMAL(8,2) NULL AFTER weight,
  ADD COLUMN width DECIMAL(8,2) NULL AFTER length,
  ADD COLUMN height DECIMAL(8,2) NULL AFTER width;
