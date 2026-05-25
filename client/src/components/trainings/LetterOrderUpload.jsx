import React, { useState } from 'react';

const LetterOrderUpload = ({ onUpload, trainingId }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL for image/pdf (if supported)
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Call the onUpload function (to be implemented in parent)
      await onUpload(trainingId, selectedFile);
      // Reset after successful upload
      setSelectedFile(null);
      setPreviewUrl(null);
      // Clear file input
      e.target.reset();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="letter-order-upload">
      <h3>Upload Letter Order</h3>
      <form onSubmit={handleUpload} className="upload-form">
        <div className="file-input-container">
          <label htmlFor="letterOrderFile" className="file-input-label">
            {selectedFile ? (
              <>
                <span className="file-name">{selectedFile.name}</span>
                <button type="button" onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  // Reset file input
                  document.getElementById('letterOrderFile').value = '';
                }} className="btn-remove">
                  Remove
                </button>
              </>
            ) : (
              'Choose a file'
            )}
          </label>
          <input
            type="file"
            id="letterOrderFile"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button type="button" onClick={() => document.getElementById('letterOrderFile').click()} className="btn-browse">
            Browse
          </button>
        </div>
        
        {previewUrl && (
          <div className="file-preview">
            {selectedFile.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" />
            ) : selectedFile.type === 'application/pdf' ? (
              <iframe src={previewUrl} title="PDF Preview" />
            ) : (
              <div className="preview-placeholder">
                <i className="fas fa-file-alt"></i>
                <p>{selectedFile.name}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="upload-actions">
          <button 
            type="submit" 
            disabled={!selectedFile || uploading}
            className={uploading ? 'btn-uploading' : 'btn-primary'}
          >
            {uploading ? 'Uploading...' : 'Upload Letter Order'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
              document.getElementById('letterOrderFile').value = '';
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default LetterOrderUpload;