import { useState, useCallback } from 'react';
import type { RsnRecord, RsnResult } from '../types';

interface RsnStatusProps {
  data: RsnRecord[] | null;
}

export default function RsnStatus({ data }: RsnStatusProps) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<RsnResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(() => {
    if (!data || !input.trim()) return;

    const rsnValues = input
      .split(/[,\n]+/)
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (rsnValues.length === 0) return;

    const rsnSet = new Set(data.map(r => r.rsn.trim().toLowerCase()));

    const rsnResults: RsnResult[] = rsnValues.map(rsn => {
      const found = rsnSet.has(rsn.toLowerCase());
      return {
        rsn,
        found,
        status: found
          ? 'RSN successfully processed in SAP ECC'
          : 'RSN not available in SAP ECC',
      };
    });

    setResults(rsnResults);
    setSearched(true);
  }, [data, input]);

  if (!data) {
    return (
      <div className="feature-panel">
        <h2>RSN Status</h2>
        <p className="empty-state">Please upload an RSN Header file first.</p>
      </div>
    );
  }

  return (
    <div className="feature-panel">
      <h2>RSN Status</h2>
      <p className="feature-description">
        Enter one or more RSN values (comma-separated or one per line) to check their processing status in SAP ECC.
      </p>

      <div className="search-bar search-bar--vertical">
        <textarea
          className="input textarea"
          placeholder="Enter RSN values (comma-separated or one per line)..."
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={4}
        />
        <button className="btn btn--primary" onClick={handleSearch} disabled={!input.trim()}>
          Check Status
        </button>
      </div>

      {searched && (
        <div className="results-section">
          {results.length === 0 ? (
            <p className="empty-state">No RSN values entered.</p>
          ) : (
            <>
              <p className="record-count">
                {results.filter(r => r.found).length} of {results.length} RSNs found in SAP ECC
              </p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>RSN</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className={row.found ? 'row--success' : 'row--error'}>
                        <td>{row.rsn}</td>
                        <td>
                          <span className={`status-pill ${row.found ? 'status-pill--success' : 'status-pill--error'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
