"use client";
import { useEffect, useRef, useState } from "react";

interface AttackTrendsProps {
  accepted?: number;
  invalid?: number;
  brute?: number;
}

const SEGMENTS = [
  { key: "accepted", label: "Aceitos",     color: "#10B981", glow: "rgba(16,185,129,0.5)" },
  { key: "invalid",  label: "Inválidos",   color: "#00C2FF", glow: "rgba(0,194,255,0.4)" },
  { key: "brute",    label: "Brute Force", color: "#CB3CFF", glow: "rgba(203,60,255,0.5)" },
] as const;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, thickness: number) {
  const inner = r - thickness;
  const s1 = polarToXY(cx, cy, r, startDeg);
  const e1 = polarToXY(cx, cy, r, endDeg);
  const s2 = polarToXY(cx, cy, inner, endDeg);
  const e2 = polarToXY(cx, cy, inner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${r} ${r} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${e2.x} ${e2.y}`,
    "Z",
  ].join(" ");
}

const MIN_DEG  = 10;
const GAP_DEG  = 3;
const CX = 110, CY = 118, R = 90, THICKNESS = 22;
const START = -180, FULL_RANGE = 180;
const ANIM_MS  = 700; // duração da transição em ms

/** Calcula graus alvo de cada segmento dado os valores brutos */
function calcTargetDegs(vals: Record<string, number>): Record<string, number> {
  const sum = SEGMENTS.reduce((a, s) => a + (vals[s.key] ?? 0), 0);
  if (sum === 0) return Object.fromEntries(SEGMENTS.map(s => [s.key, 0]));

  const activeSegs = SEGMENTS.filter(s => (vals[s.key] ?? 0) > 0);
  const totalGap = GAP_DEG * Math.max(0, activeSegs.length - 1);
  const usable = FULL_RANGE - totalGap;

  const raw: Record<string, number> = {};
  SEGMENTS.forEach(s => { raw[s.key] = (vals[s.key] / sum) * usable; });

  // aplica mínimo
  const withMin: Record<string, number> = {};
  SEGMENTS.forEach(s => { withMin[s.key] = vals[s.key] > 0 ? Math.max(raw[s.key], MIN_DEG) : 0; });

  // corrige excesso reduzindo os maiores proporcionalmente
  const totalDeg = Object.values(withMin).reduce((a, v) => a + v, 0);
  const excess = totalDeg - usable;
  if (excess > 0) {
    const bigKeys = SEGMENTS.filter(s => withMin[s.key] > MIN_DEG);
    const bigTotal = bigKeys.reduce((a, s) => a + withMin[s.key], 0);
    bigKeys.forEach(s => { withMin[s.key] -= excess * (withMin[s.key] / bigTotal); });
  }
  return withMin;
}

const AttackTrends = ({ accepted = 0, invalid = 0, brute = 0 }: AttackTrendsProps) => {
  const vals = { accepted, invalid, brute };
  const sum  = accepted + invalid + brute;

  // % para legenda (usa valores reais, não animados)
  const pcts: Record<string, number> = {};
  SEGMENTS.forEach(s => { pcts[s.key] = sum > 0 ? Math.round(((vals as Record<string,number>)[s.key] / sum) * 100) : 0; });

  // centro: tipo ataque dominante
  const attackSum    = invalid + brute;
  const dominantKey  = brute >= invalid ? "brute" : "invalid";
  const centerSeg    = SEGMENTS.find(s => s.key === dominantKey)!;
  const centerPct    = sum > 0 ? Math.round(((vals as Record<string,number>)[dominantKey] / sum) * 100) : 0;
  const centerLabel  = attackSum === 0 ? "sem ataques" : dominantKey === "brute" ? "brute force" : "inválidos";

  // ── Animação: interpola graus de animatedDegs → targetDegs ──
  const targetDegs = calcTargetDegs(vals as Record<string, number>);
  const [animDegs, setAnimDegs] = useState<Record<string, number>>(targetDegs);
  const rafRef  = useRef<number | null>(null);
  const fromRef = useRef<Record<string, number>>(targetDegs);
  const startTs = useRef<number>(0);

  useEffect(() => {
    fromRef.current = animDegs;   // parte de onde estamos agora
    startTs.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (ts: number) => {
      if (!startTs.current) startTs.current = ts;
      const t = Math.min((ts - startTs.current) / ANIM_MS, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad

      const next: Record<string, number> = {};
      SEGMENTS.forEach(s => {
        next[s.key] = fromRef.current[s.key] + (targetDegs[s.key] - fromRef.current[s.key]) * ease;
      });
      setAnimDegs(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accepted, invalid, brute]);

  // constrói arcos com graus animados
  const arcs = SEGMENTS.reduce<{ key: string; color: string; glow: string; start: number; end: number; deg: number }[]>(
    (acc, seg) => {
      const deg = animDegs[seg.key] ?? 0;
      if (deg < 0.5) return acc;
      const prev = acc[acc.length - 1];
      const start = prev ? prev.end + GAP_DEG : START;
      const end   = start + deg;
      return [...acc, { key: seg.key, color: seg.color, glow: seg.glow, start, end, deg }];
    }, []
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <svg width="220" height="130" viewBox="0 0 220 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {SEGMENTS.map(seg => (
            <filter key={`glow-${seg.key}`} id={`glow-${seg.key}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Track */}
        <path d={buildArc(CX, CY, R, START, START + FULL_RANGE, THICKNESS)} fill="#0A1330" stroke="#1a2550" strokeWidth="0.5" />

        {/* Arcos animados */}
        {arcs.map(arc => (
          <path
            key={arc.key}
            d={buildArc(CX, CY, R, arc.start, arc.end, THICKNESS)}
            fill={arc.color}
            filter={`url(#glow-${arc.key})`}
            opacity="0.95"
          />
        ))}

        {/* Centro */}
        <text x={CX} y={CY - 14} textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="inherit"
          fill={sum === 0 ? "#AEB9E1" : centerSeg.color}>
          {centerPct}%
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" fill="#AEB9E1" fontSize="10" fontFamily="inherit">
          {centerLabel}
        </text>
      </svg>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {SEGMENTS.map(seg => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color, boxShadow: `0 0 6px ${seg.glow}` }} />
            <span className="text-[11px] text-[#AEB9E1]">{seg.label}</span>
            <span className="text-[11px] font-semibold" style={{ color: seg.color }}>{pcts[seg.key]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttackTrends;
