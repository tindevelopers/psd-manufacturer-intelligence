
"use client";
import React from "react";
import AppSidebar from "./app-sidebar";
import AppHeader from "./app-header";
import { useSidebar } from "../context/sidebar-context";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isExpanded, isMobileOpen } = useSidebar();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 xl:hidden"
          onClick={() => {}}
        />
      )}
      
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content */}
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ease-in-out ${
          isExpanded ? "xl:ml-[290px]" : "xl:ml-[90px]"
        }`}
      >
        <AppHeader />
        <main className="flex-1 p-4 xl:p-6">
          <div className="mx-auto max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
