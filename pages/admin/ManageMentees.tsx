import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { SupabaseService } from '../../services/supabaseService';
import { Mentee } from '../../types';

interface MenteeStats extends Mentee {
    meetingCount: number;
}

const TableRowSkeleton: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            </div>
        </td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/4"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div></td>
    </tr>
);

export const ManageMentees: React.FC = () => {
    const [mentees, setMentees] = useState<MenteeStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [menteesData, meetingsData] = await Promise.all([
                    SupabaseService.getAllMentees(),
                    SupabaseService.getAllMeetingsForStats(),
                ]);
                
                const meetingCounts = new Map<string, number>();
                meetingsData.forEach(meeting => {
                    (meeting.mentee_ids || []).forEach(menteeId => {
                        meetingCounts.set(menteeId, (meetingCounts.get(menteeId) || 0) + 1);
                    });
                });

                const menteesWithStats = menteesData.map(mentee => ({
                    ...mentee,
                    meetingCount: meetingCounts.get(mentee.id) || 0,
                })).sort((a, b) => a.name.localeCompare(b.name));

                setMentees(menteesWithStats);
            } catch (error) {
                console.error("Failed to fetch mentee data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <Card title="All Mentees Status Overview">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Mentee Name</th>
                            <th scope="col" className="px-6 py-3">Admission No.</th>
                            <th scope="col" className="px-6 py-3">Mentor</th>
                            <th scope="col" className="px-6 py-3">Class</th>
                            <th scope="col" className="px-6 py-3">Points</th>
                            <th scope="col" className="px-6 py-3">Meetings Logged</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <>
                                <TableRowSkeleton />
                                <TableRowSkeleton />
                                <TableRowSkeleton />
                                <TableRowSkeleton />
                            </>
                        ) : mentees.map(mentee => (
                            <tr key={mentee.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    <div className="flex items-center space-x-3">
                                        <img src={mentee.photo} alt={mentee.name} className="w-10 h-10 rounded-full object-cover"/>
                                        <span>{mentee.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">{mentee.adno}</td>
                                <td className="px-6 py-4">{mentee.mentor?.name || 'N/A'}</td>
                                <td className="px-6 py-4">{mentee.class}</td>
                                <td className="px-6 py-4">{mentee.points}</td>
                                <td className="px-6 py-4">{mentee.meetingCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 { !loading && mentees.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No mentees found in the system.
                    </div>
                )}
            </div>
        </Card>
    );
};