
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { SupabaseService } from '../../services/supabaseService';
import { PointsLog, Mentee } from '../../types';
import { Icons } from '../../constants';

const PointsSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <Card>
            <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                </div>
            </div>
        </Card>
        <Card title="My Points History">
            <div className="space-y-2">
                <div className="h-12 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
            </div>
        </Card>
    </div>
);

export const MyPoints: React.FC = () => {
    const { user } = useAuth();
    const mentee = user as Mentee;
    const [logs, setLogs] = useState<PointsLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!user) return;
            setLoading(true);
            const data = await SupabaseService.getPointsLogForMentee(user.id);
            setLogs(data);
            setLoading(false);
        };
        fetchLogs();
    }, [user]);

    if (loading) return <PointsSkeleton />;

    return (
        <div className="space-y-6">
            <Card>
                 <div className="flex items-center space-x-4">
                    <div className="text-4xl p-3 bg-yellow-400/20 text-yellow-500 rounded-full">🏆</div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400">Total Points</p>
                        <p className="text-4xl font-bold">{mentee.points}</p>
                    </div>
                </div>
            </Card>

            <Card title="My Points History">
                {logs.length > 0 ? (
                    <ul className="space-y-2">
                        {logs.map(log => (
                            <li key={log.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{log.reason}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                                </div>
                                <p className={`font-bold text-lg ${log.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>{log.points >= 0 ? `+${log.points}` : log.points}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 py-8">You haven't earned any points yet.</p>
                )}
            </Card>
        </div>
    );
};
