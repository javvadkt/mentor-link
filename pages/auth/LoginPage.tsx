import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { APP_NAME } from '../../constants';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToAdminSetup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister, onSwitchToAdminSetup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Supabase uses email for login, we'll derive it from username
      await login(username, password);
    } catch (err: any) {
      if (err.message && err.message.includes('Invalid login credentials')) {
          setError('Invalid username or password. Please check your credentials and try again.');
      } else if (err.message && err.message.includes('Profile not found')) {
          setError('Login successful, but your user profile could not be found. Please contact an administrator.');
      } else {
          setError(err.message || 'Failed to login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-4">
        <h1 className="text-4xl font-bold text-center mb-6 text-primary">{APP_NAME}</h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">Login</h2>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Input id="username" label="Username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            <Input id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you a Mentor?{' '}
                <button type="button" onClick={onSwitchToRegister} className="font-medium text-primary hover:text-indigo-500">
                    Register here
                </button>
                </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};