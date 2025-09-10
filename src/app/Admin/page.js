'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function AdminDashboard() {
  const { user, userData, loading: authLoading, isAdmin, isEditor, isViewer } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    editorUsers: 0,
    viewerUsers: 0
  });

  // Collection counts state
  const [collectionCounts, setCollectionCounts] = useState({
    blog: 0,
    applications: 0,
    category_manage: 0,
    enquireOptions: 0,
    footer_url: 0,
    states_cities: 0
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Collection configurations
  const collections = [
    { name: 'blog', displayName: 'Blog Posts', color: 'blue', link: '/Admin/blog' },
    { name: 'applications', displayName: 'Partner Leads', color: 'green', link: '/Admin/partner_leads' },
    { name: 'category_manage', displayName: 'Categories', color: 'purple', link: '/Admin/category' },
    { name: 'enquireOptions', displayName: 'Contact Leads', color: 'orange', link: '/Admin/contactLeads' },
    { name: 'footer_url', displayName: 'Footer URL', color: 'indigo', link: '/Admin/addLink' },
    // { name: 'states_cities', displayName: 'States & Cities', color: 'red', link: '/Admin' }
  ];

  
  // Authentication check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }

      // ✅ Allow admin, editor, viewer
      if (!(isAdmin || isEditor || isViewer)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, userData, authLoading, isAdmin, isEditor, isViewer, router]);

  // Fetch data when user is authenticated and has proper role
  useEffect(() => {
    if (user && (isAdmin || isEditor || isViewer)) {
      fetchDashboardData();
    }
  }, [user, isAdmin, isEditor, isViewer]);

  const fetchCollectionCounts = async () => {
    const newCounts = {};
    
    try {
      for (const collectionConfig of collections) {
        try {
          const querySnapshot = await getDocs(collection(db, collectionConfig.name));
          newCounts[collectionConfig.name] = querySnapshot.size;
        } catch (error) {
          console.error(`Error fetching ${collectionConfig.name}:`, error);
          newCounts[collectionConfig.name] = 0;
        }
      }
      
      setCollectionCounts(newCounts);
    } catch (error) {
      console.error('Error fetching collection counts:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting to fetch users from Firestore...');
      
      // Fetch users data (only if admin)
      let adminCount = 0;
      let editorCount = 0;
      let viewerCount = 0;
      let users = [];

      if (isAdmin) {
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc')
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.forEach((doc) => {
          const userData = { id: doc.id, ...doc.data() };
          users.push(userData);
          
          switch (userData.role) {
            case 'admin':
              adminCount++;
              break;
            case 'editor':
              editorCount++;
              break;
            case 'viewer':
              viewerCount++;
              break;
          }
        });

        console.log(`Found ${users.length} users in Firestore`);

        setStats({
          totalUsers: users.length,
          adminUsers: adminCount,
          editorUsers: editorCount,
          viewerUsers: viewerCount
        });

        setRecentUsers(users.slice(0, 5));
      } else {
        // For non-admin users, show limited or no user data
        setStats({
          totalUsers: 0,
          adminUsers: 0,
          editorUsers: 0,
          viewerUsers: 0
        });
        setRecentUsers([]);
      }

      // Fetch collection counts (available to all roles)
      await fetchCollectionCounts();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please check your Firestore security rules.');
      } else if (error.code === 'unavailable') {
        setError('Firestore service unavailable. Please try again later.');
      } else {
        setError(`Failed to load dashboard data: ${error.message}`);
      }
      
      setStats({
        totalUsers: 0,
        adminUsers: 0,
        editorUsers: 0,
        viewerUsers: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || !(isAdmin || isEditor || isViewer)) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 bg-${color}-500 rounded-md flex items-center justify-center`}>
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{loading ? '...' : value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp && timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp) {
      date = new Date(timestamp);
    } else {
      return 'N/A';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'editor':
        return 'bg-yellow-100 text-yellow-800';
      case 'viewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewUser = (userId) => {
    alert(`View user: ${userId} (feature coming soon)`);
  };

  const handleEditUser = (userId) => {
    window.location.href = `/Admin/users/edit/${userId}`;
  };

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      indigo: 'bg-indigo-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500'
    };
    return colorMap[color] || 'bg-blue-500';
  };

  const totalCollectionRecords = Object.values(collectionCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Welcome back, {userData?.name || 'User'}! ({userData?.role})</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* User Stats Grid (only show for admins) */}
          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                color="blue"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                }
              />
              
              <StatCard
                title="Admins"
                value={stats.adminUsers}
                color="red"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              />
              
              <StatCard
                title="Editors"
                value={stats.editorUsers}
                color="yellow"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              />
              
              <StatCard
                title="Viewers"
                value={stats.viewerUsers}
                color="green"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Collection Counts Section */}
          <div className="mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Collection Overview</h2>
                <p className="text-sm text-gray-500 mt-1">Total records across all collections: {totalCollectionRecords.toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collectionConfig) => {
                  const count = collectionCounts[collectionConfig.name];
                  const percentage = totalCollectionRecords > 0 ? ((count / totalCollectionRecords) * 100).toFixed(1) : '0';
                  
                  return (
                    <Link 
                      key={collectionConfig.name} 
                      href={collectionConfig.link}
                      className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-blue-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-3 h-3 rounded-full ${getColorClasses(collectionConfig.color)}`}></div>
                        <span className="text-xs text-gray-500">{percentage}%</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {collectionConfig.displayName}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {collectionConfig.name}
                      </p>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {count.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">records</span>
                      </div>
                      <div className="mt-3">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getColorClasses(collectionConfig.color)} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Users Table (only show for admins) */}
          {isAdmin && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Recent Users</h2>
                    <p className="text-sm text-gray-500">Latest user registrations</p>
                  </div>
                  {recentUsers.length > 0 && (
                    <Link
                      href="/Admin/users"
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      View all users →
                    </Link>
                  )}
                </div>
              </div>
              
              {recentUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name || 'No name'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleViewUser(user.id)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleEditUser(user.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding your first user.</p>
                  <div className="mt-6">
                    <Link
                      href="/Admin/users/add"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add First User
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Add New User (only show for admins) */}
            {isAdmin && (
              <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
                    <p className="text-sm text-gray-500">Create a new user account</p>
                    <Link
                      href="/Admin/users/add"
                      className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                    >
                      Add User
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 1.26a2 2 0 001.28-.59L18 3m0 0L9 12m9-9v9.5A2.5 2.5 0 0115.5 15H9" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Contact Leads</h3>
                  <p className="text-sm text-gray-500">View customer inquiries</p>
                  <Link
                    href="/Admin/Contact Leads"
                    className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-200"
                  >
                    View Leads ({collectionCounts.enquireOptions})
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Manage Content</h3>
                  <p className="text-sm text-gray-500">Blog posts and categories</p>
                  <Link
                    href="/Admin/blog"
                    className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-200"
                  >
                    Manage Blog ({collectionCounts.blog})
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}