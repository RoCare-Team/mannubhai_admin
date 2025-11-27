"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit,
  startAfter,
  getDocs, 
  where,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '@/app/firebase/config';

// Modern Icons (you can replace with your preferred icon library)
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.121A1 1 0 013 6.414V4z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ActivePagesManager = () => {
  const [activePages, setActivePages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const ITEMS_PER_PAGE = 10;

  // Fetch categories from category_manage collection
  const fetchCategories = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'category_manage'));
      const categoriesData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: data.id || doc.id, // Use data.id if available, fallback to doc.id
            docId: doc.id,
            name: data.category_name,
            url: data.category_url,
            status: data.status,
            ...data
          };
        })
        .filter(cat => cat.status === '1' || cat.status === 1)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      console.log('Categories loaded:', categoriesData.length, categoriesData.slice(0, 3));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Fetch cities from city_tb collection
  const fetchCities = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'city_tb'));
      const citiesData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: data.id || doc.id, // Use data.id if available, fallback to doc.id
            docId: doc.id,
            name: data.city_name,
            url: data.city_url,
            state: data.state_name,
            status: data.status,
            ...data
          };
        })
        .filter(city => city.status === '1' || city.status === 1)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      console.log('Cities loaded:', citiesData.length, citiesData.slice(0, 3));
      setCities(citiesData);
      
      // Extract unique states
      const uniqueStates = [...new Set(citiesData
        .map(city => city.state)
        .filter(state => state && state !== null && state !== undefined)
      )].sort();
      
      setStates(uniqueStates);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }, []);

  // Helper functions - Updated to handle both data.id and doc.id
  const getCategoryInfo = useCallback((categoryId) => {
    if (!categoryId) return { name: 'No Category', url: '' };
    
    const category = categories.find(cat => 
      String(cat.id) === String(categoryId) || 
      String(cat.docId) === String(categoryId)
    );
    
    console.log(`Looking for category ID: ${categoryId}, found:`, category);
    
    return category ? {
      name: category.name || `Category ID: ${categoryId}`,
      url: category.url || ''
    } : { name: `Category ID: ${categoryId}`, url: '' };
  }, [categories]);

  const getCityInfo = useCallback((cityId) => {
    if (!cityId) return { name: 'No City', url: '', state: 'N/A' };
    
    const city = cities.find(c => 
      String(c.id) === String(cityId) || 
      String(c.docId) === String(cityId)
    );
    
    console.log(`Looking for city ID: ${cityId}, found:`, city);
    
    return city ? {
      name: city.name || `City ID: ${cityId}`,
      url: city.url || '',
      state: city.state || 'N/A'
    } : { name: `City ID: ${cityId}`, url: '', state: 'N/A' };
  }, [cities]);

  const createPageUrl = useCallback((page) => {
    const categoryInfo = getCategoryInfo(page.category_id);
    const cityInfo = getCityInfo(page.city_id);
    
    if (cityInfo.url && categoryInfo.url) {
      return `/${cityInfo.url}/${categoryInfo.url}`;
    } else if (categoryInfo.url) {
      return `/${categoryInfo.url}`;
    } else if (cityInfo.url) {
      return `/${cityInfo.url}`;
    } else {
      return page.page_url || '#';
    }
  }, [getCategoryInfo, getCityInfo]);

  // Fetch all pages
  const fetchAllActivePages = useCallback(async () => {
    setLoading(true);
    try {
      // First try with ordering
      let q;
      try {
        q = query(
          collection(db, 'page_master_tb'),
          orderBy('updated_at', 'desc')
        );
      } catch (orderError) {
        console.log('Ordering failed, trying without order:', orderError);
        q = query(collection(db, 'page_master_tb'));
      }
      
      const snapshot = await getDocs(q);
      const pagesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // Use document ID
          docId: doc.id,
          ...data
        };
      });
      
      console.log('Pages loaded:', pagesData.length);
      console.log('Sample page data:', pagesData.slice(0, 2));
      
      setActivePages(pagesData);
      setTotalCount(pagesData.length);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
    setLoading(false);
  }, []);

  // Apply filters to the data
  const applyFilters = useCallback(() => {
    let filtered = [...activePages];

    console.log('Applying filters to', filtered.length, 'pages');

    // Apply status filter first
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(page => {
        const pageStatus = String(page.status || '0');
        return pageStatus === String(statusFilter);
      });
      console.log('After status filter:', filtered.length);
    }

    // Apply category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(page => {
        const pageCategory = String(page.category_id || '');
        const filterCategory = String(categoryFilter);
        return pageCategory === filterCategory;
      });
      console.log('After category filter:', filtered.length);
    }

    // Apply state filter first (this will affect city options)
    if (stateFilter && stateFilter !== 'all') {
      const stateCities = cities.filter(city => city.state === stateFilter);
      const stateCityIds = stateCities.map(city => String(city.id));
      filtered = filtered.filter(page => {
        const pageCityId = String(page.city_id || '');
        return stateCityIds.includes(pageCityId);
      });
      console.log('After state filter:', filtered.length);
    }

    // Apply city filter
    if (cityFilter && cityFilter !== 'all') {
      filtered = filtered.filter(page => {
        const pageCityId = String(page.city_id || '');
        const filterCityId = String(cityFilter);
        return pageCityId === filterCityId;
      });
      console.log('After city filter:', filtered.length);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(page => {
        const categoryInfo = getCategoryInfo(page.category_id);
        const cityInfo = getCityInfo(page.city_id);
        
        const searchFields = [
          page.page_title || '',
          page.meta_title || '',
          page.page_url || '',
          page.meta_keywords || '',
          categoryInfo.name || '',
          cityInfo.name || '',
          cityInfo.state || ''
        ];
        
        return searchFields.some(field => 
          field.toLowerCase().includes(searchLower)
        );
      });
      console.log('After search filter:', filtered.length);
    }

    setFilteredPages(filtered);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
    setCurrentPage(1); // Reset to first page when filters change
  }, [activePages, statusFilter, categoryFilter, cityFilter, stateFilter, searchTerm, cities, getCategoryInfo, getCityInfo]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPages.slice(startIndex, endIndex);
  }, [filteredPages, currentPage]);

  // Get filtered cities based on selected state
  const filteredCities = useMemo(() => {
    if (stateFilter === 'all') return cities;
    return cities.filter(city => city.state === stateFilter);
  }, [cities, stateFilter]);

  // Effects
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchCities()
      ]);
      await fetchAllActivePages();
    };
    
    initializeData();
  }, [fetchCategories, fetchCities, fetchAllActivePages]);

  useEffect(() => {
    if (activePages.length > 0 && categories.length > 0 && cities.length > 0) {
      applyFilters();
    }
  }, [applyFilters, activePages, categories, cities]);

  // Event handlers
  const handleFilterChange = (type, value) => {
    if (type === 'category') {
      setCategoryFilter(value);
    } else if (type === 'city') {
      setCityFilter(value);
    } else if (type === 'state') {
      setStateFilter(value);
      // Reset city filter when state changes
      if (value !== 'all') {
        setCityFilter('all');
      }
    } else if (type === 'status') {
      setStatusFilter(value);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setCityFilter('all');
    setStateFilter('all');
    setStatusFilter('all');
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const formatDate = (dateValue) => {
    if (dateValue?.toDate) {
      return dateValue.toDate().toLocaleDateString();
    } else if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleDateString();
    }
    return 'N/A';
  };

  // Debug function
  const debugData = () => {
    console.log('=== DEBUG INFO ===');
    console.log('Active Pages:', activePages.length);
    console.log('Categories:', categories.length);
    console.log('Cities:', cities.length);
    console.log('Sample page:', activePages[0]);
    console.log('Sample category:', categories[0]);
    console.log('Sample city:', cities[0]);
    
    // Check for ID matching issues
    if (activePages.length > 0) {
      const samplePage = activePages[0];
      console.log('Sample page category_id:', samplePage.category_id, typeof samplePage.category_id);
      console.log('Sample page city_id:', samplePage.city_id, typeof samplePage.city_id);
      
      const categoryMatch = getCategoryInfo(samplePage.category_id);
      const cityMatch = getCityInfo(samplePage.city_id);
      
      console.log('Category match:', categoryMatch);
      console.log('City match:', cityMatch);
    }
  };

  // Pagination component
  const Pagination = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-t border-gray-200">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredPages.length)}</span> of{' '}
              <span className="font-medium">{filteredPages.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                      : 'text-gray-900'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Active Pages</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage and monitor all pages across your platform
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchAllActivePages}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <RefreshIcon />
                  <span className="ml-2">Refresh</span>
                </button>
                <button
                  onClick={debugData}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Debug Data
                </button>
                <div className="text-sm text-gray-500">
                  Total: <span className="font-semibold text-gray-900">{totalCount}</span> |
                  Filtered: <span className="font-semibold text-gray-900">{filteredPages.length}</span>
                  {statusFilter !== 'all' && (
                    <span className="ml-2 text-xs">
                      (Status: {statusFilter === '1' ? 'Active' : 'Inactive'})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              {/* Search */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Search pages, categories, cities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FilterIcon />
                <span className="ml-2">Filters</span>
                {(statusFilter !== 'all' || categoryFilter !== 'all' || cityFilter !== 'all' || stateFilter !== 'all') && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Active
                  </span>
                )}
              </button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Status</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(category => (
                        <option key={category.docId} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      value={stateFilter}
                      onChange={(e) => handleFilterChange('state', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All States</option>
                      {states.map(state => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <select
                      value={cityFilter}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Cities</option>
                      {filteredCities.map(city => (
                        <option key={city.docId} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={resetFilters}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="text-gray-600">Loading pages...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Page Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((page) => {
                      const categoryInfo = getCategoryInfo(page.category_id);
                      const cityInfo = getCityInfo(page.city_id);
                      const pageUrl = createPageUrl(page);

                      return (
                        <tr key={page.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                  <span className="text-indigo-600 font-semibold text-sm">
                                    {(page.page_title || 'P')[0].toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {page.page_title || 'Untitled Page'}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  {page.meta_title || 'No meta title'}
                                </p>
                                <div className="mt-1">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    page.status === '1' || page.status === 1
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {page.status === '1' || page.status === 1 ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <a
                                href={pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1 group"
                              >
                                <span className="truncate max-w-xs">{pageUrl}</span>
                                <ExternalLinkIcon />
                              </a>
                              {page.page_url && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Original: {page.page_url}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{cityInfo.name}</p>
                              <p className="text-gray-500">{cityInfo.state}</p>
                              <p className="text-xs text-gray-400">ID: {page.city_id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{categoryInfo.name}</p>
                              <p className="text-xs text-gray-400">ID: {page.category_id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(page.createdAt || page.updated_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* No Results */}
              {filteredPages.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="mx-auto max-w-md">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No pages found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      No pages match your current search and filter criteria.
                    </p>
                    {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || cityFilter !== 'all' || stateFilter !== 'all') && (
                      <button
                        onClick={resetFilters}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Pagination */}
              {filteredPages.length > 0 && totalPages > 1 && <Pagination />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivePagesManager;