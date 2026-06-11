import { redirect } from "next/navigation";

// Sales has been removed — this folder can be deleted entirely.
export default function NewSalePage() {
  redirect("/warehouses");
}
