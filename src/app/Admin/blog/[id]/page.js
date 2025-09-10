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
    const [coverImageUpload, setCoverImageUpload] = useState(null);
    const [image3Upload, setImage3Upload] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [editorKey, setEditorKey] = useState(0);
    const [autoSaveStatus, setAutoSaveStatus] = useState('Ready');
    const router = useRouter();
    const params = useParams();
    const blogId = params.id;

    // Complete formData matching the add blog structure
    const [formData, setFormData] = useState({
      // Core fields
      id: null,
      blog_id: null,
      blog_name: '',
      blog_title: '',
      blog_description: '',
      blog_content_text: '',
      blog_keywords: '',
      blog_url: '',
      blog_cat_id: '',
      blog_image: '',
      blog_image_cover: '',
      blog_date: new Date().toISOString().split('T')[0],
      blog_type: null,
      
      // Meta fields
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      canonical: '',
      Canonical: '', // Duplicate field as in your structure
      robots: 'index, follow',
      Robots: 'index, follow', // Uppercase version
      
      // Status and timestamps
      status: 'draft',
      publishdate: new Date().toISOString().split('T')[0],
      created_at: '',
      update_time: '',
      createdAt: null,
      updatedAt: '',
      updated_at: '',
      
      // Additional fields
      author_name: 'ADMIN',
      user_id: null,
      image3: null,
      
      // Calculated fields
      word_count: 0,
      reading_time: 0,
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
          console.log('Fetched blog data:', blogData);
          
          // Map all fields from the database
          const updatedFormData = {
            // Core fields - ensure numeric IDs are preserved
            id: blogData.id || parseInt(blogId) || null,
            blog_id: blogData.blog_id || parseInt(blogId) || null,
            blog_name: blogData.blog_name || '',
            blog_title: blogData.blog_title || '',
            blog_description: blogData.blog_description || '',
            blog_content_text: blogData.blog_content_text || '',
            blog_keywords: blogData.blog_keywords || '',
            blog_url: blogData.blog_url || '',
            blog_cat_id: blogData.blog_cat_id || '',
            blog_image: blogData.blog_image || '',
            blog_image_cover: blogData.blog_image_cover || '',
            blog_date: blogData.blog_date || new Date().toISOString().split('T')[0],
            blog_type: blogData.blog_type || null,
            
            // Meta fields
            meta_title: blogData.meta_title || '',
            meta_description: blogData.meta_description || '',
            meta_keywords: blogData.meta_keywords || '',
            canonical: blogData.canonical || '',
            Canonical: blogData.Canonical || blogData.canonical || '',
            robots: blogData.robots || 'index, follow',
            Robots: blogData.Robots || blogData.robots || 'index, follow',
            
            // Status and timestamps
            status: blogData.status || 'draft',
            publishdate: blogData.publishdate || new Date().toISOString().split('T')[0],
            created_at: blogData.created_at || '',
            update_time: blogData.update_time || '',
            createdAt: blogData.createdAt || null,
            updatedAt: blogData.updatedAt || '',
            updated_at: blogData.updated_at || '',
            
            // Additional fields
            author_name: blogData.author_name || 'ADMIN',
            user_id: blogData.user_id || null,
            image3: blogData.image3 || null,
            
            // Calculated fields
            word_count: blogData.word_count || 0,
            reading_time: blogData.reading_time || 0,
          };
          
          setFormData(updatedFormData);
          setEditorKey(prev => prev + 1); // Force editor re-render
          
          console.log('Form data updated:', updatedFormData);
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
          const data = doc.data();
          if (data.status === 'active') {
            categoriesData.push({ 
              id: doc.id, 
              name: data.name || data.category_name || 'Unnamed Category',
              ...data 
            });
          }
        });
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      const now = new Date();
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        updatedAt: now.toISOString(),
        updated_at: now.toISOString(),
        update_time: now.toISOString()
      }));

      // Auto-generate URL slug if title changes
      if (name === 'blog_title' && value) {
        const slug = value
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim();
        
        setFormData(prev => ({
          ...prev,
          blog_url: prev.blog_url || slug,
          blog_name: value,
          meta_title: prev.meta_title || (value.length > 60 ? value.substring(0, 57) + '...' : value)
        }));
      }

      setAutoSaveStatus('Modified');
      setTimeout(() => setAutoSaveStatus('Ready'), 2000);
    };

    const handleEditorChange = (content) => {
      console.log('Editor content changed:', content.length, 'characters');
      const now = new Date();
      
      // Calculate word count and reading time
      const plainText = content.replace(/<[^>]*>/g, '');
      const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
      const readingTime = Math.ceil(wordCount / 200);
      
      // Auto-generate description and meta description if not set
      let autoDescription = formData.blog_description;
      let autoMetaDescription = formData.meta_description;
      
      if (!autoDescription && plainText.length > 10) {
        autoDescription = plainText.length > 200 
          ? plainText.substring(0, 197) + '...' 
          : plainText;
      }
      
      if (!autoMetaDescription && plainText.length > 10) {
        autoMetaDescription = plainText.length > 160 
          ? plainText.substring(0, 157) + '...' 
          : plainText;
      }
      
      setFormData(prev => ({
        ...prev,
        blog_content_text: content,
        blog_description: prev.blog_description || autoDescription,
        meta_description: prev.meta_description || autoMetaDescription,
        word_count: wordCount,
        reading_time: readingTime,
        updatedAt: now.toISOString(),
        updated_at: now.toISOString(),
        update_time: now.toISOString()
      }));
      
      setAutoSaveStatus('Modified');
      setTimeout(() => setAutoSaveStatus('Ready'), 2000);
    };

    const uploadImage = async (file, folder = 'blogs') => {
      if (!file) return '';

      setImageUploading(true);
      try {
        // Create a unique filename with timestamp
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const imageRef = ref(storage, `${folder}/${fileName}`);
        const snapshot = await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        toast.success('Image uploaded successfully');
        return downloadURL;
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image: ' + error.message);
        return '';
      } finally {
        setImageUploading(false);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Enhanced validation
      if (!formData.blog_title.trim()) {
        toast.error('Blog title is required');
        return;
      }
      
      if (!formData.blog_content_text.trim()) {
        toast.error('Blog content is required');
        return;
      }

      if (!formData.blog_cat_id) {
        toast.error('Please select a category');
        return;
      }

      // Validate content length
      const plainTextContent = formData.blog_content_text.replace(/<[^>]*>/g, '');
      if (plainTextContent.length < 100) {
        toast.error('Blog content should be at least 100 characters long');
        return;
      }
      
      setSaving(true);
      setAutoSaveStatus('Saving...');

      try {
        // Upload images if selected
        let imageUrl = formData.blog_image;
        let coverImageUrl = formData.blog_image_cover;
        let image3Url = formData.image3;

        if (imageUpload) {
          imageUrl = await uploadImage(imageUpload, 'blogs');
          if (!imageUrl) {
            setSaving(false);
            setAutoSaveStatus('Error');
            return;
          }
        }

        if (coverImageUpload) {
          coverImageUrl = await uploadImage(coverImageUpload, 'blogs/covers');
          if (!coverImageUrl) {
            setSaving(false);
            setAutoSaveStatus('Error');
            return;
          }
        }

        if (image3Upload) {
          image3Url = await uploadImage(image3Upload, 'blogs/additional');
          if (!image3Url) {
            setSaving(false);
            setAutoSaveStatus('Error');
            return;
          }
        }

        // Prepare updated blog data
        const now = new Date();
        const blogData = {
          // Preserve existing IDs - both should be numeric
          id: formData.id || parseInt(blogId),
          blog_id: formData.blog_id || parseInt(blogId),
          
          // Core fields
          blog_name: formData.blog_name || formData.blog_title,
          blog_title: formData.blog_title,
          blog_description: formData.blog_description,
          blog_content_text: formData.blog_content_text,
          blog_keywords: formData.blog_keywords,
          blog_url: formData.blog_url,
          blog_cat_id: formData.blog_cat_id,
          blog_image: imageUrl,
          blog_image_cover: coverImageUrl || null,
          blog_date: formData.blog_date,
          blog_type: formData.blog_type,
          
          // Meta fields
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          meta_keywords: formData.meta_keywords,
          canonical: formData.canonical,
          Canonical: formData.canonical, // Duplicate field
          robots: formData.robots,
          Robots: formData.robots, // Uppercase version
          
          // Status and dates - preserve creation data, update modification data
          status: formData.status,
          publishdate: formData.publishdate,
          created_at: formData.created_at, // Preserve original
          update_time: now.toISOString().replace('T', ' ').substring(0, 19),
          createdAt: formData.createdAt, // Preserve original
          updatedAt: now.toISOString(),
          updated_at: now.toISOString(),
          
          // Additional fields
          author_name: formData.author_name,
          user_id: formData.user_id,
          image3: image3Url || null,
          
          // Calculated fields
          word_count: formData.word_count,
          reading_time: formData.reading_time,
        };

        console.log('Updating blog with data:', {
          ...blogData,
          blog_content_text: `${blogData.blog_content_text.slice(0, 100)}...`
        });

        // Update in Firestore
        const docRef = doc(db, 'blog', blogId);
        await updateDoc(docRef, blogData);
        
        setAutoSaveStatus('Saved');
        toast.success('Blog updated successfully!');
        setTimeout(() => {
          router.push('/Admin/blog');
        }, 1500);
      } catch (error) {
        console.error('Error updating blog:', error);
        toast.error('Error updating blog: ' + error.message);
        setSaving(false);
        setAutoSaveStatus('Error');
      }
    };

    const handleSaveDraft = async () => {
      if (!formData.blog_title.trim()) {
        toast.error('Blog title is required to save draft');
        return;
      }

      const currentStatus = formData.status;
      setFormData(prev => ({ ...prev, status: 'draft' }));
      
      const form = document.getElementById('edit-blog-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
      
      if (currentStatus !== 'draft') {
        setTimeout(() => {
          setFormData(prev => ({ ...prev, status: currentStatus }));
        }, 100);
      }
    };

    const getWordCount = () => {
      const plainText = formData.blog_content_text.replace(/<[^>]*>/g, '');
      return plainText.split(/\s+/).filter(word => word.length > 0).length;
    };

    const getReadingTime = () => {
      const wordCount = getWordCount();
      return Math.ceil(wordCount / 200);
    };

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
                <h1 className="text-2xl font-semibold text-gray-900">
                  Edit Blog #{formData.id || formData.blog_id || blogId}
                </h1>
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
                  {formData.updated_at && (
                    <p className="text-sm text-gray-600">
                      Last updated: {new Date(formData.updated_at).toLocaleString()}
                    </p>
                  )}
                  {formData.blog_content_text && (
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
                  disabled={saving || !formData.blog_title.trim()}
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
              <form id="edit-blog-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
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
                        placeholder="Enter an engaging blog title..."
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
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="blog_description" className="block text-sm font-medium text-gray-700">
                        Blog Description
                      </label>
                      <textarea
                        id="blog_description"
                        name="blog_description"
                        value={formData.blog_description}
                        onChange={handleInputChange}
                        rows="3"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Brief description of the blog post..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.blog_description.length}/300 characters
                      </p>
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
                    </div>

                    <div>
                      <label htmlFor="blog_keywords" className="block text-sm font-medium text-gray-700">
                        Blog Keywords
                      </label>
                      <input
                        type="text"
                        id="blog_keywords"
                        name="blog_keywords"
                        value={formData.blog_keywords}
                        onChange={handleInputChange}
                        placeholder="keyword1, keyword2, keyword3"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="author_name" className="block text-sm font-medium text-gray-700">
                        Author Name
                      </label>
                      <input
                        type="text"
                        id="author_name"
                        name="author_name"
                        value={formData.author_name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Author name"
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
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Images Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Images</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                      {formData.blog_image && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">Current image:</p>
                          <img 
                            src={formData.blog_image} 
                            alt="Featured image" 
                            className="h-20 w-32 object-cover mt-1 rounded border"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="blog_image_cover" className="block text-sm font-medium text-gray-700">
                        Cover Image
                      </label>
                      <input
                        type="file"
                        id="blog_image_cover"
                        onChange={(e) => setCoverImageUpload(e.target.files[0])}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        accept="image/*"
                      />
                      {formData.blog_image_cover && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">Current cover:</p>
                          <img 
                            src={formData.blog_image_cover} 
                            alt="Cover image" 
                            className="h-20 w-32 object-cover mt-1 rounded border"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="image3" className="block text-sm font-medium text-gray-700">
                        Additional Image
                      </label>
                      <input
                        type="file"
                        id="image3"
                        onChange={(e) => setImage3Upload(e.target.files[0])}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        accept="image/*"
                      />
                      {formData.image3 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">Current additional:</p>
                          <img 
                            src={formData.image3} 
                            alt="Additional image" 
                            className="h-20 w-32 object-cover mt-1 rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {imageUploading && (
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading images...
                    </p>
                  )}
                </div>

                {/* Dates Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Publishing Information</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="blog_date" className="block text-sm font-medium text-gray-700">
                        Blog Date
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

                    <div>
                      <label htmlFor="publishdate" className="block text-sm font-medium text-gray-700">
                        Publish Date
                      </label>
                      <input
                        type="date"
                        id="publishdate"
                        name="publishdate"
                        value={formData.publishdate}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="border-t pt-6">
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
                  {formData.blog_content_text && (
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

                {/* Additional Options Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Options</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="blog_type" className="block text-sm font-medium text-gray-700">
                        Blog Type
                      </label>
                      <select
                        id="blog_type"
                        name="blog_type"
                        value={formData.blog_type || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Blog Type (Optional)</option>
                        <option value="article">Article</option>
                        <option value="news">News</option>
                        <option value="tutorial">Tutorial</option>
                        <option value="review">Review</option>
                        <option value="guide">Guide</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                        User ID
                      </label>
                      <input
                        type="text"
                        id="user_id"
                        name="user_id"
                        value={formData.user_id || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Optional user ID"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
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
                    disabled={saving || categories.length === 0 || imageUploading}
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