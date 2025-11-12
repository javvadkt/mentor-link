import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { SupabaseService } from '../../services/supabaseService';
import { Meeting, Mentee, MeetingType, ScheduledMeeting } from '../../types';
import { Icons } from '../../constants';

const MeetingForm: React.FC<{ mentees: Mentee[]; onSave: () => void; onClose: () => void; initialData?: Partial<Meeting> }> = ({ mentees, onSave, onClose, initialData }) => {
    const { user: mentor } = useAuth();
    const [type, setType] = useState<MeetingType>(initialData?.type || MeetingType.PERSONAL);
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [selectedMentees, setSelectedMentees] = useState<string[]>(initialData?.menteeIds || []);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mentor || selectedMentees.length === 0) return;
        setLoading(true);
        await SupabaseService.logMeeting({ mentorId: mentor.id, type, date, notes, menteeIds: selectedMentees });
        setLoading(false);
        onSave();
    };
    
    const handleMenteeSelection = (menteeId: string, checked: boolean) => {
        if (type === MeetingType.PERSONAL) {
             setSelectedMentees(checked ? [menteeId] : []);
        } else {
            if (checked) {
                setSelectedMentees(prev => [...prev, menteeId]);
            } else {
                setSelectedMentees(prev => prev.filter(id => id !== menteeId));
            }
        }
    };
    
    useEffect(() => {
        if (!initialData) {
            setSelectedMentees([]);
        }
    }, [type, initialData]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Meeting Type</label>
                    <select value={type} onChange={e => setType(e.target.value as MeetingType)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700">
                        <option value={MeetingType.PERSONAL}>Personal</option>
                        <option value={MeetingType.GENERAL}>General</option>
                    </select>
                </div>
                <Input id="date" label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
                <label className="block text-sm font-medium">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-700" required></textarea>
            </div>
            <div>
                <h4 className="font-semibold mb-2">Select Mentee(s)</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                    {mentees.map(mentee => (
                        <div key={mentee.id} className="flex items-center">
                            <input type={type === MeetingType.PERSONAL ? 'radio' : 'checkbox'} name="menteeSelection" id={`meet-mentee-${mentee.id}`} checked={selectedMentees.includes(mentee.id)} onChange={e => handleMenteeSelection(mentee.id, e.target.checked)} className="mr-2"/>
                            <label htmlFor={`meet-mentee-${mentee.id}`}>{mentee.name}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Logging...' : 'Log Meeting'}</Button>
            </div>
        </form>
    );
}

const ScheduleMeetingForm: React.FC<{ mentees: Mentee[]; onSave: () => void; onClose: () => void; }> = ({ mentees, onSave, onClose }) => {
    const { user: mentor } = useAuth();
    const [type, setType] = useState<MeetingType>(MeetingType.PERSONAL);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [agenda, setAgenda] = useState('');
    const [selectedMentees, setSelectedMentees] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mentor || selectedMentees.length === 0) return;
        setLoading(true);
        await SupabaseService.scheduleMeeting({ mentorId: mentor.id, type, date, time, agenda, menteeIds: selectedMentees });
        setLoading(false);
        onSave();
    };
    
    const handleMenteeSelection = (menteeId: string, checked: boolean) => {
        if (type === MeetingType.PERSONAL) {
             setSelectedMentees(checked ? [menteeId] : []);
        } else {
            if (checked) {
                setSelectedMentees(prev => [...prev, menteeId]);
            } else {
                setSelectedMentees(prev => prev.filter(id => id !== menteeId));
            }
        }
    };
    
    useEffect(() => {
        setSelectedMentees([]);
    }, [type]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Meeting Type</label>
                    <select value={type} onChange={e => setType(e.target.value as MeetingType)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700">
                        <option value={MeetingType.PERSONAL}>Personal</option>
                        <option value={MeetingType.GENERAL}>General</option>
                    </select>
                </div>
                <Input id="date" label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
             <Input id="time" label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} required />
            <div>
                <label className="block text-sm font-medium">Agenda</label>
                <textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={5} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-700" required></textarea>
            </div>
            <div>
                <h4 className="font-semibold mb-2">Select Mentee(s)</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                    {mentees.map(mentee => (
                        <div key={mentee.id} className="flex items-center">
                            <input type={type === MeetingType.PERSONAL ? 'radio' : 'checkbox'} name="menteeSelection" id={`s-meet-mentee-${mentee.id}`} checked={selectedMentees.includes(mentee.id)} onChange={e => handleMenteeSelection(mentee.id, e.target.checked)} className="mr-2"/>
                            <label htmlFor={`s-meet-mentee-${mentee.id}`}>{mentee.name}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Scheduling...' : 'Schedule Meeting'}</Button>
            </div>
        </form>
    );
};

const MeetingSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
        <div className="flex">
            <div className="w-1.5 bg-gray-300 dark:bg-gray-600"></div>
            <div className="p-5 flex-grow space-y-3">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-40 mt-2"></div>
                    </div>
                    <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="pt-3 border-t dark:border-gray-600 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                </div>
            </div>
        </div>
    </div>
);


export const MeetingLogs: React.FC = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [loadingScheduled, setLoadingScheduled] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'schedule'>('schedule');
    const [meetingToLog, setMeetingToLog] = useState<Partial<Meeting> | undefined>(undefined);

    const refetchAll = async () => {
        if (!user) return;
        setLoadingScheduled(true);
        setLoadingHistory(true);
        const [meetingsData, menteesData, scheduledMeetingsData] = await Promise.all([
            SupabaseService.getMeetings(user.id, user.role),
            SupabaseService.getMenteesByMentorId(user.id),
            SupabaseService.getScheduledMeetings(user.id, user.role),
        ]);
        setMeetings(meetingsData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setMentees(menteesData);
        setScheduledMeetings(scheduledMeetingsData.filter(m => m.status === 'Planned').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setLoadingScheduled(false);
        setLoadingHistory(false);
    };

    useEffect(() => {
        if (!user) {
            setLoadingScheduled(false);
            setLoadingHistory(false);
            return;
        }

        const fetchScheduledData = async () => {
            setLoadingScheduled(true);
            try {
                const [menteesData, scheduledMeetingsData] = await Promise.all([
                    SupabaseService.getMenteesByMentorId(user.id),
                    SupabaseService.getScheduledMeetings(user.id, user.role),
                ]);
                setMentees(menteesData);
                setScheduledMeetings(scheduledMeetingsData.filter(m => m.status === 'Planned').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            } catch (error) {
                console.error("Failed to fetch scheduled meetings data", error);
            } finally {
                setLoadingScheduled(false);
            }
        };

        const fetchHistoryData = async () => {
            setLoadingHistory(true);
            try {
                const meetingsData = await SupabaseService.getMeetings(user.id, user.role);
                setMeetings(meetingsData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch(error) {
                console.error("Failed to fetch meeting history", error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchScheduledData();
        fetchHistoryData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleOpenLogModal = (scheduledMeeting?: ScheduledMeeting) => {
        if (scheduledMeeting) {
            setMeetingToLog({
                type: scheduledMeeting.type,
                date: scheduledMeeting.date,
                menteeIds: scheduledMeeting.menteeIds,
                notes: scheduledMeeting.agenda,
            });
            SupabaseService.updateScheduledMeetingStatus(scheduledMeeting.id, 'Completed');
        } else {
            setMeetingToLog(undefined);
        }
        setIsLogModalOpen(true);
    };

    const handleCancelMeeting = async (meetingId: string) => {
        if (window.confirm("Are you sure you want to cancel this meeting?")) {
            await SupabaseService.updateScheduledMeetingStatus(meetingId, 'Cancelled');
            refetchAll();
        }
    };

    const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({ label, isActive, onClick }) => (
        <button 
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none ${isActive ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
            {label}
        </button>
    );

    const renderContent = () => {
        if (activeTab === 'history') {
            return (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => handleOpenLogModal()} className="flex items-center gap-2">
                            {Icons.add}
                            Log a Meeting
                        </Button>
                    </div>
                    {loadingHistory ? (
                         <div className="space-y-4 mt-4">
                            <MeetingSkeleton />
                            <MeetingSkeleton />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {meetings.length > 0 ? meetings.map(meeting => (
                                <div key={meeting.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="flex">
                                        <div className={`w-1.5 ${meeting.type === MeetingType.PERSONAL ? 'bg-primary' : 'bg-secondary'}`}></div>
                                        <div className="p-5 flex-grow space-y-3">
                                            {/* Header */}
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white">
                                                        <span className="text-gray-500 dark:text-gray-400">{Icons.meetings}</span>
                                                        <span>{new Date(meeting.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                        <span className="text-gray-500 dark:text-gray-400">{Icons.users}</span>
                                                        <span>With: {meeting.menteeIds.map(id => mentees.find(m => m.id === id)?.name).join(', ')}</span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${meeting.type === MeetingType.PERSONAL ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-secondary/10 text-secondary dark:bg-secondary/20'}`}>
                                                    {meeting.type}
                                                </span>
                                            </div>

                                            {/* Notes */}
                                            <div className="pt-3 border-t dark:border-gray-600">
                                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500 py-4">No meetings have been logged yet.</p>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'schedule') {
             return (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => setIsScheduleModalOpen(true)} className="flex items-center gap-2">
                            {Icons.add}
                            Schedule a Meeting
                        </Button>
                    </div>
                    {loadingScheduled ? (
                        <div className="space-y-4 mt-4">
                            <MeetingSkeleton />
                            <MeetingSkeleton />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {scheduledMeetings.length > 0 ? scheduledMeetings.map(meeting => (
                                <div key={meeting.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="flex">
                                        <div className={`w-1.5 ${meeting.type === MeetingType.PERSONAL ? 'bg-primary' : 'bg-secondary'}`}></div>
                                        <div className="p-5 flex-grow space-y-4">
                                            {/* Header */}
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white">
                                                        <span className="text-gray-500 dark:text-gray-400">{Icons.meetings}</span>
                                                        <span>{new Date(meeting.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} at {meeting.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                        <span className="text-gray-500 dark:text-gray-400">{Icons.users}</span>
                                                        <span>With: {meeting.menteeIds.map(id => mentees.find(m => m.id === id)?.name).join(', ')}</span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${meeting.type === MeetingType.PERSONAL ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-secondary/10 text-secondary dark:bg-secondary/20'}`}>
                                                    {meeting.type}
                                                </span>
                                            </div>
                
                                            {/* Agenda */}
                                            <div className="pt-4 border-t dark:border-gray-600">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-gray-500 dark:text-gray-400 mt-0.5">{Icons.assignment}</span>
                                                    <div className="text-sm">
                                                        <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Agenda</h5>
                                                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{meeting.agenda}</p>
                                                    </div>
                                                </div>
                                            </div>
                
                                            {/* Actions */}
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="danger" size="sm" onClick={() => handleCancelMeeting(meeting.id)}>Cancel</Button>
                                                <Button variant="secondary" size="sm" onClick={() => handleOpenLogModal(meeting)}>Log as Completed</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500 py-4">No meetings scheduled.</p>
                            )}
                        </div>
                    )}
                </div>
            );
        }
    }


    return (
        <>
            <Card title="Meetings">
                 <div className="flex border-b border-gray-200 dark:border-gray-700 -mt-4 -mx-6 px-6 mb-4">
                    <TabButton label="Meeting History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                    <TabButton label="Scheduled Meetings" isActive={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
                </div>
                {renderContent()}
            </Card>

            <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Log a New Meeting">
                <MeetingForm mentees={mentees} onSave={() => { setIsLogModalOpen(false); refetchAll(); }} onClose={() => setIsLogModalOpen(false)} initialData={meetingToLog} />
            </Modal>
            
            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule a New Meeting">
                <ScheduleMeetingForm mentees={mentees} onSave={() => { setIsScheduleModalOpen(false); refetchAll(); }} onClose={() => setIsScheduleModalOpen(false)} />
            </Modal>
        </>
    );
};
