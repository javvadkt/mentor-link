import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { SupabaseService } from '../../services/supabaseService';
import { Mentee, Mentor, PointsLog, Meeting } from '../../types';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

interface MenteeStats extends Mentee {
    meetingCount: number;
}

type SortKey = 'name' | 'adno' | 'mentor' | 'class' | 'points' | 'meetingCount';
type SortDirection = 'asc' | 'desc';

const ChangePasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newPassword: string) => Promise<void>;
  menteeName: string;
}> = ({ isOpen, onClose, onConfirm, menteeName }) => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(newPassword);
    } catch (err: any) {
      // FIX: Display the specific error from the backend rather than a generic one.
      // This provides more accurate feedback (e.g., about password strength).
      setError(err.message || 'An unknown error occurred while updating the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Change Password for ${menteeName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">Enter a new password for the mentee. They will be able to use this to log in immediately.</p>
        <Input 
          id="new-password" 
          label="New Password" 
          type="password" 
          value={newPassword} 
          onChange={(e) => {
            setNewPassword(e.target.value);
            // FIX: Clear error when user types, for better UX.
            setError('');
          }}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};


const HistoryModal: React.FC<{
    mentee: Mentee;
    points: PointsLog[];
    meetings: Meeting[];
    loading: boolean;
    onClose: () => void;
}> = ({ mentee, points, meetings, loading, onClose }) => {
    const [activeTab, setActiveTab] = useState<'points' | 'meetings'>('points');

    return (
        <Modal isOpen={true} onClose={onClose} title={`History for ${mentee.name}`}>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('points')}
                        className={`${activeTab === 'points' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Point History
                    </button>
                    <button
                        onClick={() => setActiveTab('meetings')}
                        className={`${activeTab === 'meetings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Meeting History
                    </button>
                </nav>
            </div>

            {loading ? <div className="py-8"><Spinner /></div> : (
                <div className="mt-4 max-h-[60vh] overflow-y-auto p-1">
                    {activeTab === 'points' ? (
                        <div>
                            {points.length > 0 ? (
                                <ul className="space-y-2">
                                    {points.map(log => (
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
                                <p className="text-center text-gray-500 py-8">No points history found.</p>
                            )}
                        </div>
                    ) : (
                        <div>
                            {meetings.length > 0 ? (
                                <div className="space-y-4">
                                    {meetings.map(meeting => (
                                        <div key={meeting.id} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{new Date(meeting.date).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${meeting.type === 'Personal' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}>
                                                    {meeting.type}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No meeting history found.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

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
        <td className="px-6 py-4"><div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div></td>
    </tr>
);

const SortableHeader: React.FC<{
    sortKey: SortKey;
    currentSort: { key: SortKey; direction: SortDirection };
    setSort: (key: SortKey) => void;
    children: React.ReactNode;
}> = ({ sortKey, currentSort, setSort, children }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => setSort(sortKey)}>
        <div className="flex items-center">
            {children}
            {currentSort.key === sortKey && (
                <span className="ml-1">{currentSort.direction === 'asc' ? '▲' : '▼'}</span>
            )}
        </div>
    </th>
);

export const ManageMentees: React.FC = () => {
    const [allMentees, setAllMentees] = useState<MenteeStats[]>([]);
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [loading, setLoading] = useState(true);

    const [mentorFilter, setMentorFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [viewingMentee, setViewingMentee] = useState<Mentee | null>(null);
    const [pointHistory, setPointHistory] = useState<PointsLog[]>([]);
    const [meetingHistory, setMeetingHistory] = useState<Meeting[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [menteesData, meetingsData, mentorsData] = await Promise.all([
                    SupabaseService.getAllMentees(),
                    SupabaseService.getAllMeetingsForStats(),
                    SupabaseService.getAllMentors(),
                ]);
                
                setMentors(mentorsData);

                const meetingCounts = new Map<string, number>();
                meetingsData.forEach(meeting => {
                    (meeting.mentee_ids || []).forEach(menteeId => {
                        meetingCounts.set(menteeId, (meetingCounts.get(menteeId) || 0) + 1);
                    });
                });

                const menteesWithStats = menteesData.map(mentee => ({
                    ...mentee,
                    meetingCount: meetingCounts.get(mentee.id) || 0,
                }));

                setAllMentees(menteesWithStats);
            } catch (error) {
                console.error("Failed to fetch mentee data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const handleViewHistory = async (mentee: Mentee) => {
        setViewingMentee(mentee);
        setIsHistoryModalOpen(true);
        setHistoryLoading(true);
        try {
            const [pointsData, meetingsData] = await Promise.all([
                SupabaseService.getPointsLogForMentee(mentee.id),
                SupabaseService.getMeetingsForMentee(mentee.id)
            ]);
            setPointHistory(pointsData);
            setMeetingHistory(meetingsData);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleOpenPasswordModal = (mentee: Mentee) => {
        setViewingMentee(mentee);
        setIsPasswordModalOpen(true);
    };

    const handleClosePasswordModal = () => {
        setViewingMentee(null);
        setIsPasswordModalOpen(false);
    };

    const handleConfirmPasswordChange = async (newPassword: string) => {
        if (!viewingMentee) return;
        
        await SupabaseService.updateUserPasswordByAdmin(viewingMentee.id, newPassword);
        
        alert(`Password for ${viewingMentee.name} has been updated successfully.`);
        handleClosePasswordModal();
    };

    const uniqueClasses = useMemo(() => {
        const classes = new Set(allMentees.map(m => m.class));
        return Array.from(classes).sort();
    }, [allMentees]);

    const handleSort = (key: SortKey) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedMentees = useMemo(() => {
        return allMentees
            .filter(mentee => (mentorFilter === 'all' || mentee.mentorId === mentorFilter))
            .filter(mentee => (classFilter === 'all' || mentee.class === classFilter))
            .sort((a, b) => {
                const valA = sort.key === 'mentor' ? a.mentor?.name || '' : a[sort.key];
                const valB = sort.key === 'mentor' ? b.mentor?.name || '' : b[sort.key];
                
                // Fix: When sorting by admission number, treat it as a number instead of a string.
                if (sort.key === 'adno') {
                    const numA = parseInt(valA as string, 10);
                    const numB = parseInt(valB as string, 10);
                    // Only use numeric sort if both values are valid numbers
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return sort.direction === 'asc' ? numA - numB : numB - numA;
                    }
                }
    
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                
                if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [allMentees, mentorFilter, classFilter, sort]);

    return (
        <>
            <Card title="All Mentees Status Overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-md dark:border-gray-700">
                    <div>
                        <label htmlFor="mentor-filter" className="block text-sm font-medium">Filter by Mentor</label>
                        <select id="mentor-filter" value={mentorFilter} onChange={e => setMentorFilter(e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                            <option value="all">All Mentors</option>
                            {mentors.map(mentor => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="class-filter" className="block text-sm font-medium">Filter by Class</label>
                        <select id="class-filter" value={classFilter} onChange={e => setClassFilter(e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                            <option value="all">All Classes</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <SortableHeader sortKey="name" currentSort={sort} setSort={handleSort}>Mentee Name</SortableHeader>
                                <SortableHeader sortKey="adno" currentSort={sort} setSort={handleSort}>Admission No.</SortableHeader>
                                <SortableHeader sortKey="mentor" currentSort={sort} setSort={handleSort}>Mentor</SortableHeader>
                                <SortableHeader sortKey="class" currentSort={sort} setSort={handleSort}>Class</SortableHeader>
                                <SortableHeader sortKey="points" currentSort={sort} setSort={handleSort}>Points</SortableHeader>
                                <SortableHeader sortKey="meetingCount" currentSort={sort} setSort={handleSort}>Meetings</SortableHeader>
                                <th scope="col" className="px-6 py-3">Actions</th>
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
                            ) : filteredAndSortedMentees.map(mentee => (
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
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-1">
                                            <Button size="sm" variant="ghost" onClick={() => handleViewHistory(mentee)}>
                                                View
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleOpenPasswordModal(mentee)}>
                                                Password
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     { !loading && filteredAndSortedMentees.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No mentees found for the selected filters.
                        </div>
                    )}
                </div>
            </Card>

            {viewingMentee && (
                <>
                    <HistoryModal
                        isOpen={isHistoryModalOpen}
                        mentee={viewingMentee}
                        points={pointHistory}
                        meetings={meetingHistory}
                        loading={historyLoading}
                        onClose={() => { setIsHistoryModalOpen(false); setViewingMentee(null); }}
                    />
                    <ChangePasswordModal
                        isOpen={isPasswordModalOpen}
                        onClose={handleClosePasswordModal}
                        onConfirm={handleConfirmPasswordChange}
                        menteeName={viewingMentee.name}
                    />
                </>
            )}
        </>
    );
};