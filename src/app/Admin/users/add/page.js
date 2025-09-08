'use client';
import { useState } from 'react';
import { collection, setDoc, serverTimestamp,doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../firebase/config';
import { useRouter } from 'next/navigation';

export default function AddUser() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'viewer',
    status: 'inactive'
  });
  const [errors, setErrors] = useState({});
  const router = useRouter();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Add user document to Firestore
  // Add user document to Firestore
await setDoc(doc(db, 'users', userCredential.user.uid), {
  id: userCredential.user.uid,
  name: formData.name.trim(),
  email: formData.email.trim(),
  role: formData.role,
  status:formData.status,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});


      showToast('User created successfully!', 'success');
      setTimeout(() => {
        router.push('/Admin/users');
      }, 1500);
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: 'Email is already registered' });
        showToast('Email is already registered', 'error');
      } else if (error.code === 'auth/weak-password') {
        setErrors({ password: 'Password is too weak' });
        showToast('Password is too weak', 'error');
      } else {
        showToast('Error creating user. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const getRoleInfo = (role) => {
    const roleMap = {
      viewer: {
        icon: '👁️',
        description: 'View only access - Can browse and read content',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      editor: {
        icon: '✏️',
        description: 'Edit access - Can view and modify content',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      admin: {
        icon: '👑',
        description: 'Full access - Complete system administration',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      }
    };
    return roleMap[role] || roleMap.viewer;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Add New User</h1>
              <p className="text-gray-600">Create a new user account with appropriate role assignment</p>
            </div>
            <button
              onClick={() => router.push('/Admin/users')}
              className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to Users
            </button>
          </div>
        </div>

        {/* Main Form */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
              <div className="flex items-center">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">User Account Information</h2>
                  <p className="text-blue-100">Fill in the details to create a new user account</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Personal Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      Personal Information
                    </h3>

                    {/* Name Field */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Enter full name"
                      />
                      {errors.name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Enter email address"
                      />
                      {errors.email && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Security & Role */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      Security & Access
                    </h3>

                    {/* Password Field */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Enter password (min. 6 characters)"
                      />
                      {errors.password && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        placeholder="Confirm password"
                      />
                      {errors.confirmPassword && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Selection Section */}
              <div className="mt-8 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                  User Role & Permissions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['viewer', 'editor', 'admin'].map((role) => {
                    const roleInfo = getRoleInfo(role);
                    return (
                      <label 
                        key={role}
                        className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                          formData.role === role 
                            ? `border-blue-500 ${roleInfo.bgColor} transform scale-105 shadow-lg` 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={formData.role === role}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className={`text-3xl mb-2 ${formData.role === role ? 'transform scale-110' : ''} transition-transform duration-300`}>
                            {roleInfo.icon}
                          </div>
                          <div className={`font-semibold capitalize mb-1 ${formData.role === role ? roleInfo.color : 'text-gray-700'}`}>
                            {role}
                          </div>
                          <div className="text-sm text-gray-600">
                            {roleInfo.description}
                          </div>
                        </div>
                        {formData.role === role && (
                          <div className="absolute top-2 right-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
                {errors.role && (
                  <p className="mt-3 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {errors.role}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => router.push('/Admin/users')}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating User...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                      </svg>
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}