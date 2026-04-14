import { useState, useCallback, useMemo } from 'react';
import type { EkesRecord, MsegRecord, BorGrResult } from '../types';

interface BorGrMismatchProps {
  ekesData: EkesRecord[] | null;
  msegData: MsegRecord[] | null;
}

export default function BorGrMismatch({ ekesData, msegData }: BorGrMismatchProps) {
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mismatch' | 'sync'>('all');

  // Build full comparison of all EKES records against MSEG on mount
  const allResults = useMemo<BorGrResult[]>(() => {
    if (!ekesData || !msegData) return [];

    // Build a lookup: key = purchaseOrder (lowercase) → array of { shortText, materialDocument }
    const msegIndex = new Map<string, { shortText: string; materialDocument: string }[]>();
    for (const row of msegData) {
      const po = row.purchaseOrder.trim().toLowerCase();
      if (!msegIndex.has(po)) msegIndex.set(po, []);
      const matDoc = row['Material Document'] || row['material document'] || row['Mat. Doc.'] || row['Material Doc.'] || '';
      msegIndex.get(po)!.push({
        shortText: row.shortText.trim().toLowerCase(),
        materialDocument: matDoc.trim(),
      });
    }

    const results: BorGrResult[] = [];

    for (const ekesRow of ekesData) {
      const bo = ekesRow.purchasingDocument.trim();
      const borPid = ekesRow.reference.trim();
      if (!bo || !borPid) continue;

      // Extract the base PID by stripping known prefixes
      let basePid = borPid;
      const upper = borPid.toUpperCase();
      if (upper.startsWith('P_') || upper.startsWith('W_') || upper.startsWith('F_')) {
        basePid = borPid.substring(2);
      }

      // Check MSEG for matching GR — try basePid first, then full borPid
      const msegRows = msegIndex.get(bo.toLowerCase()) || [];
      let grMatch = msegRows.find(r => r.shortText === basePid.toLowerCase());
      if (!grMatch) {
        grMatch = msegRows.find(r => r.shortText === borPid.toLowerCase());
      }
      if (!grMatch) {
        grMatch = msegRows.find(r => r.shortText.includes(basePid.toLowerCase()));
      }

      const grFound = !!grMatch;
      const grPid = grFound ? (grMatch!.shortText) : '';
      const materialDocument = grFound ? grMatch!.materialDocument : '';

      let mismatch = 'BOR and GR are in sync';
      if (upper.startsWith('F_') && !grFound) {
        mismatch = 'BOR FG and GR Mismatch';
      }

      results.push({
        bo,
        borPid,
        materialDocument: materialDocument || '—',
        grPid: grPid || '—',
        mismatch,
      });
    }

    return results;
  }, [ekesData, msegData]);

  // Filter results
  const filtered = useMemo(() => {
    let result = allResults;

    if (filterType === 'mismatch') {
      result = result.filter(r => r.mismatch.includes('Mismatch'));
    } else if (filterType === 'sync') {
      result = result.filter(r => !r.mismatch.includes('Mismatch'));
    }

    if (filter) {
      const lf = filter.toLowerCase();
      result = result.filter(r =>
        r.bo.toLowerCase().includes(lf) ||
        r.borPid.toLowerCase().includes(lf) ||
        r.grPid.toLowerCase().includes(lf)
      );
    }

    return result;
  }, [allResults, filter, filterType]);

  const mismatchCount = useMemo(() => allResults.filter(r => r.mismatch.includes('Mismatch')).length, [allResults]);
  const syncCount = allResults.length - mismatchCount;

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
        All EKES (BOR) records compared against MSEG (GR). F_ (Finished Goods) PIDs without a matching GR are flagged as mismatches.
      </p>

      <div className="toolbar">
        <input
          type="text"
          className="input"
          placeholder="Filter by BO or PID..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="filter-buttons">
          <button className={`btn ${filterType === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setFilterType('all')}>
            All ({allResults.length})
          </button>
          <button className={`btn ${filterType === 'mismatch' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setFilterType('mismatch')}>
            Mismatches ({mismatchCount})
          </button>
          <button className={`btn ${filterType === 'sync' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setFilterType('sync')}>
            In Sync ({syncCount})
          </button>
        </div>
      </div>

      <p className="record-count">{filtered.length} of {allResults.length} records shown</p>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>BO</th>
              <th>BOR PID</th>
              <th>Material Document</th>
              <th>GR PID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const isMismatch = row.mismatch.includes('Mismatch');
              return (
              <tr key={i} className={isMismatch ? 'row--error' : 'row--success'}>
                <td>{row.bo}</td>
                <td>{row.borPid}</td>
                <td>{row.materialDocument}</td>
                <td>{row.grPid}</td>
                <td>
                  <span className={`status-pill ${isMismatch ? 'status-pill--error' : 'status-pill--success'}`}>
                    {row.mismatch}
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
