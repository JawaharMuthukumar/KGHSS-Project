import { useState } from "react";

/*
 * Small dependency-free charts for the portal (dataviz method: thin marks, 4px rounded data-ends, 2px surface
 * gaps, recessive hairline grid, text in ink tokens — colour only on the marks — and a hover tooltip on every mark).
 * Colours come from the --viz-* CSS variables in index.css, so portal dark mode swaps them in one place.
 */

const fmt = (v, unit = "") => (v == null ? "—" : `${v}${unit}`);

/** Relative wrapper + a hover tooltip that follows the pointer inside it. */
function useTooltip() {
  const [container, setContainer] = useState(null); // callback ref: the chart's relative wrapper
  const [tip, setTip] = useState(null);
  const show = (e, content) => {
    const box = container?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, w: box.width, content });
  };
  const hide = () => setTip(null);
  const node = tip && (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 min-w-[8rem] max-w-[16rem] rounded-xl bg-navy-dark px-3 py-2 text-xs text-white shadow-lg"
      style={{
        left: Math.min(Math.max(tip.x + 12, 0), Math.max(tip.w - 180, 0)),
        top: Math.max(tip.y - 12, 0),
        transform: "translateY(-100%)",
      }}
    >
      {tip.content}
    </div>
  );
  return { wrap: setContainer, show, hide, node };
}

function TipRows({ title, rows }) {
  return (
    <>
      {title && <p className="font-semibold mb-1">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 leading-snug">
          {r.color && <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />}
          <span className="text-white/70">{r.label}</span>
          <span className="ml-auto font-semibold tabular-nums">{r.value}</span>
        </p>
      ))}
    </>
  );
}

/** Legend for two or more series: swatch + text label (identity never rests on colour alone). */
export function Legend({ series, className = "" }) {
  if (!series || series.length < 2) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy/65 ${className}`}>
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Part-of-whole ring with a centre figure; the legend beside it carries every label, count and share. */
export function Donut({ segments, centerValue, centerLabel, size = 168 }) {
  const tip = useTooltip();
  const total = segments.reduce((s, x) => s + (x.value || 0), 0);
  const r = 15.9155; // circumference 100 in the 42×42 viewBox
  const gap = total && segments.filter((s) => s.value).length > 1 ? 0.8 : 0; // 2px-ish surface gap between slices
  let offset = 25; // start at 12 o'clock
  return (
    <div ref={tip.wrap} className="relative flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 42 42" width={size} height={size} className="shrink-0" role="img" aria-label={centerLabel}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--viz-grid)" strokeWidth="5" />
        {total > 0 &&
          segments.map((s) => {
            const share = ((s.value || 0) / total) * 100;
            if (!share) return null;
            const dash = Math.max(share - gap, 0.01);
            const el = (
              <circle
                key={s.label}
                cx="21"
                cy="21"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="5"
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={offset}
                className="cursor-default"
                onMouseMove={(e) => tip.show(e, <TipRows rows={[{ label: s.label, value: `${s.value} · ${Math.round(share)}%`, color: s.color }]} />)}
                onMouseLeave={tip.hide}
              />
            );
            offset -= share;
            return el;
          })}
        <text x="21" y="20.5" textAnchor="middle" className="fill-navy font-heading font-bold" style={{ fontSize: 7 }}>
          {centerValue ?? "—"}
        </text>
        <text x="21" y="26.5" textAnchor="middle" className="fill-navy/55" style={{ fontSize: 3.2 }}>
          {centerLabel}
        </text>
      </svg>
      <ul className="flex flex-col gap-2 text-sm min-w-[9rem]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-navy/70">{s.label}</span>
            <span className="ml-auto pl-3 font-semibold text-navy tabular-nums">{s.value}</span>
            <span className="w-10 text-right text-xs text-navy/45 tabular-nums">{total ? `${Math.round((s.value / total) * 100)}%` : ""}</span>
          </li>
        ))}
      </ul>
      {tip.node}
    </div>
  );
}

/**
 * Horizontal bars, one row per item, one thin bar per series (same 0–max scale, one axis).
 * The value sits at each bar's tip; `onRowClick` makes rows act as links.
 */
export function HBars({ rows, series, max = 100, unit = "%", onRowClick, labelWidth = "5.5rem" }) {
  const tip = useTooltip();
  return (
    <div ref={tip.wrap} className="relative">
      <Legend series={series} className="mb-3" />
      <div className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onMouseMove={(e) =>
              tip.show(
                e,
                <TipRows
                  title={row.label}
                  rows={[
                    ...series.map((s) => ({ label: s.label, value: fmt(row.values[s.key], unit), color: s.color })),
                    ...(row.extra || []),
                  ]}
                />
              )
            }
            onMouseLeave={tip.hide}
            className={`flex items-center gap-3 py-1.5 rounded-lg ${onRowClick ? "cursor-pointer hover:bg-navy/[0.04]" : ""}`}
          >
            <div className="shrink-0 text-sm" style={{ width: labelWidth }}>
              <p className="font-medium text-navy leading-tight truncate">{row.label}</p>
              {row.sublabel && <p className="text-[11px] text-navy/45 leading-tight truncate">{row.sublabel}</p>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-[2px] border-l border-[var(--viz-axis)]">
              {series.map((s) => {
                const v = row.values[s.key];
                return (
                  <div key={s.key} className="flex items-center gap-1.5 h-3">
                    <div
                      className="h-full rounded-r-[4px]"
                      style={{ width: v ? `${Math.min(v / max, 1) * 85}%` : 0, background: s.color, minWidth: v ? 2 : 0 }}
                    />
                    <span className="text-[11px] font-semibold text-navy/70 tabular-nums whitespace-nowrap">{fmt(v, unit)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {tip.node}
    </div>
  );
}

/** Vertical columns for a short ordered list (e.g. marks ranges); value on each cap. */
export function Columns({ items, height = 160, unitLabel = "" }) {
  const tip = useTooltip();
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <div ref={tip.wrap} className="relative">
      <div className="flex items-end gap-2 border-b border-[var(--viz-axis)]" style={{ height }}>
        {items.map((it) => (
          <div
            key={it.label}
            className="flex-1 flex flex-col items-center justify-end h-full"
            onMouseMove={(e) => tip.show(e, <TipRows rows={[{ label: it.label, value: `${it.value}${unitLabel}`, color: it.color }]} />)}
            onMouseLeave={tip.hide}
          >
            <span className="text-xs font-semibold text-navy/75 tabular-nums mb-1">{it.value}</span>
            <div
              className="w-full max-w-[24px] rounded-t-[4px]"
              style={{ height: `${((it.value || 0) / max) * (height - 22)}px`, background: it.color, minHeight: it.value ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1.5">
        {items.map((it) => (
          <span key={it.label} className="flex-1 text-center text-[11px] text-navy/55 leading-tight">
            {it.label}
          </span>
        ))}
      </div>
      {tip.node}
    </div>
  );
}

/** Line chart over ordered categories (exams), 0–max on one axis, crosshair + tooltip per point. */
export function LineChart({ points, series, max = 100, unit = "%" }) {
  const tip = useTooltip();
  const [hover, setHover] = useState(null);
  const W = 560, H = 210, L = 34, R = 14, T = 14, B = 34;
  const n = points.length;
  const x = (i) => (n <= 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (1 - Math.min(v, max) / max) * (H - T - B);
  const ticks = [0, 25, 50, 75, 100].filter((t) => t <= max);
  const band = n <= 1 ? W - L - R : (W - L - R) / (n - 1);
  return (
    <div ref={tip.wrap} className="relative">
      <Legend series={series} className="mb-2" />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={series.map((s) => s.label).join(" and ") + " by exam"}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth="1" />
            <text x={L - 6} y={y(t) + 3.5} textAnchor="end" className="fill-navy/45 tabular-nums" style={{ fontSize: 10 }}>
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={p.label} x={x(i)} y={H - B + 18} textAnchor="middle" className="fill-navy/55" style={{ fontSize: 10.5 }}>
            {p.label}
          </text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--viz-axis)" strokeWidth="1" />}
        {series.map((s) => {
          const pts = points.map((p, i) => (p.values[s.key] == null ? null : [x(i), y(p.values[s.key])])).filter(Boolean);
          return (
            <g key={s.key}>
              {pts.length > 1 && (
                <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {pts.map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={hover === i ? 5.5 : 4.5} fill={s.color} stroke="var(--viz-surface)" strokeWidth="2" />
              ))}
            </g>
          );
        })}
        {/* Hit bands wider than the marks */}
        {points.map((p, i) => (
          <rect
            key={p.label}
            x={x(i) - band / 2}
            y={T}
            width={band}
            height={H - T - B}
            fill="transparent"
            onMouseMove={(e) => {
              setHover(i);
              tip.show(
                e,
                <TipRows
                  title={p.label}
                  rows={[...series.map((s) => ({ label: s.label, value: fmt(p.values[s.key], unit), color: s.color })), ...(p.extra || [])]}
                />
              );
            }}
            onMouseLeave={() => {
              setHover(null);
              tip.hide();
            }}
          />
        ))}
      </svg>
      {tip.node}
    </div>
  );
}
