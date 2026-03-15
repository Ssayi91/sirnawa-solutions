// src/components/ImageUpload.jsx

import { useState } from 'react';
import { uploadToCloudinary } from '../utils/cloudinary';

const ImageUpload = ({ label, onUpload, previewUrl, required = false }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const imageUrl = await uploadToCloudinary(file);
      onUpload(imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-error">*</span>}
      </label>
      
      {/* Preview */}
      {previewUrl && (
        <div className="mb-2">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-32 h-32 object-cover rounded-lg border-2 border-primary"
          />
        </div>
      )}
      
      {/* File Input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-primary file:text-white
          hover:file:bg-primary-dark
          disabled:opacity-50
          cursor-pointer"
      />
      
      {/* Status Messages */}
      {uploading && (
        <p className="text-sm text-primary mt-2">Uploading...</p>
      )}
      
      {error && (
        <p className="text-sm text-error mt-2">{error}</p>
      )}
    </div>
  );
};

export default ImageUpload;