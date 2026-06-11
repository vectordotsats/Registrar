import ReportsContent from "@/components/ui/ReportsContent";

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">
          Stock levels, movements, and warehouse overview
        </p>
      </div>
      <ReportsContent />
    </div>
  );
}
