"use client";
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/app/firebase/config';

// Enhanced SVG Icons with modern styling
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
  </svg>
);

// Toggle Switch Component
const ToggleSwitch = ({ isActive, onToggle, disabled = false }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      isActive ? 'bg-green-600' : 'bg-gray-200'
    }`}
    title={`Click to ${isActive ? 'deactivate' : 'activate'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
        isActive ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const LoadingSpinner = () => (
  <div className="inline-flex items-center justify-center">
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Loading...</span>
  </div>
);

const ModernLinkManager = () => {
  const [links, setLinks] = useState([]);
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('action_date_time');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    status: 'active'
  });

  const [errors, setErrors] = useState({});
  const linksPerPage = 12;

  // Load links on component mount
  useEffect(() => {
    loadLinks();
  }, []);

  // Filter and sort links
  useEffect(() => {
    let filtered = links.filter(link => {
      const matchesSearch = (link.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (link.url || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort links
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'action_date_time') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredLinks(filtered);
    setCurrentPage(1);
  }, [links, searchTerm, statusFilter, sortBy, sortOrder]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'footer_url'), orderBy('action_date_time', 'desc'));
      const querySnapshot = await getDocs(q);
      const linksData = querySnapshot.docs.map(doc => ({
        firebaseId: doc.id, // This is the document ID from Firebase
        ...doc.data() // This includes the 'id' field from your document data
      }));
      
      console.log('Loaded links:', linksData); // Debug log
      setLinks(linksData);
    } catch (error) {
      console.error('Error loading links:', error);
    }
    setLoading(false);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = 'Please enter a valid URL starting with http:// or https://';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const linkData = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        status: formData.status,
        action_date_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
        id: editingLink ? editingLink.id : Date.now().toString() // Use existing id or create new one
      };

      if (editingLink) {
        // Update existing document
        await updateDoc(doc(db, 'footer_url', editingLink.firebaseId), linkData);
        
        // Update local state
        setLinks(links.map(link => 
          link.firebaseId === editingLink.firebaseId 
            ? { ...link, ...linkData }
            : link
        ));
      } else {
        // Add new document
        const docRef = await addDoc(collection(db, 'footer_url'), linkData);
        
        // Add to local state
        const newLink = {
          firebaseId: docRef.id,
          ...linkData
        };
        setLinks([newLink, ...links]);
      }

      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving link:', error);
      alert('Error saving link. Please try again.');
    }
    setLoading(false);
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    setFormData({
      name: link.name || '',
      url: link.url || '',
      status: link.status || 'active'
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (link) => {
    if (!confirm(`Are you sure you want to delete "${link.name}"?`)) return;

    setLoading(true);
    try {
      // Delete from Firebase
      await deleteDoc(doc(db, 'footer_url', link.firebaseId));
      
      // Remove from local state
      setLinks(links.filter(l => l.firebaseId !== link.firebaseId));
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Error deleting link. Please try again.');
    }
    setLoading(false);
  };

  const handleStatusToggle = async (link) => {
    setLoading(true);
    try {
      const newStatus = link.status === 'active' ? 'inactive' : 'active';
      const updateData = {
        ...link,
        status: newStatus,
        action_date_time: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      // Update in Firebase
      await updateDoc(doc(db, 'footer_url', link.firebaseId), updateData);
      
      // Update local state
      setLinks(links.map(l => 
        l.firebaseId === link.firebaseId 
          ? { ...l, ...updateData }
          : l
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', status: 'active' });
    setEditingLink(null);
    setErrors({});
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid Time';
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredLinks.length / linksPerPage);
  const startIndex = (currentPage - 1) * linksPerPage;
  const endIndex = startIndex + linksPerPage;
  const currentLinks = filteredLinks.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const activeCount = links.filter(link => link.status === 'active').length;
  const inactiveCount = links.filter(link => link.status === 'inactive').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Gradient */}
      <div className="bg-white shadow-lg border-b border-gray-100 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <GlobeIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Link Manager
                </h1>
                <p className="text-gray-600 text-sm mt-1">Manage your footer links with ease</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <PlusIcon />
              <span className="ml-2 font-medium">Add Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">{links.length}</div>
                <div className="text-gray-600 text-sm font-medium mt-1">Total Links</div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <GlobeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{activeCount}</div>
                <div className="text-gray-600 text-sm font-medium mt-1">Active Links</div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <div className="w-6 h-6 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-500">{inactiveCount}</div>
                <div className="text-gray-600 text-sm font-medium mt-1">Inactive Links</div>
              </div>
              <div className="p-3 bg-gray-100 rounded-xl">
                <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search links by name or URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="lg:w-48">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FilterIcon />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
            
            {/* Sort Options */}
            <div className="lg:w-48">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
              >
                <option value="action_date_time-desc">Newest First</option>
                <option value="action_date_time-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modern Links Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600 font-medium">Loading your links...</p>
            </div>
          ) : currentLinks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex justify-center mb-4 text-gray-300">
                <GlobeIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No links found' : 'No links yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'Get started by adding your first link!'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                >
                  <PlusIcon />
                  <span className="ml-2">Add Your First Link</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Name</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">URL</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900">Last Modified</th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentLinks.map((link) => (
                      <tr key={link.firebaseId} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">{link.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">ID: {link.id || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <a
                            href={link.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center group transition-colors duration-150"
                          >
                            <span className="truncate max-w-xs">{link.url || 'N/A'}</span>
                            <ExternalLinkIcon className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                          </a>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                              link.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {link.status ? link.status.charAt(0).toUpperCase() + link.status.slice(1) : 'N/A'}
                            </span>
                            <ToggleSwitch 
                              isActive={link.status === 'active'}
                              onToggle={() => handleStatusToggle(link)}
                              disabled={loading}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          <div className="flex items-center">
                            <CalendarIcon className="mr-2" />
                            <div>
                              <div className="text-sm font-medium">
                                {formatDate(link.action_date_time)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatTime(link.action_date_time)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(link)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-150"
                              title="Edit link"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => handleDelete(link)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-150"
                              title="Delete link"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {currentLinks.map((link) => (
                  <div key={link.firebaseId} className="border-b border-gray-100 last:border-b-0 p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 mr-4">
                        <h3 className="font-semibold text-gray-900 text-lg">{link.name || 'N/A'}</h3>
                        <p className="text-sm text-gray-500 mt-1">ID: {link.id || 'N/A'}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full flex-shrink-0 ${
                          link.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {link.status ? link.status.charAt(0).toUpperCase() + link.status.slice(1) : 'N/A'}
                        </span>
                        <ToggleSwitch 
                          isActive={link.status === 'active'}
                          onToggle={() => handleStatusToggle(link)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <a
                        href={link.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center group"
                      >
                        <span className="truncate">{link.url || 'N/A'}</span>
                        <ExternalLinkIcon className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                      </a>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-gray-600 text-sm flex items-center">
                        <CalendarIcon className="mr-2" />
                        <div>
                          <div>{formatDate(link.action_date_time)}</div>
                          <div className="text-xs text-gray-400">
                            {formatTime(link.action_date_time)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(link)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-150"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(link)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, filteredLinks.length)}</span> of{' '}
                    <span className="font-medium">{filteredLinks.length}</span> results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                    >
                      <ChevronLeftIcon />
                    </button>
                    
                    <div className="flex space-x-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-150 ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enhanced Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLink ? 'Edit Link' : 'Add New Link'}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {editingLink ? 'Update the link information below' : 'Fill in the details for the new link'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Link Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter a descriptive name"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.url ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com"
                />
                {errors.url && (
                  <p className="mt-2 text-sm text-red-600">{errors.url}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </div>
                  ) : (
                    editingLink ? 'Update Link' : 'Add Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernLinkManager;