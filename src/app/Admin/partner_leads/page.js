'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  limit, 
  startAfter, 
  updateDoc, 
  doc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/app/firebase/config';

export default function PartnerLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Pagination
  const leadsPerPage = 10;
  
  // Fetch leads with filters and pagination
  const fetchLeads = async (pageDirection = 'next', resetPage = false) => {
    setLoading(true);
    
    try {
      let q = collection(db, 'applications');
      
      // Apply filters
      const conditions = [];
      
      if (statusFilter !== 'all') {
        conditions.push(where('status', '==', statusFilter));
      }
      
      if (serviceFilter !== 'all') {
        conditions.push(where('selectedService', '==', serviceFilter));
      }
      
      // Date filter
      if (dateFilter.startDate && dateFilter.endDate) {
        const startDate = new Date(dateFilter.startDate);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        
        conditions.push(where('submittedAt', '>=', Timestamp.fromDate(startDate)));
        conditions.push(where('submittedAt', '<=', Timestamp.fromDate(endDate)));
      }
      
      // Build query
      if (conditions.length > 0) {
        q = query(q, ...conditions, orderBy('submittedAt', 'desc'));
      } else {
        q = query(q, orderBy('submittedAt', 'desc'));
      }
      
      // Handle pagination
      if (resetPage) {
        setCurrentPage(1);
        setLastVisible(null);
        setFirstVisible(null);
      } else if (pageDirection === 'next' && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }
      
      q = query(q, limit(leadsPerPage + 1)); // Get one extra to check if there are more
      
      const querySnapshot = await getDocs(q);
      const leadsData = [];
      
      querySnapshot.docs.forEach((doc, index) => {
        if (index < leadsPerPage) {
          leadsData.push({
            id: doc.id,
            ...doc.data()
          });
        }
      });
      
      setLeads(leadsData);
      
      if (leadsData.length > 0) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[Math.min(leadsData.length - 1, leadsPerPage - 1)]);
      }
      
      // Get total count (this is approximate for better performance)
      const countQuery = query(collection(db, 'applications'), ...conditions);
      const countSnapshot = await getDocs(countQuery);
      setTotalLeads(countSnapshot.size);
      
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update lead status
  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const leadRef = doc(db, 'applications', leadId);
      await updateDoc(leadRef, { status: newStatus });
      
      // Update local state
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
    } catch (error) {
      console.error('Error updating lead status:', error);
      alert('Error updating lead status');
    }
  };
  
  // Delete lead
  const deleteLead = async (leadId) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      await deleteDoc(doc(db, 'applications', leadId));
      setLeads(leads.filter(lead => lead.id !== leadId));
      setTotalLeads(totalLeads - 1);
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Error deleting lead');
    }
  };
  
  // Handle filter changes
  const handleFilterChange = () => {
    fetchLeads('next', true);
  };
  
  // Reset filters
  const resetFilters = () => {
    setStatusFilter('all');
    setServiceFilter('all');
    setDateFilter({ startDate: '', endDate: '' });
    setTimeout(() => fetchLeads('next', true), 100);
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      case 'approved': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'rejected': return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      case 'contacted': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      default: return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };
  
  // Pagination handlers
  const nextPage = () => {
    if (leads.length === leadsPerPage) {
      setCurrentPage(currentPage + 1);
      fetchLeads('next');
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // For previous page, we need to refetch from the beginning
      // This is a limitation of Firestore pagination
      fetchLeads('next', true);
    }
  };
  
  useEffect(() => {
    fetchLeads('next', true);
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                Partner Leads
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Manage and track all partner applications
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
                <div className="text-2xl font-bold text-gray-900">{totalLeads}</div>
                <div className="text-sm text-gray-500">Total Leads</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modern Filters Card */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
            <div className="flex gap-3">
              <button
                onClick={handleFilterChange}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-all duration-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border-0 bg-gray-50 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all duration-200"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="contacted">Contacted</option>
              </select>
            </div>
            
            {/* Service Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service</label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full rounded-lg border-0 bg-gray-50 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all duration-200"
              >
                <option value="all">All Services</option>
                <option value="beauty">Beauty Services</option>
                <option value="cleaning">Cleaning Services</option>
                <option value="repair">Repair Services</option>
                <option value="tutoring">Tutoring Services</option>
              </select>
            </div>
            
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                className="w-full rounded-lg border-0 bg-gray-50 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                className="w-full rounded-lg border-0 bg-gray-50 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        
        {/* Results Summary */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-gray-900">
              Showing {leads.length} of {totalLeads} entries
            </p>
            <div className="h-4 w-px bg-gray-300"></div>
            <p className="text-sm text-gray-600">Page {currentPage}</p>
          </div>
        </div>
        
        {/* Modern Leads Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                <p className="text-sm font-medium text-gray-600">Loading leads...</p>
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-gray-100 p-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500">No leads match your current filter criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Lead Info
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Service
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Submitted
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {(lead.fullName || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {lead.fullName || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">
                                Aadhaar: {lead.aadhaarNumber || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{lead.phoneNumber || 'N/A'}</div>
                          {lead.alternateNumber && (
                            <div className="text-sm text-gray-500">Alt: {lead.alternateNumber}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {lead.serviceTitle || lead.selectedService || 'N/A'}
                          </div>
                          {lead.skills && lead.skills.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {lead.skills.slice(0, 3).map((skill, index) => (
                                <span key={index} className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                  {skill}
                                </span>
                              ))}
                              {lead.skills.length > 3 && (
                                <span className="text-xs text-gray-400">+{lead.skills.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{lead.city || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{lead.state || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={lead.status || 'pending'}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-indigo-600 ${getStatusColor(lead.status)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(lead.submittedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // View lead details - you can implement a modal here
                                alert('View functionality - implement modal with full lead details');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors duration-200"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            <button
                              onClick={() => deleteLead(lead.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors duration-200"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Modern Pagination */}
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={leads.length < leadsPerPage}
                    className="relative ml-3 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-semibold">{currentPage}</span> of approximately{' '}
                      <span className="font-semibold">{Math.ceil(totalLeads / leadsPerPage)}</span> pages
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center gap-1 rounded-l-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      <span className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900">
                        {currentPage}
                      </span>
                      <button
                        onClick={nextPage}
                        disabled={leads.length < leadsPerPage}
                        className="relative inline-flex items-center gap-1 rounded-r-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}