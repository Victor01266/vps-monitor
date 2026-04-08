"use client";
import { useState } from "react";

interface GeoInfo {
  ip: string;
  country: string;
  city: string;
  attempts: number;
  lat: number;
  lon: number;
}

interface AttackMapProps {
  geoData: GeoInfo[];
  geoLoading: boolean;
}

// equirectangular projection → percentages for CSS positioning
function toPercent(lat: number, lon: number) {
  return {
    left: ((lon + 180) / 360) * 100,
    top: ((90 - lat) / 180) * 100,
  };
}

const COLORS = ["#CB3CFF", "#9A91FB", "#00C2FF", "#FDB52A", "#14CA74"];

// Minimal but accurate world SVG paths (Natural Earth simplified)
const WORLD_PATH = `
M 32,52 L 42,48 L 55,50 L 68,55 L 72,65 L 68,78 L 58,82 L 50,80 L 40,72 L 33,62 Z
M 42,30 L 55,25 L 65,28 L 68,38 L 60,44 L 50,42 L 42,36 Z
M 105,52 L 118,48 L 130,50 L 138,58 L 132,70 L 120,75 L 108,68 L 102,58 Z
M 155,30 L 175,28 L 195,32 L 220,38 L 235,48 L 238,62 L 228,74 L 210,80 L 190,82 L 172,76 L 158,65 L 150,50 Z
M 162,15 L 178,12 L 192,16 L 195,25 L 180,28 L 165,24 Z
M 240,42 L 260,38 L 285,42 L 305,50 L 318,62 L 320,78 L 308,90 L 288,95 L 268,92 L 250,82 L 238,68 L 235,55 Z
M 270,28 L 290,24 L 308,28 L 315,38 L 300,44 L 278,42 Z
M 315,72 L 335,68 L 355,72 L 365,85 L 360,100 L 345,108 L 328,105 L 316,92 Z
M 280,105 L 305,100 L 330,105 L 345,118 L 340,135 L 320,142 L 300,138 L 282,125 Z
M 360,42 L 390,36 L 420,38 L 445,45 L 458,56 L 455,70 L 440,80 L 415,85 L 388,82 L 365,72 L 355,58 Z
M 395,28 L 420,22 L 445,25 L 450,35 L 432,40 L 408,38 Z
M 455,55 L 480,50 L 510,52 L 530,60 L 538,75 L 528,90 L 508,98 L 485,96 L 462,85 L 450,70 Z
M 465,25 L 490,20 L 515,22 L 520,32 L 500,38 L 470,35 Z
M 530,48 L 568,42 L 600,44 L 625,52 L 638,65 L 635,80 L 618,92 L 595,96 L 568,92 L 545,80 L 530,65 Z
M 540,28 L 575,22 L 605,24 L 615,34 L 595,40 L 560,38 Z
M 610,52 L 645,46 L 678,48 L 700,58 L 708,72 L 702,88 L 682,98 L 655,100 L 630,92 L 612,78 L 605,62 Z
M 625,28 L 658,22 L 688,24 L 695,35 L 672,42 L 638,40 Z
M 680,55 L 715,48 L 748,50 L 768,62 L 772,78 L 758,92 L 732,98 L 705,94 L 682,80 L 672,65 Z
M 688,28 L 720,22 L 748,24 L 755,35 L 730,42 L 698,40 Z
M 748,60 L 782,52 L 810,55 L 825,68 L 820,82 L 802,92 L 778,94 L 755,82 L 742,70 Z
M 756,32 L 790,25 L 818,28 L 822,40 L 800,46 L 765,44 Z
M 812,38 L 832,32 L 848,36 L 848,48 L 832,52 L 815,46 Z
M 820,55 L 845,48 L 868,52 L 875,65 L 865,78 L 845,82 L 825,75 L 812,62 Z
M 855,70 L 875,65 L 895,68 L 900,82 L 890,95 L 870,98 L 852,88 Z
M 860,35 L 878,30 L 892,34 L 892,45 L 876,50 L 862,44 Z
M 730,82 L 758,78 L 785,82 L 800,95 L 796,112 L 778,120 L 755,118 L 735,105 Z
M 755,118 L 782,115 L 808,120 L 815,135 L 805,148 L 780,152 L 758,142 L 748,128 Z
`;

export function AttackMap({ geoData, geoLoading }: AttackMapProps) {
  const [tooltip, setTooltip] = useState<GeoInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ left: "0%", top: "0%" });

  const maxAttempts = geoData.reduce((m, g) => Math.max(m, g.attempts), 1);

  // VPS server position (São Paulo, Brazil)
  const vps = toPercent(-23.5, -46.6);

  return (
    <div style={{
      background: "#0B1739",
      borderRadius: 12,
      border: "0.6px solid #0B1739",
      boxShadow: "1px 1px 1px 0 rgba(16,25,52,0.40)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#AEB9E1", fontSize: 12, fontWeight: 500 }}>Origem dos Ataques</span>
          {geoData.length > 0 && (
            <>
              <span style={{ color: "#343B4F" }}>·</span>
              <span style={{ color: "#CB3CFF", fontSize: 12, fontWeight: 600 }}>{geoData.length} origens</span>
            </>
          )}
        </div>
        {geoLoading && <span style={{ color: "#AEB9E1", fontSize: 10, opacity: 0.7 }}>Resolvendo IPs…</span>}
      </div>

      {/* Map container */}
      <div style={{ position: "relative", width: "100%", paddingBottom: "46%" }}>

        {/* SVG world map */}
        <svg
          viewBox="0 0 940 160"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <defs>
            <filter id="am-glow-purple" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="am-glow-green" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Land */}
          <path d={WORLD_PATH} fill="#1a3060" fillOpacity="0.9" stroke="#243d72" strokeWidth="0.4" strokeLinejoin="round"/>

          {/* Attack lines */}
          {geoData.map((g, i) => {
            const from = toPercent(g.lat, g.lon);
            const fx = (from.left / 100) * 940;
            const fy = (from.top / 100) * 160;
            const tx = (vps.left / 100) * 940;
            const ty = (vps.top / 100) * 160;
            const mx = (fx + tx) / 2;
            const my = Math.min(fy, ty) - 25;
            return (
              <path key={`l${i}`}
                d={`M${fx},${fy} Q${mx},${my} ${tx},${ty}`}
                fill="none" stroke={COLORS[i % COLORS.length]}
                strokeWidth="0.6" strokeOpacity="0.3" strokeDasharray="3 3"
              />
            );
          })}

          {/* VPS server dot */}
          <g filter="url(#am-glow-green)">
            <circle cx={(vps.left/100)*940} cy={(vps.top/100)*160} r="5" fill="#14CA74" fillOpacity="0.9"/>
            <circle cx={(vps.left/100)*940} cy={(vps.top/100)*160} r="9" fill="#14CA74" fillOpacity="0.18">
              <animate attributeName="r" values="6;13;6" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="fill-opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite"/>
            </circle>
          </g>
          <text x={(vps.left/100)*940+7} y={(vps.top/100)*160+3} fill="#14CA74" fontSize="6" fontWeight="700">VPS</text>

          {/* Attack dots */}
          {geoData.map((g, i) => {
            const pos = toPercent(g.lat, g.lon);
            const cx = (pos.left / 100) * 940;
            const cy = (pos.top / 100) * 160;
            const color = COLORS[i % COLORS.length];
            const r = 3.5 + (g.attempts / maxAttempts) * 5;
            return (
              <g key={`d${i}`} filter="url(#am-glow-purple)"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => { setTooltip(g); setTooltipPos({ left: `${pos.left}%`, top: `${pos.top}%` }); }}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle cx={cx} cy={cy} r={r + 5} fill={color} fillOpacity="0.1">
                  <animate attributeName="r" values={`${r+3};${r+10};${r+3}`} dur="2.2s" repeatCount="indefinite" begin={`${i*0.35}s`}/>
                  <animate attributeName="fill-opacity" values="0.2;0;0.2" dur="2.2s" repeatCount="indefinite" begin={`${i*0.35}s`}/>
                </circle>
                <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity="0.85"/>
                <circle cx={cx} cy={cy} r={r*0.42} fill="white" fillOpacity="0.95"/>
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip — Figma style */}
        {tooltip && (
          <div style={{
            position: "absolute",
            left: parseFloat(tooltipPos.left) > 68 ? undefined : `calc(${tooltipPos.left} + 14px)`,
            right: parseFloat(tooltipPos.left) > 68 ? `calc(${100 - parseFloat(tooltipPos.left)}% + 14px)` : undefined,
            top: parseFloat(tooltipPos.top) > 62 ? undefined : `calc(${tooltipPos.top} + 12px)`,
            bottom: parseFloat(tooltipPos.top) > 62 ? `calc(${100 - parseFloat(tooltipPos.top)}% + 12px)` : undefined,
            background: "#0B1739",
            border: "0.6px solid #0B1739",
            borderRadius: 8,
            boxShadow: "0px 17px 17px 0px rgba(1,5,17,0.10), 1px 1px 6px rgba(0,0,0,0.5)",
            padding: "8px 14px",
            pointerEvents: "none",
            zIndex: 20,
            minWidth: 100,
          }}>
            <p style={{ color: "#AEB9E1", fontSize: 10, marginBottom: 2 }}>{tooltip.city || tooltip.country}</p>
            <p style={{ color: "white", fontSize: 16, fontWeight: 600, lineHeight: "18px", margin: 0 }}>
              {tooltip.attempts.toLocaleString("pt-BR")}
            </p>
            <p style={{ color: "#AEB9E1", fontSize: 10, marginTop: 1 }}>{tooltip.country}</p>
          </div>
        )}
      </div>

      {/* Bottom legend */}
      {geoData.length > 0 && (
        <div style={{ padding: "10px 20px 14px", borderTop: "0.6px solid #1a2550", display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          {geoData.map((g, i) => (
            <div key={g.ip} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS[i % COLORS.length], display: "inline-block", flexShrink: 0, boxShadow: `0 0 5px ${COLORS[i % COLORS.length]}` }}/>
              <span style={{ color: "#AEB9E1", fontSize: 11 }}>{g.country}</span>
              <span style={{ color: COLORS[i % COLORS.length], fontSize: 11, fontWeight: 600 }}>{g.attempts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
