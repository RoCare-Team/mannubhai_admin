'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import './../../app/globals.css';
import AdminSidebar from '../Compoents/Adminsidebar';
import AdminNavbar from '../Compoents/AdminNavbar';
import { useAuth } from '../hooks/useAuth'; // Adjust path as needed

// Protected Route Component using Firebase auth
function ProtectedRoute({ children }) {
  const { user, userData, loading: authLoading, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // User is not logged in, redirect to login
        router.push('/login');
        return;
      }
      
      if (!hasAnyRole(['admin', 'editor'])) {
        // User is logged in but doesn't have admin or editor role
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, userData, authLoading, hasAnyRole, router]);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render content if user is not authenticated or doesn't have proper role
  // The useEffect will handle the redirect
  if (!user || !hasAnyRole(['admin', 'editor'])) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Main Admin Layout Component
export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userData } = useAuth(); // Get user data for passing to components

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <AdminSidebar
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          userData={userData} // Pass user data to sidebar if needed
        />
                
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation */}
          <AdminNavbar
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen}
            userData={userData} // Pass user data to navbar for user info display
          />
                    
          {/* Page Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}