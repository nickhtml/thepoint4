import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface User {
  id: string;
  email: string;
  name: string;
  is_admin?: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
        
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser({ 
           id: userId, 
           email, 
           name: data.first_name || email,
           is_admin: data.is_admin === true || userId === '85DcnhXk0Ma6KmdHUXTvQxRCFP42',
           avatar: data.avatar || undefined
        });
      } else {
        setUser({ id: userId, email, name: email, is_admin: userId === '85DcnhXk0Ma6KmdHUXTvQxRCFP42' });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setUser({ id: userId, email, name: email });
    }
  };

  const refetchUser = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await fetchProfile(currentUser.uid, currentUser.email || '');
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid, firebaseUser.email || '');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, logout, refetchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

