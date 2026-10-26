import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Activity, CheckCircle2, AlertTriangle, ArrowRight, Wrench } from 'lucide-react';
import { ControlLimits, NelsonViolation, ProcessSpecs } from '../../types';
import { getViolationDiagnosis } from '../../utils/spcDiagnostics';
import { DiagnosticPopover } from '../DiagnosticPopover';
import { ChartManualGuideModal } from '../ChartManualGuideModal';

interface ControlChartPlotProps {
  title: string;
  subTitle?: string;
  points: { sample: number; value: number }[];
  limits: {
    cl: number;
    ucl: number;
    lcl: number;
    sigma: number;
  };
  violations: NelsonViolation[];
  yLabel?: string;
  height?: number;
  onOpenCriticalAnalysis?: (triggerInfo?: string) => void;
  chartKind?: 'xbar_individual' | 'range_dispersion';
  specs?: ProcessSpecs;
}

export const ControlChartPlot: React.FC<ControlChartPlotProps> = ({
  title,
  subTitle,
  points,
  limits,
  violations,
  yLabel = 'Valor Medido',
  height = 300,
  onOpenCriticalAnalysis,
  chartKind,
  specs = {
    metricName: yLabel,
    unit: '',
    lsl: null,
    usl: null,
    target: limits.cl
  }
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPos, setHoverCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isRange =
    chartKind === 'range_dispersion' ||
    title.toLowerCase().includes('amplitude') ||
    title.toLowerCase().includes('dispersão');
  const guideType = isRange ? 'range_dispersion' : 'xbar_individual';

  const handleMouseEnterTrigger = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = Math.min(Math.max(16, rect.left - 120), window.innerWidth - 460);
    const posY =
      rect.bottom + 8 < window.innerHeight - 340
        ? rect.bottom + 8
        : Math.max(16, rect.top - 360);
    setHoverCardPos({ x: posX, y: posY });
    setShowHoverCard(true);
  };

  if (points.length < 2) {
    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 text-center text-slate-400 text-xs italic">
        Amostras insuficientes para plotar a Carta de Controle.
      </div>
    );
  }

  const width = 720;
  const paddingLeft = 65;
  const paddingRight = 95;
  const paddingTop = 35;
  const paddingBottom = 40;

  const vals = points.map((p) => p.value);
  const minVal = Math.min(...vals, limits.lcl);
  const maxVal = Math.max(...vals, limits.ucl);
  const range = maxVal - minVal || 1;

  const yMin = minVal - range * 0.1;
  const yMax = maxVal + range * 0.1;
  const ySpan = yMax - yMin;

  const scaleX = (idx: number) =>
    paddingLeft + (idx / Math.max(1, points.length - 1)) * (width - paddingLeft - paddingRight);
  const scaleY = (val: number) =>
    height - paddingBottom - ((val - yMin) / ySpan) * (height - paddingTop - paddingBottom);

  const yUCL = scaleY(limits.ucl);
  const yCL = scaleY(limits.cl);
  const yLCL = scaleY(limits.lcl);

  const yPlus1 = scaleY(limits.cl + limits.sigma);
  const yMinus1 = scaleY(limits.cl - limits.sigma);
  const yPlus2 = scaleY(limits.cl + 2 * limits.sigma);
  const yMinus2 = scaleY(limits.cl - 2 * limits.sigma);

  // Path string for connected line
  const linePath = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.value)}`;
  }, '');

  // Map of violations by index
  const violationMap = new Map<number, NelsonViolation[]>();
  violations.forEach((v) => {
    const arr = violationMap.get(v.pointIndex) || [];
    arr.push(v);
    violationMap.set(v.pointIndex, arr);
  });

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
        <div>
          {title ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Controle Estatístico de Processo (CEP)
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <h4 className="text-base font-serif italic text-slate-900 font-semibold">
                  {title}
                </h4>
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
              </div>
              {subTitle && <p className="text-xs text-slate-500 mt-0.5">{subTitle}</p>}
            </>
          ) : (
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
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-red-700 font-semibold">LSC = {limits.ucl.toFixed(3)}</span>
          <span className="text-slate-700 font-semibold">LC = {limits.cl.toFixed(3)}</span>
          <span className="text-red-700 font-semibold">LIC = {limits.lcl.toFixed(3)}</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[800px] mx-auto select-none">
          {/* Shaded 1-sigma & 2-sigma zones (Western Electric Zones C, B, A) */}
          <rect
            x={paddingLeft}
            y={yPlus1}
            width={width - paddingLeft - paddingRight}
            height={Math.max(1, yMinus1 - yPlus1)}
            fill="#f8fafc"
            fillOpacity="0.8"
          />
          <rect
            x={paddingLeft}
            y={yPlus2}
            width={width - paddingLeft - paddingRight}
            height={Math.max(1, yPlus1 - yPlus2)}
            fill="#f1f5f9"
            fillOpacity="0.5"
          />
          <rect
            x={paddingLeft}
            y={yMinus1}
            width={width - paddingLeft - paddingRight}
            height={Math.max(1, yMinus2 - yMinus1)}
            fill="#f1f5f9"
            fillOpacity="0.5"
          />

          {/* Sigma Guideline Dashes (Zone boundaries) */}
          {[yPlus1, yMinus1, yPlus2, yMinus2].map((sy, i) => (
            <line
              key={i}
              x1={paddingLeft}
              y1={sy}
              x2={width - paddingRight}
              y2={sy}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}

          {/* UCL Line (LSC) */}
          <line
            x1={paddingLeft}
            y1={yUCL}
            x2={width - paddingRight}
            y2={yUCL}
            stroke="#dc2626"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
          <text
            x={width - paddingRight + 6}
            y={yUCL + 4}
            fontSize="10"
            fontFamily="monospace"
            fill="#dc2626"
            fontWeight="bold"
          >
            LSC={limits.ucl.toFixed(2)} (+3σ)
          </text>

          {/* Center Line (LC) */}
          <line
            x1={paddingLeft}
            y1={yCL}
            x2={width - paddingRight}
            y2={yCL}
            stroke="#0f172a"
            strokeWidth="1.75"
          />
          <text
            x={width - paddingRight + 6}
            y={yCL + 4}
            fontSize="10"
            fontFamily="monospace"
            fill="#0f172a"
            fontWeight="bold"
          >
            LC={limits.cl.toFixed(2)}
          </text>

          {/* LCL Line (LIC) */}
          <line
            x1={paddingLeft}
            y1={yLCL}
            x2={width - paddingRight}
            y2={yLCL}
            stroke="#dc2626"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
          <text
            x={width - paddingRight + 6}
            y={yLCL + 4}
            fontSize="10"
            fontFamily="monospace"
            fill="#dc2626"
            fontWeight="bold"
          >
            LIC={limits.lcl.toFixed(2)} (-3σ)
          </text>

          {/* Axes */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#334155"
            strokeWidth="1.5"
          />
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Connected Data Line */}
          <path d={linePath} fill="none" stroke="#334155" strokeWidth="1.75" />

          {/* Points & Special Cause Badges */}
          {points.map((p, idx) => {
            const cx = scaleX(idx);
            const cy = scaleY(p.value);
            const pViolations = violationMap.get(idx);
            const isOutOfControl = Boolean(pViolations && pViolations.length > 0);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setPinnedIndex(pinnedIndex === idx ? null : idx)}
              >
                {/* Out of control highlight halo */}
                {isOutOfControl && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered || pinnedIndex === idx ? 12 : 8}
                    fill="#fee2e2"
                    stroke="#dc2626"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered || pinnedIndex === idx ? 6.5 : isOutOfControl ? 4.5 : 3.5}
                  fill={isOutOfControl ? '#dc2626' : '#334155'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Violation rule number badge above point */}
                {isOutOfControl && pViolations && (
                  <text
                    x={cx}
                    y={cy - 10}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#dc2626"
                    fontFamily="monospace"
                  >
                    {pViolations[0].ruleNumber}
                  </text>
                )}
              </g>
            );
          })}

          {/* X Axis ticks (sample indices) */}
          {points.map((p, idx) => {
            // Draw every 5th or 10th tick
            const step = Math.ceil(points.length / 12);
            if (idx % step !== 0 && idx !== points.length - 1) return null;
            const cx = scaleX(idx);
            return (
              <g key={idx}>
                <line x1={cx} y1={height - paddingBottom} x2={cx} y2={height - paddingBottom + 4} stroke="#334155" />
                <text
                  x={cx}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#475569"
                >
                  {p.sample}
                </text>
              </g>
            );
          })}

          {/* X and Y Axis titles */}
          <text
            x={(width - paddingRight + paddingLeft) / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fontFamily="serif"
            fontStyle="italic"
            fontWeight="bold"
            fill="#1e293b"
          >
            Amostra / Batelada de Produção
          </text>

          <text
            x={16}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${height / 2})`}
            fontSize="11"
            fontFamily="serif"
            fontStyle="italic"
            fontWeight="bold"
            fill="#1e293b"
          >
            {yLabel}
          </text>
        </svg>

        {/* Diagnostic Popover / Tooltip Overlay */}
        {(() => {
          const activeIdx = pinnedIndex !== null ? pinnedIndex : hoveredIndex;
          if (activeIdx === null || !points[activeIdx]) return null;

          const activePoint = points[activeIdx];
          const activeViolations = violationMap.get(activeIdx);
          const isSpecialCause = activeViolations && activeViolations.length > 0;

          if (isSpecialCause) {
            const ruleNum = activeViolations[0].ruleNumber;
            const diag = getViolationDiagnosis(ruleNum, activePoint.value, limits.cl);

            return (
              <div
                className="absolute z-30 top-1 right-2 left-2 sm:left-auto sm:right-6 sm:w-96 shadow-2xl"
                onMouseEnter={() => setHoveredIndex(activeIdx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="relative">
                  <DiagnosticPopover
                    diagnosis={diag}
                    sampleNumber={activePoint.sample}
                    measuredValue={activePoint.value}
                    onOpenCriticalAnalysis={
                      onOpenCriticalAnalysis
                        ? () => {
                            const info = `Causa Especial na Amostra #${activePoint.sample} (${diag.title}) - Valor: ${activePoint.value.toFixed(3)}`;
                            onOpenCriticalAnalysis(info);
                          }
                        : undefined
                    }
                  />
                  {pinnedIndex !== null && (
                    <button
                      onClick={() => setPinnedIndex(null)}
                      className="absolute -top-2 -right-2 bg-slate-800 text-slate-300 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] border border-slate-600 shadow-sm"
                      title="Desafixar diagnóstico"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Normal point tooltip
          return (
            <div className="absolute top-2 left-16 bg-slate-900/95 text-white p-2.5 rounded-lg shadow-xl text-xs backdrop-blur-xs max-w-xs z-10 border border-slate-700 pointer-events-none">
              <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1 text-slate-200">
                <span className="font-bold">Amostra #{activePoint.sample}</span>
                <span className="text-[10px] text-emerald-400 font-semibold font-mono">✓ Normal</span>
              </div>
              <div className="text-[11px] space-y-0.5">
                <div>Valor Medido: <span className="font-mono font-bold text-amber-300">{activePoint.value.toFixed(3)}</span></div>
                <div>Desvio da Média (LC): <span className="font-mono">{(activePoint.value - limits.cl).toFixed(3)}</span></div>
                <div>Escore-Z: <span className="font-mono">{((activePoint.value - limits.cl) / limits.sigma).toFixed(2)}σ</span></div>
              </div>
              <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                Clique no ponto para fixar diagnóstico.
              </div>
            </div>
          );
        })()}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-serif italic border-t border-slate-100 pt-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-red-600 border-dashed inline-block"></span>
            Limites de Controle 3-Sigma (LSC / LIC)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
            Causa Especial / Ponto Fora de Controle (Regras de Nelson)
          </span>
        </div>
        <span>$\sigma_{'{within}'} = {limits.sigma.toFixed(3)}$</span>
      </div>

      {/* Prominent Explanatory Hover Card via createPortal */}
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
          className="w-[430px] max-w-[92vw] bg-white text-slate-800 rounded-xl shadow-2xl border-2 border-blue-600 p-4 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>
                {isRange
                  ? 'Carta de Dispersão (Manual AIAG SPC 4ª Ed.)'
                  : 'Carta de Controle Shewhart (Manual AIAG SPC)'}
              </span>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200">
              {isRange ? 'Variabilidade de Curto Prazo' : 'Tendência Central & Estabilidade'}
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
                {isRange
                  ? 'Monitora a amplitude entre peças consecutivas (MR) ou subgrupos (R). Conforme o manual AIAG SPC, a estabilidade da amplitude é pré-requisito obrigatório para validar a carta de médias.'
                  : 'Monitora a estabilidade da média ao longo do tempo. Lê se o processo opera apenas sob causas comuns ou se há causas especiais (Regras de Nelson / Western Electric).'}
              </p>
            </div>

            {/* O que está indicando */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Diagnóstico Atual do Processo:</span>
              </div>
              <div className="text-[10.5px] text-slate-700 mt-1 space-y-0.5">
                <div>• Linha Central (LC): <strong>{limits.cl.toFixed(3)}</strong> | LSC: <strong>{limits.ucl.toFixed(3)}</strong> | LIC: <strong>{limits.lcl.toFixed(3)}</strong></div>
                <div>
                  • Causas Especiais:{' '}
                  <strong className={violations.length > 0 ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                    {violations.length === 0 ? '0 ocorrências (Processo Estável)' : `${violations.length} regra(s) violada(s) (Instabilidade)`}
                  </strong>
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
                {isRange
                  ? 'Verificar folgas mecânicas em fusos/guias, vibração da usinagem, repetibilidade do dispositivo de fixação e estudo de MSA do instrumento.'
                  : violations.length > 0
                  ? 'Interromper a operação, segregar as peças produzidas após a última amostra aprovada, investigar 6M (5 Porquês / Ishikawa) e abrir Análise Crítica formal.'
                  : 'Manter a operação no ritmo padrão. Evitar sobreajustes na máquina enquanto os pontos flutuarem aleatoriamente dentro dos limites.'}
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

      {/* Full Educational Modal */}
      <ChartManualGuideModal
        type={guideType}
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        specs={specs}
        mean={limits.cl}
        sigma={limits.sigma}
        limits={limits}
        violations={violations}
        pointsCount={points.length}
        chartTitle={title}
      />
    </div>
  );
};
