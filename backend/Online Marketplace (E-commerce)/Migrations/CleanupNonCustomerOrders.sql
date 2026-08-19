-- One-off data cleanup: remove any Order that belongs to a non-Customer
-- (Admin / Vendor) user. Admins and vendors run the store and must never own
-- an order; the checkout endpoint now blocks this, but existing bad rows are
-- purged here. Child rows (OrderItems, Payments, Shippings) are deleted first
-- so the script works regardless of the DB's cascade configuration.
BEGIN TRANSACTION;

-- Orders owned by users whose role isn't 'Customer'.
DECLARE @bad TABLE (orderId INT PRIMARY KEY);
INSERT INTO @bad (orderId)
SELECT o.orderId
FROM Orders o
JOIN Users u ON u.UserId = o.userId
WHERE u.Role <> 'Customer';

DELETE FROM OrderItems WHERE orderId IN (SELECT orderId FROM @bad);
DELETE FROM Payments   WHERE orderId IN (SELECT orderId FROM @bad);
DELETE FROM Shippings  WHERE orderId IN (SELECT orderId FROM @bad);
DELETE FROM Orders     WHERE orderId IN (SELECT orderId FROM @bad);

COMMIT TRANSACTION;
