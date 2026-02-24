
import AppLayout from "@/components/layout/app-layout";

export default function ProductRecommendationsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Product Recommendations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered product recommendations based on manufacturer data and market trends.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="max-w-md mx-auto">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              AI Recommendations
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Smart product recommendations engine will be available once the AI chatbot and full database integration are implemented.
            </p>
            <a
              href="/chat"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mr-2"
            >
              Try AI Assistant
            </a>
            <a
              href="/products"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Products
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
