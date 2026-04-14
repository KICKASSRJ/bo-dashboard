import { useCallback, useRef, useState } from 'react';
import type { UploadedFiles } from '../types';
import { parseEdidcFile, parseEkesFile, parseMsegFile, parseRsnFile } from '../excel-parser';

interface FileUploadProps {
  files: UploadedFiles;
  onFilesChange: (files: UploadedFiles) => void;
}

type FileType = 'edidc' | 'mseg' | 'ekes' | 'rsn';
type UploadStatus = 'idle' | 'reading' | 'parsing' | 'success' | 'error';

interface FileState {
  status: UploadStatus;
  fileName: string;
  error: string;
  rowCount: number;
}

const FILE_CONFIG: { key: FileType; label: string; description: string }[] = [
  { key: 'edidc', label: 'EDIDC', description: 'IDoc Control Records — contains Message Type, IDoc number, status, EDI Archive Key, etc.' },
  { key: 'mseg', label: 'MSEG', description: 'Material Document Segment — contains Purchase Order, Short Text for GR matching.' },
  { key: 'ekes', label: 'EKES', description: 'Purchasing Confirmations — contains Purchasing Document, Reference for BOR matching.' },
  { key: 'rsn', label: 'RSN Header', description: 'Return Service Notification — contains RSN numbers for status verification.' },
];

const INITIAL_FILE_STATE: FileState = { status: 'idle', fileName: '', error: '', rowCount: 0 };

export default function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [fileStates, setFileStates] = useState<Record<FileType, FileState>>({
    edidc: { ...INITIAL_FILE_STATE },
    mseg: { ...INITIAL_FILE_STATE },
    ekes: { ...INITIAL_FILE_STATE },
    rsn: { ...INITIAL_FILE_STATE },
  });

  const updateFileState = (fileType: FileType, update: Partial<FileState>) => {
    setFileStates(prev => ({ ...prev, [fileType]: { ...prev[fileType], ...update } }));
  };

  const handleFileSelect = useCallback(async (fileType: FileType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Step 1: Reading file
    updateFileState(fileType, { status: 'reading', fileName: file.name, error: '', rowCount: 0 });

    try {
      const buffer = await file.arrayBuffer();

      // Step 2: Parsing
      updateFileState(fileType, { status: 'parsing' });

      let result;
      switch (fileType) {
        case 'edidc': result = parseEdidcFile(buffer); break;
        case 'mseg': result = parseMsegFile(buffer); break;
        case 'ekes': result = parseEkesFile(buffer); break;
        case 'rsn': result = parseRsnFile(buffer); break;
      }

      if (result.errors.length > 0) {
        updateFileState(fileType, { status: 'error', error: result.errors.join('\n') });
        if (fileInputRefs.current[fileType]) {
          fileInputRefs.current[fileType]!.value = '';
        }
        return;
      }

      // Step 3: Success
      updateFileState(fileType, { status: 'success', rowCount: result.data.length });
      onFilesChange({ ...files, [fileType]: result.data });
    } catch (err) {
      updateFileState(fileType, {
        status: 'error',
        error: `Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      if (fileInputRefs.current[fileType]) {
        fileInputRefs.current[fileType]!.value = '';
      }
    }
  }, [files, onFilesChange]);

  const handleClear = useCallback((fileType: FileType) => {
    if (fileInputRefs.current[fileType]) {
      fileInputRefs.current[fileType]!.value = '';
    }
    updateFileState(fileType, { ...INITIAL_FILE_STATE });
    onFilesChange({ ...files, [fileType]: null });
  }, [files, onFilesChange]);

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'reading': return '📂';
      case 'parsing': return '⚙️';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '📁';
    }
  };

  const getStatusText = (state: FileState) => {
    switch (state.status) {
      case 'reading': return `Reading ${state.fileName}...`;
      case 'parsing': return `Parsing ${state.fileName}...`;
      case 'success': return `${state.fileName} — ${state.rowCount} rows loaded`;
      case 'error': return state.error.replace(/^DRM_PROTECTED:\s*/, '');
      default: return 'No file selected';
    }
  };

  return (
    <div className="feature-panel">
      <h2>Upload Input Data</h2>
      <p className="feature-description">
        Upload Excel files exported from SAP ECC. Each file powers specific features in the dashboard.
      </p>

      <div className="upload-grid">
        {FILE_CONFIG.map(({ key, label, description }) => {
          const state = fileStates[key];
          const isLoaded = files[key] !== null;
          const isProcessing = state.status === 'reading' || state.status === 'parsing';
          const hasError = state.status === 'error';

          return (
            <div key={key} className={`upload-card ${isLoaded ? 'upload-card--loaded' : ''} ${hasError ? 'upload-card--error' : ''} ${isProcessing ? 'upload-card--processing' : ''}`}>
              <div className="upload-card__header">
                <h3>{getStatusIcon(state.status)} {label}</h3>
                {isLoaded && <span className="badge badge--success">{state.rowCount} rows</span>}
              </div>
              <p className="upload-card__desc">{description}</p>

              {/* Status Progress Bar */}
              {isProcessing && (
                <div className="upload-progress">
                  <div className="upload-progress__bar">
                    <div className="upload-progress__fill upload-progress__fill--animated" />
                  </div>
                  <span className="upload-progress__text">{getStatusText(state)}</span>
                </div>
              )}

              {/* Error Message */}
              {hasError && (
                <div className="upload-error">
                  <span className="upload-error__text">{state.error.replace(/^DRM_PROTECTED:\s*/, '')}</span>
                  {state.error.startsWith('DRM_PROTECTED:') && (
                    <a
                      href="/convert-excel.ps1"
                      download="convert-excel.ps1"
                      className="btn btn--primary upload-error__converter-btn"
                    >
                      ⬇ Download Converter Script
                    </a>
                  )}
                </div>
              )}

              {/* Success Status */}
              {state.status === 'success' && isLoaded && (
                <div className="upload-success">
                  <span className="upload-success__text">{getStatusText(state)}</span>
                </div>
              )}

              <div className="upload-card__actions">
                <input
                  ref={(el) => { fileInputRefs.current[key] = el; }}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileSelect(key, e)}
                  id={`file-${key}`}
                  className="file-input"
                  disabled={isProcessing}
                />
                <label htmlFor={`file-${key}`} className={`btn btn--primary ${isProcessing ? 'btn--disabled' : ''}`}>
                  {isProcessing ? 'Processing...' : isLoaded ? 'Replace File' : 'Choose File'}
                </label>
                {(isLoaded || hasError) && (
                  <button className="btn btn--danger" onClick={() => handleClear(key)} disabled={isProcessing}>
                    {hasError ? 'Dismiss' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Summary */}
      <div className="upload-summary">
        <h3>Upload Summary</h3>
        <div className="upload-summary__grid">
          {FILE_CONFIG.map(({ key, label }) => {
            const state = fileStates[key];
            const isLoaded = files[key] !== null;
            return (
              <div key={key} className={`upload-summary__item upload-summary__item--${state.status}`}>
                <span className="upload-summary__icon">{getStatusIcon(state.status)}</span>
                <span className="upload-summary__label">{label}</span>
                <span className="upload-summary__status">
                  {isLoaded ? `${state.rowCount} rows` : state.status === 'error' ? 'Error' : state.status === 'reading' || state.status === 'parsing' ? 'Processing...' : 'Not uploaded'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
