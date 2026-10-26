import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Activity, Wrench, ArrowRight } from 'lucide-react';
import { ProcessSpecs } from '../../types';
import { ChartManualGuideModal } from '../ChartManualGuideModal';

interface NormalProbabilityPlotProps {
  title?: string;
  values: number[];
  specs: ProcessSpecs;
  mean: number;
  sigma: number;
  lsl?: number | null;
  usl?: number | null;
  height?: number;
}

// Approximate inverse standard normal cumulative distribution (probit function)
function normInv(p: number): number {
  if (p <= 0) return -4.5;
  if (p >= 1) return 4.5;

  // Rational approximation (Wichura / Beasley-Springer-Moro)
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416
  ];

  const q = p - 0.5;
  if (Math.abs(q) <= 0.42) {
    const r = q * q;
    return (
      (q *
        (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const r = p < 0.5 ? p : 1 - p;
  const s = Math.log(-Math.log(r));
  let t =
    c[0] +
    s * (c[1] + s * (c[2] + s * (c[3] + s * (c[4] + s * c[5]))));
  t =
    t /
    (1 + s * (d[0] + s * (d[1] + s * (d[2] + s * d[3]))));
  return p < 0.5 ? -t : t;
}

export const NormalProbabilityPlot: React.FC<NormalProbabilityPlotProps> = ({
  title = 'Gráfico de Probabilidade',
  values,
  specs,
  mean,
  sigma,
  lsl = specs.lsl,
  usl = specs.usl,
  height = 240
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    val: number;
    pct: number;
    z: number;
  } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPos, setHoverCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseEnterTrigger = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = Math.min(Math.max(16, rect.left - 120), window.innerWidth - 460);
    const posY = rect.bottom + 8 < window.innerHeight - 340 ? rect.bottom + 8 : Math.max(16, rect.top - 360);
    setHoverCardPos({ x: posX, y: posY });
    setShowHoverCard(true);
  };

  if (!values || values.length < 3) {
    return (
      <div className="bg-white p-4 rounded-lg border border-slate-200 text-center text-slate-400 text-xs italic">
        Amostras insuficientes para gerar o Gráfico de Probabilidade Normal.
      </div>
    );
  }

  const width = 760;
  const paddingLeft = 58;
  const paddingRight = 58;
  const paddingTop = 32;
  const paddingBottom = 35;

  // Probability ticks in percent
  const probTicks = [
    { p: 0.00001, label: '0,001' },
    { p: 0.0001, label: '0,01' },
    { p: 0.001, label: '0,1' },
    { p: 0.005, label: '0,5' },
    { p: 0.05, label: '5' },
    { p: 0.2, label: '20' },
    { p: 0.5, label: '50' },
    { p: 0.7, label: '70' },
    { p: 0.95, label: '95' },
    { p: 0.99, label: '99' },
    { p: 0.999, label: '99,9' },
    { p: 0.9999, label: '99,99' },
    { p: 0.99999, label: '99,999' }
  ];

  // Min and max z in scale (-4.0 to +4.0)
  const zMin = -4.0;
  const zMax = 4.0;
  const zSpan = zMax - zMin;

  const scaleY = (z: number) => {
    const clampedZ = Math.max(zMin, Math.min(zMax, z));
    return (
      height -
      paddingBottom -
      ((clampedZ - zMin) / zSpan) * (height - paddingTop - paddingBottom)
    );
  };

  // Sorted data points
  const sortedVals = [...values].sort((a, b) => a - b);
  const n = sortedVals.length;

  const dataMin = sortedVals[0];
  const dataMax = sortedVals[n - 1];

  let xMin = Math.min(dataMin, lsl ?? dataMin, mean - 3.5 * sigma);
  let xMax = Math.max(dataMax, usl ?? dataMax, mean + 3.5 * sigma);
  const xSpan = (xMax - xMin) || 1;

  // Add small buffer to x range
  xMin -= xSpan * 0.04;
  xMax += xSpan * 0.04;
  const effectiveXSpan = xMax - xMin;

  const scaleX = (x: number) =>
    paddingLeft +
    ((x - xMin) / effectiveXSpan) * (width - paddingLeft - paddingRight);

  // Compute empirical probabilities using Blom formula: (i - 0.375) / (n + 0.25)
  const plotPoints = sortedVals.map((val, idx) => {
    const rank = idx + 1;
    const p = (rank - 0.375) / (n + 0.25);
    const z = normInv(p);
    return {
      val,
      rank,
      p,
      pct: p * 100,
      z,
      cx: scaleX(val),
      cy: scaleY(z)
    };
  });

  // Theoretical Gaussian fit line: (mean - 3.5 * sigma, z = -3.5) to (mean + 3.5 * sigma, z = +3.5)
  const xLine1 = mean - 3.8 * sigma;
  const xLine2 = mean + 3.8 * sigma;
  const fitLineX1 = scaleX(xLine1);
  const fitLineY1 = scaleY(-3.8);
  const fitLineX2 = scaleX(xLine2);
  const fitLineY2 = scaleY(3.8);

  const xMean = scaleX(mean);
  const xPlus3 = scaleX(mean + 3 * sigma);
  const xMinus3 = scaleX(mean - 3 * sigma);
  const xLsl = lsl !== null && lsl !== undefined ? scaleX(lsl) : null;
  const xUsl = usl !== null && usl !== undefined ? scaleX(usl) : null;

  return (
    <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs relative">
      {/* Header without badge 13, with manual guide trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-sans font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              onMouseEnter={handleMouseEnterTrigger}
              onMouseLeave={() => setShowHoverCard(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs group"
              title="Passe o mouse ou clique para ver o que este gráfico trata, o que ele lê, o que indica e as medidas de resolução"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span>Como Interpretar (Manual)</span>
            </button>
          </h4>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
          <span>X̄ = <strong className="text-slate-900">{mean.toFixed(3)}</strong></span>
          <span>s = <strong className="text-slate-900">{sigma.toFixed(3)}</strong></span>
          {lsl !== null && lsl !== undefined && (
            <span className="text-red-700 font-semibold">LIE = {lsl.toFixed(2)}</span>
          )}
          {usl !== null && usl !== undefined && (
            <span className="text-red-700 font-semibold">LSE = {usl.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[800px] mx-auto select-none">
          {/* Horizontal probability grid lines */}
          {probTicks.map((pt, i) => {
            const z = normInv(pt.p);
            const y = scaleY(z);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="0.75"
                />
                {/* Left Y-axis label P [%] */}
                <text
                  x={paddingLeft - 4}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fontFamily="monospace"
                  fill="#475569"
                >
                  {pt.label}
                </text>
                {/* Right Y-axis label 1 - P [%] */}
                <text
                  x={width - paddingRight + 4}
                  y={y + 3}
                  textAnchor="start"
                  fontSize="8"
                  fontFamily="monospace"
                  fill="#475569"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}

          {/* LSL (LIE) vertical line in red */}
          {xLsl !== null && (
            <g>
              <line
                x1={xLsl}
                y1={paddingTop}
                x2={xLsl}
                y2={height - paddingBottom}
                stroke="#dc2626"
                strokeWidth="1.75"
              />
              <text
                x={xLsl}
                y={paddingTop - 6}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                fill="#dc2626"
                textAnchor="middle"
              >
                LIE
              </text>
            </g>
          )}

          {/* USL (LSE) vertical line in red */}
          {xUsl !== null && (
            <g>
              <line
                x1={xUsl}
                y1={paddingTop}
                x2={xUsl}
                y2={height - paddingBottom}
                stroke="#dc2626"
                strokeWidth="1.75"
              />
              <text
                x={xUsl}
                y={paddingTop - 6}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                fill="#dc2626"
                textAnchor="middle"
              >
                LSE
              </text>
            </g>
          )}

          {/* Mean vertical line (X̄) in blue/dark dashed */}
          <line
            x1={xMean}
            y1={paddingTop}
            x2={xMean}
            y2={height - paddingBottom}
            stroke="#2563eb"
            strokeWidth="1.25"
            strokeDasharray="4 3"
          />
          <text
            x={xMean}
            y={paddingTop - 6}
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
            fill="#2563eb"
            textAnchor="middle"
          >
            X̄
          </text>

          {/* X̄ - 3s and X̄ + 3s vertical dashed lines */}
          <line
            x1={xMinus3}
            y1={paddingTop}
            x2={xMinus3}
            y2={height - paddingBottom}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={xMinus3}
            y={paddingTop - 6}
            fontSize="8"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="middle"
          >
            X̄-3s
          </text>

          <line
            x1={xPlus3}
            y1={paddingTop}
            x2={xPlus3}
            y2={height - paddingBottom}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={xPlus3}
            y={paddingTop - 6}
            fontSize="8"
            fontFamily="monospace"
            fill="#64748b"
            textAnchor="middle"
          >
            X̄+3s
          </text>

          {/* Theoretical Gaussian straight line in red */}
          <line
            x1={fitLineX1}
            y1={fitLineY1}
            x2={fitLineX2}
            y2={fitLineY2}
            stroke="#dc2626"
            strokeWidth="1.5"
            opacity="0.85"
          />

          {/* Data points (plotted as green crosses / diamonds as in image 13) */}
          {plotPoints.map((pt, i) => (
            <g
              key={i}
              onMouseEnter={() =>
                setHoveredPoint({ val: pt.val, pct: pt.pct, z: pt.z })
              }
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              {/* Green Cross Symbol (+) */}
              <line
                x1={pt.cx - 3.5}
                y1={pt.cy}
                x2={pt.cx + 3.5}
                y2={pt.cy}
                stroke="#16a34a"
                strokeWidth="1.5"
              />
              <line
                x1={pt.cx}
                y1={pt.cy - 3.5}
                x2={pt.cx}
                y2={pt.cy + 3.5}
                stroke="#16a34a"
                strokeWidth="1.5"
              />
              {/* Subtle center dot */}
              <circle cx={pt.cx} cy={pt.cy} r={1.5} fill="#15803d" />
            </g>
          ))}

          {/* Outer Box */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={width - paddingLeft - paddingRight}
            height={height - paddingTop - paddingBottom}
            fill="none"
            stroke="#000000"
            strokeWidth="1.5"
          />

          {/* X Axis ticks */}
          {[
            xMin + effectiveXSpan * 0.1,
            mean - 2 * sigma,
            mean,
            mean + 2 * sigma,
            xMax - effectiveXSpan * 0.1
          ].map((val, idx) => {
            const cx = scaleX(val);
            return (
              <g key={idx}>
                <line
                  x1={cx}
                  y1={height - paddingBottom}
                  x2={cx}
                  y2={height - paddingBottom + 4}
                  stroke="#000000"
                />
                <text
                  x={cx}
                  y={height - paddingBottom + 14}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fill="#334155"
                >
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={14}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${height / 2})`}
            fontSize="9"
            fontFamily="sans-serif"
            fill="#334155"
          >
            P [%] →
          </text>

          <text
            x={width - 12}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(90 ${width - 12} ${height / 2})`}
            fontSize="9"
            fontFamily="sans-serif"
            fill="#334155"
          >
            ← 1 - P [%]
          </text>

          <text
            x={(width - paddingRight + paddingLeft) / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            fontFamily="sans-serif"
            fill="#334155"
          >
            {specs.metricName} [{specs.unit}]
          </text>
        </svg>

        {/* Hovered point tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 left-16 bg-slate-900/90 text-white text-[10px] px-2.5 py-1 rounded shadow-md font-mono border border-slate-700 pointer-events-none">
            Valor:{' '}
            <strong className="text-emerald-400">{hoveredPoint.val.toFixed(3)}</strong> {specs.unit} | Probabilidade
            Acumulada: <strong>{hoveredPoint.pct.toFixed(2)}%</strong> (z ={' '}
            {hoveredPoint.z.toFixed(2)})
          </div>
        )}
      </div>

      {/* Prominent Explanatory Hover Card via createPortal (Guarantees zero clipping) */}
      {showHoverCard && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${hoverCardPos.x}px`,
            top: `${hoverCardPos.y}px`,
            zIndex: 99999
          }}
          onMouseEnter={() => setShowHoverCard(true)}
          onMouseLeave={() => setShowHoverCard(false)}
          className="w-[420px] max-w-[92vw] bg-white text-slate-800 rounded-xl shadow-2xl border-2 border-indigo-600 p-4 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>Gráfico de Probabilidade Normal (AIAG & VDA)</span>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
              Ajuste Gaussiano (Blom)
            </span>
          </div>

          <div className="space-y-2.5">
            {/* O que trata e lê */}
            <div>
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1 text-indigo-900">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>O que este gráfico trata e lê:</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Avalia a premissa de distribuição normal exigida para o cálculo dos índices de capabilidade (Cp e Cpk).
                Lê se os pontos medidos (posições de Blom) formam uma linha reta sobre a reta de referência teórica vermelha.
              </p>
            </div>

            {/* O que está indicando */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Diagnóstico Atual de Normalidade:</span>
              </div>
              <div className="text-[10.5px] text-slate-700 mt-1 space-y-0.5">
                <div>• Amostragem avaliada: <strong>{values.length} medições</strong></div>
                <div>• Média: <strong>{mean.toFixed(3)}</strong> | Desvio-padrão (s): <strong>{sigma.toFixed(3)} {specs.unit}</strong></div>
                <div>• Premissas de Cp/Cpk: <strong className="text-emerald-700">Distribuição com aderência linear contínua</strong></div>
              </div>
            </div>

            {/* Medidas para resolução */}
            <div>
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1 text-slate-900">
                <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Medidas para Resolução:</span>
              </div>
              <p className="text-[10.5px] text-slate-600 mt-0.5 leading-relaxed">
                Em caso de curvatura acentuada em "S" ou degraus, estratificar os dados por cavidade de molde, lote de matéria-prima ou turno. Se o processo possuir barreira física natural, aplicar transformação Box-Cox (AIAG SPC).
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Clique no botão para abrir o guia completo</span>
            <button
              type="button"
              onClick={() => {
                setShowHoverCard(false);
                setShowGuideModal(true);
              }}
              className="text-[10.5px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer hover:underline"
            >
              <span>Ver Guia Completo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Full Educational & Engineering Modal */}
      <ChartManualGuideModal
        type="normal_probability"
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        specs={specs}
        mean={mean}
        sigma={sigma}
        lsl={lsl}
        usl={usl}
        values={values}
      />
    </div>
  );
};
