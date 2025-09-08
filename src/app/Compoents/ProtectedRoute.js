'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function ProtectedRoute({ 
  children, 
  requiredRoles = ['admin', 'editor', 'viewer'],
  redirectTo = '/login',
  allowUnauthenticated = false 
}) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        setError(null);

        if (firebaseUser) {
          setUser(firebaseUser);

          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

            if (userDoc.exists()) {
              const userInfo = userDoc.data();
              setUserData(userInfo);

              // Store quick info in localStorage
              localStorage.setItem('userRole', userInfo.role);
              localStorage.setItem('userName', userInfo.name || 'User');
              localStorage.setItem('userId', firebaseUser.uid);

              // ✅ Check account status
              if (userInfo.status !== 'active') {
                setAuthorized(false);
                setError('Your account is not active. Please contact the administrator.');
                await signOut(auth);
                setUser(null);
                setUserData(null);
                return;
              }

              // ✅ Check roles
              if (requiredRoles.includes(userInfo.role)) {
                setAuthorized(true);
              } else {
                setAuthorized(false);
                setError(`Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${userInfo.role}`);
              }
            } else {
              setError('User profile not found. Please contact administrator.');
              setAuthorized(false);
              await signOut(auth);
              setUser(null);
              setUserData(null);
            }
          } catch (firestoreError) {
            console.error('Error fetching user data from Firestore:', firestoreError);
            setError('Failed to load user profile. Please try again.');
            setAuthorized(false);
          }
        } else {
          // Not signed in
          setUser(null);
          setUserData(null);
          setAuthorized(allowUnauthenticated);

          localStorage.removeItem('userRole');
          localStorage.removeItem('userName');
          localStorage.removeItem('userId');

          if (!allowUnauthenticated) {
            setError('Authentication required');
          }
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        setError('Authentication system error. Please try again.');
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [requiredRoles, allowUnauthenticated]);

  // Redirect logic
  useEffect(() => {
    if (!loading && !authorized && !allowUnauthenticated) {
      const redirectTimer = setTimeout(() => {
        if (!user) {
          router.push(redirectTo);
        } else if (userData && userData.status !== 'active') {
          router.push('/unauthorized'); // inactive account
        } else if (userData && !requiredRoles.includes(userData.role)) {
          router.push('/unauthorized'); // wrong role
        }
      }, 100);

      return () => clearTimeout(redirectTimer);
    }
  }, [loading, authorized, allowUnauthenticated, user, userData, requiredRoles, redirectTo, router]);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !allowUnauthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Unauthorized
  if (user && userData && !authorized && !allowUnauthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-yellow-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-2">
            You don’t have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Required roles: {requiredRoles.join(', ')}
            <br />
            Your role: {userData.role}
          </p>
          <button 
            onClick={async () => {
              await signOut(auth);
              router.push('/login');
            }}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // If authorized
  if (authorized || allowUnauthenticated) {
    return <>{children}</>;
  }

  return null;
}


