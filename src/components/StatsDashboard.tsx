import { useMemo, useState } from 'react';
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
  const [drillDown, setDrillDown] = useState<null | 'bor' | 'gr' | 'other'>(null);

  const stats = useMemo(() => {
    if (!edidcData) return null;

    let borCount = 0;
    let borPassed = 0;
    let borFailed = 0;
    let grCount = 0;
    let grPassed = 0;
    let grFailed = 0;
    let otherCount = 0;
    let otherPassed = 0;
    let otherFailed = 0;

    for (const row of edidcData) {
      const mt = row.messageType.trim().toUpperCase();
      const passed = row.idocStatus.trim() === '53';
      if (mt === 'ORDRSP') {
        borCount++;
        if (passed) borPassed++; else borFailed++;
      } else if (mt === 'WMMBXY') {
        grCount++;
        if (passed) grPassed++; else grFailed++;
      } else {
        otherCount++;
        if (passed) otherPassed++; else otherFailed++;
      }
    }

    return {
      total: edidcData.length,
      borCount, borPassed, borFailed,
      grCount, grPassed, grFailed,
      otherCount, otherPassed, otherFailed,
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
  const { total, borCount, borPassed, borFailed, grCount, grPassed, grFailed, otherCount, otherPassed, otherFailed } = stats;
  const borPct = total > 0 ? (borCount / total) * 100 : 0;
  const grPct = total > 0 ? (grCount / total) * 100 : 0;
  const otherPct = total > 0 ? (otherCount / total) * 100 : 0;

  const borEnd = (borCount / total) * 360;
  const grEnd = borEnd + (grCount / total) * 360;
  const otherEnd = 360;

  // Bar chart max
  const barMax = Math.max(borCount, grCount, otherCount, 1);

  // Drill-down bar maxes
  const borDrillMax = Math.max(borPassed, borFailed, 1);
  const grDrillMax = Math.max(grPassed, grFailed, 1);
  const otherDrillMax = Math.max(otherPassed, otherFailed, 1);

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
          <p className="stats-chart-hint">Click any bar to drill down into pass/fail</p>
          <div className="stats-bars">
            {[
              { key: 'bor' as const, label: 'BOR (ORDRSP)', count: borCount, color: '#1565c0' },
              { key: 'gr' as const, label: 'GR (WMMBXY)', count: grCount, color: '#0f6b5e' },
              { key: 'other' as const, label: 'Other', count: otherCount, color: '#9e9e9e' },
            ].map((bar) => (
              <div
                key={bar.label}
                className={`stats-bar-row stats-bar-row--clickable ${drillDown === bar.key ? 'stats-bar-row--active' : ''}`}
                onClick={() => setDrillDown(drillDown === bar.key ? null : bar.key)}
              >
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

      {/* ── Drill-Down Panel ── */}
      {drillDown && (() => {
        const config = {
          bor: { title: 'BOR (ORDRSP)', total: borCount, passed: borPassed, failed: borFailed, drillMax: borDrillMax, color: '#1565c0' },
          gr: { title: 'GR (WMMBXY)', total: grCount, passed: grPassed, failed: grFailed, drillMax: grDrillMax, color: '#0f6b5e' },
          other: { title: 'Other Messages', total: otherCount, passed: otherPassed, failed: otherFailed, drillMax: otherDrillMax, color: '#9e9e9e' },
        }[drillDown];

        const passAngle = config.total > 0 ? (config.passed / config.total) * 360 : 0;

        return (
          <div className="stats-drilldown" style={{ borderColor: config.color }}>
            <div className="stats-drilldown__header">
              <h3 className="stats-chart-title">{config.title} — Pass / Fail Breakdown</h3>
              <button className="btn btn--secondary stats-drilldown__close" onClick={() => setDrillDown(null)}>✕ Close</button>
            </div>
            <p className="stats-drilldown__sub">IDoc Status 53 = Passed &nbsp;|&nbsp; Any other status = Failed</p>

            <div className="stats-grid" style={{ marginTop: '1rem' }}>
              <div className="stats-card stats-card--passed">
                <span className="stats-card__value">{config.passed.toLocaleString()}</span>
                <span className="stats-card__label">Passed</span>
                <span className="stats-card__sub">IDoc Status: 53</span>
              </div>
              <div className="stats-card stats-card--failed">
                <span className="stats-card__value">{config.failed.toLocaleString()}</span>
                <span className="stats-card__label">Failed</span>
                <span className="stats-card__sub">IDoc Status: ≠ 53</span>
              </div>
            </div>

            <div className="stats-charts" style={{ marginTop: '1rem' }}>
              {/* Donut */}
              <div className="stats-chart-box">
                <h3 className="stats-chart-title">Pass/Fail Distribution</h3>
                <div className="stats-donut-wrap">
                  <svg viewBox="0 0 200 200" className="stats-donut">
                    {config.passed > 0 && (
                      <DonutSegment cx={100} cy={100} r={85} startAngle={0} endAngle={passAngle} color="#16794a" />
                    )}
                    {config.failed > 0 && (
                      <DonutSegment cx={100} cy={100} r={85} startAngle={passAngle} endAngle={360} color="#c0392b" />
                    )}
                    <circle cx={100} cy={100} r={50} fill="#fff" />
                    <text x={100} y={95} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1b3a4b">
                      {config.total.toLocaleString()}
                    </text>
                    <text x={100} y={116} textAnchor="middle" fontSize="11" fill="#888">
                      Total
                    </text>
                  </svg>
                </div>
                <div className="stats-legend">
                  <span className="stats-legend__item"><span className="stats-legend__dot" style={{ background: '#16794a' }} /> Passed ({config.total > 0 ? ((config.passed / config.total) * 100).toFixed(1) : 0}%)</span>
                  <span className="stats-legend__item"><span className="stats-legend__dot" style={{ background: '#c0392b' }} /> Failed ({config.total > 0 ? ((config.failed / config.total) * 100).toFixed(1) : 0}%)</span>
                </div>
              </div>

              {/* Bars */}
              <div className="stats-chart-box">
                <h3 className="stats-chart-title">Passed vs Failed</h3>
                <div className="stats-bars">
                  {[
                    { label: 'Passed (53)', count: config.passed, color: '#16794a' },
                    { label: 'Failed (≠ 53)', count: config.failed, color: '#c0392b' },
                  ].map((bar) => (
                    <div key={bar.label} className="stats-bar-row">
                      <span className="stats-bar-label">{bar.label}</span>
                      <div className="stats-bar-track">
                        <div
                          className="stats-bar-fill"
                          style={{ width: `${(bar.count / config.drillMax) * 100}%`, background: bar.color }}
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
      })()}
    </div>
  );
}
