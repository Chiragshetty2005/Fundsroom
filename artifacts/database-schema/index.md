---
kind: ticket
title: 'Implement the Mini ERP + CRM database'
status: 2
---

## Implemented schema

The PostgreSQL/Prisma schema covers every required core module:

| Area      | Tables                                                | Notes                                                                                         |
| --------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Identity  | `User`                                                | Unique email, BCrypt password hash, and the four required roles.                              |
| CRM       | `Customer`, `CustomerFollowUp`                        | Customer attributes, lifecycle status, follow-up scheduling, and an authored note history.    |
| Inventory | `Product`, `StockMovement`                            | Product master data, current stock, alert threshold, and a traceable IN/OUT ledger.           |
| Sales     | `SalesChallan`, `SalesChallanItem`, `ChallanSequence` | Challan lifecycle, a single counter for automatic numbering, and line-item product snapshots. |

## Important constraints

- Product SKU, user email, and challan number are unique.
- Challan items retain product name, SKU, and unit price in addition to the product reference, preserving historical records when product data changes.
- Movements can link back to the challan that caused them.
- Relationships prevent deletion of users/products/customers with operational records; deleting a customer cascades only to its CRM follow-up notes.
- A future challan-confirmation API must update product stock, create OUT movements, advance the sequence as needed, and set the challan status inside one database transaction. It must reject any line whose available stock is below the requested quantity.

## Local use

1. Start the locally installed PostgreSQL server on `localhost:5432`.
2. Set the `DB_*` values in `apps/api/.env`.
3. Run the migration command in the README.
4. Run the database seed command to create one login for each role.

This environment does not have access to a local PostgreSQL client/server, so the migration SQL and seed could not be executed against a live database here. Prisma schema/client generation succeeds.
