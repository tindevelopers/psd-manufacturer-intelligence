
import AppLayout from "@/components/layout/app-layout";

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ask PSD - AI Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chat with our AI assistant for personalized product recommendations and grooming guidance.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <iframe
            src="https://apps.abacus.ai/chatllm/?appId=d7dea936a&hideTopBar=2"
            width="100%"
            height="800"
            frameBorder="0"
            className="w-full min-h-[800px]"
            title="Ask Joey AI Assistant"
            allow="clipboard-write"
          />
        </div>
      </div>
    </AppLayout>
  );
}
