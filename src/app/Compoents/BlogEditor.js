'use client';
import { useState, useEffect, useRef } from 'react';

export default function BlogEditor({ content = '', onChange }) {
  const [editorContent, setEditorContent] = useState(content);
  const [isMounted, setIsMounted] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Load TinyMCE script
    const script = document.createElement('script');
    script.src = 'https://cdn.tiny.cloud/1/yxdhva453fg3g09khl32w7ymlhccugq44bu87haqbgjomjhz/tinymce/7/tinymce.min.js';
    script.referrerPolicy = 'origin';
    
    script.onload = () => {
      initializeTinyMCE();
    };
    
    document.head.appendChild(script);

    return () => {
      if (window.tinymce) {
        window.tinymce.remove('#tinymce-editor');
      }
    };
  }, []);

  useEffect(() => {
    if (content !== editorContent && isEditorReady) {
      setEditorContent(content);
      if (window.tinymce && editorRef.current) {
        window.tinymce.get('tinymce-editor')?.setContent(content);
      }
    }
  }, [content, isEditorReady]);

  const initializeTinyMCE = () => {
    if (!window.tinymce) return;

    window.tinymce.init({
      selector: '#tinymce-editor',
      plugins: [
        // Core editing features
        'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 
        'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
        // Premium features (if available)
        'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 
        'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 
        'advtable', 'advcode', 'advtemplate', 'ai', 'uploadcare', 'mentions', 
        'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 
        'typography', 'inlinecss', 'markdown', 'importword', 'exportword', 'exportpdf'
      ],
      toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
      tinycomments_mode: 'embedded',
      tinycomments_author: 'Author name',
      mergetags_list: [
        { value: 'First.Name', title: 'First Name' },
        { value: 'Email', title: 'Email' },
      ],
      ai_request: (request, respondWith) => respondWith.string(() => Promise.reject('See docs to implement AI Assistant')),
      uploadcare_public_key: '77f9a687d5ec35f210eb',
      height: 400,
      menubar: false,
      branding: false,
      setup: (editor) => {
        editor.on('init', () => {
          setIsEditorReady(true);
          editor.setContent(editorContent);
        });
        
        editor.on('change keyup', () => {
          const newContent = editor.getContent();
          setEditorContent(newContent);
          if (onChange) {
            onChange(newContent);
          }
        });
      }
    });
  };

  if (!isMounted) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
        <div className="p-3 border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="p-6 min-h-[400px] flex items-center justify-center">
          <div className="text-gray-500">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="p-3 border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">TinyMCE Blog Editor</span>
        </div>
      </div>
      
      <div className="p-4">
        {!isEditorReady && (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-gray-500">Initializing TinyMCE editor...</div>
          </div>
        )}
        <textarea 
          id="tinymce-editor"
          ref={editorRef}
          defaultValue={editorContent}
          style={{ visibility: isEditorReady ? 'visible' : 'hidden' }}
        />
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>
            <span>TinyMCE Rich Text Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isEditorReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>{isEditorReady ? 'Ready' : 'Loading...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}