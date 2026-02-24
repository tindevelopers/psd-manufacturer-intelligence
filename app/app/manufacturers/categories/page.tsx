
import AppLayout from "@/components/layout/app-layout";

export default function ManufacturerCategoriesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Manufacturer Categories
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse manufacturers organized by product categories and specializations.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="max-w-md mx-auto">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Category Browser
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Manufacturer categorization and filtering by product specializations will be available once the complete database integration is finished.
            </p>
            <a
              href="/search"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search Manufacturers Instead
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
