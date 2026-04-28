import { useMemo } from 'react';
import type { EdidcRecord } from '../types';

interface StatsDashboardProps {
  edidcData: EdidcRecord[] | null;
}

export default function StatsDashboard({ edidcData }: StatsDashboardProps) {
  const stats = useMemo(() => {
    if (!edidcData) return null;

    let borCount = 0;
    let grCount = 0;
    let otherCount = 0;

    for (const row of edidcData) {
      const mt = row.messageType.trim().toUpperCase();
      if (mt === 'ORDSP') {
        borCount++;
      } else if (mt === 'WMMBXY') {
        grCount++;
      } else {
        otherCount++;
      }
    }

    return {
      total: edidcData.length,
      borCount,
      grCount,
      otherCount,
    };
  }, [edidcData]);

  if (!edidcData) {
    return (
      <div className="feature-panel">
        <h2>Stats Dashboard</h2>
        <p className="empty-state">Please upload the EDIDC file first.</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="feature-panel">
      <h2>Stats Dashboard</h2>
      <p className="feature-description">
        Key metrics derived from uploaded EDIDC data.
      </p>

      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-card__value">{stats.total.toLocaleString()}</span>
          <span className="stats-card__label">Total IDocs</span>
        </div>
        <div className="stats-card stats-card--bor">
          <span className="stats-card__value">{stats.borCount.toLocaleString()}</span>
          <span className="stats-card__label">BOR Received</span>
          <span className="stats-card__sub">Message Type: ORDSP</span>
        </div>
        <div className="stats-card stats-card--gr">
          <span className="stats-card__value">{stats.grCount.toLocaleString()}</span>
          <span className="stats-card__label">GR Received</span>
          <span className="stats-card__sub">Message Type: WMMBXY</span>
        </div>
        <div className="stats-card stats-card--other">
          <span className="stats-card__value">{stats.otherCount.toLocaleString()}</span>
          <span className="stats-card__label">Other Messages</span>
        </div>
      </div>
    </div>
  );
}
