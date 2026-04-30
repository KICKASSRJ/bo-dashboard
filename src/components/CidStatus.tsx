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
          sender: '—',
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
            sender: row.logicalRecipient,
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
                      <th>Sender</th>
                      <th>Message Type</th>
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
                        <td>{row.sender}</td>
                        <td>{row.messageType}</td>
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
