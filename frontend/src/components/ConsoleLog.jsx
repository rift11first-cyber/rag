import React from 'react';

export default function ConsoleLog({ lines }) {
  if (!lines) return null;
  return (
    <div className="upload-log-wrapper">
      <pre className="console-output" style={{ display: lines ? 'block' : 'none' }}>
        {lines}
      </pre>
    </div>
  );
}
