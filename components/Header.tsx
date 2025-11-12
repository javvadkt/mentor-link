
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { APP_NAME } from '../constants';
import { Button } from './Button';

interface HeaderProps {
    title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
    const { logout, user } = useAuth();
    
    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <div className="flex items-center space-x-4">
                <span className="text-gray-600 dark:text-gray-300 hidden sm:block">Welcome, {user?.name}</span>
                <Button onClick={logout} variant="danger" size="sm">Logout</Button>
            </div>
        </header>
    );
};
