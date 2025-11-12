
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { SupabaseService } from '../../services/supabaseService';
import { Mentor, Mentee, Warning } from '../../types';
import { Icons } from '../../constants';

const StatCardSkeleton: React.FC = () => (
    <Card>
        <div className="flex items-center space-x-4 animate-pulse">
            <div className="bg-gray-300 dark:bg-gray-600 rounded-full h-12 w-12"></div>
            <div className="space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            </div>
        </div>
    </Card>
);

export const AdminDashboard: React.FC = () => {
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const [mentorsData, menteesData] = await Promise.all([
            SupabaseService.getAllMentors(),
            SupabaseService.getAllMentees()
        ]);
        setMentors(mentorsData);
        setMentees(menteesData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleRunCheck = async () => {
        setChecking(true);
        setWarnings([]);
        const newWarnings = await SupabaseService.runMonthlyCheck();
        setWarnings(newWarnings);
        setChecking(false);
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <Card>
                            <div className="flex items-center space-x-4">
                                <div className="bg-primary/20 text-primary p-3 rounded-full">{Icons.users}</div>
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">Total Mentors</p>
                                    <p className="text-3xl font-bold">{mentors.length}</p>
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <div className="flex items-center space-x-4">
                                <div className="bg-secondary/20 text-secondary p-3 rounded-full">{Icons.profile}</div>
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">Total Mentees</p>
                                    <p className="text-3xl font-bold">{mentees.length}</p>
                                </div>
                            </div>
                        </Card>
                    </>
                )}
            </div>

            <Card title="System Health & Automated Warnings">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        Run a system-wide check for the past month to find mentees with insufficient meetings.
                    </p>
                    <Button onClick={handleRunCheck} disabled={checking}>
                        {checking ? 'Checking...' : 'Run Monthly Check'}
                    </Button>

                    {checking && <Spinner />}

                    {warnings.length > 0 && (
                         <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">{Icons.warning} Urgent Warnings ({warnings.length})</h3>
                            <div className="max-h-60 overflow-y-auto rounded-md border dark:border-gray-700">
                                <ul className="divide-y dark:divide-gray-700">
                                    {warnings.map((warning, index) => (
                                        <li key={index} className="p-3">
                                            <p className="font-semibold">{warning.menteeName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{warning.reason}</p>
                                            <p className="text-xs text-red-500">Mentor ID: {warning.mentorId}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    {warnings.length === 0 && !checking && (
                        <p className="text-green-600 mt-4">No warnings found after the last check.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};
