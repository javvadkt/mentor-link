
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { SupabaseService } from '../../services/supabaseService';
import { Feedback, UserRole } from '../../types';
import { Button } from '../../components/Button';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleStyles = {
        [UserRole.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        [UserRole.MENTOR]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        [UserRole.MENTEE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleStyles[role]}`}>
            {role}
        </span>
    );
};

export const FeedbackReview: React.FC = () => {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const data = await SupabaseService.getFeedback();
            setFeedback(data);
        } catch (error) {
            console.error("Failed to fetch feedback", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    const handleToggleActioned = async (feedbackItem: Feedback) => {
        try {
            const updatedFeedback = await SupabaseService.setFeedbackActioned(feedbackItem.id, !feedbackItem.is_actioned);
            setFeedback(prevFeedback => 
                prevFeedback.map(item => 
                    item.id === updatedFeedback.id ? updatedFeedback : item
                )
            );
        } catch (error) {
            console.error("Failed to update feedback status", error);
        }
    };


    return (
        <Card title="User Feedback Submissions">
            {loading ? (
                <Spinner />
            ) : (
                <div className="space-y-4">
                    {feedback.length > 0 ? (
                        feedback.map(item => (
                            <div key={item.id} className={`p-4 border rounded-lg dark:border-gray-700 transition-colors ${item.is_actioned ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{item.user_name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(item.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RoleBadge role={item.user_role} />
                                         <Button
                                            size="sm"
                                            variant={item.is_actioned ? 'secondary' : 'ghost'}
                                            onClick={() => handleToggleActioned(item)}
                                            className="flex items-center gap-1"
                                        >
                                            {item.is_actioned ? (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                    Actioned
                                                </>
                                            ) : (
                                                'Mark as Actioned'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <p className="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.content}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No feedback has been submitted yet.</p>
                    )}
                </div>
            )}
        </Card>
    );
};