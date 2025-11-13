
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { SupabaseService } from '../../services/supabaseService';
import { Mentee, Meeting, Assignment, Submission, AssignmentStatus, Warning, MeetingType } from '../../types';
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
    onViewHistory: (mentee: Mentee) => void;
} & Omit<MentorDashboardProps, 'onViewAssignments'>> = ({ mentee, meetings, assignments, submissions, onViewProfile, onSendMessage, onViewHistory }) => {
    
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
        <Card className="flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative">
            <button 
                onClick={() => onViewHistory(mentee)}
                className="absolute top-2 right-2 p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={`View meeting history for ${mentee.name}`}
                title="View Meeting History"
            >
                {Icons.history}
            </button>

            <div className="flex-grow">
                <div className="flex flex-col items-center text-center pt-4">
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


const MeetingHistoryModal: React.FC<{
    mentee: Mentee | null;
    meetings: Meeting[];
    loading: boolean;
    onClose: () => void;
}> = ({ mentee, meetings, loading, onClose }) => {
    if (!mentee) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Meeting History for ${mentee.name}`}>
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Spinner />
                </div>
            ) : meetings.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No meeting history found for {mentee.name}.</p>
            ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {meetings.map(meeting => (
                        <div key={meeting.id} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{new Date(meeting.date).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${meeting.type === MeetingType.PERSONAL ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}>
                                    {meeting.type}
                                </span>
                            </div>
                            <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};


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
    const [lastCheckDate, setLastCheckDate] = useState<Date | null>(null);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<Mentee | null>(null);
    const [menteeMeetingLogs, setMenteeMeetingLogs] = useState<Meeting[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

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
        setLastCheckDate(new Date());
        setChecking(false);
    }

    const handleViewHistory = async (mentee: Mentee) => {
        setViewingHistoryFor(mentee);
        setIsHistoryModalOpen(true);
        setHistoryLoading(true);
        try {
            const data = await SupabaseService.getMeetingsForMentee(mentee.id);
            setMenteeMeetingLogs(data);
        } catch (error) {
            console.error("Failed to fetch meeting history", error);
            setMenteeMeetingLogs([]);
        } finally {
            setHistoryLoading(false);
        }
    };
    
    if (error) {
        return (
            <Card title="Error">
                <p className="text-red-500">{error}</p>
            </Card>
        );
    }

    return (
        <>
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
                                    onSendMessage={onSendMessage}
                                    onViewHistory={handleViewHistory}
                                />
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
                            {checking ? <><Spinner size="sm" color="white" className="mr-2"/> Checking...</> : 'Run Monthly Check'}
                        </Button>

                        {checking && <Spinner />}

                         {lastCheckDate && !checking && (
                            warnings.length > 0 ? (
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
                            ) : (
                                 <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-md">
                                    <p className="font-semibold text-green-800 dark:text-green-300">All Clear!</p>
                                    <p className="text-sm text-green-700 dark:text-green-400">No warnings found for your mentees after the last check.</p>
                                </div>
                            )
                        )}
                    </div>
                </Card>
            </div>
            
            {isHistoryModalOpen && (
                <MeetingHistoryModal 
                    mentee={viewingHistoryFor}
                    meetings={menteeMeetingLogs}
                    loading={historyLoading}
                    onClose={() => setIsHistoryModalOpen(false)}
                />
            )}
        </>
    );
};