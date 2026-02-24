
import AppLayout from "@/components/layout/app-layout";

export default function BulkSearchPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Bulk Manufacturer Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search for multiple manufacturers at once using batch processing capabilities.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="max-w-md mx-auto">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Bulk Search Operations
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Bulk search functionality for processing multiple queries and handling large datasets will be implemented in the next update.
            </p>
            <div className="flex gap-2 justify-center">
              <a
                href="/search"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Use Basic Search
              </a>
              <a
                href="/search/advanced"
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Advanced Search
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
