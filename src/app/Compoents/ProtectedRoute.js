'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function ProtectedRoute({ 
  children, 
  requiredRoles = ['admin', 'editor'],
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
          // User is signed in
          setUser(firebaseUser);
          
          try {
            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            
            if (userDoc.exists()) {
              const userInfo = userDoc.data();
              setUserData(userInfo);
              
              // Store in localStorage for quick access
              localStorage.setItem('userRole', userInfo.role);
              localStorage.setItem('userName', userInfo.name || 'User');
              localStorage.setItem('userId', firebaseUser.uid);
              
              // Check if user has required role
              if (requiredRoles.includes(userInfo.role)) {
                setAuthorized(true);
              } else {
                setAuthorized(false);
                setError(`Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${userInfo.role}`);
              }
            } else {
              // User exists in Auth but not in Firestore
              setError('User profile not found. Please contact administrator.');
              setAuthorized(false);
              
              // Sign out user since they don't have a profile
              await auth.signOut();
              setUser(null);
              setUserData(null);
            }
          } catch (firestoreError) {
            console.error('Error fetching user data from Firestore:', firestoreError);
            setError('Failed to load user profile. Please try again.');
            setAuthorized(false);
          }
        } else {
          // User is signed out
          setUser(null);
          setUserData(null);
          setAuthorized(allowUnauthenticated);
          
          // Clear localStorage
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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [requiredRoles, allowUnauthenticated]);

  // Handle redirects
  useEffect(() => {
    if (!loading && !authorized && !allowUnauthenticated) {
      // Small delay to prevent flash of unauthorized content
      const redirectTimer = setTimeout(() => {
        if (!user) {
          // Not authenticated, redirect to login
          router.push(redirectTo);
        } else if (userData && !requiredRoles.includes(userData.role)) {
          // Authenticated but insufficient permissions
          router.push('/unauthorized');
        }
      }, 100);

      return () => clearTimeout(redirectTimer);
    }
  }, [loading, authorized, allowUnauthenticated, user, userData, requiredRoles, redirectTo, router]);

  // Loading state
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
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Go to Login
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized state (authenticated but insufficient permissions)
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
            You dont have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Required roles: {requiredRoles.join(', ')}
            <br />
            Your role: {userData.role}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={async () => {
                await auth.signOut();
                router.push('/login');
              }}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render children if authorized or if unauthenticated access is allowed
  if (authorized || allowUnauthenticated) {
    return <>{children}</>;
  }

  // Default fallback (shouldn't reach here, but just in case)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Helper hook to use authentication data in components
export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(firebaseUser);
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    isViewer: userData?.role === 'viewer',
    signOut: () => auth.signOut()
  };
}