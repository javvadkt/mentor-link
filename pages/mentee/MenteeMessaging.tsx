
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SupabaseService } from '../../services/supabaseService';
import { Mentor, Mentee, Message } from '../../types';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';

type ChatTarget = 'mentor' | 'group';

const ChatSkeleton: React.FC<{ isCoordinator: boolean }> = ({ isCoordinator }) => (
    <div className="flex flex-col md:flex-row h-[calc(100vh-10rem)] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
        {isCoordinator && (
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r dark:border-gray-700 flex flex-col h-48 md:h-full">
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
                <div className="overflow-y-auto flex-grow p-4 space-y-4">
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        )}
        <div className={isCoordinator ? "w-full md:w-2/3 flex flex-col flex-grow" : "w-full flex flex-col flex-grow"}>
            <div className="p-4 border-b dark:border-gray-700">
                 <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/5"></div>
                <div className="h-12 bg-primary/20 rounded-lg w-1/2 self-end ml-auto"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/5"></div>
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex gap-2">
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded flex-grow"></div>
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </div>
        </div>
    </div>
);

export const MenteeMessaging: React.FC = () => {
    const { user } = useAuth();
    const mentee = user as Mentee;
    const [mentor, setMentor] = useState<Mentor | null>(null);
    const [chatTarget, setChatTarget] = useState<ChatTarget>('mentor');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const getTargetId = () => {
        if (chatTarget === 'mentor') return mentor?.id;
        if (chatTarget === 'group') return `group-${mentor?.id}`;
        return '';
    };

    useEffect(() => {
        const fetchMentor = async () => {
            if (mentee) {
                const mentorData = await SupabaseService.getUserById(mentee.mentorId).then(user => user as Mentor);
                setMentor(mentorData);
                setLoading(false);
            }
        };
        fetchMentor();
    }, [mentee]);
    
    useEffect(() => {
        const fetchMessages = async () => {
            const targetId = getTargetId();
            if (mentee && targetId) {
                const data = await SupabaseService.getMessages(mentee.id, targetId);
                setMessages(data);
            }
        };
        fetchMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mentee, chatTarget, mentor]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetId = getTargetId();
        if (!newMessage.trim() || !mentee || !targetId) return;
        const sentMessage = await SupabaseService.sendMessage(mentee.id, targetId, newMessage);
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
    };
    
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) return <ChatSkeleton isCoordinator={mentee.isCoordinator} />;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-10rem)] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {mentee.isCoordinator && (
                <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r dark:border-gray-700 flex flex-col h-48 md:h-full">
                    <div className="p-4 border-b dark:border-gray-700">
                        <h3 className="font-semibold">Chats</h3>
                    </div>
                    <ul className="overflow-y-auto flex-grow">
                        <li>
                            <button onClick={() => setChatTarget('mentor')} className={`w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-gray-700 ${chatTarget === 'mentor' ? 'bg-gray-200 dark:bg-gray-900' : ''}`}>
                                Chat with {mentor?.name}
                            </button>
                        </li>
                        <li>
                            <button onClick={() => setChatTarget('group')} className={`w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-gray-700 ${chatTarget === 'group' ? 'bg-gray-200 dark:bg-gray-900' : ''}`}>
                                Group Announcement
                            </button>
                        </li>
                    </ul>
                </div>
            )}
            <div className={mentee.isCoordinator ? "w-full md:w-2/3 flex flex-col flex-grow" : "w-full flex flex-col flex-grow"}>
                <div className="p-4 border-b dark:border-gray-700">
                    <h3 className="font-semibold">{chatTarget === 'mentor' ? mentor?.name : 'Group Announcement'}</h3>
                </div>
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.senderId === mentee?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.senderId === mentee?.id ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <p className="break-words">{msg.content}</p>
                                <p className="text-xs opacity-75 mt-1 text-right">{formatTime(msg.timestamp)}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-700 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full"
                    />
                    <Button type="submit">Send</Button>
                </form>
            </div>
        </div>
    );
};
