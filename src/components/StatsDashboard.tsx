import { useMemo } from 'react';
import type { EdidcRecord } from '../types';

interface StatsDashboardProps {
  edidcData: EdidcRecord[] | null;
}

/* ── SVG donut helper ── */
function DonutSegment({ cx, cy, r, startAngle, endAngle, color }: {
  cx: number; cy: number; r: number; startAngle: number; endAngle: number; color: string;
}) {
  const rad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  return <path d={d} fill={color} />;
}

export default function StatsDashboard({ edidcData }: StatsDashboardProps) {
  const stats = useMemo(() => {
    if (!edidcData) return null;

    let borCount = 0;
    let grCount = 0;
    let otherCount = 0;

    for (const row of edidcData) {
      const mt = row.messageType.trim().toUpperCase();
      if (mt === 'ORDRSP') {
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

  // Donut chart angles
  const { total, borCount, grCount, otherCount } = stats;
  const borPct = total > 0 ? (borCount / total) * 100 : 0;
  const grPct = total > 0 ? (grCount / total) * 100 : 0;
  const otherPct = total > 0 ? (otherCount / total) * 100 : 0;

  const borEnd = (borCount / total) * 360;
  const grEnd = borEnd + (grCount / total) * 360;
  const otherEnd = 360;

  // Bar chart max
  const barMax = Math.max(borCount, grCount, otherCount, 1);

  return (
    <div className="feature-panel">
      <h2>Stats Dashboard</h2>
      <p className="feature-description">
        Key metrics derived from uploaded EDIDC data.
      </p>

      {/* ── Metric Cards ── */}
      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-card__value">{total.toLocaleString()}</span>
          <span className="stats-card__label">Total IDocs</span>
        </div>
        <div className="stats-card stats-card--bor">
          <span className="stats-card__value">{borCount.toLocaleString()}</span>
          <span className="stats-card__label">BOR Received</span>
          <span className="stats-card__sub">Message Type: ORDRSP</span>
        </div>
        <div className="stats-card stats-card--gr">
          <span className="stats-card__value">{grCount.toLocaleString()}</span>
          <span className="stats-card__label">GR Received</span>
          <span className="stats-card__sub">Message Type: WMMBXY</span>
        </div>
        <div className="stats-card stats-card--other">
          <span className="stats-card__value">{otherCount.toLocaleString()}</span>
          <span className="stats-card__label">Other Messages</span>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="stats-charts">

        {/* Donut Chart */}
        <div className="stats-chart-box">
          <h3 className="stats-chart-title">Message Distribution</h3>
          <div className="stats-donut-wrap">
            <svg viewBox="0 0 200 200" className="stats-donut">
              {borCount > 0 && (
                <DonutSegment cx={100} cy={100} r={85} startAngle={0} endAngle={borEnd} color="#1565c0" />
              )}
              {grCount > 0 && (
                <DonutSegment cx={100} cy={100} r={85} startAngle={borEnd} endAngle={grEnd} color="#0f6b5e" />
              )}
              {otherCount > 0 && (
                <DonutSegment cx={100} cy={100} r={85} startAngle={grEnd} endAngle={otherEnd} color="#9e9e9e" />
              )}
              {/* Inner circle for donut hole */}
              <circle cx={100} cy={100} r={50} fill="#fff" />
              <text x={100} y={95} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1b3a4b">
                {total.toLocaleString()}
              </text>
              <text x={100} y={116} textAnchor="middle" fontSize="11" fill="#888">
                Total IDocs
              </text>
            </svg>
          </div>
          <div className="stats-legend">
            <span className="stats-legend__item"><span className="stats-legend__dot" style={{ background: '#1565c0' }} /> BOR ({borPct.toFixed(1)}%)</span>
            <span className="stats-legend__item"><span className="stats-legend__dot" style={{ background: '#0f6b5e' }} /> GR ({grPct.toFixed(1)}%)</span>
            <span className="stats-legend__item"><span className="stats-legend__dot" style={{ background: '#9e9e9e' }} /> Other ({otherPct.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="stats-chart-box">
          <h3 className="stats-chart-title">BOR vs GR Comparison</h3>
          <div className="stats-bars">
            {[
              { label: 'BOR (ORDRSP)', count: borCount, color: '#1565c0' },
              { label: 'GR (WMMBXY)', count: grCount, color: '#0f6b5e' },
              { label: 'Other', count: otherCount, color: '#9e9e9e' },
            ].map((bar) => (
              <div key={bar.label} className="stats-bar-row">
                <span className="stats-bar-label">{bar.label}</span>
                <div className="stats-bar-track">
                  <div
                    className="stats-bar-fill"
                    style={{ width: `${(bar.count / barMax) * 100}%`, background: bar.color }}
                  />
                </div>
                <span className="stats-bar-count">{bar.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
