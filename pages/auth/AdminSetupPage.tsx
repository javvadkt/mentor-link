import React, { useState } from 'react';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SupabaseService } from '../../services/supabaseService';
import { APP_NAME } from '../../constants';

interface AdminSetupPageProps {
  onSwitchToLogin: () => void;
}

export const AdminSetupPage: React.FC<AdminSetupPageProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('admin');
  const [name, setName] = useState('Administrator');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await SupabaseService.registerAdmin(username, password, name, secretCode);
      setSuccess('Admin account created successfully! You can now log in.');
    } catch (err: any) {
      setError(err.message || 'Failed to create admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-4">
        <h1 className="text-4xl font-bold text-center mb-6 text-primary">{APP_NAME}</h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-semibold text-center">First-Time Admin Setup</h2>
            <p className="text-sm text-center text-gray-500">Create the initial administrator account for the platform.</p>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center">{success}</p>}
            <Input id="name" label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} required />
            <Input id="username" label="Admin Username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            <Input id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Input id="secretCode" label="Admin Secret Code" type="password" value={secretCode} onChange={e => setSecretCode(e.target.value)} required />
            <div className="text-right">
                <p className="text-xs text-gray-400">Hint: SUPER_ADMIN_SETUP_2024</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Admin Account'}
            </Button>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              Finished setup?{' '}
              <button type="button" onClick={onSwitchToLogin} className="font-medium text-primary hover:text-indigo-500">
                Return to Login
              </button>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};
