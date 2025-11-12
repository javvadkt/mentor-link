
import React, { useState } from 'react';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SupabaseService } from '../../services/supabaseService';
import { APP_NAME } from '../../constants';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await SupabaseService.registerMentor(username, password, name, invitationCode);
      setSuccess('Registration successful! You can now log in.');
    } catch (err: any) {
      setError(err.message || 'Failed to register.');
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
            <h2 className="text-2xl font-semibold text-center">Mentor Registration</h2>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center">{success}</p>}
            <Input id="name" label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} required />
            <Input id="username" label="Username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            <Input id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Input id="confirmPassword" label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            <Input id="invitationCode" label="Invitation Code" type="text" value={invitationCode} onChange={e => setInvitationCode(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </Button>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button type="button" onClick={onSwitchToLogin} className="font-medium text-primary hover:text-indigo-500">
                Login here
              </button>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};
