import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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
          console.log("🔑 Logged in Firebase user:", firebaseUser.uid);

          // Fetch Firestore user profile by UID
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userInfo = userDoc.data();
            console.log("✅ Firestore user data:", userInfo);

            setUser(firebaseUser);
            setUserData(userInfo);

            // Save in localStorage
            localStorage.setItem('userRole', userInfo.role);
            localStorage.setItem('userName', userInfo.name || '');
            localStorage.setItem('userId', firebaseUser.uid);
          } else {
            console.warn("⚠️ User doc not found in Firestore → signing out");
            await signOut(auth);
            setUser(null);
            setUserData(null);
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          setUser(null);
          setUserData(null);
        }
      } else {
        console.log("ℹ️ No Firebase user logged in");
        setUser(null);
        setUserData(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Role helpers
  const hasRole = (role) => userData?.role === role;
  const hasAnyRole = (roles) => roles.includes(userData?.role);

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