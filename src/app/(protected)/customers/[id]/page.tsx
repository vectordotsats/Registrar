import { redirect } from "next/navigation";

// Customer profiles have been replaced by Suppliers (admin-only).
export default function CustomerProfilePage() {
  redirect("/suppliers");
}
