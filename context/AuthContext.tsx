import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AppUser } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isLoggingOut: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<AppUser>) => void;
  refetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          SupabaseService.getCurrentUser()
            .then(currentUser => {
              setUser(currentUser);
            })
            .catch(error => {
              console.error('Error in auth state change handler:', error);
              setUser(null);
            })
            .finally(() => {
              setLoading(false);
            });
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password?: string) => {
    try {
      const { user } = await SupabaseService.signIn(username, password);
      setUser(user);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await SupabaseService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally show an error to the user
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  const updateUser = (updates: Partial<AppUser>) => {
    if (user) {
        const updatedUser = { ...user, ...updates };
        // Fix: Cast updatedUser to AppUser to resolve TypeScript error.
        // The spread operator combined with a partial of a union type (`Partial<AppUser>`)
        // creates a type that TypeScript cannot automatically infer back to the original union type.
        setUser(updatedUser as AppUser);
    }
  };

  const refetchUser = async () => {
    try {
        const currentUser = await SupabaseService.getCurrentUser();
        setUser(currentUser);
    } catch (error) {
        console.error('Error refetching user:', error);
        setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isLoggingOut,
    login,
    logout,
    updateUser,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
