
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Modal } from './Modal';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { SupabaseService } from '../services/supabaseService';
import { Icons } from '../constants';

export const Feedback: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await SupabaseService.submitFeedback(user.id, user.role, user.name, content);
            setSuccess(true);
            setContent('');
            setTimeout(() => {
                setIsOpen(false);
                setSuccess(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit feedback.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        setContent('');
        setSuccess(false);
        setError('');
        setIsOpen(true);
    };

    return (
        <>
            <Button
                variant="ghost"
                onClick={handleOpen}
                className="w-full flex items-center justify-start space-x-3 p-3 !text-left"
            >
                {Icons.feedback}
                <span>Submit Feedback</span>
            </Button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Submit Feedback">
                {success ? (
                    <div className="text-center p-8">
                        <h3 className="text-xl font-bold text-green-600">Thank you!</h3>
                        <p>Your feedback has been submitted successfully.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Have a suggestion or encountered an issue? Let us know. Your feedback helps us improve MenteeLink.
                        </p>
                        <div>
                            <label htmlFor="feedback-content" className="sr-only">Feedback</label>
                            <textarea
                                id="feedback-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={6}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                placeholder="Type your feedback here..."
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <Spinner size="sm" color="white" /> : 'Submit'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
};