
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { SupabaseService } from '../../services/supabaseService';
import { Assignment, ScheduledMeeting, Mentor, Mentee, AssignmentStatus, Submission } from '../../types';
import { Icons } from '../../constants';

const CardSkeleton: React.FC<{ title: string }> = ({ title }) => (
    <Card title={title}>
        <div className="animate-pulse flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            <div className="space-y-2">
                <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
            </div>
        </div>
    </Card>
);

const ListCardSkeleton: React.FC<{ title: string }> = ({ title }) => (
    <Card title={title}>
        <div className="space-y-3 animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
    </Card>
);

export const MenteeDashboard: React.FC = () => {
    const { user } = useAuth();
    const mentee = user as Mentee;
    const mentor = mentee.mentor;
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Map<string, Submission>>(new Map());
    const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || user.role !== 'MENTEE') return;
            setLoading(true);
            const [assignmentsData, scheduledMeetingsData] = await Promise.all([
                SupabaseService.getAssignmentsByMentee(user.id),
                SupabaseService.getScheduledMeetings(user.id, user.role),
            ]);

            setAssignments(assignmentsData);

            const submissionsMap = new Map<string, Submission>();
            for (const assignment of assignmentsData) {
                const submission = await SupabaseService.getSubmission(assignment.id, user.id);
                if (submission) {
                    submissionsMap.set(assignment.id, submission);
                }
            }
            setSubmissions(submissionsMap);

            setScheduledMeetings(scheduledMeetingsData.filter(m => m.status === 'Planned').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            setLoading(false);
        };
        fetchData();
    }, [user]);

    const getPendingAssignments = () => {
        return assignments.filter(a => {
            const status = submissions.get(a.id)?.status || AssignmentStatus.PENDING;
            return status !== AssignmentStatus.COMPLETED;
        });
    };

    if (loading) return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CardSkeleton title="My Mentor" />
                <CardSkeleton title="My Points" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ListCardSkeleton title="Pending Assignments" />
                <ListCardSkeleton title="Upcoming Meetings" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {mentee.isCoordinator && (
                <div className="p-4 bg-green-100 dark:bg-green-900 border-l-4 border-green-500 rounded-md">
                    <h3 className="font-bold text-green-800 dark:text-green-200 flex items-center gap-2">
                        {Icons.star} Welcome, {mentee.name} (Coordinator)
                    </h3>
                    <p className="text-green-700 dark:text-green-300">You can send announcements to your group via the messaging tab.</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="My Mentor">
                    {mentor ? (
                        <div className="flex items-center space-x-4">
                            <div className="text-4xl p-3 bg-primary/20 text-primary rounded-full">{Icons.profile}</div>
                            <div>
                                <h4 className="text-xl font-bold">{mentor.name}</h4>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">Your mentor's information is not available.</p>
                    )}
                </Card>
                <Card title="My Points">
                    <div className="flex items-center space-x-4">
                        <div className="text-4xl p-3 bg-yellow-400/20 text-yellow-500 rounded-full">🏆</div>
                        <div>
                            <p className="text-3xl font-bold">{mentee.points}</p>
                            <p className="text-gray-500 dark:text-gray-400">Total Points Earned</p>
                        </div>
                    </div>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Pending Assignments">
                    <ul className="space-y-3">
                        {getPendingAssignments().map(a => (
                            <li key={a.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <p className="font-semibold">{a.title}</p>
                                <p className="text-sm text-red-500">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                            </li>
                        ))}
                        {getPendingAssignments().length === 0 && <p className="text-gray-500">No pending assignments.</p>}
                    </ul>
                </Card>
                <Card title="Upcoming Meetings">
                    <ul className="space-y-3">
                        {scheduledMeetings.slice(0, 3).map(m => (
                            <li key={m.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <p className="font-semibold">{m.type} Meeting</p>
                                <p className="text-sm text-gray-500">On: {new Date(m.date).toLocaleDateString()} at {m.time}</p>
                            </li>
                        ))}
                         {scheduledMeetings.length === 0 && <p className="text-gray-500">No meetings scheduled.</p>}
                    </ul>
                </Card>
            </div>
        </div>
    );
};
