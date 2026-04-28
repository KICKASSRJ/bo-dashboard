import { useCallback, useRef, useState } from 'react';
import type { UploadedFiles } from '../types';
import ParseWorker from '../parse-worker?worker';

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

function detectFileType(name: string): FileType | null {
  const n = name.toLowerCase();
  if (n.includes('edidc')) return 'edidc';
  if (n.includes('mseg')) return 'mseg';
  if (n.includes('ekes')) return 'ekes';
  if (n.includes('rsn')) return 'rsn';
  return null;
}

function parseInWorker(fileType: FileType, buffer: ArrayBuffer): Promise<{ data: Record<string, string>[]; errors: string[]; rowCount: number }> {
  return new Promise((resolve, reject) => {
    const worker = new ParseWorker();
    worker.onmessage = (e: MessageEvent) => {
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.result);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message || 'Worker failed'));
    };
    worker.postMessage({ fileType, buffer }, [buffer]);
  });
}

function deriveFileStates(files: UploadedFiles): Record<FileType, FileState> {
  const keys: FileType[] = ['edidc', 'mseg', 'ekes', 'rsn'];
  const states = {} as Record<FileType, FileState>;
  for (const key of keys) {
    const data = files[key];
    if (data && data.length > 0) {
      states[key] = { status: 'success', fileName: `${key.toUpperCase()}.xlsx`, error: '', rowCount: data.length };
    } else {
      states[key] = { ...INITIAL_FILE_STATE };
    }
  }
  return states;
}

export default function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const [fileStates, setFileStates] = useState<Record<FileType, FileState>>(() => deriveFileStates(files));

  const updateFileState = (fileType: FileType, update: Partial<FileState>) => {
    setFileStates(prev => ({ ...prev, [fileType]: { ...prev[fileType], ...update } }));
  };

  const processFile = useCallback(async (fileType: FileType, file: File, _currentFiles: UploadedFiles): Promise<{ key: FileType; data: unknown[] } | null> => {
    updateFileState(fileType, { status: 'reading', fileName: file.name, error: '', rowCount: 0 });
    try {
      const buffer = await file.arrayBuffer();
      updateFileState(fileType, { status: 'parsing' });

      const result = await parseInWorker(fileType, buffer);

      if (result.errors.length > 0) {
        updateFileState(fileType, { status: 'error', error: result.errors.join('\n') });
        return null;
      }

      updateFileState(fileType, { status: 'success', rowCount: result.data.length });
      return { key: fileType, data: result.data };
    } catch (err) {
      updateFileState(fileType, {
        status: 'error',
        error: `Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return null;
    }
  }, []);

  const handleBulkUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const updatedFiles = { ...files };
    const unmatched: string[] = [];

    for (const file of Array.from(selectedFiles)) {
      const fileType = detectFileType(file.name);
      if (!fileType) {
        unmatched.push(file.name);
        continue;
      }

      const result = await processFile(fileType, file, updatedFiles);
      if (result) {
        (updatedFiles as Record<string, unknown>)[result.key] = result.data;
      }
    }

    onFilesChange(updatedFiles);

    if (unmatched.length > 0) {
      alert(`Could not auto-detect type for: ${unmatched.join(', ')}\n\nFile names must contain EDIDC, MSEG, EKES, or RSN.`);
    }

    if (bulkInputRef.current) bulkInputRef.current.value = '';
  }, [files, onFilesChange, processFile]);

  const handleFileSelect = useCallback(async (fileType: FileType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await processFile(fileType, file, files);
    if (result) {
      onFilesChange({ ...files, [result.key]: result.data });
    } else {
      if (fileInputRefs.current[fileType]) {
        fileInputRefs.current[fileType]!.value = '';
      }
    }
  }, [files, onFilesChange, processFile]);

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
      <h2>SAP Input Data</h2>
      <p className="feature-description">
        Upload EDIDC, MSEG, EKES, and RSN Excel files exported from SAP ECC.
      </p>

      <div className="bulk-upload">
        <input
          ref={bulkInputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={handleBulkUpload}
          id="bulk-upload"
          className="file-input"
        />
        <label htmlFor="bulk-upload" className="btn btn--primary btn--bulk">
          📁 Upload All Files at Once
        </label>
        <span className="bulk-upload__hint">Select up to 4 files — auto-detected by filename (EDIDC, MSEG, EKES, RSN)</span>
      </div>

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
