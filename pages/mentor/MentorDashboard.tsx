
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { SupabaseService } from '../../services/supabaseService';
import { Mentee, Meeting, Assignment, Submission, AssignmentStatus, Warning } from '../../types';
import { Icons } from '../../constants';

interface MentorDashboardProps {
  onViewProfile: (menteeId: string) => void;
  onViewAssignments: () => void;
  onSendMessage: (mentee: Mentee) => void;
}

const StatItem: React.FC<{ value: number | string; label: string; }> = ({ value, label }) => (
    <div className="text-center">
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
);

const MenteeCard: React.FC<{ 
    mentee: Mentee;
    meetings: Meeting[];
    assignments: Assignment[];
    submissions: {[key: string]: Submission[]};
} & Omit<MentorDashboardProps, 'onViewAssignments'>> = ({ mentee, meetings, assignments, submissions, onViewProfile, onSendMessage }) => {
    
    const totalMeetings = meetings.length;

    const pendingWork = assignments.reduce((count, assignment) => {
        if (!assignment.menteeIds.includes(mentee.id)) {
            return count;
        }
        const submission = submissions[assignment.id]?.find(s => s.menteeId === mentee.id);
        if (!submission || submission.status !== AssignmentStatus.COMPLETED) {
            return count + 1;
        }
        return count;
    }, 0);
    
    return (
        <Card className="flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex-grow">
                <div className="flex flex-col items-center text-center">
                    <img src={mentee.photo} alt={mentee.name} className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-600" />
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mt-4 flex items-center">
                        {mentee.name}
                        {mentee.isCoordinator && <span className="ml-2" title="Coordinator">{Icons.star}</span>}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{mentee.adno} | {mentee.class}</p>
                </div>
                <div className="mt-6 pt-4 border-t dark:border-gray-700 grid grid-cols-3 gap-4">
                   <StatItem value={mentee.points} label="Points" />
                   <StatItem value={totalMeetings} label="Meetings" />
                   <StatItem value={pendingWork} label="Pending" />
                </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <Button onClick={() => onViewProfile(mentee.id)} className="flex-1">View Profile</Button>
                <Button onClick={() => onSendMessage(mentee)} variant="secondary" className="flex-1">Message</Button>
            </div>
        </Card>
    );
};

const MenteeCardSkeleton: React.FC = () => (
    <Card className="flex flex-col animate-pulse">
        <div className="flex-grow">
            <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32 mt-4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mt-2"></div>
            </div>
            <div className="mt-6 pt-4 border-t dark:border-gray-700 grid grid-cols-3 gap-4">
                <div className="space-y-1"><div className="h-6 mx-auto bg-gray-300 dark:bg-gray-600 rounded w-8"></div><div className="h-3 mx-auto bg-gray-300 dark:bg-gray-600 rounded w-12"></div></div>
                <div className="space-y-1"><div className="h-6 mx-auto bg-gray-300 dark:bg-gray-600 rounded w-8"></div><div className="h-3 mx-auto bg-gray-300 dark:bg-gray-600 rounded w-12"></div></div>
                <div className="space-y-1"><div className="h-6 mx-auto bg-gray-300 dark:bg-gray-600 rounded w-8"></div><div className="h-3 mx-auto bg-gray-300 dark:bg-gray-600 rounded w-12"></div></div>
            </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        </div>
    </Card>
);

export const MentorDashboard: React.FC<MentorDashboardProps> = ({ onViewProfile, onViewAssignments, onSendMessage }) => {
    const { user } = useAuth();
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<{[key: string]: Submission[]}>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                setError(null);
                try {
                    const [menteesData, meetingsData, assignmentsData] = await Promise.all([
                       SupabaseService.getMenteesByMentorId(user.id),
                       SupabaseService.getMeetings(user.id, user.role),
                       SupabaseService.getAssignmentsByMentor(user.id)
                   ]);
                   
                   setMentees(menteesData);
                   setMeetings(meetingsData);
                   setAssignments(assignmentsData);
   
                   const subs: {[key: string]: Submission[]} = {};
                   for (const assign of assignmentsData) {
                       subs[assign.id] = await SupabaseService.getSubmissionsByAssignment(assign.id);
                   }
                   setSubmissions(subs);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    const handleRunCheck = async () => {
        if (!user) return;
        setChecking(true);
        setWarnings([]);
        const newWarnings = await SupabaseService.runMentorMonthlyCheck(user.id);
        setWarnings(newWarnings);
        setChecking(false);
    }
    
    if (error) {
        return (
            <Card title="Error">
                <p className="text-red-500">{error}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">My Mentees</h2>
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MenteeCardSkeleton />
                    <MenteeCardSkeleton />
                    <MenteeCardSkeleton />
                </div>
            ) : mentees.length === 0 ? (
                <Card>
                    <p className="text-center text-gray-500">You have not added any mentees yet.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mentees.map(mentee => {
                        const menteeMeetings = meetings.filter(m => m.menteeIds.includes(mentee.id));
                        const menteeAssignments = assignments.filter(a => a.menteeIds.includes(mentee.id));
                        return (
                            <MenteeCard 
                                key={mentee.id} 
                                mentee={mentee} 
                                meetings={menteeMeetings} 
                                assignments={menteeAssignments}
                                submissions={submissions}
                                onViewProfile={onViewProfile} 
                                onSendMessage={onSendMessage} />
                        )
                    })}
                </div>
            )}

            <Card title="System Health & Automated Warnings">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        Run a check for the past month to find your mentees with insufficient meetings.
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
