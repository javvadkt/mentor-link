
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME, Icons } from '../../constants';
import { AdminDashboard } from './AdminDashboard';
import { ManageMentors } from './ManageMentors';
import { ManageMentees } from './ManageMentees';
import { SystemSettings } from './SystemSettings';
import { AdminAccount } from './AdminAccount';
import { FeedbackReview } from './FeedbackReview';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { BottomNavBar } from '../../components/BottomNavBar';
import { NavItemType } from '../../components/BottomNavBar';
import { Feedback } from '../../components/Feedback';

type AdminPage = 'dashboard' | 'mentors' | 'mentees' | 'settings' | 'account' | 'feedback';

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-3 w-full p-3 rounded-lg text-left transition-colors duration-200 ${isActive ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const ProfileMenu: React.FC = () => {
    const { user, logout, isLoggingOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    if (!user) return <div className="w-8 h-8"></div>;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none rounded-full p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                {Icons.profile}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20">
                    <div className="px-4 py-3 border-b dark:border-gray-700">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.username}</p>
                    </div>
                    <button
                        onClick={logout}
                        disabled={isLoggingOut}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                        {isLoggingOut ? <Spinner size="sm" /> : Icons.logout}
                        <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export const AdminPortal: React.FC = () => {
    const { logout, user, isLoggingOut } = useAuth();
    const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavClick = (page: AdminPage) => {
        setCurrentPage(page);
        if (window.innerWidth < 768) { // md breakpoint
            setIsSidebarOpen(false);
        }
    };

    const adminNavItems: NavItemType[] = [
        { page: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
        { page: 'mentors', label: 'Mentors', icon: Icons.users },
        { page: 'mentees', label: 'Mentees', icon: Icons.profile },
        { page: 'settings', label: 'Settings', icon: Icons.settings },
        { page: 'feedback', label: 'Feedback', icon: Icons.feedback },
        { page: 'account', label: 'Account', icon: Icons.settings },
    ];

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <AdminDashboard />;
            case 'mentors':
                return <ManageMentors />;
            case 'mentees':
                return <ManageMentees />;
            case 'settings':
                return <SystemSettings />;
            case 'feedback':
                return <FeedbackReview />;
            case 'account':
                return <AdminAccount />;
            default:
                return <AdminDashboard />;
        }
    };

    const sidebarContent = (
        <>
            <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-2xl font-bold text-primary">{APP_NAME}</h2>
                <p className="text-sm text-gray-500">Admin Portal</p>
            </div>
            <nav className="flex-grow p-4 space-y-2">
                <NavItem icon={Icons.dashboard} label="Dashboard" isActive={currentPage === 'dashboard'} onClick={() => handleNavClick('dashboard')} />
                <NavItem icon={Icons.users} label="Manage Mentors" isActive={currentPage === 'mentors'} onClick={() => handleNavClick('mentors')} />
                <NavItem icon={Icons.profile} label="All Mentees" isActive={currentPage === 'mentees'} onClick={() => handleNavClick('mentees')} />
                <NavItem icon={Icons.settings} label="System Settings" isActive={currentPage === 'settings'} onClick={() => handleNavClick('settings')} />
                <NavItem icon={Icons.feedback} label="Feedback" isActive={currentPage === 'feedback'} onClick={() => handleNavClick('feedback')} />
            </nav>
            <div className="p-4 border-t dark:border-gray-700 space-y-4">
                 <NavItem icon={Icons.settings} label="My Account" isActive={currentPage === 'account'} onClick={() => handleNavClick('account')} />
                <Feedback />
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.username}</p>
                </div>
                <Button onClick={logout} variant="danger" className="w-full flex items-center justify-center space-x-2" disabled={isLoggingOut}>
                    {isLoggingOut ? <Spinner size="sm" color="white" /> : Icons.logout}
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen md:flex bg-gray-100 dark:bg-gray-900">
            {/* Mobile sidebar overlay */}
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setIsSidebarOpen(false)}></div>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out z-30`}>
                {sidebarContent}
            </aside>
            
            <main className="flex-1 flex flex-col md:h-screen">
                <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
                     <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-gray-600 dark:text-gray-300">
                        {Icons.menu}
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{currentPage.replace('-', ' ')}</h1>
                    <ProfileMenu />
                </header>
                <div className="p-6 md:flex-1 md:overflow-y-auto pb-20 md:pb-6">
                    {renderContent()}
                </div>
                <BottomNavBar 
                    navItems={adminNavItems} 
                    currentPage={currentPage} 
                    onNavClick={(page) => handleNavClick(page as AdminPage)} 
                />
            </main>
        </div>
    );
};
