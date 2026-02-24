
import AppLayout from "@/components/layout/app-layout";
import ManufacturerSearch from "@/components/search/manufacturer-search";

export default function AdvancedSearchPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Advanced Manufacturer Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Use advanced filtering and search parameters to find specific manufacturers.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Advanced Search Options
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Enhanced filtering capabilities will be available in future updates. For now, you can use AI search for more intelligent results.
            </p>
          </div>
          
          <ManufacturerSearch />
        </div>
      </div>
    </AppLayout>
  );
}
