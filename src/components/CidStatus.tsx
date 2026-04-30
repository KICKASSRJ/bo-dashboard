import { useState, useCallback, useMemo } from 'react';
import type { EdidcRecord, CidResult } from '../types';
import { IDOC_STATUS_MAP } from '../types';

interface CidStatusProps {
  data: EdidcRecord[] | null;
}

export default function CidStatus({ data }: CidStatusProps) {
  const [cid, setCid] = useState('');
  const [results, setResults] = useState<CidResult[]>([]);
  const [searched, setSearched] = useState(false);

  // Get unique sample CIDs from uploaded data
  const sampleCids = useMemo(() => {
    const hardcoded = ['65b2b2cf-d73b-42ad-bf31-5eb57d33f435', '8D133676-9df4-4378-9af2-46776a0630c1'];
    if (!data) return hardcoded;
    const fromData = [...new Set(data.map(r => r.ediArchiveKey.trim()).filter(Boolean))];
    // Merge hardcoded first, then up to 3 from data (avoid duplicates)
    const all = [...hardcoded];
    for (const v of fromData) {
      if (!all.some(a => a.toLowerCase() === v.toLowerCase())) all.push(v);
      if (all.length >= 5) break;
    }
    return all;
  }, [data]);

  const handleSearch = useCallback(() => {
    if (!data || !cid.trim()) return;

    const cidValues = cid
      .split(/[,\n]+/)
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (cidValues.length === 0) return;

    const cidResults: CidResult[] = [];

    for (const searchKey of cidValues) {
      const matches = data.filter(row =>
        row.ediArchiveKey.trim().toLowerCase() === searchKey.toLowerCase()
      );

      if (matches.length === 0) {
        cidResults.push({
          correlationId: searchKey,
          found: false,
          idocNumber: '—',
          idocStatus: '',
          statusDescription: '',
          displayStatus: 'CID not received in SAP',
          messageType: '—',
          senderPartnerNo: '—',
          createdOn: '—',
          createdAt: '—',
        });
      } else {
        for (const row of matches) {
          const statusCode = row.idocStatus.trim();
          const description = IDOC_STATUS_MAP[statusCode] || 'Unknown status';
          cidResults.push({
            correlationId: searchKey,
            found: true,
            idocNumber: row.idocNumber,
            idocStatus: statusCode,
            statusDescription: description,
            displayStatus: `${statusCode} – ${description}`,
            messageType: row.messageType,
            senderPartnerNo: row.senderPartnerNo,
            createdOn: row.createdOn,
            createdAt: row.createdAt,
          });
        }
      }
    }

    setResults(cidResults);
    setSearched(true);
  }, [data, cid]);

  if (!data) {
    return (
      <div className="feature-panel">
        <h2>Correlation ID Processing Status</h2>
        <p className="empty-state">Please upload an EDIDC file first.</p>
        <div className="sample-data">
          <p className="sample-data__label">Sample Correlation IDs (click to copy):</p>
          <div className="sample-data__list">
            {sampleCids.map((s, i) => (
              <button key={i} className="sample-data__item" onClick={() => setCid(prev => prev ? `${prev}, ${s}` : s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-panel">
      <h2>Correlation ID Processing Status</h2>
      <p className="feature-description">
        Look up Correlation ID processing status. Enter one or more Correlation IDs (comma-separated or one per line).
      </p>

      <div className="search-bar search-bar--vertical">
        <textarea
          className="input textarea"
          placeholder="Enter Correlation IDs (comma-separated or one per line)..."
          value={cid}
          onChange={e => setCid(e.target.value)}
          rows={4}
        />
        <button className="btn btn--primary" onClick={handleSearch} disabled={!cid.trim()}>
          Search
        </button>
        {(cid || searched) && (
          <button className="btn btn--secondary" onClick={() => { setCid(''); setResults([]); setSearched(false); }}>
            Clear
          </button>
        )}
      </div>

      {sampleCids.length > 0 && !searched && (
        <div className="sample-data">
          <p className="sample-data__label">Sample Correlation IDs from uploaded data (click to use):</p>
          <div className="sample-data__list">
            {sampleCids.map((s, i) => (
              <button key={i} className="sample-data__item" onClick={() => setCid(prev => prev ? `${prev}, ${s}` : s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {searched && (
        <div className="results-section">
          {results.length === 0 ? (
            <p className="empty-state">No Correlation IDs entered.</p>
          ) : (
            <>
              <p className="record-count">
                {results.filter(r => r.found).length} of {results.length} record{results.length > 1 ? 's' : ''} found in SAP
              </p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Correlation ID</th>
                      <th>IDoc Number</th>
                      <th>Status</th>
                      <th>Message Type</th>
                      <th>Sender Partner No.</th>
                      <th>Created On</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className={!row.found || row.idocStatus === '68' || row.idocStatus === '51' ? 'row--error' : 'row--success'}>
                        <td className="nowrap">{row.correlationId}</td>
                        <td>{row.idocNumber}</td>
                        <td className="nowrap"><strong>{row.displayStatus}</strong></td>
                        <td>{row.messageType}</td>
                        <td>{row.senderPartnerNo}</td>
                        <td>{row.createdOn}</td>
                        <td>{row.createdAt}</td>
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
