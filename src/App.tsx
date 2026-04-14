import { useState, useCallback, useEffect } from 'react';
import type { UploadedFiles } from './types';
import FileUpload from './components/FileUpload';
import IdocStatus from './components/IdocStatus';
import CidStatus from './components/CidStatus';
import RsnStatus from './components/RsnStatus';
import BorGrMismatch from './components/BorGrMismatch';
import './App.css';

const DB_NAME = 'bo-dashboard';
const DB_STORE = 'files';
const DB_KEY = 'uploaded';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(DB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFilesFromDB(): Promise<UploadedFiles> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(DB_KEY);
      req.onsuccess = () => {
        const data = req.result as UploadedFiles | undefined;
        resolve(data ? { edidc: data.edidc ?? null, mseg: data.mseg ?? null, ekes: data.ekes ?? null, rsn: data.rsn ?? null } : { edidc: null, mseg: null, ekes: null, rsn: null });
      };
      req.onerror = () => resolve({ edidc: null, mseg: null, ekes: null, rsn: null });
    });
  } catch {
    return { edidc: null, mseg: null, ekes: null, rsn: null };
  }
}

async function saveFilesToDB(files: UploadedFiles) {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(files, DB_KEY);
  } catch { /* silently ignore */ }
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
  const [files, setFiles] = useState<UploadedFiles>({ edidc: null, mseg: null, ekes: null, rsn: null });
  const [loaded, setLoaded] = useState(false);

  // Load persisted data from IndexedDB on mount
  useEffect(() => {
    loadFilesFromDB().then(data => {
      setFiles(data);
      setLoaded(true);
    });
  }, []);

  const handleFilesChange = useCallback((updated: UploadedFiles) => {
    setFiles(updated);
    saveFilesToDB(updated);
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
