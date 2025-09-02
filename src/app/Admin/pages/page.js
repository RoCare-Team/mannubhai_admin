"use client";
import { useState, useEffect } from 'react';
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

const ActivePagesManager = () => {
  const [activePages, setActivePages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  
  const ITEMS_PER_PAGE = 10;

  // Fetch categories from category_manage collection - simplified approach
  const fetchCategories = async () => {
    try {
      // Get all categories without filters first to debug
      const snapshot = await getDocs(collection(db, 'category_manage'));
      console.log('Total category documents found:', snapshot.docs.length);
      
      const categoriesData = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Category document:', {
          docId: doc.id,
          status: data.status,
          category_name: data.category_name,
          category_url: data.category_url,
          id: data.id
        });
        
        // Only include active categories
        if (data.status === '1' || data.status === 1) {
          categoriesData.push({
            id: data.id,
            docId: doc.id,
            name: data.category_name,
            url: data.category_url,
            status: data.status,
            rawData: data
          });
        }
      });
      
      setCategories(categoriesData);
      console.log('Final categories data:', categoriesData);
      
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch cities from city_tb collection - simplified approach
  const fetchCities = async () => {
    try {
      // Get all cities without filters first to debug
      const snapshot = await getDocs(collection(db, 'city_tb'));
      console.log('Total city documents found:', snapshot.docs.length);
      
      const citiesData = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('City document:', {
          docId: doc.id,
          status: data.status,
          city_name: data.city_name,
          state_name: data.state_name,
          id: data.id
        });
        
        // Only include active cities
        if (data.status === '1' || data.status === 1) {
          citiesData.push({
            id: data.id,
            docId: doc.id,
            name: data.city_name,
            url: data.city_url,
            state: data.state_name,
            status: data.status,
            rawData: data
          });
        }
      });
      
      setCities(citiesData);
      console.log('Final cities data:', citiesData);
      
      // Extract unique states
      const uniqueStates = [...new Set(citiesData
        .map(city => city.state)
        .filter(state => state && state !== null && state !== undefined)
      )];
      
      setStates(uniqueStates);
      console.log('Unique states:', uniqueStates);
      
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };
  // Helper function to get category info
  const getCategoryInfo = (categoryId) => {
    console.log('Looking for category with ID:', categoryId, 'Type:', typeof categoryId);
    console.log('Available categories:', categories.map(c => ({ id: c.id, type: typeof c.id, name: c.name })));
    
    const category = categories.find(cat => {
      // Try both string and number comparison
      return cat.id === categoryId || cat.id === String(categoryId) || String(cat.id) === String(categoryId);
    });
    
    console.log('Found category:', category);
    
    if (!category) {
      return { name: `Category ID: ${categoryId}`, url: '' };
    }
    
    return {
      name: category.name || category.category_name || `Category ID: ${categoryId}`,
      url: category.url || category.category_url || ''
    };
  };

  // Helper function to get city info
  const getCityInfo = (cityId) => {
    console.log('Looking for city with ID:', cityId, 'Type:', typeof cityId);
    console.log('Available cities:', cities.map(c => ({ id: c.id, type: typeof c.id, name: c.name })));
    
    const city = cities.find(c => {
      // Try both string and number comparison
      return c.id === cityId || c.id === String(cityId) || String(c.id) === String(cityId);
    });
    
    console.log('Found city:', city);
    
    if (!city) {
      return { name: `City ID: ${cityId}`, url: '', state: 'N/A' };
    }
    
    return {
      name: city.name || city.city_name || `City ID: ${cityId}`,
      url: city.url || city.city_url || '',
      state: city.state || city.state_name || 'N/A'
    };
  };

  // Helper function to create page URL
  const createPageUrl = (page) => {
    const categoryInfo = getCategoryInfo(page.category_id);
    const cityInfo = getCityInfo(page.city_id);
    
    // Create URL from city_url and category_url
    if (cityInfo.url && categoryInfo.url) {
      return `/${cityInfo.url}/${categoryInfo.url}`;
    } else if (categoryInfo.url) {
      return `/${categoryInfo.url}`;
    } else if (cityInfo.url) {
      return `/${cityInfo.url}`;
    } else {
      return page.page_url || '#';
    }
  };
  const buildQuery = (isCount = false, pageNumber = 1) => {
    let constraints = [where('status', '==', '1')];
    
    // Add category filter if specified
    if (categoryFilter && categoryFilter !== 'all') {
      constraints.push(where('category_id', '==', categoryFilter));
    }
    
    // Add city filter if specified  
    if (cityFilter && cityFilter !== 'all') {
      constraints.push(where('city_id', '==', cityFilter));
    }

    let q = query(
      collection(db, 'page_master_tb'),
      ...constraints
    );

    if (!isCount) {
      // Add ordering and pagination for data query
      q = query(q, orderBy('createdAt', 'desc'));
      
      if (pageNumber > 1 && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      q = query(q, limit(ITEMS_PER_PAGE));
    }
    
    return q;
  };

  // Get total count for pagination
  const getTotalCount = async () => {
    try {
      const countQuery = buildQuery(true);
      const countSnapshot = await getCountFromServer(countQuery);
      const count = countSnapshot.data().count;
      setTotalCount(count);
      setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      return count;
    } catch (error) {
      console.error('Error getting total count:', error);
      // Fallback: get all docs and count them
      try {
        const fallbackQuery = query(
          collection(db, 'page_master_tb'),
          where('status', '==', '1')
        );
        const snapshot = await getDocs(fallbackQuery);
        const count = snapshot.docs.length;
        setTotalCount(count);
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
        return count;
      } catch (fallbackError) {
        console.error('Fallback count also failed:', fallbackError);
        return 0;
      }
    }
  };
  // Get all active pages from page_master_tb with pagination and enhanced filtering
  const fetchActivePages = async (pageNumber = 1, resetPagination = false) => {
    setLoading(true);
    try {
      // Reset pagination if needed
      if (resetPagination) {
        setCurrentPage(1);
        setLastDoc(null);
        pageNumber = 1;
      }

      // Get total count first
      await getTotalCount();

      // Get paginated data
      const dataQuery = buildQuery(false, pageNumber);
      const snapshot = await getDocs(dataQuery);
      
      let pagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply state filtering (client-side since we need to join with cities)
      if (stateFilter && stateFilter !== 'all') {
        const stateCities = cities.filter(city => city.state === stateFilter);
        const stateCityIds = stateCities.map(city => city.id);
        pagesData = pagesData.filter(page => stateCityIds.includes(page.city_id));
      }

      // Apply client-side search filtering if search term exists
      const filteredPages = searchTerm
        ? pagesData.filter(page => {
            const categoryName = categories.find(cat => cat.id === page.category_id)?.name || '';
            const cityName = cities.find(city => city.id === page.city_id)?.name || '';
            const stateName = cities.find(city => city.id === page.city_id)?.state || '';
            
            return page.page_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   page.meta_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   page.page_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   page.meta_keywords?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   cityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   stateName.toLowerCase().includes(searchTerm.toLowerCase());
          })
        : pagesData;
      
      setActivePages(filteredPages);
      
      // Store last document for pagination
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      console.log('Active Pages Count:', filteredPages.length);
      console.log('Total Count:', totalCount);
      
    } catch (error) {
      console.error('Error fetching active pages:', error);
      // Fallback query without ordering
      try {
        const fallbackQ = query(
          collection(db, 'page_master_tb'),
          where('status', '==', '1'),
          limit(ITEMS_PER_PAGE)
        );
        const fallbackSnapshot = await getDocs(fallbackQ);
        const fallbackData = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivePages(fallbackData);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    }
    setLoading(false);
  };

  // Handle page navigation
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchActivePages(page);
    }
  };

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
    setLastDoc(null);
    // Trigger search with debouncing effect
    const searchTimeout = setTimeout(() => {
      fetchActivePages(1, true);
    }, 300);
    
    return () => clearTimeout(searchTimeout);
  };

  // Handle filter changes
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
    }
    
    // Reset pagination when filters change
    setCurrentPage(1);
    setLastDoc(null);
    fetchActivePages(1, true);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setCityFilter('all');
    setStateFilter('all');
    setCurrentPage(1);
    setLastDoc(null);
    fetchActivePages(1, true);
  };
  // Get active pages by specific criteria (keeping for backward compatibility)
  const fetchActivePagesByFilters = async (filters = {}) => {
    setCategoryFilter(filters.categoryId || 'all');
    setCityFilter(filters.cityId || 'all');
    setCurrentPage(1);
    setLastDoc(null);
    fetchActivePages(1, true);
  };

  // Get active pages with search functionality (keeping for backward compatibility)  
  const searchActivePages = async (searchTerm) => {
    setSearchTerm(searchTerm);
  };

  // Simple function to get count of active pages (updated)
  const getActivePageCount = async () => {
    return await getTotalCount();
  };

  // Get active pages by category (keeping for backward compatibility)
  const getActivePagesByCategory = async (categoryId) => {
    setCategoryFilter(categoryId);
    setCurrentPage(1);
    setLastDoc(null);
    fetchActivePages(1, true);
  };

  // Update your existing component's buildQuery method
  const buildQueryForActivePages = (additionalFilters = {}) => {
    let constraints = [where('status', '==', '1')];
    
    // Add additional filters
    if (additionalFilters.categoryId && additionalFilters.categoryId !== 'all') {
      constraints.push(where('category_id', '==', additionalFilters.categoryId));
    }
    
    if (additionalFilters.cityId && additionalFilters.cityId !== 'all') {
      constraints.push(where('city_id', '==', additionalFilters.cityId));
    }
    
    const q = query(
      collection(db, 'page_master_tb'),
      ...constraints,
      orderBy('createdAt', 'desc')
    );
    
    return q;
  };

  // Fetch data when component mounts
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchCities()
      ]);
      fetchActivePages(1, true);
    };
    
    initializeData();
  }, []);

  // Update search with debouncing
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (currentPage === 1) {
        fetchActivePages(1, true);
      } else {
        setCurrentPage(1);
        setLastDoc(null);
        fetchActivePages(1, true);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  const formatDate = (dateValue) => {
    if (dateValue?.toDate) {
      return dateValue.toDate().toLocaleDateString();
    } else if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleDateString();
    }
    return 'N/A';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Active Pages Management</h1>
        
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by title, URL, keywords, category, city, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All States</option>
              {states.map(state => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Cities</option>
              {cities
                .filter(city => stateFilter === 'all' || city.state === stateFilter)
                .map(city => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Reset Button */}
          <div>
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset Filters
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <button
            onClick={() => fetchActivePages(currentPage)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Refresh Data
          </button>
          <button
            onClick={() => {
              console.log('Categories:', categories);
              console.log('Cities:', cities);
              console.log('States:', states);
              console.log('Active Pages:', activePages);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Debug Data
          </button>
          <button
            onClick={() => setSearchTerm('Kitchen')}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
          >
            Search "Kitchen"
          </button>
          <button
            onClick={async () => {
              const count = await getTotalCount();
              alert(`Total Active Pages: ${count}\nCategories: ${categories.length}\nCities: ${cities.length}\nStates: ${states.length}`);
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            Show Counts
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading active pages...</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} active pages
            </div>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activePages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {page.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {page.page_title || 'Untitled'}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {page.meta_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-600">
                        <a 
                          href={createPageUrl(page)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {createPageUrl(page)}
                        </a>
                      </div>
                      {page.page_url && (
                        <div className="text-xs text-gray-500">
                          Original: {page.page_url}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {getCategoryInfo(page.category_id).name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {page.category_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {(() => {
                          const cityInfo = getCityInfo(page.city_id);
                          return cityInfo.name;
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {page.city_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {(() => {
                          const cityInfo = getCityInfo(page.city_id);
                          return cityInfo.state;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(page.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} ({totalCount} total items)
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, currentPage - 2) + i;
                if (pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-md ${
                        pageNum === currentPage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-3 py-1 text-gray-500">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
              >
                Next
              </button>
            </div>
          </div>

          {/* No Results */}
          {activePages.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No active pages found matching your criteria.</p>
              {(searchTerm || categoryFilter !== 'all' || cityFilter !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivePagesManager;