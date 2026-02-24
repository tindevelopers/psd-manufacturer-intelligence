
import AppLayout from "@/components/layout/app-layout";
import ManufacturerSearch from "@/components/search/manufacturer-search";

export default function SearchPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Manufacturer Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find manufacturers using our basic or AI-powered search functionality.
          </p>
        </div>

        <ManufacturerSearch />
      </div>
    </AppLayout>
  );
}
