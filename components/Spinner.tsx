import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'white';
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'primary', className = '' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };
    const colorClasses = {
        primary: 'border-primary',
        white: 'border-white',
    };

    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 ${colorClasses[color]}`}></div>
        </div>
    );
};