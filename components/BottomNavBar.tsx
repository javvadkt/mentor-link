import React from 'react';

export interface NavItemType {
  page: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavBarProps {
  navItems: NavItemType[];
  currentPage: string;
  onNavClick: (page: string) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ navItems, currentPage, onNavClick }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40">
      <div className="flex justify-around max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavClick(item.page)}
              className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={isActive ? 'text-primary' : ''}>{item.icon}</div>
              <span className="mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
