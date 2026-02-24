
"use client";
import { useSidebar } from "../context/sidebar-context";
import { MenuIcon, CloseIcon } from "../icons";
import React from "react";
import Image from "next/image";
import Link from "next/link";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-40 dark:border-gray-800 dark:bg-gray-900 xl:border-b">
      <div className="flex flex-col items-center justify-between grow xl:flex-row xl:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 xl:justify-normal xl:border-b-0 xl:px-0 xl:py-4">
          <button
            className={`flex items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-40 dark:border-gray-800 dark:text-gray-400 lg:h-11 lg:w-11 xl:border lg:bg-transparent dark:lg:bg-transparent transition-colors ${
              isMobileOpen ? "bg-gray-100 dark:bg-white/[0.03]" : ""
            }`}
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <CloseIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-6 h-6" />
            )}
          </button>

          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/psd-logo.png"
              alt="PetStore.Direct"
              width={150}
              height={50}
              className="h-10 w-auto"
              priority
            />
            <span className="hidden sm:inline-block text-lg font-semibold text-gray-900 dark:text-white">
              Manufacturer Search
            </span>
          </Link>

          <div className="hidden xl:block ml-auto">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Brand Intelligence Platform</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
