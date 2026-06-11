import { redirect } from "next/navigation";

// Inventory has been replaced by Warehouses.
// This folder can be deleted entirely.
export default function InventoryPage() {
  redirect("/warehouses");
}
