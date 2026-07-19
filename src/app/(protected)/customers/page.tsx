import { redirect } from "next/navigation";

// Customers has been replaced by Suppliers (admin-only).
export default function CustomersPage() {
  redirect("/suppliers");
}
