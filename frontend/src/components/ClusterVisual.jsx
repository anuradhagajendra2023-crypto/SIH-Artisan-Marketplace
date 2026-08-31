import React from "react";

// Same warm palette used for the image-fallback avatars, so the whole
// app's "artisan color" language stays consistent.
const PALETTE = ["#B65C38", "#8A5A44", "#C97D3F", "#7A6248", "#A6714A", "#9C5B3C"];

function colorForIndex(i) {
  return PALETTE[i % PALETTE.length];
}

/**
 * Visualizes a cluster-fulfillment result as a single stacked bar —
 * each segment is one artisan's share of the order — plus a legend
 * row per artisan with their match score, units, revenue and distance.
 *
 * This is the visual proof of the app's core idea: a bulk order too
 * big for any one artisan gets split across a "micro-cooperative."
 */
const ClusterVisual = ({ result }) => {
  if (!result) return null;

  const allocation = result.allocation || [];
  const totalNeeded =
    result.totalUnitsAllocated + (result.unitsShort || 0) || result.totalUnitsAllocated || 1;
  const coveredPct = Math.min(100, Math.round((result.totalUnitsAllocated / totalNeeded) * 100));

  return (
    <div className="cluster-visual">
      <div className="cluster-visual-header">
        <span className="cluster-visual-label">
          {result.totalUnitsAllocated} / {totalNeeded} units covered
        </span>
        <span className="cluster-visual-pct">{coveredPct}%</span>
      </div>

      <div className="cluster-stack-track" role="img" aria-label={`${coveredPct}% of order covered`}>
        {allocation.map((a, i) => {
          const widthPct = (a.unitsAllocated / totalNeeded) * 100;
          return (
            <div
              key={a.artisanId}
              className="cluster-stack-segment"
              style={{ width: `${widthPct}%`, background: colorForIndex(i) }}
              title={`${a.name} — ${a.unitsAllocated} units`}
            />
          );
        })}
        {result.unitsShort > 0 && (
          <div
            className="cluster-stack-gap"
            style={{ width: `${(result.unitsShort / totalNeeded) * 100}%` }}
            title={`${result.unitsShort} units still needed`}
          />
        )}
      </div>

      <div className="cluster-legend">
        {allocation.map((a, i) => (
          <div key={a.artisanId} className="cluster-legend-row">
            <span className="cluster-legend-dot" style={{ background: colorForIndex(i) }} />
            <div className="cluster-legend-info">
              <strong>{a.name}</strong>
              <span>
                {a.unitsAllocated} units
                {a.revenueShareInr != null ? ` · ₹${a.revenueShareInr.toLocaleString("en-IN")}` : ""}
                {a.distanceKm != null ? ` · ${a.distanceKm} km away` : ""}
              </span>
            </div>
            <div className="cluster-legend-score" title="Match score (capacity, distance, rating)">
              {a.matchScore}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClusterVisual;
