import { useState, useMemo } from 'react';
import type { EdidcRecord } from '../types';
import { IDOC_STATUS_MAP } from '../types';

interface IdocStatusProps {
  data: EdidcRecord[] | null;
}

export default function IdocStatus({ data }: IdocStatusProps) {
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState<keyof EdidcRecord>('idocNumber');
  const [sortAsc, setSortAsc] = useState(true);

  const columns: { key: keyof EdidcRecord; label: string }[] = [
    { key: 'messageType', label: 'Message Type' },
    { key: 'idocNumber', label: 'IDoc Number' },
    { key: 'idocStatus', label: 'IDoc Status' },
    { key: 'senderPartnerNo', label: 'Sender Partner No.' },
    { key: 'ediArchiveKey', label: 'EDI Archive Key' },
    { key: 'createdOn', label: 'Created On' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'changedOn', label: 'Changed On' },
    { key: 'timeChanged', label: 'Time Changed' },
  ];

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val => val.toLowerCase().includes(lowerFilter))
      );
    }
    result = [...result].sort((a, b) => {
      const aVal = a[sortCol] || '';
      const bVal = b[sortCol] || '';
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return result;
  }, [data, filter, sortCol, sortAsc]);

  const handleSort = (col: keyof EdidcRecord) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  if (!data) {
    return (
      <div className="feature-panel">
        <h2>IDoc Status</h2>
        <p className="empty-state">Please upload an EDIDC file first.</p>
      </div>
    );
  }

  return (
    <div className="feature-panel">
      <h2>IDoc Status</h2>
      <p className="feature-description">
        All records from the uploaded EDIDC file. Click column headers to sort. Use the filter to search.
      </p>

      <div className="toolbar">
        <input
          type="text"
          className="input"
          placeholder="Filter records..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <span className="record-count">{filtered.length} of {data.length} records</span>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} className="sortable">
                  {col.label}
                  {sortCol === col.key && (sortAsc ? ' ▲' : ' ▼')}
                </th>
              ))}
              <th>Status Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
                <td>{IDOC_STATUS_MAP[row.idocStatus] || 'Unknown'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
