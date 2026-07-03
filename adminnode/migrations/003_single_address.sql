-- Migration: Single-Address Simplification
-- Remove addresses table and consolidate to single address on Customer

-- 1. Drop addresses table
DROP TABLE IF EXISTS addresses;

-- 2. Remove billing and default address from customers
ALTER TABLE customers DROP COLUMN IF EXISTS billingAddress;
ALTER TABLE customers DROP COLUMN IF EXISTS defaultAddress;

-- 3. Remove billing address from orders (keep only shippingAddress as snapshot)
ALTER TABLE orders DROP COLUMN IF EXISTS billingAddress;
