
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { SupabaseService } from '../../services/supabaseService';
import { Mentee, UserRole, ProgressRecord, PointsLog } from '../../types';
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

const MenteeForm: React.FC<{ mentee?: Mentee; onSave: () => void; onClose: () => void; }> = ({ mentee, onSave, onClose }) => {
    const { user: mentor, refetchUser } = useAuth();
    const [formData, setFormData] = useState({
        name: mentee?.name || '',
        username: mentee?.username || '',
        password: '',
        adno: mentee?.adno || '',
        class: mentee?.class || '',
        photo: mentee?.photo || 'https://picsum.photos/200',
        isCoordinator: mentee?.isCoordinator || false,
    });
    const [photoFile, setPhotoFile] = useState<File | undefined>();
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mentee) {
                // Update
                await SupabaseService.updateMentee(mentee.id, {
                    name: formData.name,
                    username: formData.username,
                    adno: formData.adno,
                    class: formData.class,
                    photo: formData.photo,
                    isCoordinator: formData.isCoordinator,
                    photoFile,
                });
            } else {
                // Create
                if (!mentor) throw new Error("Mentor not found");
                await SupabaseService.addMentee(mentor.id, {
                    username: formData.username,
                    password: formData.password,
                    name: formData.name,
                    adno: formData.adno,
                    class: formData.class,
                    photo: formData.photo,
                    isCoordinator: formData.isCoordinator,
                    personalDetails: { dob: '', bloodGroup: '' },
                    academicDetails: { gpa: 0, major: '' },
                    photoFile,
                });
                // After adding a mentee, Supabase's signUp function temporarily changes the session.
                // Although the session is restored in the backend service, the UI context needs a manual refresh.
                await refetchUser();
            }
            onSave();
        } catch (error) {
            console.error("Failed to save mentee", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="name" name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
                <Input id="username" name="username" label="Username" value={formData.username} onChange={handleChange} required />
                {!mentee && <Input id="password" name="password" label="Initial Password" type="password" value={formData.password} onChange={handleChange} required />}
                <Input id="adno" name="adno" label="Admission No." value={formData.adno} onChange={handleChange} required />
                <Input id="class" name="class" label="Class" value={formData.class} onChange={handleChange} required />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</label>
                <div className="mt-1 flex items-center space-x-4">
                    <img
                        src={formData.photo}
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

            <div className="flex items-center space-x-2">
                <input type="checkbox" id="isCoordinator" name="isCoordinator" checked={formData.isCoordinator} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                <label htmlFor="isCoordinator" className="text-sm font-medium text-gray-700 dark:text-gray-300">Assign 'Coordinator' Title</label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Mentee'}</Button>
            </div>
        </form>
    );
};

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; onAddItem?: () => void; }> = ({ label, id, onAddItem, ...props }) => (
    <div>
        <div className="flex justify-between items-center">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            {onAddItem && (
                 <button type="button" onClick={onAddItem} className="text-sm text-primary hover:underline flex items-center gap-1 p-1 rounded-md hover:bg-primary/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0
0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add Item
                </button>
            )}
        </div>
        <div className="mt-1">
            <textarea id={id} rows={3} className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" {...props} />
        </div>
    </div>
);


const MenteeDetailsForm: React.FC<{ mentee: Mentee; onSave: () => void; onClose: () => void; }> = ({ mentee, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        dob: mentee.personalDetails.dob || '',
        bloodGroup: mentee.personalDetails.bloodGroup || '',
        address: mentee.personalDetails.address || '',
        parentContact: mentee.personalDetails.parentContact || '',
        hobbies: mentee.personalDetails.hobbies || '',
        gpa: mentee.academicDetails.gpa || 0,
        major: mentee.academicDetails.major || '',
        strengths: mentee.academicDetails.strengths || '',
        weaknesses: mentee.academicDetails.weaknesses || '',
        shortTermGoals: mentee.mentorshipDetails?.shortTermGoals || '',
        longTermGoals: mentee.mentorshipDetails?.longTermGoals || '',
        motivations: mentee.mentorshipDetails?.motivations || '',
        challenges: mentee.mentorshipDetails?.challenges || '',
        communicationStyle: mentee.mentorshipDetails?.communicationStyle || '',
        learningPreference: mentee.mentorshipDetails?.learningPreference || '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumberInput = (e.target as HTMLInputElement).type === 'number';
        setFormData(prev => ({ ...prev, [name]: isNumberInput ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await SupabaseService.updateMentee(mentee.id, {
                personalDetails: {
                    dob: formData.dob,
                    bloodGroup: formData.bloodGroup,
                    address: formData.address,
                    parentContact: formData.parentContact,
                    hobbies: formData.hobbies,
                },
                academicDetails: {
                    gpa: formData.gpa,
                    major: formData.major,
                    strengths: formData.strengths,
                    weaknesses: formData.weaknesses,
                },
                mentorshipDetails: {
                    shortTermGoals: formData.shortTermGoals,
                    longTermGoals: formData.longTermGoals,
                    motivations: formData.motivations,
                    challenges: formData.challenges,
                    communicationStyle: formData.communicationStyle,
                    learningPreference: formData.learningPreference,
                }
            });
            onSave();
        } catch (error) {
            console.error("Failed to save mentee details", error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <section>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4 dark:border-gray-600">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input id="dob" name="dob" label="Date of Birth" type="date" value={formData.dob} onChange={handleChange} />
                    <Input id="bloodGroup" name="bloodGroup" label="Blood Group" value={formData.bloodGroup} onChange={handleChange} />
                    <Input id="address" name="address" label="Address" value={formData.address} onChange={handleChange} />
                    <Input id="parentContact" name="parentContact" label="Parent Contact" value={formData.parentContact} onChange={handleChange} />
                    <div className="md:col-span-2">
                        <TextArea id="hobbies" name="hobbies" label="Hobbies & Interests" value={formData.hobbies} onChange={handleChange} />
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4 pt-4 dark:border-gray-600">Academic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input id="gpa" name="gpa" label="GPA" type="number" step="0.1" value={formData.gpa} onChange={handleChange} />
                    <Input id="major" name="major" label="Major/Stream" value={formData.major} onChange={handleChange} />
                    <div className="md:col-span-2">
                        <TextArea id="strengths" name="strengths" label="Identified Strengths" value={formData.strengths} onChange={handleChange} />
                    </div>
                    <div className="md:col-span-2">
                        <TextArea id="weaknesses" name="weaknesses" label="Areas for Development" value={formData.weaknesses} onChange={handleChange} />
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4 pt-4 dark:border-gray-600">Goals & Mentorship Style</h3>
                <div className="space-y-4">
                     <TextArea id="shortTermGoals" name="shortTermGoals" label="Short-Term Goals (6-12 months)" value={formData.shortTermGoals} onChange={handleChange} />
                     <TextArea id="longTermGoals" name="longTermGoals" label="Long-Term Goals (2-5 years)" value={formData.longTermGoals} onChange={handleChange} />
                     <TextArea id="motivations" name="motivations" label="Key Motivations" value={formData.motivations} onChange={handleChange} />
                     <TextArea id="challenges" name="challenges" label="Current Challenges & Obstacles" value={formData.challenges} onChange={handleChange} />
                     <TextArea id="communicationStyle" name="communicationStyle" label="Preferred Communication Style" value={formData.communicationStyle} onChange={handleChange} />
                     <TextArea id="learningPreference" name="learningPreference" label="Learning Preferences" value={formData.learningPreference} onChange={handleChange} />
                </div>
            </section>

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Details'}</Button>
            </div>
        </form>
    );
};

const ProgressRecordForm: React.FC<{
    record?: Partial<ProgressRecord>;
    menteeId: string;
    onSave: () => void;
    onCancel: () => void;
}> = ({ record, menteeId, onSave, onCancel }) => {
    const { user: mentor } = useAuth();
    const [formData, setFormData] = useState({
        meetingDate: record?.meetingDate || new Date().toISOString().split('T')[0],
        keyTopicsDiscussed: record?.keyTopicsDiscussed || '',
        menteeActionItems: record?.menteeActionItems || '',
        mentorActionItems: record?.mentorActionItems || '',
        milestonesWins: record?.milestonesWins || '',
        keyInsights: record?.keyInsights || '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddItem = (fieldName: keyof typeof formData) => {
        setFormData(prev => {
            const currentValue = prev[fieldName] || '';
            const lines = currentValue.split('\n').filter(line => line.trim() !== '');
            const lastLine = lines[lines.length - 1] || '';
            // Find the last number in a line like "1." or "1 "
            const match = lastLine.match(/^(\d+)[.\s) ]*/);
            const newNumber = match ? parseInt(match[1], 10) + 1 : lines.length + 1;
            
            const newItem = `${newNumber}. `;
            // Add a newline only if there's existing content
            const newValue = currentValue.trim() ? `${currentValue}\n${newItem}` : newItem;
    
            return { ...prev, [fieldName]: newValue };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (record && 'id' in record) { // It's an existing record
                await SupabaseService.updateProgressRecord(record.id!, formData);
            } else { // New record
                if (!mentor) throw new Error("Mentor not found");
                await SupabaseService.addProgressRecord({ ...formData, menteeId, mentorId: mentor.id });
            }
            onSave();
        } catch (error) {
            console.error("Failed to save progress record", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="meetingDate" name="meetingDate" label="Meeting Date" type="date" value={formData.meetingDate} onChange={handleChange} required />
            <TextArea id="keyTopicsDiscussed" name="keyTopicsDiscussed" label="Key Topics Discussed" value={formData.keyTopicsDiscussed} onChange={handleChange} onAddItem={() => handleAddItem('keyTopicsDiscussed')} />
            <TextArea id="menteeActionItems" name="menteeActionItems" label="Action Items (for Mentee)" value={formData.menteeActionItems} onChange={handleChange} onAddItem={() => handleAddItem('menteeActionItems')} />
            <TextArea id="mentorActionItems" name="mentorActionItems" label="Action Items (for Mentor)" value={formData.mentorActionItems} onChange={handleChange} onAddItem={() => handleAddItem('mentorActionItems')} />
            <TextArea id="milestonesWins" name="milestonesWins" label="Milestones & Wins" value={formData.milestonesWins} onChange={handleChange} onAddItem={() => handleAddItem('milestonesWins')} />
            <TextArea id="keyInsights" name="keyInsights" label="Key Insights / Challenges" value={formData.keyInsights} onChange={handleChange} onAddItem={() => handleAddItem('keyInsights')} />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Entry'}</Button>
            </div>
        </form>
    );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    if (!text || text.trim() === '') return <p className="text-gray-500 dark:text-gray-400 italic">Not specified.</p>;
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length <= 1) {
        return <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{text}</p>;
    }

    return (
        <ul className="list-none space-y-1 text-gray-800 dark:text-gray-200">
            {lines.map((line, index) => (
                <li key={index} className="flex items-start">
                    <span className="mr-3 text-primary">&bull;</span>
                    {/* Remove numbering like "1. " or "1) " */}
                    <span>{line.replace(/^\s*\d+[.) ]\s*/, '')}</span> 
                </li>
            ))}
        </ul>
    );
};

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
    const hasValue = children !== null && children !== undefined && children !== '';
    return (
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <div className="mt-1 text-gray-800 dark:text-gray-200">
                {hasValue ? children : <span className="italic text-gray-500 dark:text-gray-400">Not specified.</span>}
            </div>
        </div>
    );
};

const MenteeDetailsView: React.FC<{ mentee: Mentee }> = ({ mentee }) => {
    return (
        <div className="space-y-6">
            <section>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4 dark:border-gray-600">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Date of Birth">{mentee.personalDetails.dob}</DetailItem>
                    <DetailItem label="Blood Group">{mentee.personalDetails.bloodGroup}</DetailItem>
                    <DetailItem label="Address">{mentee.personalDetails.address}</DetailItem>
                    <DetailItem label="Parent Contact">{mentee.personalDetails.parentContact}</DetailItem>
                    <div className="md:col-span-2">
                        <DetailItem label="Hobbies & Interests">
                           <FormattedText text={mentee.personalDetails.hobbies || ''} />
                        </DetailItem>
                    </div>
                </div>
            </section>
            
            <section>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4 pt-4 dark:border-gray-600">Academic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="GPA">{mentee.academicDetails.gpa}</DetailItem>
                    <DetailItem label="Major/Stream">{mentee.academicDetails.major}</DetailItem>
                     <div className="md:col-span-2">
                        <DetailItem label="Identified Strengths">
                           <FormattedText text={mentee.academicDetails.strengths || ''} />
                        </DetailItem>
                    </div>
                    <div className="md:col-span-2">
                        <DetailItem label="Areas for Development">
                           <FormattedText text={mentee.academicDetails.weaknesses || ''} />
                        </DetailItem>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4 pt-4 dark:border-gray-600">Goals & Mentorship Style</h3>
                <div className="space-y-4">
                     <DetailItem label="Short-Term Goals (6-12 months)">
                         <FormattedText text={mentee.mentorshipDetails?.shortTermGoals || ''} />
                     </DetailItem>
                     <DetailItem label="Long-Term Goals (2-5 years)">
                         <FormattedText text={mentee.mentorshipDetails?.longTermGoals || ''} />
                     </DetailItem>
                     <DetailItem label="Key Motivations">
                         <FormattedText text={mentee.mentorshipDetails?.motivations || ''} />
                     </DetailItem>
                     <DetailItem label="Current Challenges & Obstacles">
                         <FormattedText text={mentee.mentorshipDetails?.challenges || ''} />
                     </DetailItem>
                     <DetailItem label="Preferred Communication Style">
                         <FormattedText text={mentee.mentorshipDetails?.communicationStyle || ''} />
                     </DetailItem>
                     <DetailItem label="Learning Preferences">
                         <FormattedText text={mentee.mentorshipDetails?.learningPreference || ''} />
                     </DetailItem>
                </div>
            </section>
        </div>
    );
};

const ProgressLog: React.FC<{ mentee: Mentee; onClose: () => void; }> = ({ mentee, onClose }) => {
    const [records, setRecords] = useState<ProgressRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<Partial<ProgressRecord> | null>(null);

    const fetchRecords = async () => {
        setLoading(true);
        const data = await SupabaseService.getProgressRecordsForMentee(mentee.id);
        setRecords(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchRecords();
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mentee.id]);

    const handleSave = () => {
        setEditingRecord(null);
        fetchRecords();
    };

    const handleDelete = async (recordId: string) => {
        if (window.confirm("Are you sure you want to delete this log entry?")) {
            await SupabaseService.deleteProgressRecord(recordId);
            fetchRecords();
        }
    };

    const getEntryTitle = (text: string) => {
        if (!text || text.trim() === '') return 'Log Entry';
        // Remove list-like prefixes for a cleaner title, take first line
        const firstLine = text.trim().split('\n')[0];
        const cleanedText = firstLine.replace(/^\s*\d+[.)-]?\s*/, '').trim();
        const words = cleanedText.split(/\s+/);
        if (words.length > 8) {
            return words.slice(0, 8).join(' ') + '...';
        }
        return cleanedText;
    };

    if (loading) {
        return <Spinner />;
    }

    if (editingRecord) {
        return <ProgressRecordForm record={editingRecord} menteeId={mentee.id} onSave={handleSave} onCancel={() => setEditingRecord(null)} />;
    }

    return (
        <div className="space-y-4">
            <div className="text-right">
                <Button onClick={() => setEditingRecord({})} className="flex items-center gap-2 ml-auto">
                    {Icons.add}
                    Add New Log Entry
                </Button>
            </div>
            {records.length > 0 ? (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {records.map(record => (
                        <Card key={record.id} className="bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-md text-gray-900 dark:text-white">
                                        {getEntryTitle(record.keyTopicsDiscussed)}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {new Date(record.meetingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingRecord(record)}>Edit</Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(record.id)}>Delete</Button>
                                </div>
                            </div>
                            <div className="mt-4 space-y-4 text-sm">
                                <div className="border-t dark:border-gray-600 pt-3">
                                    <h5 className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider mb-2">Topics Discussed</h5>
                                    <FormattedText text={record.keyTopicsDiscussed} />
                                </div>
                                {record.menteeActionItems && (
                                     <div className="border-t dark:border-gray-600 pt-3">
                                        <h5 className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider mb-2">Mentee Action Items</h5>
                                        <FormattedText text={record.menteeActionItems} />
                                    </div>
                                )}
                                {record.mentorActionItems && (
                                     <div className="border-t dark:border-gray-600 pt-3">
                                        <h5 className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider mb-2">Mentor Action Items</h5>
                                        <FormattedText text={record.mentorActionItems} />
                                    </div>
                                )}
                                {record.milestonesWins && (
                                     <div className="border-t dark:border-gray-600 pt-3">
                                        <h5 className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider mb-2">Milestones & Wins</h5>
                                        <FormattedText text={record.milestonesWins} />
                                    </div>
                                )}
                                {record.keyInsights && (
                                     <div className="border-t dark:border-gray-600 pt-3">
                                        <h5 className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider mb-2">Key Insights / Challenges</h5>
                                        <FormattedText text={record.keyInsights} />
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-8">No progress logs found. Click "Add New Log Entry" to start.</p>
            )}
            <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                 <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
        </div>
    );
};

const PointsLogView: React.FC<{ mentee: Mentee; onUpdate: () => void; }> = ({ mentee, onUpdate }) => {
    const [logs, setLogs] = useState<PointsLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [bonusPoints, setBonusPoints] = useState(10);
    const [bonusReason, setBonusReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        const data = await SupabaseService.getPointsLogForMentee(mentee.id);
        setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [mentee.id]);

    const handleAddBonus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bonusPoints === 0 || !bonusReason.trim()) return;
        setSubmitting(true);
        await SupabaseService.addPoints(mentee.id, bonusPoints, bonusReason);
        setBonusPoints(10);
        setBonusReason('');
        await fetchLogs();
        onUpdate();
        setSubmitting(false);
    };

    if (loading) return <Spinner />;
    
    return (
        <div className="space-y-6">
            <div className="text-center border-2 border-primary rounded-lg p-4">
                <p className="text-gray-500 dark:text-gray-400">Total Points</p>
                <p className="text-4xl font-bold text-primary">{mentee.points}</p>
            </div>

            <Card title="Add Bonus Points">
                <form onSubmit={handleAddBonus} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-1">
                            <Input id="bonus-points" label="Points" type="number" value={String(bonusPoints)} onChange={e => setBonusPoints(parseInt(e.target.value, 10) || 0)} />
                        </div>
                        <div className="md:col-span-2">
                             <Input id="bonus-reason" label="Reason" value={bonusReason} onChange={e => setBonusReason(e.target.value)} placeholder="e.g., excellent participation" required />
                        </div>
                    </div>
                    <div className="text-right">
                        <Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Points'}</Button>
                    </div>
                </form>
            </Card>
            
            <h4 className="text-lg font-semibold pt-4 border-t dark:border-gray-700">Points History</h4>
            {logs.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto p-1">
                    {logs.map(log => (
                        <li key={log.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{log.reason}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                            </div>
                             <div className={`px-3 py-1 rounded-md ${log.points >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                                <p className={`font-semibold ${log.points >= 0 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>{log.points >= 0 ? `+${log.points}` : log.points}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 py-4">No points history found.</p>
            )}
        </div>
    );
};

const MenteeListItemSkeleton: React.FC = () => (
    <Card className="p-4 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 items-center">
            <div className="col-span-1 md:col-span-3 flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div>
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-1"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 md:hidden"></div>
                </div>
            </div>
            <div className="hidden md:block md:col-span-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            </div>
            <div className="col-span-1 md:col-span-2"></div>
            <div className="col-span-1 md:col-span-4 flex flex-col md:flex-row items-stretch md:items-center justify-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                 <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                 <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </div>
        </div>
    </Card>
);


export const MenteeManagement: React.FC = () => {
    const { user } = useAuth();
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMentee, setEditingMentee] = useState<Mentee | undefined>(undefined);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [viewingMentee, setViewingMentee] = useState<Mentee | undefined>(undefined);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [progressMentee, setProgressMentee] = useState<Mentee | undefined>(undefined);
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [activeProgressTab, setActiveProgressTab] = useState<'log' | 'points'>('log');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);


    const fetchMentees = async () => {
        if (!user) return;
        setLoading(true);
        const data = await SupabaseService.getMenteesByMentorId(user.id);
        setMentees(data);
        
        // If the progress modal is open, update its data too
        if (progressMentee) {
            const updatedMentee = data.find(m => m.id === progressMentee.id);
            if (updatedMentee) {
                setProgressMentee(updatedMentee);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMentees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleSave = () => {
        setIsModalOpen(false);
        setEditingMentee(undefined);
        setIsDetailsModalOpen(false);
        setViewingMentee(undefined);
        fetchMentees();
    };

    const handleRemoveClick = (mentee: Mentee) => {
        setSelectedMentee(mentee);
        setIsConfirmOpen(true);
    };

    const handleConfirmRemove = async () => {
        if (!selectedMentee) return;
        await SupabaseService.removeMentee(selectedMentee.id);
        fetchMentees();
        setIsConfirmOpen(false);
        setSelectedMentee(null);
    };

    const handleOpenDetailsModal = (mentee: Mentee) => {
        setViewingMentee(mentee);
        setIsEditingDetails(false);
        setIsDetailsModalOpen(true);
    };
    
    const handleCloseDetailsModal = () => {
        setIsDetailsModalOpen(false);
        setViewingMentee(undefined);
        setIsEditingDetails(false);
    };

    const handleOpenProgressModal = (mentee: Mentee) => {
        setProgressMentee(mentee);
        setActiveProgressTab('points');
        setIsProgressModalOpen(true);
    };

    const handleOpenEditModal = (mentee: Mentee) => {
        setEditingMentee(mentee);
        setIsModalOpen(true);
    };
    
    const handleOpenAddModal = () => {
        setEditingMentee(undefined);
        setIsModalOpen(true);
    };

    return (
        <>
            <Card title="Manage My Mentees">
                <div className="flex justify-end mb-4">
                    <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                         {Icons.add}
                        Add New Mentee
                    </Button>
                </div>

                {loading ? (
                    <div className="space-y-4 md:mt-4">
                        <MenteeListItemSkeleton />
                        <MenteeListItemSkeleton />
                    </div>
                ) : mentees.length > 0 ? (
                    <>
                        {/* List Header for larger screens */}
                        <div className="hidden md:grid md:grid-cols-10 gap-4 px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                            <div className="col-span-3">Mentee</div>
                            <div className="col-span-1">Class</div>
                            <div className="col-span-2">Coordinator</div>
                            <div className="col-span-4 text-right">Actions</div>
                        </div>

                        {/* Mentees List */}
                        <div className="space-y-4 md:mt-4">
                            {mentees.map(mentee => (
                                <Card key={mentee.id} className="p-4 transition-shadow hover:shadow-md bg-white dark:bg-gray-800/50">
                                    <div className="grid grid-cols-1 md:grid-cols-10 gap-4 items-center">
                                        {/* Mentee Info */}
                                        <div className="col-span-1 md:col-span-3 flex items-center space-x-4">
                                            <img src={mentee.photo} alt={mentee.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"/>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{mentee.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 md:hidden">Class: {mentee.class}</p>
                                            </div>
                                        </div>
                                        
                                        {/* Class (Desktop only) */}
                                        <div className="hidden md:block md:col-span-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{mentee.class}</p>
                                        </div>

                                        {/* Coordinator Status */}
                                        <div className="col-span-1 md:col-span-2">
                                            <p className="md:hidden text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Coordinator</p>
                                            {mentee.isCoordinator && (
                                                <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 w-fit">
                                                    {Icons.star} Coordinator
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 md:col-span-4 flex flex-col items-stretch gap-y-2 md:flex-row md:flex-wrap md:items-center justify-start md:justify-end md:gap-x-4 md:gap-y-2 border-t dark:border-gray-700 md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                                            <div className="flex items-center justify-start md:justify-end gap-4">
                                                <button className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary" onClick={() => handleOpenEditModal(mentee)}>Edit</button>
                                                <button className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary" onClick={() => handleOpenDetailsModal(mentee)}>Details</button>
                                            </div>
                                            <div className="flex items-center justify-start md:justify-end gap-2">
                                                <Button className="bg-green-500 hover:bg-green-600 text-white flex-1 md:flex-none" size="sm" onClick={() => handleOpenProgressModal(mentee)}>Progress</Button>
                                                <Button variant="danger" size="sm" className="flex-1 md:flex-none" onClick={() => handleRemoveClick(mentee)}>Remove</Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                     <div className="text-center py-16">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-3-5.197m-3 0a5.995 5.995 0 00-3 5.197" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No mentees found</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new mentee.</p>
                        <div className="mt-6">
                            <Button onClick={handleOpenAddModal} className="flex items-center gap-2 mx-auto">
                                {Icons.add}
                                Add New Mentee
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMentee ? 'Edit Mentee' : 'Add New Mentee'}>
                <MenteeForm mentee={editingMentee} onSave={handleSave} onClose={() => setIsModalOpen(false)} />
            </Modal>
            
            {viewingMentee && (
                <Modal isOpen={isDetailsModalOpen} onClose={handleCloseDetailsModal} title={`Details for ${viewingMentee.name}`}>
                   {isEditingDetails ? (
                        <MenteeDetailsForm 
                            mentee={viewingMentee} 
                            onSave={handleSave} 
                            onClose={() => setIsEditingDetails(false)} 
                        />
                   ) : (
                       <div className="space-y-6">
                           <MenteeDetailsView mentee={viewingMentee} />
                            <div className="flex justify-end space-x-2 pt-4 mt-4 border-t dark:border-gray-700">
                                <Button variant="ghost" onClick={handleCloseDetailsModal}>Close</Button>
                                <Button onClick={() => setIsEditingDetails(true)}>Edit</Button>
                            </div>
                       </div>
                   )}
                </Modal>
            )}

            {progressMentee && (
                 <Modal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} title={`Progress for ${progressMentee.name}`}>
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveProgressTab('log')}
                                className={`${activeProgressTab === 'log' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                Progress Log
                            </button>
                            <button
                                onClick={() => setActiveProgressTab('points')}
                                className={`${activeProgressTab === 'points' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                Points History
                            </button>
                        </nav>
                    </div>
                    {activeProgressTab === 'log' ? (
                        <ProgressLog mentee={progressMentee} onClose={() => setIsProgressModalOpen(false)} />
                    ) : (
                        <PointsLogView mentee={progressMentee} onUpdate={fetchMentees} />
                    )}
                </Modal>
            )}
            
            {selectedMentee && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => { setIsConfirmOpen(false); setSelectedMentee(null); }}
                    onConfirm={handleConfirmRemove}
                    title={`Remove ${selectedMentee.name}`}
                    message="Are you sure you want to remove this mentee? This will permanently delete their account and all associated data."
                />
            )}
        </>
    );
};
