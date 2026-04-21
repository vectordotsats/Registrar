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

// Get sale status color
export function getStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "text-green-600 bg-green-50";
    case "partial":
      return "text-amber-600 bg-amber-50";
    case "unpaid":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
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