import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CheckCircle2, AlertTriangle, ArrowRight, Wrench, Activity } from 'lucide-react';
import { ProcessSpecs } from '../../types';
import { ChartManualGuideModal } from '../ChartManualGuideModal';

interface RawValuesRunChartPlotProps {
  title?: string;
  points: { sample: number; value: number; id?: string }[];
  specs: ProcessSpecs;
  mean: number;
  sigma: number;
  lsl?: number | null;
  usl?: number | null;
  height?: number;
}

export const RawValuesRunChartPlot: React.FC<RawValuesRunChartPlotProps> = ({
  title = 'Carta de Valores Brutos',
  points,
  specs,
  mean,
  sigma,
  lsl = specs.lsl,
  usl = specs.usl,
  height = 240
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg border border-slate-200 text-center text-slate-400 text-xs italic">
        Nenhum dado disponível para a Carta de Valores Brutos.
      </div>
    );
  }

  const width = 760;
  const paddingLeft = 55;
  const paddingRight = 65;
  const paddingTop = 32;
  const paddingBottom = 35;

  const vals = points.map((p) => p.value);
  const minVal = Math.min(...vals, lsl !== null && lsl !== undefined ? lsl : Infinity);
  const maxVal = Math.max(...vals, usl !== null && usl !== undefined ? usl : -Infinity);
  const dataSpan = maxVal - minVal || 1;

  const yMin = minVal - dataSpan * 0.12;
  const yMax = maxVal + dataSpan * 0.12;
  const ySpan = yMax - yMin;

  const scaleX = (idx: number) =>
    paddingLeft + (idx / Math.max(1, points.length - 1)) * (width - paddingLeft - paddingRight);
  const scaleY = (val: number) =>
    height - paddingBottom - ((val - yMin) / ySpan) * (height - paddingTop - paddingBottom);

  const yMean = scaleY(mean);
  const yPlus3 = scaleY(mean + 3 * sigma);
  const yMinus3 = scaleY(mean - 3 * sigma);
  const yLsl = lsl !== null && lsl !== undefined ? scaleY(lsl) : null;
  const yUsl = usl !== null && usl !== undefined ? scaleY(usl) : null;

  // Path string for connected run chart
  const pathD = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.value).toFixed(1)}`;
  }, '');

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPos, setHoverCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const rawValues = points.map((p) => p.value);

  const handleMouseEnterTrigger = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Position below or above trigger safely
    const posX = Math.min(Math.max(16, rect.left - 120), window.innerWidth - 460);
    const posY = rect.bottom + 8 < window.innerHeight - 340 ? rect.bottom + 8 : Math.max(16, rect.top - 360);
    setHoverCardPos({ x: posX, y: posY });
    setShowHoverCard(true);
  };

  return (
    <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs relative">
      {/* Header without badge 12, with manual guide trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-sans font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              onMouseEnter={handleMouseEnterTrigger}
              onMouseLeave={() => setShowHoverCard(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs group"
              title="Passe o mouse ou clique para ver o que este gráfico trata, o que ele lê, o que indica e as medidas de resolução"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Como Interpretar (Manual)</span>
            </button>
          </h4>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
          <span>X̄ = <strong className="text-slate-900">{mean.toFixed(3)}</strong></span>
          {lsl !== null && lsl !== undefined && (
            <span className="text-red-700 font-semibold">LIE = {lsl.toFixed(2)}</span>
          )}
          {usl !== null && usl !== undefined && (
            <span className="text-red-700 font-semibold">LSE = {usl.toFixed(2)}</span>
          )}
          <span className="text-slate-400">N = {points.length}</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[800px] mx-auto select-none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = height - paddingBottom - pct * (height - paddingTop - paddingBottom);
            return (
              <line
                key={pct}
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            );
          })}

          {/* LSL (LIE) line in red */}
          {yLsl !== null && (
            <g>
              <line
                x1={paddingLeft}
                y1={yLsl}
                x2={width - paddingRight}
                y2={yLsl}
                stroke="#dc2626"
                strokeWidth="1.75"
              />
              <text
                x={width - paddingRight + 5}
                y={yLsl + 3}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                fill="#dc2626"
              >
                LIE
              </text>
            </g>
          )}

          {/* USL (LSE) line in red */}
          {yUsl !== null && (
            <g>
              <line
                x1={paddingLeft}
                y1={yUsl}
                x2={width - paddingRight}
                y2={yUsl}
                stroke="#dc2626"
                strokeWidth="1.75"
              />
              <text
                x={width - paddingRight + 5}
                y={yUsl + 3}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                fill="#dc2626"
              >
                LSE
              </text>
            </g>
          )}

          {/* +3s and -3s dashed lines */}
          <line
            x1={paddingLeft}
            y1={yPlus3}
            x2={width - paddingRight}
            y2={yPlus3}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={width - paddingRight + 5}
            y={yPlus3 + 3}
            fontSize="8"
            fontFamily="monospace"
            fill="#64748b"
          >
            +3s
          </text>

          <line
            x1={paddingLeft}
            y1={yMinus3}
            x2={width - paddingRight}
            y2={yMinus3}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={width - paddingRight + 5}
            y={yMinus3 + 3}
            fontSize="8"
            fontFamily="monospace"
            fill="#64748b"
          >
            -3s
          </text>

          {/* Mean line (X̄) in blue/dark */}
          <line
            x1={paddingLeft}
            y1={yMean}
            x2={width - paddingRight}
            y2={yMean}
            stroke="#2563eb"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text
            x={width - paddingRight + 5}
            y={yMean + 3}
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
            fill="#2563eb"
          >
            X̄
          </text>

          {/* Connected spikes / series line in green as shown in image 12 */}
          <path d={pathD} fill="none" stroke="#16a34a" strokeWidth="1.25" />

          {/* Vertical connectors / spikes from mean to points */}
          {points.map((p, idx) => {
            const cx = scaleX(idx);
            const cy = scaleY(p.value);
            const isHovered = hoveredIdx === idx;
            const isOutOfSpec =
              (lsl !== null && lsl !== undefined && p.value < lsl) ||
              (usl !== null && usl !== undefined && p.value > usl);

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Thin vertical spike from mean line */}
                <line
                  x1={cx}
                  y1={yMean}
                  x2={cx}
                  y2={cy}
                  stroke="#16a34a"
                  strokeWidth="0.75"
                  opacity="0.6"
                />

                {/* Point dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4.5 : isOutOfSpec ? 3 : 2}
                  fill={isOutOfSpec ? '#dc2626' : '#16a34a'}
                  stroke="#ffffff"
                  strokeWidth="0.75"
                />
              </g>
            );
          })}

          {/* Border Box */}
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
          {points.map((p, idx) => {
            const step = Math.max(1, Math.ceil(points.length / 10));
            if (idx % step !== 0 && idx !== points.length - 1) return null;
            const cx = scaleX(idx);
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
                  fontSize="9"
                  fontFamily="monospace"
                  fill="#334155"
                >
                  {p.sample ?? idx + 1}
                </text>
              </g>
            );
          })}

          {/* Y Axis ticks */}
          {[yMin + ySpan * 0.1, yMean, yMax - ySpan * 0.1].map((tickVal, i) => {
            const y = scaleY(tickVal);
            return (
              <g key={i}>
                <line x1={paddingLeft - 4} y1={y} x2={paddingLeft} y2={y} stroke="#000000" />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fill="#334155"
                >
                  {tickVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* X and Y labels */}
          <text
            x={(width - paddingRight + paddingLeft) / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            fontFamily="sans-serif"
            fill="#334155"
          >
            Ordem Amostral / Amostra
          </text>

          <text
            x={14}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${height / 2})`}
            fontSize="10"
            fontFamily="sans-serif"
            fill="#334155"
          >
            {specs.metricName} [{specs.unit}]
          </text>
        </svg>

        {/* Hovered point tooltip */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div className="absolute top-2 left-16 bg-slate-900/90 text-white text-[10px] px-2.5 py-1 rounded shadow-md font-mono border border-slate-700 pointer-events-none">
            Amostra #{points[hoveredIdx].sample ?? hoveredIdx + 1}:{' '}
            <strong className="text-emerald-400">{points[hoveredIdx].value.toFixed(3)}</strong> {specs.unit} (Desvio:{' '}
            {(points[hoveredIdx].value - mean >= 0 ? '+' : '')}
            {(points[hoveredIdx].value - mean).toFixed(3)})
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
          className="w-[420px] max-w-[92vw] bg-white text-slate-800 rounded-xl shadow-2xl border-2 border-blue-600 p-4 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Carta de Valores Brutos (Manual AIAG SPC)</span>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200">
              Run Chart Individual
            </span>
          </div>

          <div className="space-y-2.5">
            {/* O que trata e lê */}
            <div>
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1 text-blue-900">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>O que este gráfico trata e lê:</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Plota cada peça individual em ordem temporal de fabricação (sem agrupamento em subgrupos).
                Lê a distância de cada ponto para as tolerâncias de engenharia (LIE e LSE) e derivo térmico ou desgaste de ferramenta.
              </p>
            </div>

            {/* O que está indicando */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Diagnóstico Atual do Processo:</span>
              </div>
              <div className="text-[10.5px] text-slate-700 mt-1 space-y-0.5">
                <div>• Média: <strong>{mean.toFixed(3)} {specs.unit}</strong> (Alvo: {specs.target !== null && specs.target !== undefined ? specs.target.toFixed(3) : '—'})</div>
                <div>
                  • Fora das cotas [LIE/LSE]:{' '}
                  <strong className={rawValues.filter((v) => (lsl !== null && lsl !== undefined && v < lsl) || (usl !== null && usl !== undefined && v > usl)).length > 0 ? 'text-red-700' : 'text-emerald-700'}>
                    {rawValues.filter((v) => (lsl !== null && lsl !== undefined && v < lsl) || (usl !== null && usl !== undefined && v > usl)).length} peças
                  </strong>{' '}
                  ({((rawValues.filter((v) => (lsl !== null && lsl !== undefined && v < lsl) || (usl !== null && usl !== undefined && v > usl)).length / (rawValues.length || 1)) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Medidas para resolução */}
            <div>
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1 text-slate-900">
                <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Medidas para Resolução:</span>
              </div>
              <p className="text-[10.5px] text-slate-600 mt-0.5 leading-relaxed">
                Ajustar offset da ferramenta/máquina para centralizar a média. Caso haja pontos fora do LIE/LSE, realizar contenção e inspeção 100% imediata do lote.
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
              className="text-[10.5px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer hover:underline"
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
        type="raw_values"
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        specs={specs}
        mean={mean}
        sigma={sigma}
        lsl={lsl}
        usl={usl}
        values={rawValues}
      />
    </div>
  );
};
