

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
// Fix: Import the Mentor type
import { Mentee, Mentor } from '../../types';
import { APP_NAME, Icons } from '../../constants';
import { Button } from '../../components/Button';
import { MentorDashboard } from './MentorDashboard';
import { MenteeManagement } from './MenteeManagement';
import { AssignmentManager } from './AssignmentManager';
import { MeetingLogs } from './MeetingLogs';
import { MentorMessaging } from './MentorMessaging';
import { MentorAccount } from './MentorAccount';
import { Spinner } from '../../components/Spinner';
import { BottomNavBar, NavItemType } from '../../components/BottomNavBar';
import { Feedback } from '../../components/Feedback';
import { supabase } from '../../services/supabaseClient';

type MentorPage = 'dashboard' | 'mentees' | 'assignments' | 'meetings' | 'messages' | 'account';

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; hasNotification?: boolean; }> = ({ icon, label, isActive, onClick, hasNotification }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center space-x-3 w-full p-3 rounded-lg text-left transition-colors duration-200 ${isActive ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    >
        {icon}
        <span>{label}</span>
        {hasNotification && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
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

    const mentor = user as Mentor;
    const avatarUrl = mentor.photo || `https://ui-avatars.com/api/?name=${(mentor.name || mentor.username || '').replace(/\s/g, '+')}&background=4f46e5&color=fff`;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none rounded-full p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <img src={avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
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

export const MentorPortal: React.FC = () => {
    const { logout, user, isLoggingOut } = useAuth();
    const [currentPage, setCurrentPage] = useState<MentorPage>('dashboard');
    const [messagingTarget, setMessagingTarget] = useState<Mentee | undefined>(undefined);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('new-messages-mentor')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            if (payload.new.receiver_id === user.id) {
              setHasNewMessages(true);
            }
          })
          .subscribe();
    
        return () => {
          supabase.removeChannel(channel);
        };
    }, [user]);

    const handleNavClick = (page: MentorPage) => {
        if (page === 'messages') {
            setHasNewMessages(false);
        }
        setCurrentPage(page);
    }

    const mentorNavItems: NavItemType[] = [
        { page: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
        { page: 'mentees', label: 'Mentees', icon: Icons.users },
        { page: 'assignments', label: 'Assignments', icon: Icons.assignment },
        { page: 'meetings', label: 'Meetings', icon: Icons.meetings },
        { page: 'messages', label: 'Messages', icon: Icons.chat },
    ];

    const navigateToMessages = (mentee: Mentee) => {
        setMessagingTarget(mentee);
        handleNavClick('messages');
    };
    
    const navigateToProfile = (menteeId: string) => {
        // In a real app this would go to a detailed profile page.
        // For now, we can just switch to the mentee management tab.
        handleNavClick('mentees');
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <MentorDashboard onViewProfile={navigateToProfile} onViewAssignments={() => handleNavClick('assignments')} onSendMessage={navigateToMessages} />;
            case 'mentees':
                return <MenteeManagement />;
            case 'assignments':
                return <AssignmentManager />;
            case 'meetings':
                return <MeetingLogs />;
            case 'messages':
                return <MentorMessaging initialMentee={messagingTarget} />;
            case 'account':
                return <MentorAccount />;
            default:
                return <MentorDashboard onViewProfile={navigateToProfile} onViewAssignments={() => handleNavClick('assignments')} onSendMessage={navigateToMessages} />;
        }
    };

    const sidebarContent = (
        <>
            <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-2xl font-bold text-primary">{APP_NAME}</h2>
                <p className="text-sm text-gray-500">Mentor Portal</p>
            </div>
            <nav className="flex-grow p-4 space-y-2">
                <NavItem icon={Icons.dashboard} label="Dashboard" isActive={currentPage === 'dashboard'} onClick={() => handleNavClick('dashboard')} />
                <NavItem icon={Icons.users} label="My Mentees" isActive={currentPage === 'mentees'} onClick={() => handleNavClick('mentees')} />
                <NavItem icon={Icons.assignment} label="Assignments" isActive={currentPage === 'assignments'} onClick={() => handleNavClick('assignments')} />
                <NavItem icon={Icons.meetings} label="Meetings" isActive={currentPage === 'meetings'} onClick={() => handleNavClick('meetings')} />
                <NavItem icon={Icons.chat} label="Messages" isActive={currentPage === 'messages'} onClick={() => handleNavClick('messages')} hasNotification={hasNewMessages} />
            </nav>
            <div className="p-4 border-t dark:border-gray-700 space-y-4">
                <NavItem icon={Icons.settings} label="My Account" isActive={currentPage === 'account'} onClick={() => handleNavClick('account')} />
                <Feedback />
                <div className="flex items-center">
                    <img
                        src={(user as Mentor).photo || `https://ui-avatars.com/api/?name=${(user?.name || user?.username || '').replace(/\s/g, '+')}&background=4f46e5&color=fff`}
                        alt={user?.name}
                        className="w-10 h-10 rounded-full mr-3 object-cover bg-gray-200 dark:bg-gray-600"
                    />
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.username}</p>
                    </div>
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
            {/* Sidebar */}
            <aside className="hidden w-64 bg-white dark:bg-gray-800 shadow-md md:flex flex-col z-30">
                {sidebarContent}
            </aside>

            <main className="flex-1 flex flex-col md:h-screen">
                <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{currentPage.replace('-', ' ')}</h1>
                    <ProfileMenu />
                </header>
                <div className="p-6 md:flex-1 md:overflow-y-auto pb-20 md:pb-6">
                    {renderContent()}
                </div>
                <BottomNavBar 
                    navItems={mentorNavItems} 
                    currentPage={currentPage} 
                    onNavClick={(page) => handleNavClick(page as MentorPage)} 
                />
            </main>
        </div>
    );
};