
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { SupabaseService } from '../../services/supabaseService';
import { Assignment, Submission, AssignmentStatus } from '../../types';

const AssignmentSkeleton: React.FC = () => (
    <div className="p-4 border rounded-md dark:border-gray-700 animate-pulse">
        <div className="flex justify-between items-start">
            <div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mt-2"></div>
                <div className="mt-3 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
            </div>
            <div className="h-6 w-24 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
        <div className="mt-4 flex justify-end">
            <div className="h-10 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
    </div>
);

export const MyAssignments: React.FC = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Map<string, Submission>>(new Map());
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        const assignmentsData = await SupabaseService.getAssignmentsByMentee(user.id);
        const submissionsMap = new Map<string, Submission>();
        for (const assignment of assignmentsData) {
            const submission = await SupabaseService.getSubmission(assignment.id, user.id);
            if (submission) {
                submissionsMap.set(assignment.id, submission);
            }
        }
        setAssignments(assignmentsData);
        setSubmissions(submissionsMap);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleUpload = async (assignmentId: string) => {
        if (!user) return;
        // In a real app, this would open a file dialog. We'll simulate the upload.
        alert("Simulating file upload...");
        await SupabaseService.submitAssignment(assignmentId, user.id, 'simulated-file-url.pdf');
        fetchData();
    };

    const getStatus = (assignmentId: string) => {
        return submissions.get(assignmentId)?.status || AssignmentStatus.PENDING;
    }

    return (
        <Card title="My Assignments">
            <div className="space-y-4">
                {loading ? (
                    <>
                        <AssignmentSkeleton />
                        <AssignmentSkeleton />
                    </>
                ) : assignments.length > 0 ? (
                    assignments.map(assignment => {
                        const status = getStatus(assignment.id);
                        return (
                            <div 
                                key={assignment.id} 
                                className={`p-4 border rounded-md dark:border-gray-700 transition-colors ${
                                    status === AssignmentStatus.COMPLETED ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-lg">{assignment.title}</h4>
                                        <p className="text-sm text-red-500">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                                        <p className="mt-2 text-gray-600 dark:text-gray-300">{assignment.instructions}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                        status === AssignmentStatus.COMPLETED ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                        : status === AssignmentStatus.SUBMITTED ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                                    }`}>{status}</span>
                                </div>
                                <div className="mt-4 text-right">
                                    {status === AssignmentStatus.PENDING && (
                                        <Button onClick={() => handleUpload(assignment.id)}>Upload Work</Button>
                                    )}
                                    {status === AssignmentStatus.SUBMITTED && (
                                        <p className="text-sm text-blue-600 dark:text-blue-400">Awaiting review from your mentor.</p>
                                    )}
                                    {status === AssignmentStatus.COMPLETED && (
                                        <p className="text-sm text-green-600 dark:text-green-400">Completed and reviewed.</p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <p className="text-gray-500">You have no assignments.</p>
                )}
            </div>
        </Card>
    );
};
