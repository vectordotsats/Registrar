"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { formatDate } from "@/lib/utils";
import type { Customer } from "@/types";
import { ArrowLeft, Loader2, Phone, MapPin, CalendarDays } from "lucide-react";

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      setCustomer(data);
      setLoading(false);
    };
    load();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 text-sm font-medium mb-4">
          Customer not found
        </p>
        <button
          onClick={() => router.push("/customers")}
          className="text-sm text-[var(--color-primary)] font-medium hover:underline cursor-pointer"
        >
          Back to customers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <button
        onClick={() => router.push("/customers")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 cursor-pointer"
      >
        <ArrowLeft size={18} /> All customers
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex items-center justify-center text-2xl font-bold shadow-sm">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-400">Supply customer</p>
        </div>
      </div>

      {/* Contact details */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
            <Phone size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Phone</p>
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                {customer.phone}
              </a>
            ) : (
              <p className="text-sm text-gray-400">Not provided</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Address</p>
            <p className="text-sm font-medium text-gray-900">
              {customer.address || "Not provided"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
            <CalendarDays size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Customer since</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
