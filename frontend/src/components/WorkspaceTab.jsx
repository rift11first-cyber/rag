import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FolderOpen, RefreshCw, Trash2 } from 'lucide-react';
import FileDropzone from './FileDropzone';
import ConsoleLog from './ConsoleLog';
import { getDocuments, uploadFile, deleteDocument } from '../hooks/useApi';

export default function WorkspaceTab() {
  const [files, setFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState('');
  const [docsLoading, setDocsLoading] = useState(true);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const data = await getDocuments();
      setDocuments(data.documents || []);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setLog('⚠ Choose at least one file.');
      return;
    }
    setUploading(true);
    setLog('');
    let output = '';
    for (const file of files) {
      output += `↑ Uploading ${file.name}...\n`;
      setLog(output);
      try {
        const data = await uploadFile(file);
        output += `✓ ${file.name}: ${data.chunk_count} chunks indexed\n`;
      } catch (err) {
        output += `✗ ${file.name}: ${err.message}\n`;
      }
      setLog(output);
    }
    setUploading(false);
    setFiles([]);
    await loadDocs();
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      await loadDocs();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <section className="tab-content active">
      <div className="section-header">
        <h2 className="section-title">Document Ingestion</h2>
        <p className="section-desc">Upload and manage your knowledge base documents</p>
      </div>

      <div className="workspace-grid">
        {/* Upload Panel */}
        <div className="card card-upload">
          <div className="card-header">
            <div className="card-icon upload-icon"><Upload size={20} /></div>
            <h3>Upload Files</h3>
          </div>
          <form onSubmit={handleUpload}>
            <FileDropzone onFilesSelected={setFiles} selectedFiles={files} />
            <div className="upload-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="submit" className={`btn btn-primary ${uploading ? 'loading' : ''}`} disabled={uploading}>
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Upload & Index'}
              </button>
            </div>
          </form>
          <ConsoleLog lines={log} />
        </div>

        {/* Documents Panel */}
        <div className="card card-documents">
          <div className="card-header">
            <div className="card-icon docs-icon"><FolderOpen size={20} /></div>
            <h3>Indexed Documents</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={loadDocs}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="document-list">
            {docsLoading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <FolderOpen size={40} strokeWidth={1.5} opacity={0.4} />
                <p>No documents indexed yet</p>
                <p className="empty-hint">Upload files to get started</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div className="doc-item" key={doc.id}>
                  <div className="doc-item-info">
                    <span className="doc-item-name">{doc.name}</span>
                    <span className="doc-item-meta">
                      {doc.chunk_count} chunks · {Number(doc.char_count).toLocaleString()} characters
                    </span>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
