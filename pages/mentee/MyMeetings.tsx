
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { SupabaseService } from '../../services/supabaseService';
import { Meeting, ScheduledMeeting, MeetingType, Mentee, Mentor } from '../../types';

const MeetingListSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-1"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-40"></div>
                    </div>
                    <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="mt-3 pt-3 border-t dark:border-gray-600 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
            </div>
        ))}
    </div>
);

export const MyMeetings: React.FC = () => {
    const { user } = useAuth();
    const mentee = user as Mentee;
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
    const [loadingScheduled, setLoadingScheduled] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [mentor, setMentor] = useState<Mentor | null>(null);

    useEffect(() => {
        if (!mentee || mentee.role !== 'MENTEE') {
            setLoadingScheduled(false);
            setLoadingHistory(false);
            return;
        }

        const fetchScheduledData = async () => {
            setLoadingScheduled(true);
            try {
                const [scheduledMeetingsData, mentorData] = await Promise.all([
                    SupabaseService.getScheduledMeetings(mentee.id, mentee.role),
                    SupabaseService.getUserById(mentee.mentorId) as Promise<Mentor | undefined>,
                ]);
    
                setScheduledMeetings(
                    scheduledMeetingsData
                        .filter(m => m.status === 'Planned')
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                );
    
                if (mentorData) {
                    setMentor(mentorData);
                }
            } catch (error) {
                console.error("Error fetching scheduled meetings:", error);
            } finally {
                setLoadingScheduled(false);
            }
        };

        const fetchHistoryData = async () => {
            setLoadingHistory(true);
            try {
                const meetingsData = await SupabaseService.getMeetings(mentee.id, mentee.role);
                setMeetings(meetingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error("Error fetching meeting history:", error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchScheduledData();
        fetchHistoryData();
    }, [mentee]);

    return (
        <div className="space-y-6">
            <Card title="Upcoming Meetings">
                {loadingScheduled ? <MeetingListSkeleton /> : (
                    <div className="space-y-4">
                        {scheduledMeetings.length > 0 ? (
                            scheduledMeetings.map(meeting => (
                                <div key={meeting.id} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-lg text-gray-900 dark:text-white">
                                                {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">at {meeting.time} with {mentor?.name || 'your mentor'}</p>
                                        </div>
                                        <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${meeting.type === MeetingType.PERSONAL ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-secondary/10 text-secondary dark:bg-secondary/20'}`}>
                                            {meeting.type}
                                        </span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t dark:border-gray-600">
                                        <h5 className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider mb-2">Agenda</h5>
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meeting.agenda}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">You have no upcoming meetings.</p>
                        )}
                    </div>
                )}
            </Card>

            <Card title="Meeting History">
                {loadingHistory ? <MeetingListSkeleton /> : (
                    <div className="space-y-4">
                        {meetings.length > 0 ? (
                            meetings.map(meeting => (
                                <div key={meeting.id} className="p-4 border rounded-md dark:border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{new Date(meeting.date).toLocaleDateString()}</p>
                                            {meeting.type === MeetingType.GENERAL && <p className="text-sm text-gray-500 dark:text-gray-400">Group Meeting</p>}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${meeting.type === MeetingType.PERSONAL ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}>
                                            {meeting.type}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">You have no meeting history.</p>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};
