
"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/sidebar-context";
import {
  GridIcon,
  ManufacturerIcon,
  ProductIcon,
  ChevronDownIcon,
  HorizontalDotsIcon,
  SearchIcon,
  DatabaseIcon,
  BotIcon,
  FilterIcon,
  RefreshIcon
} from "../icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon className="w-5 h-5" />,
    name: "Dashboard",
    path: "/",
  },
  {
    name: "Manufacturer Search",
    icon: <SearchIcon className="w-5 h-5" />,
    subItems: [
      { name: "Quick Search", path: "/search" },
      { name: "Advanced Search", path: "/search/advanced" },
      { name: "Bulk Search", path: "/search/bulk" },
    ],
  },
  {
    name: "Manufacturers",
    icon: <ManufacturerIcon className="w-5 h-5" />,
    subItems: [
      { name: "All Manufacturers", path: "/manufacturers" },
      { name: "Featured", path: "/manufacturers/featured" },
      { name: "Categories", path: "/manufacturers/categories" },
    ],
  },
  {
    name: "Product Database",
    icon: <DatabaseIcon className="w-5 h-5" />,
    subItems: [
      { name: "Products", path: "/products" },
      { name: "Analytics", path: "/products/analytics" },
      { name: "Recommendations", path: "/products/recommendations" },
    ],
  },
  {
    name: "Data Scraper",
    icon: <RefreshIcon className="w-5 h-5" />,
    path: "/scraper",
  }
];

const supportItems: NavItem[] = [
  {
    icon: <BotIcon className="w-5 h-5" />,
    name: "AI Assistant",
    path: "/chat",
  },
  {
    icon: <FilterIcon className="w-5 h-5" />,
    name: "Settings & API Keys",
    path: "/settings",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "support"
  ) => (
    <ul className="flex flex-col gap-1">
      {navItems?.map((nav, index) => (
        <li key={nav?.name}>
          {nav?.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav?.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav?.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-blue-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav?.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav?.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav?.name}</span>
                )}
              </Link>
            )
          )}
          {nav?.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                if (subMenuRefs?.current) {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight?.[`${menuType}-${index}`] ?? 0}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav?.subItems?.map((subItem) => (
                  <li key={subItem?.name}>
                    <Link
                      href={subItem?.path ?? '#'}
                      className={`menu-dropdown-item ${
                        isActive(subItem?.path ?? '')
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem?.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem?.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem?.path ?? '')
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "support";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "support"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : supportItems;
      items?.forEach((nav, index) => {
        if (nav?.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem?.path ?? '')) {
              setOpenSubmenu({
                type: menuType as "main" | "support",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs?.current?.[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs?.current?.[key]?.scrollHeight ?? 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "support"
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed flex flex-col xl:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" className="flex items-center">
          {isExpanded || isHovered || isMobileOpen ? (
            <Image
              src="/psd-logo.png"
              alt="PetStore.Direct"
              width={180}
              height={60}
              className="h-12 w-auto"
              priority
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">PD</span>
            </div>
          )}
        </Link>
      </div>
      
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Main"
                ) : (
                  <HorizontalDotsIcon className="w-4 h-4" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Tools"
                ) : (
                  <HorizontalDotsIcon className="w-4 h-4" />
                )}
              </h2>
              {renderMenuItems(supportItems, "support")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
