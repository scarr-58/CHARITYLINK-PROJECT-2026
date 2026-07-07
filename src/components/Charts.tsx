import React, { useState } from 'react';

/**
 * Lightweight, dependency-free SVG charts for CharityLink.
 * Colours are passed in by the parent (already resolved for the active light/dark
 * theme) so the charts stay presentation-only. Chart chrome (text, gridlines)
 * uses Tailwind fill/stroke utilities so it adapts to dark mode automatically.
 */

// Validated categorical palette (dataviz skill, fixed slot order). Assigned to
// campaign categories in a stable order so adjacent segments stay CVD-safe.
const CATEGORY_ORDER = ['Education', 'Health', 'Water', 'Livelihood', 'Emergency', 'Environment'];
const CATEGORY_LIGHT = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948'];
const CATEGORY_DARK = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767'];

export function categoryColor(category: string, dark: boolean): string {
  const idx = CATEGORY_ORDER.indexOf(category);
  const palette = dark ? CATEGORY_DARK : CATEGORY_LIGHT;
  return idx >= 0 ? palette[idx] : (dark ? '#8a8f98' : '#9aa0a6');
}

interface Slice { label: string; value: number; color: string; }

// ---------------- DONUT ----------------
export function DonutChart({
  data,
  size = 200,
  thickness = 26,
  centerLabel,
  formatValue = (n) => n.toLocaleString(),
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  formatValue?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 2; // 2px surface gap between segments

  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const len = Math.max(0, frac * circumference - gap);
    const seg = { ...d, i, dash: len, gapRest: circumference - len, rotation: (offset / circumference) * 360 };
    offset += frac * circumference;
    return seg;
  });

  const active = hover !== null ? data[hover] : null;
  const centerTop = active ? formatValue(active.value) : formatValue(total);
  const centerBottom = active ? active.label : (centerLabel || 'Total');

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" strokeWidth={thickness}
            className="stroke-gray-100 dark:stroke-white/5" />
          {segments.map((s) => (
            <circle
              key={s.i}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.i ? thickness + 4 : thickness}
              strokeDasharray={`${s.dash} ${s.gapRest}`}
              strokeDashoffset={-((s.rotation / 360) * circumference)}
              strokeLinecap="butt"
              className="transition-all duration-200 cursor-pointer"
              style={{ opacity: hover === null || hover === s.i ? 1 : 0.35 }}
              onMouseEnter={() => setHover(s.i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </g>
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-900 dark:fill-white font-bold" style={{ fontSize: 20 }}>
          {centerTop}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 font-semibold" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {centerBottom}
        </text>
      </svg>

      {/* Legend (identity is never colour-alone) */}
      <div className="flex-1 w-full space-y-1.5">
        {data.map((d, i) => (
          <button
            key={d.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="w-full flex items-center gap-2 text-left group"
          >
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
            <span className={`text-xs font-semibold flex-1 truncate ${hover === i ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{d.label}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">{formatValue(d.value)}</span>
            <span className="text-[10px] text-gray-400 w-9 text-right tabular-nums">{Math.round((d.value / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- HORIZONTAL BARS ----------------
export function HBarChart({
  data,
  formatValue = (n) => n.toLocaleString(),
}: {
  data: { label: string; value: number; sub?: string; color?: string }[];
  formatValue?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="group">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate pr-2">{d.label}</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums shrink-0">{formatValue(d.value)}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  backgroundColor: d.color || '#10b981',
                  opacity: hover === null || hover === i ? 1 : 0.5
                }}
              />
            </div>
            {d.sub && <div className="text-[10px] text-gray-400 mt-0.5">{d.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- AREA / LINE (over time) ----------------
export function AreaChart({
  points,
  height = 160,
  color = '#10b981',
  formatValue = (n) => n.toLocaleString(),
  formatLabel = (s) => s,
}: {
  points: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatValue?: (n: number) => string;
  formatLabel?: (s: string) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 560;
  const padX = 8;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  if (points.length === 0) {
    return <div className="h-40 flex items-center justify-center text-xs text-gray-400">No data yet.</div>;
  }

  const max = Math.max(...points.map(p => p.value), 1);
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const xy = points.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + innerH - (p.value / max) * innerH,
    ...p,
  }));

  const linePath = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${xy[xy.length - 1].x} ${padY + innerH} L ${xy[0].x} ${padY + innerH} Z`;
  const gid = `area-grad-${Math.round(max)}`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* recessive gridlines */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={padX} x2={width - padX} y1={padY + innerH * g} y2={padY + innerH * g}
            className="stroke-gray-100 dark:stroke-white/5" strokeWidth={1} />
        ))}
        <path d={areaPath} fill={`url(#${gid})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {xy.map((p, i) => (
          <g key={i}>
            {/* wide invisible hit target */}
            <rect x={p.x - stepX / 2} y={0} width={Math.max(stepX, 12)} height={height} fill="transparent"
              onMouseEnter={() => setHover(i)} />
            <circle cx={p.x} cy={p.y} r={hover === i ? 5 : 3} fill={color} className="stroke-white dark:stroke-[#0d1512]" strokeWidth={2} />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute -translate-x-1/2 -top-1 pointer-events-none bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
          style={{ left: `${((xy[hover].x) / width) * 100}%` }}>
          {formatValue(xy[hover].value)}
          <span className="block text-gray-300 font-medium">{formatLabel(xy[hover].label)}</span>
        </div>
      )}
    </div>
  );
}
