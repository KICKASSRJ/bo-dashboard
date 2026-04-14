import { useState, useCallback } from 'react';
import type { EkesRecord, MsegRecord, BorGrResult } from '../types';

interface BorGrMismatchProps {
  ekesData: EkesRecord[] | null;
  msegData: MsegRecord[] | null;
}

const PID_PREFIXES = ['P_', 'W_', 'F_'];

export default function BorGrMismatch({ ekesData, msegData }: BorGrMismatchProps) {
  const [bo, setBo] = useState('');
  const [pid, setPid] = useState('');
  const [results, setResults] = useState<BorGrResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(() => {
    if (!ekesData || !msegData || !bo.trim() || !pid.trim()) return;

    const boVal = bo.trim();
    const pidVal = pid.trim();

    // Step 1: Search EKES for matching Purchasing Document
    const ekesMatches = ekesData.filter(
      row => row.purchasingDocument.trim().toLowerCase() === boVal.toLowerCase()
    );

    // Step 2: From the EKES subset, find records matching the PID with prefix
    const borResults: BorGrResult[] = [];

    // Try each prefix to find matching BOR PID in EKES reference column
    for (const prefix of PID_PREFIXES) {
      const prefixedPid = `${prefix}${pidVal}`;
      const matchingEkes = ekesMatches.filter(
        row => row.reference.trim().toLowerCase() === prefixedPid.toLowerCase()
      );

      for (const ekesRow of matchingEkes) {
        const borPid = ekesRow.reference.trim();

        // Step 3: Search MSEG for corresponding GR entry
        const grMatches = msegData.filter(
          row =>
            row.purchaseOrder.trim().toLowerCase() === boVal.toLowerCase() &&
            row.shortText.trim().toLowerCase() === prefixedPid.toLowerCase()
        );

        const grPid = grMatches.length > 0 ? grMatches[0].shortText.trim() : '';

        // Step 4: Determine mismatch
        let mismatch = '';
        if (borPid.toUpperCase().startsWith('F_') && !grPid) {
          mismatch = 'BOR FG and GR Mismatch';
        }

        borResults.push({
          bo: ekesRow.purchasingDocument.trim(),
          borPid,
          grPid: grPid || '—',
          mismatch: mismatch || '—',
        });
      }
    }

    // If no prefix match found at all, try without prefix
    if (borResults.length === 0) {
      const directMatches = ekesMatches.filter(
        row => row.reference.trim().toLowerCase().includes(pidVal.toLowerCase())
      );

      for (const ekesRow of directMatches) {
        const borPid = ekesRow.reference.trim();

        const grMatches = msegData.filter(
          row =>
            row.purchaseOrder.trim().toLowerCase() === boVal.toLowerCase() &&
            row.shortText.trim().toLowerCase().includes(pidVal.toLowerCase())
        );

        const grPid = grMatches.length > 0 ? grMatches[0].shortText.trim() : '';

        let mismatch = '';
        if (borPid.toUpperCase().startsWith('F_') && !grPid) {
          mismatch = 'BOR FG and GR Mismatch';
        }

        borResults.push({
          bo: ekesRow.purchasingDocument.trim(),
          borPid,
          grPid: grPid || '—',
          mismatch: mismatch || '—',
        });
      }
    }

    setResults(borResults);
    setSearched(true);
  }, [ekesData, msegData, bo, pid]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const needsEkes = !ekesData;
  const needsMseg = !msegData;

  if (needsEkes || needsMseg) {
    const missing: string[] = [];
    if (needsEkes) missing.push('EKES');
    if (needsMseg) missing.push('MSEG');
    return (
      <div className="feature-panel">
        <h2>BOR and GR Mismatch</h2>
        <p className="empty-state">
          Please upload {missing.join(' and ')} file{missing.length > 1 ? 's' : ''} first.
        </p>
      </div>
    );
  }

  return (
    <div className="feature-panel">
      <h2>BOR and GR Mismatch</h2>
      <p className="feature-description">
        Enter a BO (Purchasing Document) and PID to check for BOR/GR mismatches. The system searches EKES for BOR confirmation and MSEG for GR entry, flagging mismatches for F_ (Finished Goods) PIDs missing GR.
      </p>

      <div className="search-bar">
        <input
          type="text"
          className="input"
          placeholder="Enter BO (Purchasing Document)..."
          value={bo}
          onChange={e => setBo(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="text"
          className="input"
          placeholder="Enter PID..."
          value={pid}
          onChange={e => setPid(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn--primary" onClick={handleSearch} disabled={!bo.trim() || !pid.trim()}>
          Check Mismatch
        </button>
      </div>

      {searched && (
        <div className="results-section">
          {results.length === 0 ? (
            <p className="empty-state">No matching records found for BO "{bo}" with PID "{pid}".</p>
          ) : (
            <>
              <p className="record-count">{results.length} record{results.length > 1 ? 's' : ''} found</p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>BO</th>
                      <th>BOR PID</th>
                      <th>GR PID</th>
                      <th>Mismatch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className={row.mismatch !== '—' ? 'row--error' : ''}>
                        <td>{row.bo}</td>
                        <td>{row.borPid}</td>
                        <td>{row.grPid}</td>
                        <td>
                          {row.mismatch !== '—' ? (
                            <span className="status-pill status-pill--error">{row.mismatch}</span>
                          ) : (
                            <span className="status-pill status-pill--success">No Mismatch</span>
                          )}
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
