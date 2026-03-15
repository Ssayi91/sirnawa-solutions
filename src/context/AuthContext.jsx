// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.email);
      
      if (firebaseUser) {
        try {
          console.log('📦 Fetching user doc:', firebaseUser.uid);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('✅ User doc found, role:', userData.role);
            setUser({ ...firebaseUser, ...userData });
            setRole(userData.role);
          } else {
            console.error('❌ User doc NOT found in Firestore');
          }
        } catch (err) {
          console.error('❌ Error fetching user doc:', err);
        }
      } else {
        console.log('🚪 User signed out');
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ✅ logout function - properly defined
  const logout = async () => {
    console.log('🔐 Logout triggered');
    try {
      await signOut(auth);
      console.log('✅ Firebase signOut succeeded');
      setUser(null);
      setRole(null);
      console.log('🧹 Local state cleared');
    } catch (err) {
      console.error('❌ Logout error:', err);
      // Force clear state even if Firebase fails
      setUser(null);
      setRole(null);
    }
  };

  // ✅ Include logout in the context value
  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};