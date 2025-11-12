import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { UserRole } from './types';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AdminPortal } from './pages/admin/AdminPortal';
import { MentorPortal } from './pages/mentor/MentorPortal';
import { MenteePortal } from './pages/mentee/MenteePortal';
import { Spinner } from './components/Spinner';
import { AdminSetupPage } from './pages/auth/AdminSetupPage';

const AuthNavigator: React.FC = () => {
    const [view, setView] = useState<'login' | 'register' | 'adminSetup'>('login');

    if (view === 'register') {
        return <RegisterPage onSwitchToLogin={() => setView('login')} />;
    }
    if (view === 'adminSetup') {
        return <AdminSetupPage onSwitchToLogin={() => setView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setView('register')} onSwitchToAdminSetup={() => setView('adminSetup')} />;
};

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Spinner size="lg" />
        </div>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return <AdminPortal />;
    case UserRole.MENTOR:
      return <MentorPortal />;
    case UserRole.MENTEE:
      return <MenteePortal />;
    default:
      return <AuthNavigator />;
  }
};

export default App;