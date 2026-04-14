import { useState, useCallback } from 'react';
import type { UploadedFiles } from './types';
import FileUpload from './components/FileUpload';
import IdocStatus from './components/IdocStatus';
import CidStatus from './components/CidStatus';
import RsnStatus from './components/RsnStatus';
import BorGrMismatch from './components/BorGrMismatch';
import './App.css';

const STORAGE_KEY = 'bo-dashboard-files';

function loadFiles(): UploadedFiles {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as UploadedFiles;
      return {
        edidc: parsed.edidc ?? null,
        mseg: parsed.mseg ?? null,
        ekes: parsed.ekes ?? null,
        rsn: parsed.rsn ?? null,
      };
    }
  } catch { /* ignore corrupt data */ }
  return { edidc: null, mseg: null, ekes: null, rsn: null };
}

function saveFiles(files: UploadedFiles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch { /* storage full — silently ignore */ }
}

type ActivePanel = null | 'upload' | 'idoc' | 'cid' | 'rsn' | 'bor-gr';

const CARDS: { id: ActivePanel; icon: string; title: string; desc: string }[] = [
  { id: 'upload', icon: '📁', title: 'SAP Input Data', desc: 'Upload SAP Data.' },
  { id: 'idoc', icon: '📋', title: 'BOR and GR Message Status', desc: "Find status of BOR and GR IDoc's." },
  { id: 'cid', icon: '🔎', title: 'CID Processing Status', desc: 'Look up CID processing status.' },
  { id: 'rsn', icon: '✅', title: 'RSN Status', desc: 'Verify the receipt of RSN into SAP ECC.' },
  { id: 'bor-gr', icon: '⚠️', title: 'BOR / GR Mismatch', desc: 'Detect mismatches between BOR confirmations and Goods Receipts.' },
];

function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [files, setFiles] = useState<UploadedFiles>(loadFiles);

  const handleFilesChange = useCallback((updated: UploadedFiles) => {
    setFiles(updated);
    saveFiles(updated);
  }, []);

  const uploadedCount = Object.values(files).filter(Boolean).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">BO Self Serve Dashboard</h1>
          <p className="app-subtitle">Supply Chain — Status & Anomaly Detection</p>
        </div>
      </header>

      <main className="main-content">
        {activePanel === null ? (
          <div className="dashboard-home">
            <h2 className="dashboard-home__title">What would you like to do?</h2>
            <div className="dashboard-home__grid">
              {CARDS.map(card => (
                <button
                  key={card.id}
                  className="dashboard-home__card"
                  onClick={() => setActivePanel(card.id)}
                >
                  <span className="dashboard-home__icon">{card.icon}</span>
                  <h3 className="dashboard-home__card-title">{card.title}</h3>
                  <p className="dashboard-home__card-desc">{card.desc}</p>
                  {card.id === 'upload' && (
                    <span className="dashboard-home__badge">{uploadedCount}/4 files loaded</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="panel-view">
            <button className="btn btn--back" onClick={() => setActivePanel(null)}>
              ← Back to Dashboard
            </button>
            {activePanel === 'upload' && <FileUpload files={files} onFilesChange={handleFilesChange} />}
            {activePanel === 'idoc' && <IdocStatus data={files.edidc} />}
            {activePanel === 'cid' && <CidStatus data={files.edidc} />}
            {activePanel === 'rsn' && <RsnStatus data={files.rsn} />}
            {activePanel === 'bor-gr' && <BorGrMismatch ekesData={files.ekes} msegData={files.mseg} />}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>BO Self Serve Dashboard — Proof of Concept</p>
      </footer>
    </div>
  );
}

export default App;
