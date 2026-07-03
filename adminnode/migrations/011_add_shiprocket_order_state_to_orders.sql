ALTER TABLE orders
  ADD COLUMN shippingProvider VARCHAR(50) NULL AFTER shippingCarrier,
  ADD COLUMN shippingProviderOrderId VARCHAR(100) NULL AFTER shippingProvider,
  ADD COLUMN shippingShipmentId VARCHAR(100) NULL AFTER shippingProviderOrderId,
  ADD COLUMN shippingCourierName VARCHAR(100) NULL AFTER shippingShipmentId,
  ADD COLUMN shippingLatestStatus VARCHAR(255) NULL AFTER shippingCourierName,
  ADD COLUMN shippingBookingStage VARCHAR(30) NULL DEFAULT 'not_created' AFTER shippingLatestStatus;
