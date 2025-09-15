import React, { useState, useRef } from 'react';
import { Activity } from '@/types/weekly-plan';

interface UploadActivityProps {
  activity: Activity;
  onUpdate: (responses: any) => void;
  isReadOnly?: boolean;
}

export default function UploadActivity({ 
  activity, 
  onUpdate, 
  isReadOnly = false 
}: UploadActivityProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from existing response if available
  React.useEffect(() => {
    if (activity.response?.fileUrl) {
      setUploadStatus('success');
    }
  }, [activity.response]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const acceptedTypes = activity.data?.acceptedTypes || ['image/png', 'image/jpeg', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      setErrorMessage(`Please select a valid file type: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    const maxSize = activity.data?.maxSize || 10485760; // 10MB default
    if (file.size > maxSize) {
      setErrorMessage(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (!selectedFile || isReadOnly) return;

    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('activityId', activity.id.toString());

      // Upload file (you'll need to implement this endpoint)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Update parent component
      const responseData = {
        completed: true,
        fileUrl: result.fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      };
      
      onUpdate(responseData);
      setUploadStatus('success');
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage('Failed to upload file. Please try again.');
      setUploadStatus('error');
    }
  };

  const handleRemoveFile = () => {
    if (isReadOnly) return;
    
    setSelectedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isOptional = activity.data?.isOptional !== false;
  const acceptedTypes = activity.data?.acceptedTypes || ['image/png', 'image/jpeg', 'image/webp'];
  const maxSize = activity.data?.maxSize || 10485760; // 10MB default

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">File Upload</h4>
        <p className="text-sm text-green-800">
          {activity.prompt}
        </p>
        {isOptional && (
          <p className="text-sm text-green-700 mt-1">
            <em>This upload is optional.</em>
          </p>
        )}
        {isReadOnly && uploadStatus === 'success' && (
          <div className="mt-2 p-2 bg-green-100 rounded border border-green-200">
            <div className="flex items-center text-green-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">File uploaded successfully</span>
            </div>
          </div>
        )}
      </div>

      {/* File Upload Area */}
      {!isReadOnly && (
        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              disabled={isReadOnly}
              className="hidden"
            />
            
            {!selectedFile ? (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadOnly}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Choose File
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Accepted types: {acceptedTypes.join(', ')} (max {Math.round(maxSize / 1024 / 1024)}MB)
                </p>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="mt-4 space-x-2">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploadStatus === 'uploading'}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      'Upload File'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-800">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-800">File uploaded successfully!</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display uploaded file in read-only mode */}
      {isReadOnly && activity.response?.fileUrl && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{activity.response.fileName}</p>
              <p className="text-sm text-gray-500">
                {(activity.response.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {uploadStatus === 'success' ? '✅ Upload complete!' : 'Select and upload a file'}
        </span>
        {isOptional && (
          <span className="text-gray-500">Optional</span>
        )}
      </div>
    </div>
  );
}
