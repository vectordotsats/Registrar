# Registrar

Business management system for Nigerian retailers and distributors. Tracks inventory, sales, customer debt, and generates reports.

## Tech Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes + Supabase
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth with role-based access (admin/staff)

## Features

**Inventory** — Add, edit, and track products with cost/selling prices. Stock unit calculator supports pieces, dozens, cartons (6–100), and bags. Low stock and out-of-stock alerts.

**Sales** — Record cash sales (walk-in) or invoice sales (registered customers). Products are searched and added to a cart with quantity controls and unit selection. Stock deducts automatically on each sale. Staff member is selected from a dropdown per sale.

**Customers** — Register bulk buyers and credit customers. Track total debt per customer. View full invoice and payment history on each customer's profile. Record payments (cash, transfer, POS) against their balance.

**Reports** — Revenue collected, total sales value, outstanding debt, average transaction size. Filterable by Today, 7 days, 30 days, All time, or custom date range. Top selling products, sales by staff, and top debtors rankings.

**Settings** — Admin adds and manages staff member names used in the sales dropdown. Staff can be deactivated without losing history.

**Security** — Soft delete on sales (deleted sales are hidden but preserved with who deleted them and why). Every sale and inventory change is logged with the staff member's name. Inventory log is admin-only. Row Level Security on all tables.

## Roles

- **Admin** — Full access. Sees reports, settings, inventory logs, cost prices, and stock value. Can manage staff accounts.
- **Staff** — Can record sales, record payments, view inventory and customers. Cannot see reports, settings, cost prices, or inventory logs.

## Database Tables

`users` `products` `customers` `sales` `sale_items` `payments` `inventory_log` `staff_members`

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/00_complete_migration.sql` via the Supabase SQL Editor
3. Run the staff members table migration (in the SQL Editor):
   ```sql
   CREATE TABLE staff_members (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Authenticated users can read staff" ON staff_members FOR SELECT TO authenticated USING (true);
   CREATE POLICY "Authenticated users can insert staff" ON staff_members FOR INSERT TO authenticated WITH CHECK (true);
   CREATE POLICY "Authenticated users can update staff" ON staff_members FOR UPDATE TO authenticated USING (true);
   ```
4. Add the invoice_number column (in the SQL Editor):
   ```sql
   ALTER TABLE sales ADD COLUMN invoice_number TEXT;
   CREATE INDEX idx_sales_invoice ON sales(invoice_number);
   ```
5. Create a `.env.local` file in the project root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```
7. Create your first admin user in Supabase Authentication, then run:
   ```sql
   UPDATE users SET role = 'admin', name = 'Your Name' WHERE email = 'your@email.com';
   ```

## Deploy

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables on your hosting platform.
