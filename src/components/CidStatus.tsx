import { useState, useCallback } from 'react';
import type { EdidcRecord, CidResult } from '../types';
import { IDOC_STATUS_MAP } from '../types';

interface CidStatusProps {
  data: EdidcRecord[] | null;
}

export default function CidStatus({ data }: CidStatusProps) {
  const [cid, setCid] = useState('');
  const [results, setResults] = useState<CidResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(() => {
    if (!data || !cid.trim()) return;

    const searchKey = cid.trim();
    const matches = data.filter(row =>
      row.ediArchiveKey.trim().toLowerCase() === searchKey.toLowerCase()
    );

    const cidResults: CidResult[] = matches.map(row => {
      const statusCode = row.idocStatus.trim();
      const description = IDOC_STATUS_MAP[statusCode] || 'Unknown status';
      return {
        idocNumber: row.idocNumber,
        idocStatus: statusCode,
        statusDescription: description,
        displayStatus: `${statusCode} – ${description}`,
        messageType: row.messageType,
        senderPartnerNo: row.senderPartnerNo,
        createdOn: row.createdOn,
      };
    });

    setResults(cidResults);
    setSearched(true);
  }, [data, cid]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  if (!data) {
    return (
      <div className="feature-panel">
        <h2>CID Processing Status</h2>
        <p className="empty-state">Please upload an EDIDC file first.</p>
      </div>
    );
  }

  return (
    <div className="feature-panel">
      <h2>CID Processing Status</h2>
      <p className="feature-description">
        Look up CID processing status. If multiple records exist for the same CID, all are displayed.
      </p>

      <div className="search-bar">
        <input
          type="text"
          className="input"
          placeholder="Enter CID (EDI Archive Key)..."
          value={cid}
          onChange={e => setCid(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn--primary" onClick={handleSearch} disabled={!cid.trim()}>
          Search
        </button>
      </div>

      {searched && (
        <div className="results-section">
          {results.length === 0 ? (
            <p className="empty-state">No records found for CID "{cid}".</p>
          ) : (
            <>
              <p className="record-count">{results.length} record{results.length > 1 ? 's' : ''} found</p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>IDoc Number</th>
                      <th>Status</th>
                      <th>Message Type</th>
                      <th>Sender Partner No.</th>
                      <th>Created On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className={row.idocStatus === '68' || row.idocStatus === '51' ? 'row--error' : 'row--success'}>
                        <td>{row.idocNumber}</td>
                        <td><strong>{row.displayStatus}</strong></td>
                        <td>{row.messageType}</td>
                        <td>{row.senderPartnerNo}</td>
                        <td>{row.createdOn}</td>
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
