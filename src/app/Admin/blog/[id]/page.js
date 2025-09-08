'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebase/config';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BlogEditor from '@/app/Compoents/BlogEditor';

export default function EditBlogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [editorKey, setEditorKey] = useState(0); 
  const router = useRouter();
  const params = useParams();
  const blogId = params.id;

  const [formData, setFormData] = useState({
    blog_title: '',
    blog_content_text: '',
    blog_content_text:'',
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
    updated_at: new Date().toISOString(),
  });

  useEffect(() => {
    if (blogId) {
      fetchBlog();
      fetchCategories();
    }
  }, [blogId]);

  const fetchBlog = async () => {
    try {
      const docRef = doc(db, 'blog', blogId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const blogData = docSnap.data();
        const updatedFormData = {
          blog_title: blogData.blog_title || '',
          blog_content_text: blogData.blog_content_text || '',
          blog_content_text:blogData.blog_content_text || '',
          blog_keywords: blogData.blog_keywords || '',
          blog_url: blogData.blog_url || '',
          blog_cat_id: blogData.blog_cat_id || '',
          blog_image: blogData.blog_image || '',
          blog_date: blogData.blog_date || new Date().toISOString().split('T')[0],
          status: blogData.status || 'draft',
          meta_title: blogData.meta_title || '',
          meta_description: blogData.meta_description || '',
          meta_keywords: blogData.meta_keywords || '',
          robots: blogData.robots || 'index, follow',
          canonical: blogData.canonical || '',
        };
        
        setFormData(updatedFormData);
        // Force editor to re-render with new content
        setEditorKey(prev => prev + 1);
      } else {
        toast.error('Blog not found');
        setTimeout(() => {
          router.push('/Admin/blog');
        }, 1500);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Error loading blog');
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'blog_category'));
      const categoriesData = [];
      querySnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() });
      });
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditorChange = (content) => {
    console.log('Editor content changed:', content.length, 'characters');
    setFormData(prev => ({
      ...prev,
      blog_content_text: content
    }));
  };

  const uploadImage = async () => {
    if (!imageUpload) return formData.blog_image;

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
      return formData.blog_image;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.blog_title.trim()) {
      toast.error('Blog title is required');
      return;
    }
    
    if (!formData.blog_content_text.trim()) {
      toast.error('Blog content is required');
      return;
    }
    
    setSaving(true);

    try {
      // Upload image if selected
      const imageUrl = await uploadImage();

      // Prepare blog data
      const blogData = {
        ...formData,
        blog_image: imageUrl,
        updatedAt: new Date().toISOString(),
      };

      console.log('Updating blog with data:', {
        ...blogData,
        blog_content_text: `${blogData.blog_content_text.slice(0, 100)}...` // Log only first 100 chars
      });

      // Update in Firestore
      const docRef = doc(db, 'blog', blogId);
      await updateDoc(docRef, blogData);
      
      toast.success('Blog updated successfully!');
      setTimeout(() => {
        router.push('/Admin/blog');
      }, 1500);
    } catch (error) {
      console.error('Error updating blog:', error);
      toast.error('Error updating blog');
      setSaving(false);
    }
  };

  const handleAutoSave = () => {
    if (formData.blog_title.trim() || formData.blog_content_text.trim()) {
      // Auto-save logic here if needed
      console.log('Auto-saving content...');
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      handleAutoSave();
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [formData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">Loading blog content...</div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-semibold text-gray-900">Edit Blog</h1>
              <p className="text-sm text-gray-600 mt-1">
                Last updated: {new Date(formData.updated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Auto-save enabled</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    required
                    placeholder="Enter your blog title..."
                  />
                </div>

                <div>
                  <label htmlFor="blog_cat_id" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="blog_cat_id"
                    name="blog_cat_id"
                    value={formData.blog_cat_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
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
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="blog-url-slug"
                  />
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
                  </select>
                </div>

                <div>
                  <label htmlFor="blog_image" className="block text-sm font-medium text-gray-700">
                    Blog Featured Image
                  </label>
                  <input
                    type="file"
                    id="blog_image"
                    onChange={(e) => setImageUpload(e.target.files[0])}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    accept="image/*"
                  />
                  {formData.blog_image && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Current image:</p>
                      <img 
                        src={formData.blog_image} 
                        alt="Blog featured image" 
                        className="h-20 w-32 object-cover mt-1 rounded border"
                      />
                    </div>
                  )}
                  {imageUploading && (
                    <p className="text-sm text-blue-600 mt-1 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading image...
                    </p>
                  )}
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
                <label htmlFor="blog_content_text" className="block text-sm font-medium text-gray-700 mb-2">
                  Blog Content * 
                  <span className="text-xs text-gray-500 ml-2">
                    ({formData.blog_content_text ? formData.blog_content_text.length : 0} characters)
                  </span>
                </label>
                <BlogEditor
                  key={editorKey} // Force re-render when content loads
                  content={formData.blog_content_text} 
                  onChange={handleEditorChange} 
                />
              </div>

              {/* SEO Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
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
                      placeholder="SEO title for search engines"
                    />
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
                      placeholder="Brief description for search engine results (150-160 characters recommended)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.meta_description.length}/160 characters
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
                      placeholder="https://example.com/canonical-url"
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
                  disabled={saving || imageUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Blog'
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