'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, orderBy, query, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config'; 

export default function BlogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    // Extract unique categories from blogs
    const uniqueCategories = [...new Set(blogs.map(blog => blog.blog_cat_id))].filter(cat => cat);
    setCategories(uniqueCategories);
    
    // Apply category filter
    if (selectedCategory === 'all') {
      setFilteredBlogs(blogs);
    } else {
      setFilteredBlogs(blogs.filter(blog => blog.blog_cat_id === selectedCategory));
    }
    
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, [blogs, selectedCategory]);

  useEffect(() => {
    // Update total pages when filtered blogs change
    setTotalPages(Math.ceil(filteredBlogs.length / itemsPerPage));
  }, [filteredBlogs, itemsPerPage]);

  // Function to convert Firestore timestamp to readable date
  const formatDate = (dateValue) => {
    if (!dateValue) return 'No date';
    
    // If it's a Firestore timestamp object
    if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    
    // If it's already a string or other date format
    if (typeof dateValue === 'string') {
      try {
        return new Date(dateValue).toLocaleDateString();
      } catch (e) {
        return dateValue; // Return as-is if it can't be parsed
      }
    }
    
    return 'Invalid date';
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  const fetchBlogs = async () => {
    try {
      console.log('Fetching blogs from Firestore collection: blog');
      
      // Check if db is properly initialized
      if (!db) {
        throw new Error('Firestore db is not initialized');
      }
      
      // Use real-time listener instead of one-time fetch
      const q = query(collection(db, 'blog'), orderBy('created_at', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const blogsData = [];
        querySnapshot.forEach((doc) => {
          console.log('Document:', doc.id, doc.data());
          blogsData.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('Blogs data:', blogsData);
        setBlogs(blogsData);
        setLoading(false);
      });

      // Return the unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Toggle status function
  const toggleStatus = async (blogId, currentStatus) => {
    try {
      // Define status mapping - adjust based on your needs
      const statusMap = {
        'published': 'draft',
        'draft': 'published',
        'active': 'inactive',
        'inactive': 'active',
        '1': '0',
        '0': '1'
      };

      const newStatus = statusMap[currentStatus] || (currentStatus === 'published' ? 'draft' : 'published');
      
      const docRef = doc(db, 'blog', blogId);
      await updateDoc(docRef, { 
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      showToast(`Blog ${newStatus === 'published' || newStatus === 'active' || newStatus === '1' ? 'activated' : 'deactivated'} successfully!`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Error updating status. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this blog?')) {
      try {
        await deleteDoc(doc(db, 'blog', id));
        setBlogs(blogs.filter(blog => blog.id !== id));
        showToast('Blog deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting blog:', error);
        showToast('Error deleting blog. Please try again.', 'error');
      }
    }
  };

  // Get current blogs for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBlogs = filteredBlogs.slice(indexOfFirstItem, indexOfLastItem);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate page numbers for pagination controls
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Blogs</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchBlogs}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl transition-all duration-500 transform ${
            toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          } ${
            toast.type === 'success' 
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
              : toast.type === 'error' 
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
              : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {toast.type === 'success' && <span className="mr-3 text-xl">✅</span>}
                {toast.type === 'error' && <span className="mr-3 text-xl">❌</span>}
                {toast.type === 'warning' && <span className="mr-3 text-xl">⚠️</span>}
                <span className="font-medium">{toast.message}</span>
              </div>
              <button 
                onClick={hideToast}
                className="ml-4 text-white hover:text-gray-200 text-xl font-bold transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Blog Management</h1>
              <p className="text-gray-600">Create, manage and organize your blog content</p>
            </div>
            <Link 
              href="/Admin/blog/add"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add New Blog
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-blue-100">Total Blogs</p>
                <p className="text-2xl font-bold">{blogs.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-green-100">Published</p>
                <p className="text-2xl font-bold">{blogs.filter(blog => blog.status === 'active').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
            <div className="flex items-center">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-yellow-100">Draft</p>
                <p className="text-2xl font-bold">{blogs.filter(blog => blog.status === 'draft').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-100">Categories</p>
                <p className="text-2xl font-bold">{[...new Set(blogs.map(blog => blog.blog_cat_id))].length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Filter Blogs</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 appearance-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>

        {/* Blog Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {filteredBlogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex flex-col items-center">
                <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 className="text-xl font-semibold text-gray-500 mb-2">
                  {selectedCategory === 'all' ? 'No Blogs Found' : 'No Blogs in Selected Category'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {selectedCategory === 'all' 
                    ? 'Get started by creating your first blog post' 
                    : `No blogs found in the "${selectedCategory}" category`}
                </p>
                <Link 
                  href="/Admin/blog/add"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Create New Blog
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Blog Info
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="py-4 px-6 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-4 px-6 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentBlogs.map((blog) => (
                      <tr key={blog.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            {blog.blog_image && (
                              <div className="flex-shrink-0 h-12 w-12 mr-4">
                                <img 
                                  src={blog.blog_image} 
                                  alt={blog.blog_title} 
                                  className="h-12 w-12 object-cover rounded-lg shadow-md"
                                />
                              </div>
                            )}
                            <div>
                              <div className="text-lg font-semibold text-gray-900">
                                {blog.blog_title || 'No title'}
                              </div>
                              {blog.blog_excerpt && (
                                <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                                  {blog.blog_excerpt}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {blog.blog_cat_id || 'No category'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-500">
                            {formatDate(blog.created_at || blog.createdAt)}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={blog.status === 'published' || blog.status === 'active' || blog.status === '1'}
                              onChange={() => toggleStatus(blog.id, blog.status)}
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-green-600 shadow-lg"></div>
                            <span className={`ml-3 text-sm font-medium ${
                              blog.status === 'published' || blog.status === 'active' || blog.status === '1' 
                                ? 'text-green-600' 
                                : 'text-gray-400'
                            }`}>
                              {blog.status === 'published' || blog.status === 'active' || blog.status === '1' 
                                ? 'Published' 
                                : 'Draft'
                              }
                            </span>
                          </label>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center gap-2">
                            <Link 
                              href={`/Admin/blog/${blog.id}`}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                              title="Edit Blog"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDelete(blog.id)}
                              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                              title="Delete Blog"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Enhanced Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium text-blue-600">{indexOfFirstItem + 1}</span> to{' '}
                        <span className="font-medium text-blue-600">
                          {indexOfLastItem > filteredBlogs.length ? filteredBlogs.length : indexOfLastItem}
                        </span> of{' '}
                        <span className="font-medium text-blue-600">{filteredBlogs.length}</span> results
                        {selectedCategory !== 'all' && (
                          <span className="ml-2 text-blue-500">
                            (Filtered by: {selectedCategory})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                        disabled={currentPage === 1}
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-all duration-300 ${
                          currentPage === 1 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' 
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Previous
                      </button>
                      
                      <div className="hidden sm:flex space-x-1">
                        {pageNumbers.map(number => (
                          <button
                            key={number}
                            onClick={() => paginate(number)}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                              currentPage === number
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                            }`}
                          >
                            {number}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                        disabled={currentPage === totalPages}
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-all duration-300 ${
                          currentPage === totalPages 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' 
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300'
                        }`}
                      >
                        Next
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}