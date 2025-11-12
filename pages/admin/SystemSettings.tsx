
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SupabaseService } from '../../services/supabaseService';
import { InvitationCode } from '../../types';

const TableRowSkeleton: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div></td>
        <td className="px-6 py-4"><div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div></td>
        <td className="px-6 py-4"><div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24"></div></td>
    </tr>
);

export const SystemSettings: React.FC = () => {
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [newCode, setNewCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchCodes = async () => {
        // Only set loading true on initial fetch
        if (codes.length === 0) setLoading(true);
        const data = await SupabaseService.getInvitationCodes();
        setCodes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCodes();
    }, []);

    const handleAddCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCode) return;
        setSubmitting(true);
        await SupabaseService.addInvitationCode(newCode);
        setNewCode('');
        await fetchCodes();
        setSubmitting(false);
    };

    const handleToggleCode = async (code: string) => {
        await SupabaseService.toggleInvitationCode(code);
        await fetchCodes();
    }

    return (
        <div className="space-y-6">
            <Card title="Manage Mentor Invitation Codes">
                <form onSubmit={handleAddCode} className="flex items-end space-x-4 mb-6">
                    <div className="flex-grow">
                        <Input
                            id="new-code"
                            label="New Invitation Code"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            placeholder="e.g., FALL2024"
                        />
                    </div>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add Code'}
                    </Button>
                </form>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Code</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <>
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                </>
                            ) : codes.map(code => (
                                <tr key={code.code} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">{code.code}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${code.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {code.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleToggleCode(code.code)}>
                                            {code.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
