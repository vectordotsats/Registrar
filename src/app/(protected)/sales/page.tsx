import { redirect } from "next/navigation";

// Sales has been removed — Registrar is now warehouse/stock based.
// This folder can be deleted entirely.
export default function SalesPage() {
  redirect("/warehouses");
}
