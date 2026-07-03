-- Migration: Rename shippingAddress to address on customers and orders

ALTER TABLE customers RENAME COLUMN shippingAddress TO address;
ALTER TABLE orders RENAME COLUMN shippingAddress TO address;
