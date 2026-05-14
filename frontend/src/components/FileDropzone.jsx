import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

export default function FileDropzone({ onFilesSelected, selectedFiles }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    handleDrag(e);
    setDragOver(true);
  };

  const handleDragOut = (e) => {
    handleDrag(e);
    setDragOver(false);
  };

  const handleDrop = (e) => {
    handleDrag(e);
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.length) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const count = selectedFiles?.length || 0;

  return (
    <div>
      <label
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragEnter={handleDragIn}
        onDragOver={handleDragIn}
        onDragLeave={handleDragOut}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <div className="dropzone-content">
          <div className="dropzone-icon">
            <Upload size={36} strokeWidth={1.5} />
          </div>
          <p className="dropzone-label">
            Drop files here or <strong>browse</strong>
          </p>
          <p className="dropzone-hint">Supports PDF, TXT, DOCX, CSV, and more</p>
        </div>
      </label>
      <div className="upload-actions">
        <span className="file-count">
          {count === 0 ? 'No files selected' : `${count} file${count > 1 ? 's' : ''} selected`}
        </span>
      </div>
    </div>
  );
}
