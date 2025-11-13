
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { SupabaseService } from '../../services/supabaseService';
import { Mentor } from '../../types';
import { Icons } from '../../constants';

export const MentorAccount: React.FC = () => {
    const { user, updateUser, refetchUser } = useAuth();
    const mentor = user as Mentor;

    const [name, setName] = useState(mentor?.name || '');
    const [username, setUsername] = useState(mentor?.username || '');
    const [photo, setPhoto] = useState(mentor?.photo || '');
    const [photoFile, setPhotoFile] = useState<File | undefined>();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError('');
        setProfileSuccess('');
        try {
            if (!user) throw new Error("User not found");
            
            await SupabaseService.updateMentorProfile(user.id, { name, username, photoFile });
            await refetchUser();

            setProfileSuccess('Profile updated successfully!');
        } catch (err: any) {
            setProfileError(err.message || 'Failed to update profile.');
        } finally {
            setProfileLoading(false);
        }
    };
    
    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters long.");
            return;
        }

        setPasswordLoading(true);
        try {
            if (!user) throw new Error("User not found");
            await SupabaseService.updateMentorPassword(user.id, currentPassword, newPassword);
            setPasswordSuccess('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPasswordError(err.message || 'Failed to update password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card title="Account Information">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                     {profileError && <p className="text-red-500 text-sm text-center">{profileError}</p>}
                     {profileSuccess && <p className="text-green-500 text-sm text-center">{profileSuccess}</p>}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</label>
                        <div className="mt-1 flex items-center space-x-4">
                            <img
                                src={photo || `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=4f46e5&color=fff`}
                                alt="Preview"
                                className="w-24 h-24 rounded-full object-cover bg-gray-200 dark:bg-gray-600"
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

                    <Input id="name" label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                    <Input id="username" label="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                    <div className="text-right pt-2">
                        <Button type="submit" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                </form>
            </Card>

            <Card title="Change Password">
                 <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    {passwordError && <p className="text-red-500 text-sm text-center">{passwordError}</p>}
                    {passwordSuccess && <p className="text-green-500 text-sm text-center">{passwordSuccess}</p>}
                    <Input id="currentPassword" label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Not required by Supabase" disabled/>
                    <Input id="newPassword" label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    <Input id="confirmPassword" label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    <div className="text-right pt-2">
                        <Button type="submit" disabled={passwordLoading}>{passwordLoading ? 'Updating...' : 'Update Password'}</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
