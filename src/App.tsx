import { useState } from 'react';
import type { UploadedFiles } from './types';
import FileUpload from './components/FileUpload';
import IdocStatus from './components/IdocStatus';
import CidStatus from './components/CidStatus';
import RsnStatus from './components/RsnStatus';
import BorGrMismatch from './components/BorGrMismatch';
import './App.css';

function App() {
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

      <main className="main-content dashboard">
        <section className="dashboard-section">
          <FileUpload files={files} onFilesChange={setFiles} />
        </section>

        <div className="dashboard-grid">
          <section className="dashboard-section dashboard-card">
            <IdocStatus data={files.edidc} />
          </section>

          <section className="dashboard-section dashboard-card">
            <CidStatus data={files.edidc} />
          </section>

          <section className="dashboard-section dashboard-card">
            <RsnStatus data={files.rsn} />
          </section>

          <section className="dashboard-section dashboard-card">
            <BorGrMismatch ekesData={files.ekes} msegData={files.mseg} />
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>BO Self Serve Dashboard  Proof of Concept</p>
      </footer>
    </div>
  );
}

export default App;
