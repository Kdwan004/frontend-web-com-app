import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from './config';
import './index.css';

interface GroupFile {
  name: string;
  // Potentially add more info like size, type, date later
}

const GroupFiles: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';

  const [files, setFiles] = useState<GroupFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const fetchGroupFiles = useCallback(async () => {
    if (!groupId || !username) return;
    setLoadingFiles(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/files?username=${username}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch files');
      }
      setFiles(data.files ? data.files.map((name: string) => ({ name })) : []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching files');
    } finally {
      setLoadingFiles(false);
    }
  }, [groupId, username]);

  useEffect(() => {
    if (!username) {
      navigate('/login');
      return;
    }
    fetchGroupFiles();
  }, [username, navigate, fetchGroupFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(''); 
      setSuccessMessage('');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !groupId || !username) {
      setError('Please select a file to upload.');
      return;
    }
    setUploading(true);
    setError('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('username', username); // Add username for backend authorization

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/files/upload`, {
        method: 'POST',
        body: formData,
        // Headers are not explicitly set for FormData; browser sets Content-Type to multipart/form-data
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'File upload failed');
      }
      setSuccessMessage(data.message || 'File uploaded successfully!');
      setSelectedFile(null); // Clear selection
      fetchGroupFiles(); // Refresh file list
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const getFileViewUrl = (filename: string) => {
    // This URL should trigger the download via the backend's send_from_directory
    return `${API_BASE_URL}/api/groups/${groupId}/files/${encodeURIComponent(filename)}?username=${username}`;
  };

  return (
    <div className="app-container files-page">
      <header className="files-header">
        <h1>Files for Group {groupId}</h1>
        <div>
          <button onClick={() => navigate(`/group/${groupId}/calendar`)} className="action-button">
            Calendar
          </button>
          <button onClick={() => navigate('/portal')} className="action-button">
            Back to Portal
          </button>
        </div>
      </header>

      {error && <p className="error-message global-files-error">{error}</p>}
      {successMessage && <p className="success-message global-files-success">{successMessage}</p>}

      <div className="file-upload-section">
        <h3>Upload New File</h3>
        <input type="file" onChange={handleFileChange} className="file-input" />
        {selectedFile && <p className="selected-file-info">Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>}
        <button onClick={handleFileUpload} disabled={!selectedFile || uploading} className="action-button upload-button">
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>

      <div className="file-list-section">
        <h3>Group Files</h3>
        {loadingFiles ? (
          <p>Loading files...</p>
        ) : files.length > 0 ? (
          <ul className="files-list">
            {files.map(file => (
              <li key={file.name} className="file-item">
                <span className="file-name">{file.name}</span>
                <a 
                  href={getFileViewUrl(file.name)} 
                  target="_blank" // Open in new tab, or download directly depending on browser/Content-Disposition
                  rel="noopener noreferrer"
                  className="action-button view-download-button"
                >
                  View/Download
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No files found for this group.</p>
        )}
      </div>
    </div>
  );
};

export default GroupFiles; 