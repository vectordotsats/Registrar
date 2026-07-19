// ============================================
// Registrar — Core Types
// ============================================

export type UserRole = "admin" | "staff";

export interface Product {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number;
  created_at: string;
}

// ---- Warehouses ----

export type MovementType = "in" | "out" | "transfer" | "adjustment";

export interface Warehouse {
  id: string;
  business_id: string | null;
  name: string;
  location: string;
  created_at: string;
}

export interface WarehouseStock {
  id: string;
  business_id: string | null;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
  // Joined
  product?: Product;
  warehouse?: Warehouse;
}

export interface StockMovement {
  id: string;
  business_id: string | null;
  product_id: string;
  type: MovementType;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  quantity: number;
  moved_by: string;
  notes: string;
  created_at: string;
  // Joined
  product?: Product;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
}
