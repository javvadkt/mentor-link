
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { SupabaseService } from '../../services/supabaseService';
import { Mentor } from '../../types';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Icons } from '../../constants';

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </Modal>
  );
};

const TableRowSkeleton: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/4"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div></td>
        <td className="px-6 py-4"><div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24"></div></td>
    </tr>
);

export const ManageMentors: React.FC = () => {
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMentors = async () => {
        setLoading(true);
        const data = await SupabaseService.getAllMentors();
        setMentors(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchMentors();
    }, []);

    const handleRemoveClick = (mentor: Mentor) => {
        setSelectedMentor(mentor);
        setIsConfirmOpen(true);
    };

    const handleConfirmRemove = async () => {
        if (!selectedMentor) return;
        await SupabaseService.removeMentor(selectedMentor.id);
        fetchMentors();
        setIsConfirmOpen(false);
        setSelectedMentor(null);
    };

    const filteredMentors = useMemo(() => {
        if (!searchTerm) return mentors;
        return mentors.filter(mentor =>
            mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mentor.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, mentors]);


    return (
        <>
            <Card title="Manage Mentors">
                <div className="mb-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {Icons.search}
                        </div>
                        <Input
                            id="search-mentors"
                            label=""
                            type="text"
                            placeholder="Search by name or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Username</th>
                                <th scope="col" className="px-6 py-3">Mentees</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <>
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                </>
                            ) : filteredMentors.map(mentor => (
                                <tr key={mentor.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{mentor.name}</td>
                                    <td className="px-6 py-4">{mentor.username}</td>
                                    <td className="px-6 py-4">{mentor.mentees.length}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        <Button variant="danger" size="sm" onClick={() => handleRemoveClick(mentor)}>Remove</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {!loading && filteredMentors.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No mentors found.
                        </div>
                    )}
                </div>
            </Card>
            {selectedMentor && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => { setIsConfirmOpen(false); setSelectedMentor(null); }}
                    onConfirm={handleConfirmRemove}
                    title={`Remove ${selectedMentor.name}`}
                    message={`Are you sure you want to remove this mentor? All of their mentees and associated data will also be removed. This action cannot be undone.`}
                />
            )}
        </>
    );
};
