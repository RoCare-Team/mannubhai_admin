'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, runTransaction, collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebase/config';
import dynamic from 'next/dynamic';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BlogEditor = dynamic(() => import('../../../Compoents/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="p-3 border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
      <div className="p-6 min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-500">Loading TinyMCE editor...</div>
        </div>
      </div>
    </div>
  )
});

export default function AddBlogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('Ready');
  const router = useRouter();

  const [formData, setFormData] = useState({
    blog_title: '',
    blog_description: '',
    blog_keywords: '',
    blog_url: '',
    blog_cat_id: '',
    blog_image: '',
    blog_date: new Date().toISOString().split('T')[0],
    status: 'draft',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    robots: 'index, follow',
    canonical: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-generate URL slug from title
  useEffect(() => {
    if (formData.blog_title && !formData.blog_url) {
      const slug = formData.blog_title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .trim();
      
      setFormData(prev => ({
        ...prev,
        blog_url: slug
      }));
    }
  }, [formData.blog_title]);

  // Auto-generate meta title and description from content
  useEffect(() => {
    // Auto-generate meta title if not set
    if (formData.blog_title && !formData.meta_title) {
      setFormData(prev => ({
        ...prev,
        meta_title: formData.blog_title.length > 60 
          ? formData.blog_title.substring(0, 57) + '...' 
          : formData.blog_title
      }));
    }

    // Auto-generate meta description from content if not set
    if (formData.blog_description && !formData.meta_description) {
      // Strip HTML tags and get plain text
      const plainText = formData.blog_description.replace(/<[^>]*>/g, '');
      if (plainText.length > 10) {
        const description = plainText.length > 160 
          ? plainText.substring(0, 157) + '...' 
          : plainText;
        
        setFormData(prev => ({
          ...prev,
          meta_description: description
        }));
      }
    }
  }, [formData.blog_title, formData.blog_description]);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'blog_category'));
      const categoriesData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only show active categories
        if (data.status === 'active') {
          categoriesData.push({ 
            id: doc.id, 
            ...data 
          });
        }
      });
      setCategories(categoriesData);
      console.log('Categories loaded:', categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      updated_at: new Date().toISOString()
    }));
  };

  const handleEditorChange = (content) => {
    console.log('Editor content changed:', content.length, 'characters');
    setFormData(prev => ({
      ...prev,
      blog_description: content,
      updated_at: new Date().toISOString()
    }));
    
    // Show content update feedback
    setAutoSaveStatus('Modified');
    setTimeout(() => setAutoSaveStatus('Ready'), 2000);
  };

  const uploadImage = async () => {
    if (!imageUpload) return '';

    setImageUploading(true);
    try {
      const imageRef = ref(storage, `blogs/${Date.now()}_${imageUpload.name}`);
      const snapshot = await uploadBytes(imageRef, imageUpload);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setImageUploading(false);
      toast.success('Image uploaded successfully');
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      setImageUploading(false);
      toast.error('Failed to upload image');
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Enhanced validation
    if (!formData.blog_title.trim()) {
      toast.error("Blog title is required");
      return;
    }
    
    if (!formData.blog_description.trim()) {
      toast.error("Blog content is required");
      return;
    }

    if (!formData.blog_cat_id) {
      toast.error("Please select a category");
      return;
    }

    // Validate content length
    const plainTextContent = formData.blog_description.replace(/<[^>]*>/g, '');
    if (plainTextContent.length < 100) {
      toast.error("Blog content should be at least 100 characters long");
      return;
    }

    setLoading(true);
    setAutoSaveStatus('Saving...');

    try {
      // Upload image if selected
      let imageUrl = formData.blog_image;
      if (imageUpload) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          setLoading(false);
          setAutoSaveStatus('Error');
          return;
        }
      }

      // Step 1: get next blog_id with a Firestore transaction
      const counterRef = doc(db, "metadata", "blogCounter");
      const blog_id = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newId = 1;
        if (counterDoc.exists()) {
          newId = counterDoc.data().lastId + 1;
        }
        transaction.set(counterRef, { lastId: newId });
        return newId;
      });

      // Step 2: prepare blog data
      const blogData = {
        ...formData,
        blog_id, // <-- numeric ID
        blog_image: imageUrl,
        word_count: plainTextContent.split(/\s+/).length,
        reading_time: Math.ceil(plainTextContent.split(/\s+/).length / 200), // ~200 words per minute
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('Saving blog with data:', {
        ...blogData,
        blog_description: `${blogData.blog_description.slice(0, 100)}...` // Log only first 100 chars
      });

      // Step 3: save blog (random Firestore ID + numeric field inside)
      await addDoc(collection(db, "blogs"), blogData);

      setAutoSaveStatus('Saved');
      toast.success("Blog added successfully!");
      setTimeout(() => {
        router.push("/Admin/blog");
      }, 1500);
    } catch (error) {
      console.error("Error adding blog:", error);
      toast.error("Error adding blog");
      setLoading(false);
      setAutoSaveStatus('Error');
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.blog_title.trim()) {
      toast.error("Blog title is required to save draft");
      return;
    }

    // Save as draft with current status
    const currentStatus = formData.status;
    setFormData(prev => ({ ...prev, status: 'draft' }));
    
    // Trigger form submission
    const form = document.getElementById('blog-form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    
    // Restore original status if it wasn't draft
    if (currentStatus !== 'draft') {
      setTimeout(() => {
        setFormData(prev => ({ ...prev, status: currentStatus }));
      }, 100);
    }
  };

  const getWordCount = () => {
    const plainText = formData.blog_description.replace(/<[^>]*>/g, '');
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  };

  const getReadingTime = () => {
    const wordCount = getWordCount();
    return Math.ceil(wordCount / 200); // Assuming 200 words per minute
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Add New Blog</h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    autoSaveStatus === 'Ready' ? 'bg-green-500' :
                    autoSaveStatus === 'Modified' ? 'bg-yellow-500' :
                    autoSaveStatus === 'Saving...' ? 'bg-blue-500' :
                    autoSaveStatus === 'Saved' ? 'bg-green-500' :
                    'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">{autoSaveStatus}</span>
                </div>
                {formData.blog_description && (
                  <div className="text-sm text-gray-600">
                    {getWordCount()} words • {getReadingTime()} min read
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading || !formData.blog_title.trim()}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={() => router.push('/Admin/blog/category')}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
              >
                Manage Categories
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <form id="blog-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="blog_title" className="block text-sm font-medium text-gray-700">
                    Blog Title *
                  </label>
                  <input
                    type="text"
                    id="blog_title"
                    name="blog_title"
                    value={formData.blog_title}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter an engaging blog title..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.blog_title.length}/100 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="blog_cat_id" className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <select
                    id="blog_cat_id"
                    name="blog_cat_id"
                    value={formData.blog_cat_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      No active categories found. Please create a category first.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="blog_url" className="block text-sm font-medium text-gray-700">
                    Blog URL Slug
                  </label>
                  <input
                    type="text"
                    id="blog_url"
                    name="blog_url"
                    value={formData.blog_url}
                    onChange={handleInputChange}
                    placeholder="auto-generated-from-title"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-generated from title. Edit if needed.
                  </p>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="blog_image" className="block text-sm font-medium text-gray-700">
                    Featured Image
                  </label>
                  <input
                    type="file"
                    id="blog_image"
                    onChange={(e) => setImageUpload(e.target.files[0])}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    accept="image/*"
                  />
                  {imageUploading && (
                    <p className="text-sm text-blue-600 mt-1 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading image...
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 1200x630px (PNG, JPG, WebP)
                  </p>
                </div>

                <div>
                  <label htmlFor="blog_date" className="block text-sm font-medium text-gray-700">
                    Publish Date
                  </label>
                  <input
                    type="date"
                    id="blog_date"
                    name="blog_date"
                    value={formData.blog_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="blog_description" className="block text-sm font-medium text-gray-700 mb-2">
                  Blog Content *
                  <span className="text-xs text-gray-500 ml-2">
                    ({formData.blog_description ? formData.blog_description.length : 0} characters)
                  </span>
                </label>
                <BlogEditor 
                  content={formData.blog_description} 
                  onChange={handleEditorChange} 
                />
                {formData.blog_description && (
                  <div className="mt-2 text-xs text-gray-500">
                    Word count: {getWordCount()} | Estimated reading time: {getReadingTime()} minutes
                  </div>
                )}
              </div>

              {/* SEO Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">SEO & Meta Information</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      id="meta_title"
                      name="meta_title"
                      value={formData.meta_title}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Auto-generated from blog title"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.meta_title.length}/60 characters (recommended)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="meta_keywords" className="block text-sm font-medium text-gray-700">
                      Meta Keywords
                    </label>
                    <input
                      type="text"
                      id="meta_keywords"
                      name="meta_keywords"
                      value={formData.meta_keywords}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700">
                      Meta Description
                    </label>
                    <textarea
                      id="meta_description"
                      name="meta_description"
                      value={formData.meta_description}
                      onChange={handleInputChange}
                      rows="3"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Auto-generated from content. Edit to customize."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.meta_description.length}/160 characters (recommended)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="robots" className="block text-sm font-medium text-gray-700">
                      Robots Meta
                    </label>
                    <select
                      id="robots"
                      name="robots"
                      value={formData.robots}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="index, follow">Index, Follow</option>
                      <option value="noindex, follow">Noindex, Follow</option>
                      <option value="index, nofollow">Index, Nofollow</option>
                      <option value="noindex, nofollow">Noindex, Nofollow</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="canonical" className="block text-sm font-medium text-gray-700">
                      Canonical URL
                    </label>
                    <input
                      type="url"
                      id="canonical"
                      name="canonical"
                      value={formData.canonical}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="https://yourdomain.com/blog/your-post"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => router.push('/Admin/blog')}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || categories.length === 0 || imageUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Blog'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}