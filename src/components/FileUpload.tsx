import { useCallback, useRef } from 'react';
import type { UploadedFiles } from '../types';
import { parseEdidcFile, parseEkesFile, parseMsegFile, parseRsnFile } from '../excel-parser';

interface FileUploadProps {
  files: UploadedFiles;
  onFilesChange: (files: UploadedFiles) => void;
}

type FileType = 'edidc' | 'mseg' | 'ekes' | 'rsn';

const FILE_CONFIG: { key: FileType; label: string; description: string }[] = [
  { key: 'edidc', label: 'EDIDC', description: 'IDoc Control Records — contains Message Type, IDoc number, status, EDI Archive Key, etc.' },
  { key: 'mseg', label: 'MSEG', description: 'Material Document Segment — contains Purchase Order, Short Text for GR matching.' },
  { key: 'ekes', label: 'EKES', description: 'Purchasing Confirmations — contains Purchasing Document, Reference for BOR matching.' },
  { key: 'rsn', label: 'RSN Header', description: 'Return Service Notification — contains RSN numbers for status verification.' },
];

export default function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = useCallback(async (fileType: FileType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    let result;

    switch (fileType) {
      case 'edidc': result = parseEdidcFile(buffer); break;
      case 'mseg': result = parseMsegFile(buffer); break;
      case 'ekes': result = parseEkesFile(buffer); break;
      case 'rsn': result = parseRsnFile(buffer); break;
    }

    if (result.errors.length > 0) {
      alert(result.errors.join('\n'));
      if (fileInputRefs.current[fileType]) {
        fileInputRefs.current[fileType]!.value = '';
      }
      return;
    }

    onFilesChange({ ...files, [fileType]: result.data });
  }, [files, onFilesChange]);

  const handleClear = useCallback((fileType: FileType) => {
    if (fileInputRefs.current[fileType]) {
      fileInputRefs.current[fileType]!.value = '';
    }
    onFilesChange({ ...files, [fileType]: null });
  }, [files, onFilesChange]);

  const getRowCount = (fileType: FileType): number | null => {
    const data = files[fileType];
    return data ? data.length : null;
  };

  return (
    <div className="feature-panel">
      <h2>F1 — Upload Input Data</h2>
      <p className="feature-description">
        Upload Excel files exported from SAP ECC. Each file powers specific features in the dashboard.
      </p>

      <div className="upload-grid">
        {FILE_CONFIG.map(({ key, label, description }) => {
          const rowCount = getRowCount(key);
          const isLoaded = rowCount !== null;

          return (
            <div key={key} className={`upload-card ${isLoaded ? 'upload-card--loaded' : ''}`}>
              <div className="upload-card__header">
                <h3>{label}</h3>
                {isLoaded && <span className="badge badge--success">{rowCount} rows</span>}
              </div>
              <p className="upload-card__desc">{description}</p>
              <div className="upload-card__actions">
                <input
                  ref={(el) => { fileInputRefs.current[key] = el; }}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileSelect(key, e)}
                  id={`file-${key}`}
                  className="file-input"
                />
                <label htmlFor={`file-${key}`} className="btn btn--primary">
                  {isLoaded ? 'Replace File' : 'Choose File'}
                </label>
                {isLoaded && (
                  <button className="btn btn--danger" onClick={() => handleClear(key)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
