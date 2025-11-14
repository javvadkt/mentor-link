

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

const AddMentorForm: React.FC<{ onSave: () => void; onClose: () => void; }> = ({ onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
    });
    const [photoFile, setPhotoFile] = useState<File | undefined>();
    const [photoPreview, setPhotoPreview] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await SupabaseService.addMentorByAdmin({
                ...formData,
                photoFile,
            });
            onSave();
        } catch (err: any) {
            setError(err.message || "Failed to add mentor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Input id="name" name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
            <Input id="username" name="username" label="Username" value={formData.username} onChange={handleChange} required />
            <Input id="password" name="password" label="Password" type="password" value={formData.password} onChange={handleChange} required />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</label>
                <div className="mt-1 flex items-center space-x-4">
                    <img
                        src={photoPreview || `https://ui-avatars.com/api/?name=${(formData.name || 'M').replace(/\s/g, '+')}&background=4f46e5&color=fff`}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover bg-gray-200 dark:bg-gray-600"
                    />
                     <label
                        htmlFor="photo-upload"
                        className="cursor-pointer bg-white dark:bg-gray-700 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                        <span>Upload Image</span>
                        <input
                            type="file"
                            id="photo-upload"
                            name="photo"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </label>
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Mentor'}</Button>
            </div>
        </form>
    );
};

export const ManageMentors: React.FC = () => {
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="relative w-full md:max-w-sm">
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
                            className="pl-10 w-full"
                        />
                    </div>
                    <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 w-full md:w-auto">
                        {Icons.add}
                        Add New Mentor
                    </Button>
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
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        <div className="flex items-center space-x-3">
                                            <img
                                                src={mentor.photo || `https://ui-avatars.com/api/?name=${(mentor.name || mentor.username).replace(/\s/g, '+')}&background=4f46e5&color=fff`}
                                                alt={mentor.name}
                                                className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-600"
                                            />
                                            <span>{mentor.name}</span>
                                        </div>
                                    </td>
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
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Mentor">
                <AddMentorForm onSave={() => { setIsAddModalOpen(false); fetchMentors(); }} onClose={() => setIsAddModalOpen(false)} />
            </Modal>
        </>
    );
};