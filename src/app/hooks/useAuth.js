import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userInfo = userDoc.data();
            setUser(firebaseUser);
            setUserData(userInfo);
            
            // Store in localStorage for quick access
            localStorage.setItem('userRole', userInfo.role);
            localStorage.setItem('userName', userInfo.name);
          } else {
            // User not found in Firestore, sign out
            await auth.signOut();
            setUser(null);
            setUserData(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const hasRole = (role) => {
    return userData?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(userData?.role);
  };

  return {
    user,
    userData,
    loading,
    hasRole,
    hasAnyRole,
    isAdmin: userData?.role === 'admin',
    isEditor: userData?.role === 'editor',
    isViewer: userData?.role === 'viewer'
  };
};