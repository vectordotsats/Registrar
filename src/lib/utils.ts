// Format Naira currency
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

// Format date + time
export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

// Relative time (e.g., "2 hours ago")
export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateString);
}

// Format a quantity with its product unit (defaults to "units")
export function formatQty(qty: number, unit?: string | null): string {
  const label = unit && unit.trim() ? unit.trim() : "units";
  return `${qty.toLocaleString()} ${label}`;
}

// Like formatQty, but appends the piece total when a pack size is set,
// e.g. "12 cartons · 480 pieces".
export function formatQtyPieces(
  qty: number,
  unit?: string | null,
  packSize?: number | null,
): string {
  const base = formatQty(qty, unit);
  if (packSize && packSize > 1) {
    return `${base} · ${(qty * packSize).toLocaleString()} pieces`;
  }
  return base;
}

// Get stock level status
export function getStockStatus(
  quantity: number,
  threshold: number
): { label: string; color: string } {
  if (quantity <= 0) return { label: "Out of stock", color: "text-red-600 bg-red-50" };
  if (quantity <= threshold) return { label: "Low stock", color: "text-amber-600 bg-amber-50" };
  return { label: "In stock", color: "text-green-600 bg-green-50" };
}

// Get current user's business_id (for client components)
export async function getBusinessId(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();
  return data?.business_id || null;
}