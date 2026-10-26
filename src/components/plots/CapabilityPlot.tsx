import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Activity, CheckCircle2, AlertTriangle, ArrowRight, Wrench } from 'lucide-react';
import { CapabilityResults, ProcessSpecs } from '../../types';
import { ChartManualGuideModal } from '../ChartManualGuideModal';

interface CapabilityPlotProps {
  values: number[];
  specs: ProcessSpecs;
  capability: CapabilityResults;
  numBins?: number;
  targetCpk?: number;
  targetPpk?: number;
}

export const CapabilityPlot: React.FC<CapabilityPlotProps> = ({
  values,
  specs,
  capability,
  numBins = 14,
  targetCpk = 1.33,
  targetPpk = 1.33
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPos, setHoverCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (values.length < 3) return null;

  const lsl = capability.effectiveLsl ?? specs.lsl;
  const usl = capability.effectiveUsl ?? specs.usl;
  const target = specs.target;
  const mean = capability.mean;
  const sigmaW = capability.sigmaWithin || 1;
  const sigmaO = capability.sigmaOverall || 1;

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

  const width = 560;
  const height = 340;
  const paddingLeft = 55;
  const paddingRight = 45;
  const paddingTop = 35;
  const paddingBottom = 45;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  // Extend range to cover specification limits if present
  let plotMin = Math.min(dataMin, lsl ?? dataMin) - sigmaW * 0.8;
  let plotMax = Math.max(dataMax, usl ?? dataMax) + sigmaW * 0.8;
  const range = plotMax - plotMin || 1;

  const binWidth = (dataMax - dataMin) / numBins || 0.1;
  const bins = new Array(numBins).fill(0);
  values.forEach((v) => {
    let b = Math.floor((v - dataMin) / binWidth);
    if (b >= numBins) b = numBins - 1;
    if (b < 0) b = 0;
    bins[b]++;
  });

  const maxBinCount = Math.max(...bins, 1);

  const scaleX = (x: number) =>
    paddingLeft + ((x - plotMin) / range) * (width - paddingLeft - paddingRight);
  const scaleY = (count: number) =>
    height - paddingBottom - (count / maxBinCount) * (height - paddingTop - paddingBottom);

  // Generate Normal Curves (Within & Overall)
  const steps = 70;
  const curvePointsW: { x: number; y: number }[] = [];
  const curvePointsO: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const x = plotMin + (i / steps) * range;

    // Normal PDF * N * binWidth to match histogram scale
    const expW = Math.exp(-0.5 * Math.pow((x - mean) / sigmaW, 2));
    const densityW = (1 / (sigmaW * Math.sqrt(2 * Math.PI))) * expW;
    const freqW = densityW * values.length * binWidth;

    const expO = Math.exp(-0.5 * Math.pow((x - mean) / sigmaO, 2));
    const densityO = (1 / (sigmaO * Math.sqrt(2 * Math.PI))) * expO;
    const freqO = densityO * values.length * binWidth;

    curvePointsW.push({ x: scaleX(x), y: scaleY(freqW) });
    curvePointsO.push({ x: scaleX(x), y: scaleY(freqO) });
  }

  const pathW = curvePointsW.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${Math.max(paddingTop, p.y)}`, '');
  const pathO = curvePointsO.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${Math.max(paddingTop, p.y)}`, '');

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Capabilidade do Processo
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <h4 className="text-base font-serif italic text-slate-900 font-semibold">
              Histograma com Limites de Especificação e Curvas Normais
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
          <p className="text-xs text-slate-500 mt-0.5">
            {specs.metricName} {specs.unit ? `(${specs.unit})` : ''} | N = {values.length} medições
          </p>
        </div>

        {/* Capability Badges */}
        <div className="flex items-center gap-2">
          {capability.cpk !== null && (
            <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
              capability.cpk >= 1.33
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : capability.cpk >= 1.0
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-red-50 text-red-800 border-red-300'
            }`}>
              Cpk = {capability.cpk.toFixed(2)}
            </div>
          )}
          {capability.ppk !== null && (
            <div className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded text-xs font-mono font-bold border border-slate-200">
              Ppk = {capability.ppk.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* SVG Plot */}
        <div className="lg:col-span-3">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full select-none">
            {/* Grid */}
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

            {/* Histogram Bars */}
            {bins.map((count, idx) => {
              const bStart = dataMin + idx * binWidth;
              const x1 = scaleX(bStart);
              const x2 = scaleX(bStart + binWidth);
              const barW = Math.max(1, x2 - x1 - 1.5);
              const y = scaleY(count);
              const barH = height - paddingBottom - y;

              // Color red if outside specs
              const isBelowLsl = lsl !== null && bStart + binWidth < lsl;
              const isAboveUsl = usl !== null && bStart > usl;

              return (
                <rect
                  key={idx}
                  x={x1}
                  y={y}
                  width={barW}
                  height={barH}
                  fill={isBelowLsl || isAboveUsl ? '#fca5a5' : '#93c5fd'}
                  stroke={isBelowLsl || isAboveUsl ? '#dc2626' : '#2563eb'}
                  strokeWidth="1"
                  fillOpacity="0.75"
                >
                  <title>{`${count} peças entre ${bStart.toFixed(2)} e ${(bStart + binWidth).toFixed(2)}`}</title>
                </rect>
              );
            })}

            {/* Within Subgroup Fitted Curve (Solid Red) */}
            <path d={pathW} fill="none" stroke="#dc2626" strokeWidth="2.5" />

            {/* Overall Fitted Curve (Dashed Blue) */}
            <path d={pathO} fill="none" stroke="#2563eb" strokeWidth="1.75" strokeDasharray="5 3" />

            {/* Specification Line: LSL (LIE) */}
            {lsl !== null && (
              <g>
                <line
                  x1={scaleX(lsl)}
                  y1={paddingTop}
                  x2={scaleX(lsl)}
                  y2={height - paddingBottom}
                  stroke="#b91c1c"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
                <text
                  x={scaleX(lsl)}
                  y={paddingTop - 6}
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#b91c1c"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  LIE={lsl}
                </text>
              </g>
            )}

            {/* Specification Line: Target (Alvo) */}
            {target !== null && (
              <g>
                <line
                  x1={scaleX(target)}
                  y1={paddingTop}
                  x2={scaleX(target)}
                  y2={height - paddingBottom}
                  stroke="#16a34a"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <text
                  x={scaleX(target)}
                  y={paddingTop - 6}
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#16a34a"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Alvo={target}
                </text>
              </g>
            )}

            {/* Specification Line: USL (LSE) */}
            {usl !== null && (
              <g>
                <line
                  x1={scaleX(usl)}
                  y1={paddingTop}
                  x2={scaleX(usl)}
                  y2={height - paddingBottom}
                  stroke="#b91c1c"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
                <text
                  x={scaleX(usl)}
                  y={paddingTop - 6}
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#b91c1c"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  LSE={usl}
                </text>
              </g>
            )}

            {/* Mean Vertical Line */}
            <line
              x1={scaleX(mean)}
              y1={paddingTop + 10}
              x2={scaleX(mean)}
              y2={height - paddingBottom}
              stroke="#0f172a"
              strokeWidth="1.5"
            />

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

            {/* Ticks */}
            {[plotMin, plotMin + range * 0.25, plotMin + range * 0.5, plotMin + range * 0.75, plotMax].map((tick, i) => (
              <g key={i}>
                <line x1={scaleX(tick)} y1={height - paddingBottom} x2={scaleX(tick)} y2={height - paddingBottom + 5} stroke="#334155" />
                <text
                  x={scaleX(tick)}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#475569"
                >
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}

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
              {specs.metricName} {specs.unit ? `(${specs.unit})` : ''}
            </text>
          </svg>
        </div>

        {/* Capability Metrics Sidebar Card */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2.5">
          <div className="font-serif font-bold text-slate-900 border-b border-slate-200 pb-1">
            Índices de Capabilidade
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Cp (Potencial):</span>
              <strong className="text-slate-900">{capability.cp !== null ? capability.cp.toFixed(3) : '—'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cpk (Efetivo):</span>
              <strong className={capability.cpk && capability.cpk >= 1.33 ? 'text-emerald-700' : 'text-red-700'}>
                {capability.cpk !== null ? capability.cpk.toFixed(3) : '—'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pp (Desempenho):</span>
              <strong className="text-slate-900">{capability.pp !== null ? capability.pp.toFixed(3) : '—'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Ppk:</span>
              <strong className="text-slate-900">{capability.ppk !== null ? capability.ppk.toFixed(3) : '—'}</strong>
            </div>
            {capability.cpm !== null && (
              <div className="flex justify-between">
                <span className="text-slate-600">Cpm (Taguchi):</span>
                <strong className="text-slate-900">{capability.cpm.toFixed(3)}</strong>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">PPM Esperado:</span>
                <strong className="text-slate-900">{capability.ppmTotalExpected.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">PPM Observado:</span>
                <strong className="text-slate-900">{capability.ppmObserved.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-500 font-serif italic border-t border-slate-100 pt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-red-600 inline-block"></span>
          Distribuição Dentro do Subgrupo ($\sigma_{'{within}'} = {sigmaW.toFixed(3)}$)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-blue-600 border-dashed inline-block"></span>
          Distribuição Geral ($\sigma_{'{overall}'} = {sigmaO.toFixed(3)}$)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t border-red-700 border-dashed inline-block"></span>
          Limites de Especificação (LIE / LSE)
        </span>
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
          className="w-[440px] max-w-[92vw] bg-white text-slate-800 rounded-xl shadow-2xl border-2 border-emerald-600 p-4 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Histograma de Capabilidade (Manual AIAG / VDA)</span>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
              Voz do Processo vs Cliente
            </span>
          </div>

          <div className="space-y-2.5">
            {/* O que trata e lê */}
            <div>
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1 text-emerald-950">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>O que este gráfico trata e lê:</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Confronta a Voz do Processo com os Limites de Engenharia (LIE, Alvo, LSE).
                A curva vermelha sólida (curto prazo - σ_within) reflete a capabilidade potencial (Cp/Cpk), e a curva azul tracejada reflete o desempenho global real (Pp/Ppk).
              </p>
            </div>

            {/* O que está indicando */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Diagnóstico Atual de Capabilidade:</span>
              </div>
              <div className="text-[10.5px] text-slate-700 mt-1 space-y-0.5 font-mono">
                <div>• Cp: <strong>{capability.cp?.toFixed(3) ?? '—'}</strong> | Cpk: <strong className={(capability.cpk ?? 0) >= targetCpk ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>{capability.cpk?.toFixed(3) ?? '—'}</strong></div>
                <div>• Pp: <strong>{capability.pp?.toFixed(3) ?? '—'}</strong> | Ppk: <strong className={(capability.ppk ?? 0) >= targetPpk ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>{capability.ppk?.toFixed(3) ?? '—'}</strong></div>
                <div className="font-sans text-[10px] mt-0.5">
                  • Parecer:{' '}
                  <strong className={(capability.cpk ?? 0) >= targetCpk ? 'text-emerald-800' : 'text-red-800'}>
                    {(capability.cpk ?? 0) >= targetCpk ? `Processo Capaz e Homologado (Cpk ≥ ${targetCpk.toFixed(2)})` : `Processo Incapaz (Cpk < ${targetCpk.toFixed(2)})`}
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
                {(capability.cpk ?? 0) < (capability.cp ?? 0)
                  ? 'Ajustar o offset de ferramenta / setup para reconduzir a média ao Alvo Nominal (ação rápida para elevar o Cpk).'
                  : (capability.cp ?? 0) < 1.33
                  ? 'Reduzir a dispersão natural do equipamento (revisar folgas, fixação e ferramentas) ou renegociar tolerâncias.'
                  : 'Manter parâmetros operacionais. O processo está dentro dos requisitos da indústria automotiva.'}
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
              className="text-[10.5px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer hover:underline"
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
        type="capability_histogram"
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        specs={specs}
        mean={mean}
        sigma={sigmaO}
        lsl={lsl}
        usl={usl}
        values={values}
        capability={capability}
      />
    </div>
  );
};
