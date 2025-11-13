import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { SupabaseService } from '../../services/supabaseService';
import { Assignment, Mentee, Submission, AssignmentStatus } from '../../types';
import { Icons } from '../../constants';

const AddPointsModal: React.FC<{ mentee: Mentee; onSave: (points: number, reason: string) => void; onClose: () => void; assignmentTitle: string }> = ({ mentee, onSave, onClose, assignmentTitle }) => {
    const [points, setPoints] = useState(10);
    const [reason, setReason] = useState(`Completed assignment: ${assignmentTitle}`);

    const handleSave = () => {
        onSave(points, reason);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Award Points to ${mentee.name}`}>
            <div className="space-y-4">
                <Input id="points" label="Points" type="number" value={String(points)} onChange={e => setPoints(parseInt(e.target.value, 10) || 0)} />
                <Input id="reason" label="Reason" value={reason} onChange={e => setReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Skip</Button>
                    <Button onClick={handleSave}>Award Points</Button>
                </div>
            </div>
        </Modal>
    );
}


const AssignmentForm: React.FC<{ mentees: Mentee[]; onSave: () => void; onClose: () => void; }> = ({ mentees, onSave, onClose }) => {
    const { user: mentor } = useAuth();
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [selectedMentees, setSelectedMentees] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedMentees(mentees.map(m => m.id));
        } else {
            setSelectedMentees([]);
        }
    };

    const handleMenteeSelection = (menteeId: string, checked: boolean) => {
        if (checked) {
            setSelectedMentees(prev => [...prev, menteeId]);
        } else {
            setSelectedMentees(prev => prev.filter(id => id !== menteeId));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mentor || selectedMentees.length === 0) return;
        setLoading(true);
        await SupabaseService.createAssignment({ mentorId: mentor.id, title, instructions, dueDate, menteeIds: selectedMentees });
        setLoading(false);
        onSave();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="title" label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
            <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructions</label>
                <textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-700"></textarea>
            </div>
            <Input id="dueDate" label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />

            <div>
                <h4 className="font-semibold mb-2">Assign to Mentees</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                    <div className="flex items-center"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} className="mr-2" /> Select All</div>
                    {mentees.map(mentee => (
                        <div key={mentee.id} className="flex items-center">
                            <input type="checkbox" id={`mentee-${mentee.id}`} checked={selectedMentees.includes(mentee.id)} onChange={e => handleMenteeSelection(mentee.id, e.target.checked)} className="mr-2"/>
                            <label htmlFor={`mentee-${mentee.id}`}>{mentee.name}</label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Assignment'}</Button>
            </div>
        </form>
    );
};

const AssignmentSkeleton: React.FC = () => (
    <div className="border rounded-lg dark:border-gray-700 overflow-hidden animate-pulse">
        <div className="w-full p-4 text-left flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
            <div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
                <div className="flex items-center gap-2 mt-2">
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-28"></div>
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-32"></div>
                </div>
            </div>
            <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
    </div>
);

export const AssignmentManager: React.FC = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [submissions, setSubmissions] = useState<{[key: string]: Submission[]}>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [pointsModalState, setPointsModalState] = useState<{ isOpen: boolean; mentee?: Mentee, assignmentTitle?: string, assignmentId?: string }>({ isOpen: false });
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

    
    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [assignmentsData, menteesData] = await Promise.all([
                SupabaseService.getAssignmentsByMentor(user.id),
                SupabaseService.getMenteesByMentorId(user.id)
            ]);
            const sortedAssignments = assignmentsData.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
            setAssignments(sortedAssignments);
            setMentees(menteesData);
            
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
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const getSubmissionStatusForMentee = (assignmentId: string, menteeId: string) => {
        const submission = submissions[assignmentId]?.find(s => s.menteeId === menteeId);
        return submission ? submission.status : AssignmentStatus.PENDING;
    }

    const recordSubmission = async (assignmentId: string, menteeId: string) => {
        await SupabaseService.updateSubmissionStatus(assignmentId, menteeId, AssignmentStatus.SUBMITTED);
        fetchData();
    };

    const markAsComplete = async (assignmentId: string, menteeId: string, assignmentTitle: string) => {
        await SupabaseService.updateSubmissionStatus(assignmentId, menteeId, AssignmentStatus.COMPLETED);
        const mentee = mentees.find(m => m.id === menteeId);
        if (mentee) {
            setPointsModalState({ isOpen: true, mentee, assignmentTitle, assignmentId });
        } else {
            fetchData();
        }
    };
    
    const handleAwardPoints = async (points: number, reason: string) => {
        if (pointsModalState.mentee) {
            await SupabaseService.addPoints(pointsModalState.mentee.id, points, reason);
        }
        setPointsModalState({ isOpen: false });
        fetchData();
    };

    const toggleAssignment = (assignmentId: string) => {
        setExpandedAssignmentId(prevId => (prevId === assignmentId ? null : assignmentId));
    };
    
    const handleDeleteClick = (assignment: Assignment) => {
        setAssignmentToDelete(assignment);
        setIsConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!assignmentToDelete) return;
        await SupabaseService.deleteAssignment(assignmentToDelete.id);
        setIsConfirmDeleteOpen(false);
        setAssignmentToDelete(null);
        fetchData();
    };

    const filteredAssignments = useMemo(() => {
        return assignments.filter(assignment => {
            const dateMatch = !dateFilter || assignment.dueDate === dateFilter;
            
            if (statusFilter === 'all') return dateMatch;

            const isCompleted = (submissions[assignment.id] || []).filter(s => s.status === AssignmentStatus.COMPLETED).length === assignment.menteeIds.length;
            if (statusFilter === 'completed') return dateMatch && isCompleted;
            if (statusFilter === 'pending') return dateMatch && !isCompleted;

            return dateMatch;
        });
    }, [assignments, submissions, statusFilter, dateFilter]);


    return (
        <>
            <Card title="Assignment Manager">
                {error ? (
                     <p className="text-red-500 text-center">{error}</p>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                            <div className="flex gap-4 w-full md:w-auto">
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                </select>
                                <Input id="dateFilter" label="" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                            </div>
                            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 w-full md:w-auto">
                                {Icons.add}
                                Create Assignment
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {loading ? (
                                <>
                                    <AssignmentSkeleton />
                                    <AssignmentSkeleton />
                                    <AssignmentSkeleton />
                                </>
                            ) : filteredAssignments.length > 0 ? (
                                filteredAssignments.map(assignment => {
                                    const isExpanded = expandedAssignmentId === assignment.id;
                                    const assignmentSubmissions = submissions[assignment.id] || [];
                                    const submittedCount = assignmentSubmissions.filter(s => s.status === AssignmentStatus.SUBMITTED || s.status === AssignmentStatus.COMPLETED).length;
                                    const completedCount = assignmentSubmissions.filter(s => s.status === AssignmentStatus.COMPLETED).length;
                                    const totalMentees = assignment.menteeIds.length;
                                    const isFullyCompleted = totalMentees > 0 && completedCount === totalMentees;
            
            
                                    return (
                                        <div key={assignment.id} className="border rounded-lg dark:border-gray-700 overflow-hidden transition-all duration-300">
                                            <div
                                                className="w-full p-4 text-left flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div 
                                                    onClick={() => toggleAssignment(assignment.id)}
                                                    className="flex-grow cursor-pointer"
                                                >
                                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{assignment.title}</h4>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                                            {totalMentees === 1 ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                                </svg>
                                                            )}
                                                            {totalMentees === 1 ? 'Personal' : 'Group'}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                            </svg>
                                                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                                        </span>
                                                        {totalMentees > 0 && (
                                                            isFullyCompleted ? (
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Completed
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2-2H4a2 2 0 01-2-2v-4z" />
                                                                    </svg>
                                                                    {submittedCount}/{totalMentees} Submitted
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {submittedCount === 0 && (
                                                        <Button 
                                                            variant="danger" 
                                                            size="sm" 
                                                            onClick={() => handleDeleteClick(assignment)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
                                                    <button
                                                        onClick={() => toggleAssignment(assignment.id)}
                                                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        aria-expanded={isExpanded}
                                                        aria-controls={`assignment-content-${assignment.id}`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-gray-500 dark:text-gray-400 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
            
                                            {isExpanded && (
                                                <div id={`assignment-content-${assignment.id}`} className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                                                    <p className="mb-4 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{assignment.instructions}</p>
                                                    
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                                <tr>
                                                                    <th scope="col" className="px-4 py-3">Mentee</th>
                                                                    <th scope="col" className="px-4 py-3">Status</th>
                                                                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {assignment.menteeIds.map(menteeId => {
                                                                    const mentee = mentees.find(m => m.id === menteeId);
                                                                    if (!mentee) return null;
                                                                    const status = getSubmissionStatusForMentee(assignment.id, menteeId);
                                                                    return (
                                                                        <tr key={menteeId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{mentee.name}</td>
                                                                            <td className="px-4 py-3">
                                                                                 <span className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${
                                                                                     status === AssignmentStatus.COMPLETED ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                                                     : status === AssignmentStatus.SUBMITTED ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                                                                                     : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                                                                                 }`}>{status}</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                {status === AssignmentStatus.PENDING && (
                                                                                    <Button variant="secondary" size="sm" onClick={() => recordSubmission(assignment.id, menteeId)}>Record Submission</Button>
                                                                                )}
                                                                                {status === AssignmentStatus.SUBMITTED && (
                                                                                    <Button variant="secondary" size="sm" onClick={() => markAsComplete(assignment.id, menteeId, assignment.title)}>Mark Complete</Button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">No assignments found for the selected filters.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Assignment">
                <AssignmentForm mentees={mentees} onSave={() => { setIsModalOpen(false); fetchData(); }} onClose={() => setIsModalOpen(false)} />
            </Modal>
             {pointsModalState.isOpen && pointsModalState.mentee && pointsModalState.assignmentTitle && (
                <AddPointsModal
                    mentee={pointsModalState.mentee}
                    assignmentTitle={pointsModalState.assignmentTitle}
                    onSave={handleAwardPoints}
                    onClose={() => { setPointsModalState({ isOpen: false }); fetchData(); }}
                />
            )}
            {assignmentToDelete && (
                <Modal 
                    isOpen={isConfirmDeleteOpen} 
                    onClose={() => setIsConfirmDeleteOpen(false)} 
                    title={`Delete Assignment: ${assignmentToDelete.title}`}
                >
                    <div className="space-y-6">
                        <p>Are you sure you want to delete this assignment? This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>Cancel</Button>
                            <Button variant="danger" onClick={handleConfirmDelete}>Delete</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};