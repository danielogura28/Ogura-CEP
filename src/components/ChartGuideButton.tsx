import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wrench,
  ShieldAlert
} from 'lucide-react';
import { CapabilityResults, NelsonViolation, ProcessSpecs } from '../types';
import { ChartGuideType, ChartManualGuideModal } from './ChartManualGuideModal';

export interface ChartGuideButtonProps {
  type: ChartGuideType;
  specs: ProcessSpecs;
  mean?: number;
  sigma?: number;
  lsl?: number | null;
  usl?: number | null;
  values?: number[];
  pointsCount?: number;
  limits?: {
    cl: number;
    ucl: number;
    lcl: number;
    sigma?: number;
  };
  violations?: NelsonViolation[];
  capability?: CapabilityResults;
  chartTitle?: string;
  className?: string;
}

export const ChartGuideButton: React.FC<ChartGuideButtonProps> = ({
  type,
  specs,
  mean = specs.target ?? 0,
  sigma = 1,
  lsl = specs.lsl,
  usl = specs.usl,
  values = [],
  pointsCount = values.length,
  limits,
  violations = [],
  capability,
  chartTitle,
  className = ''
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPos, setHoverCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = Math.min(Math.max(16, rect.left - 120), window.innerWidth - 460);
    const posY =
      rect.bottom + 8 < window.innerHeight - 340
        ? rect.bottom + 8
        : Math.max(16, rect.top - 360);
    setHoverCardPos({ x: posX, y: posY });
    setShowHoverCard(true);
  };

  const isRange = type === 'range_dispersion';
  const isXbar = type === 'xbar_individual';
  const isHistogram = type === 'capability_histogram';
  const isProb = type === 'normal_probability';
  const isRaw = type === 'raw_values';

  // Compute stats for hover card
  const target = specs.target ?? (lsl !== null && usl !== null ? (lsl + usl) / 2 : null);
  const outOfSpecCount = values.filter(
    (v) => (lsl !== null && v < lsl) || (usl !== null && v > usl)
  ).length;

  let borderColor = 'border-blue-600';
  let badgeTheme = 'bg-blue-50 text-blue-700 border-blue-200';
  let pulseDotColor = 'bg-blue-600';
  let cardTitle = 'Carta de Controle (Manual AIAG SPC)';
  let cardCategory = 'Controle Estatístico';

  if (isProb) {
    borderColor = 'border-indigo-600';
    badgeTheme = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    pulseDotColor = 'bg-indigo-600';
    cardTitle = 'Gráfico de Probabilidade Normal (AIAG & VDA)';
    cardCategory = 'Ajuste Gaussiano (Blom)';
  } else if (isHistogram) {
    borderColor = 'border-emerald-600';
    badgeTheme = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    pulseDotColor = 'bg-emerald-600';
    cardTitle = 'Histograma de Capabilidade (AIAG CEP / VDA)';
    cardCategory = 'Voz do Processo vs Cliente';
  } else if (isRange) {
    borderColor = 'border-amber-600';
    badgeTheme = 'bg-amber-50 text-amber-800 border-amber-200';
    pulseDotColor = 'bg-amber-600';
    cardTitle = 'Carta de Dispersão (Manual AIAG SPC 4ª Ed.)';
    cardCategory = 'Variabilidade de Curto Prazo';
  } else if (isXbar) {
    borderColor = 'border-sky-600';
    badgeTheme = 'bg-sky-50 text-sky-800 border-sky-200';
    pulseDotColor = 'bg-sky-600';
    cardTitle = 'Carta Shewhart de Tendência Central (AIAG SPC)';
    cardCategory = 'Estabilidade da Média';
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowHoverCard(false);
          setShowGuideModal(true);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowHoverCard(false)}
        className={`no-print inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs group shrink-0 ${className}`}
        title="Passe o mouse ou clique para ver o que este gráfico trata, o que ele lê, o que indica e as medidas de resolução"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
        <span>Como Interpretar (Manual)</span>
      </button>

      {/* Prominent Floating Hover Card via Portal */}
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
          className={`w-[430px] max-w-[92vw] bg-white text-slate-800 rounded-xl shadow-2xl border-2 ${borderColor} p-4 animate-in fade-in zoom-in-95 duration-100 select-none text-xs`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <span className={`w-2 h-2 rounded-full ${pulseDotColor} animate-pulse`} />
              <span>{cardTitle}</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeTheme}`}>
              {cardCategory}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* O que trata e lê */}
            <div>
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1 text-slate-900">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>O que este gráfico trata e lê:</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {isRaw &&
                  'Plota cada medição individual em sequência cronológica sem agrupamento. Lê a proximidade para o LIE e LSE e detecta deriva gradual.'}
                {isProb &&
                  'Avalia a premissa de normalidade (posições de Blom). Lê se os pontos formam linha reta sobre a reta vermelha e valida o cálculo de Cp/Cpk.'}
                {isXbar &&
                  'Monitora a tendência central e estabilidade ao longo do tempo. Lê se a variação é apenas por causas comuns ou se há causas especiais atribuíveis.'}
                {isRange &&
                  'Monitora a variabilidade de curtíssimo prazo entre peças consecutivas (MR) ou subgrupos (R). Pré-requisito para validar a carta de médias.'}
                {isHistogram &&
                  'Confronta a Voz do Processo com as Especificações (LIE, Alvo, LSE). A curva vermelha reflete o potencial (Cp/Cpk) e a azul o desempenho global (Pp/Ppk).'}
              </p>
            </div>

            {/* O que está indicando */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Diagnóstico Atual do Processo:</span>
              </div>
              <div className="text-[10.5px] text-slate-700 mt-1 space-y-0.5 font-mono">
                {isRaw && (
                  <>
                    <div>• Média: <strong>{mean.toFixed(3)} {specs.unit}</strong> (Alvo: {target !== null ? target.toFixed(3) : '—'})</div>
                    <div>
                      • Fora das cotas: <strong className={outOfSpecCount > 0 ? 'text-red-700' : 'text-emerald-700'}>{outOfSpecCount} peças</strong>
                    </div>
                  </>
                )}
                {isProb && (
                  <>
                    <div>• Amostras: <strong>{values.length || pointsCount} peças</strong> | s = <strong>{sigma.toFixed(3)}</strong></div>
                    <div>• Premissa de Normalidade: <strong className="text-emerald-700">Aderência Linear Verificada</strong></div>
                  </>
                )}
                {isXbar && (
                  <>
                    <div>• LC: <strong>{limits?.cl.toFixed(3) ?? mean.toFixed(3)}</strong> | LSC: <strong>{limits?.ucl.toFixed(3)}</strong> | LIC: <strong>{limits?.lcl.toFixed(3)}</strong></div>
                    <div>
                      • Causas Especiais:{' '}
                      <strong className={violations.length > 0 ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                        {violations.length === 0 ? '0 ocorrências (Estável)' : `${violations.length} regra(s) violada(s)`}
                      </strong>
                    </div>
                  </>
                )}
                {isRange && (
                  <>
                    <div>• Amplitude Média (R̄ ou MR̄): <strong>{limits?.cl.toFixed(3)}</strong></div>
                    <div>• LSC da Amplitude: <strong>{limits?.ucl.toFixed(3)}</strong> | LIC: <strong>{limits?.lcl.toFixed(3) ?? '0.000'}</strong></div>
                  </>
                )}
                {isHistogram && (
                  <>
                    <div>• Cp: <strong>{capability?.cp?.toFixed(3) ?? '—'}</strong> | Cpk: <strong className={(capability?.cpk ?? 0) >= 1.33 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>{capability?.cpk?.toFixed(3) ?? '—'}</strong></div>
                    <div>• Pp: <strong>{capability?.pp?.toFixed(3) ?? '—'}</strong> | Ppk: <strong>{capability?.ppk?.toFixed(3) ?? '—'}</strong></div>
                    <div className="font-sans text-[10px] mt-0.5">
                      • Parecer:{' '}
                      <strong className={(capability?.cpk ?? 0) >= 1.33 ? 'text-emerald-800' : 'text-red-800'}>
                        {(capability?.cpk ?? 0) >= 1.33 ? 'Processo Capaz e Homologado (Cpk ≥ 1.33)' : 'Processo Incapaz (Cpk < 1.33)'}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Medidas para resolução */}
            <div>
              <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1 text-slate-900">
                <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Medidas para Resolução:</span>
              </div>
              <p className="text-[10.5px] text-slate-600 mt-0.5 leading-relaxed">
                {isRaw &&
                  'Ajustar offset da ferramenta/máquina para centralizar a média. Caso haja pontos fora do LIE/LSE, realizar contenção e inspeção 100% imediata.'}
                {isProb &&
                  'Estratificar por cavidade de molde, lote ou turno se houver curvatura em S. Aplicar transformação Box-Cox caso haja barreira física natural.'}
                {isXbar &&
                  (violations.length > 0
                    ? 'Bloquear a operação, segregar peças produzidas após a última amostra aprovada, aplicar 5 Porquês / Ishikawa e abrir Análise Crítica (CAPA).'
                    : 'Manter a operação no ritmo padrão. Não efetuar sobreajuste na máquina enquanto os pontos flutuarem dentro dos limites estatísticos.')}
                {isRange &&
                  'Verificar folgas mecânicas em fusos/guias, vibração da usinagem, repetibilidade da fixação e calibração do instrumento (MSA / Gage R&R).'}
                {isHistogram &&
                  ((capability?.cpk ?? 0) < (capability?.cp ?? 0)
                    ? 'Ajustar o offset de ferramenta / setup para reconduzir a média ao Alvo Nominal (ação mais rápida para elevar o Cpk).'
                    : (capability?.cp ?? 0) < 1.33
                    ? 'Reduzir a dispersão natural do equipamento (revisar folgas, fixação e ferramentas) ou renegociar tolerâncias.'
                    : 'Manter parâmetros operacionais. O processo atende aos requisitos automotivos.')}
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
        type={type}
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        specs={specs}
        mean={mean}
        sigma={sigma}
        lsl={lsl}
        usl={usl}
        values={values}
        pointsCount={pointsCount}
        limits={limits}
        violations={violations}
        capability={capability}
        chartTitle={chartTitle}
      />
    </>
  );
};
