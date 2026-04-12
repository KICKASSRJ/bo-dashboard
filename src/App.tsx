import { useState } from 'react';
import type { UploadedFiles, TabId } from './types';
import FileUpload from './components/FileUpload';
import IdocStatus from './components/IdocStatus';
import CidStatus from './components/CidStatus';
import RsnStatus from './components/RsnStatus';
import BorGrMismatch from './components/BorGrMismatch';
import './App.css';

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: 'upload', label: 'F1  Upload Files', short: 'Upload' },
  { id: 'idoc-status', label: 'F2  IDoc Status', short: 'IDoc' },
  { id: 'cid-status', label: 'F3  CID Status', short: 'CID' },
  { id: 'rsn-status', label: 'F4  RSN Status', short: 'RSN' },
  { id: 'bor-gr-mismatch', label: 'F5  BOR/GR Mismatch', short: 'BOR/GR' },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [files, setFiles] = useState<UploadedFiles>({
    edidc: null,
    mseg: null,
    ekes: null,
    rsn: null,
  });

  const uploadedCount = Object.values(files).filter(Boolean).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">BO Self Serve Dashboard</h1>
          <p className="app-subtitle">Status & Anomaly Detection</p>
        </div>
        <div className="header-stats">
          <span className="stat">{uploadedCount}/4 files loaded</span>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {activeTab === 'upload' && (
          <FileUpload files={files} onFilesChange={setFiles} />
        )}
        {activeTab === 'idoc-status' && (
          <IdocStatus data={files.edidc} />
        )}
        {activeTab === 'cid-status' && (
          <CidStatus data={files.edidc} />
        )}
        {activeTab === 'rsn-status' && (
          <RsnStatus data={files.rsn} />
        )}
        {activeTab === 'bor-gr-mismatch' && (
          <BorGrMismatch ekesData={files.ekes} msegData={files.mseg} />
        )}
      </main>

      <footer className="app-footer">
        <p>BO Self Serve Dashboard  Proof of Concept</p>
      </footer>
    </div>
  );
}

export default App;
