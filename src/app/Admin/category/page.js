'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, orderBy, query, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config'; 
import { useAuth } from '@/app/hooks/useAuth';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CategoryManagement = () => {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    category_name: '',
    category_url: '',
    status: '1',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  // Fetch categories
  useEffect(() => {
    if (!user) return;
    
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const q = query(collection(db, 'category_manage'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const categoriesData = [];
        querySnapshot.forEach((doc) => {
          categoriesData.push({ firestoreId: doc.id, ...doc.data() });
        });
        
        setCategories(categoriesData);
        setLoadingCategories(false);
      } catch (error) {
        console.error('Error fetching categories:', error);
        showToast('Error loading categories', 'error');
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [user]);

  // Toggle category status
  const toggleStatus = async (category) => {
    try {
      if (!category || !category.firestoreId) {
        showToast('Invalid category data', 'error');
        return;
      }
      
      const categoryRef = doc(db, 'category_manage', category.firestoreId);
      const currentStatus = category.status || '1';
      const newStatus = currentStatus === '1' ? '0' : '1';
      
      await updateDoc(categoryRef, {
        status: newStatus
      });
      
      showToast(`Status updated to ${newStatus === '1' ? 'Active' : 'Inactive'}`, 'success');
      
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.firestoreId === category.firestoreId 
            ? { ...cat, status: newStatus } 
            : cat
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Error updating status. Please try again.', 'error');
    }
  };

  // Delete category
  const deleteCategory = async (firestoreId) => {
    try {
      await deleteDoc(doc(db, 'category_manage', firestoreId));
      showToast('Category deleted successfully', 'success');
      
      setCategories(prevCategories => 
        prevCategories.filter(cat => cat.firestoreId !== firestoreId)
      );
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast('Error deleting category. Please try again.', 'error');
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Open edit modal with category data
  const openEditModal = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  // Save category (add or update)
  const saveCategory = async () => {
    try {
      if (editingCategory) {
        const docRef = doc(db, 'category_manage', editingCategory.firestoreId);
        await updateDoc(docRef, {
          category_name: editingCategory.category_name,
          category_url: editingCategory.category_url,
          status: editingCategory.status,
          updated_at: new Date().toISOString()
        });
        
        showToast('Category updated successfully', 'success');
        
        setCategories(prevCategories => 
          prevCategories.map(cat => 
            cat.firestoreId === editingCategory.firestoreId 
              ? { ...cat, ...editingCategory } 
              : cat
          )
        );
      } else {
        const docRef = await addDoc(collection(db, 'category_manage'), {
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        showToast('Category added successfully', 'success');
        
        setCategories(prevCategories => [
          { firestoreId: docRef.id, ...formData },
          ...prevCategories
        ]);
      }
      
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({ category_name: '', category_url: '', status: '1' });
    } catch (error) {
      console.error('Error saving category:', error);
      showToast('Error saving category. Please try again.', 'error');
    }
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(category => 
    (category.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.category_url || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Category Management
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Manage your categories and their status with ease
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
            <span className="hidden sm:inline">Total Categories:</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
              {categories.length}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full mx-auto transform transition-all duration-300 ease-in-out ${
          toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className={`flex items-center p-4 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`flex-shrink-0 ${
              toast.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {toast.type === 'success' ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5" />
              )}
            </div>
            <div className={`ml-3 text-sm font-medium ${
              toast.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {toast.message}
            </div>
          </div>
        </div>
      )}

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64 lg:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
          />
        </div>
        
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ category_name: '', category_url: '', status: '1' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Category
        </button>
      </div>

      {/* Categories Table/Cards */}
      {loadingCategories ? (
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 absolute top-0"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">URL</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            {searchQuery ? 'No categories found matching your search' : 'No categories available'}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first category'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => (
                      <tr key={category.firestoreId} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-medium">
                            {category.main_cat_name || 'General'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-semibold text-gray-900">
                              {category.category_name || 'Unnamed Category'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {category.id || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {category.category_url || 'No URL'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleStatus(category)}
                              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                (category.status || '1') === '1' 
                                  ? 'bg-green-500 focus:ring-green-500' 
                                  : 'bg-gray-300 focus:ring-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                  (category.status || '1') === '1' ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className={`ml-3 text-sm font-medium ${
                              (category.status || '1') === '1' ? 'text-green-700' : 'text-gray-500'
                            }`}>
                              {(category.status || '1') === '1' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => openEditModal(category)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmation(category)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredCategories.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-200">
                <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No categories found' : 'No categories available'}
                </p>
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first category'}
                </p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.firestoreId} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {category.category_name || 'Unnamed Category'}
                      </h3>
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleStatus(category)}
                          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 ${
                            (category.status || '1') === '1' ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              (category.status || '1') === '1' ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Service</p>
                        <p className="text-sm text-gray-900">{category.main_cat_name || 'General'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">URL</p>
                        <p className="text-sm text-gray-900 break-all">{category.category_url || 'No URL'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (category.status || '1') === '1' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {(category.status || '1') === '1' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => openEditModal(category)}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation(category)}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-xl text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Category</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete "{deleteConfirmation.category_name}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteCategory(deleteConfirmation.firestoreId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCategory(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={editingCategory?.category_name || formData.category_name}
                    onChange={(e) => editingCategory 
                      ? setEditingCategory({...editingCategory, category_name: e.target.value})
                      : setFormData({...formData, category_name: e.target.value})
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter category name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category URL *
                  </label>
                  <input
                    type="text"
                    value={editingCategory?.category_url || formData.category_url}
                    onChange={(e) => editingCategory 
                      ? setEditingCategory({...editingCategory, category_url: e.target.value})
                      : setFormData({...formData, category_url: e.target.value})
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Enter category URL"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editingCategory?.status || formData.status}
                    onChange={(e) => editingCategory 
                      ? setEditingCategory({...editingCategory, status: e.target.value})
                      : setFormData({...formData, status: e.target.value})
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
                {editingCategory && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Firestore ID
                    </label>
                    <input
                      type="text"
                      value={editingCategory.firestoreId}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                      disabled
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCategory(null);
                }}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
              >
                {editingCategory ? 'Update' : 'Create'} Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;