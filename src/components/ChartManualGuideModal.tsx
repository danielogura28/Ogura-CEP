import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BookOpen,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  TrendingUp,
  Sliders,
  ShieldAlert,
  ArrowRight,
  BarChart2,
  Gauge,
  Layers
} from 'lucide-react';
import { CapabilityResults, NelsonViolation, ProcessSpecs } from '../types';

export type ChartGuideType =
  | 'raw_values'
  | 'normal_probability'
  | 'xbar_individual'
  | 'range_dispersion'
  | 'capability_histogram';

export interface ChartManualGuideModalProps {
  type: ChartGuideType;
  isOpen: boolean;
  onClose: () => void;
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
}

export const ChartManualGuideModal: React.FC<ChartManualGuideModalProps> = ({
  type,
  isOpen,
  onClose,
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
  chartTitle
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const target = specs.target ?? (lsl !== null && usl !== null ? (lsl + usl) / 2 : null);
  const effectiveN = values.length || pointsCount || 0;

  // Run Chart / General calculations
  const outOfSpecCount = values.filter(
    (v) => (lsl !== null && v < lsl) || (usl !== null && v > usl)
  ).length;
  const outOfSpecPct = effectiveN > 0 ? (outOfSpecCount / effectiveN) * 100 : 0;

  const upper3Sigma = mean + 3 * sigma;
  const lower3Sigma = mean - 3 * sigma;
  const outside3SigmaCount = values.filter(
    (v) => v > upper3Sigma || v < lower3Sigma
  ).length;

  const offsetFromTarget = target !== null ? mean - target : null;

  // Normal Probability correlation
  let normCorrelation = 1;
  let skewnessEstimate = 0;
  if (values.length >= 4) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    let sumCubedDiff = 0;

    for (let i = 0; i < n; i++) {
      const p = (i + 1 - 0.375) / (n + 0.25);
      const r = p < 0.5 ? p : 1 - p;
      const s = Math.sqrt(-2 * Math.log(r));
      const z =
        (p < 0.5 ? -1 : 1) *
        (s -
          (2.515517 + 0.802853 * s + 0.010328 * s * s) /
            (1 + 1.432788 * s + 0.189269 * s * s + 0.001308 * s * s * s));
      const x = sorted[i];

      sumX += x;
      sumY += z;
      sumXY += x * z;
      sumX2 += x * x;
      sumY2 += z * z;
      sumCubedDiff += Math.pow((x - mean) / (sigma || 1), 3);
    }

    skewnessEstimate = sumCubedDiff / n;
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (den > 0) {
      normCorrelation = Math.max(0, Math.min(1, num / den));
    }
  }

  const isNormalityGood = normCorrelation >= 0.97;
  const isNormalityModerate = normCorrelation >= 0.93 && normCorrelation < 0.97;

  // Header meta & colors
  let headerTitle = 'Guia de Interpretação: Carta de Valores Brutos';
  let badgeLabel = 'Run Chart Individual';
  let iconComponent = <TrendingUp className="w-5 h-5" />;
  let accentColor = 'bg-blue-600';

  if (type === 'normal_probability') {
    headerTitle = 'Guia de Interpretação: Gráfico de Probabilidade Normal';
    badgeLabel = 'Ajuste Gaussiano (Blom)';
    iconComponent = <Activity className="w-5 h-5" />;
    accentColor = 'bg-indigo-600';
  } else if (type === 'xbar_individual') {
    headerTitle = chartTitle
      ? `Guia de Interpretação: ${chartTitle}`
      : 'Guia de Interpretação: Carta Shewhart de Tendência Central (X̄ ou I)';
    badgeLabel = 'Carta de Tendência Central';
    iconComponent = <Gauge className="w-5 h-5" />;
    accentColor = 'bg-sky-700';
  } else if (type === 'range_dispersion') {
    headerTitle = chartTitle
      ? `Guia de Interpretação: ${chartTitle}`
      : 'Guia de Interpretação: Carta de Dispersão (Amplitude R ou MR)';
    badgeLabel = 'Carta de Variabilidade de Curto Prazo';
    iconComponent = <Layers className="w-5 h-5" />;
    accentColor = 'bg-amber-600';
  } else if (type === 'capability_histogram') {
    headerTitle = 'Guia de Interpretação: Histograma de Capabilidade & Curvas Normais';
    badgeLabel = 'Capabilidade (Cp, Cpk, Pp, Ppk)';
    iconComponent = <BarChart2 className="w-5 h-5" />;
    accentColor = 'bg-emerald-700';
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border-2 border-slate-700 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${accentColor} text-white`}>
              {iconComponent}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Manual AIAG SPC 4ª Ed. / AIAG & VDA
                </span>
                <span className="text-xs text-blue-400 font-semibold font-mono">
                  {badgeLabel}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                {headerTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar guia (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* Section 1: O que o gráfico trata e o que ele lê */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2 text-blue-900">
              <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
              <span>1. O Que Este Gráfico Trata e o Que Ele Lê (Conceito Técnico do Manual)</span>
            </div>

            {type === 'raw_values' && (
              <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                <p>
                  <strong>O que trata:</strong> A <em>Carta de Valores Brutos</em> plota cada peça medida individualmente em sua <strong>ordem cronológica exata de fabricação</strong>, sem qualquer média ou agrupamento.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>O que lê:</strong> A distância de cada ponto para os Limites de Engenharia (LIE e LSE) e o espalhamento em relação a ±3σ.</li>
                  <li><strong>Tendências temporais:</strong> Detecta visualmente aquecimento térmico da máquina, folgas ou desgaste contínuo de inserto de ferramenta.</li>
                </ul>
              </div>
            )}

            {type === 'normal_probability' && (
              <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                <p>
                  <strong>O que trata:</strong> O <em>Gráfico de Probabilidade Normal</em> testa a hipótese fundamental de que a população amostrada segue uma <strong>Distribuição Gaussiana Normal</strong>.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>O que lê:</strong> Linearidade dos dados sobre a reta teórica vermelha calculada pelas posições de Blom.</li>
                  <li><strong>Detecção de Curvatura em "S":</strong> Identifica caudas pesadas ou mistura de cavidades de moldes/turnos.</li>
                  <li><strong>Validação de Cp/Cpk:</strong> Confirma se o cálculo dos índices de capabilidade é matematicamente confiável.</li>
                </ul>
              </div>
            )}

            {type === 'xbar_individual' && (
              <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                <p>
                  <strong>O que trata:</strong> A <em>Carta Shewhart de Tendência Central</em> (Carta X̄ para subgrupos ou Carta I para valores individuais) monitora a <strong>estabilidade estatística da média do processo</strong> ao longo do tempo.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>O que lê:</strong> Se a variabilidade do processo é governada apenas por <em>Causas Comuns</em> (aleatórias e naturais) ou se há intrusão de <em>Causas Especiais</em> (anomalias operacionais).</li>
                  <li><strong>Limites Estatísticos (LSC / LC / LIC):</strong> São calculados com base na dispersão interna do subgrupo (±3σ_within), representando o comportamento real da máquina e não a tolerância de desenho do cliente.</li>
                  <li><strong>Regras de Nelson / Western Electric:</strong> Lê padrões não aleatórios (pontos fora dos limites de controle, 9 pontos consecutivos de um lado da média, 6 pontos em tendência contínua, etc.).</li>
                </ul>
              </div>
            )}

            {type === 'range_dispersion' && (
              <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                <p>
                  <strong>O que trata:</strong> A <em>Carta de Dispersão</em> (Carta R para subgrupos ou Carta MR para amplitudes móveis) monitora a <strong>variabilidade de curtíssimo prazo</strong> entre peças consecutivas.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>O que lê:</strong> A consistência da repetibilidade da máquina. Conforme o manual AIAG SPC, <em>a carta de amplitude deve ser validada e estar estável antes de se concluir sobre a carta de médias</em>.</li>
                  <li><strong>Limite Superior de Controle da Amplitude (LSC_R / LSC_MR):</strong> Estabelece a amplitude máxima aceitável antes de indicar perda de estabilidade mecânica.</li>
                </ul>
              </div>
            )}

            {type === 'capability_histogram' && (
              <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                <p>
                  <strong>O que trata:</strong> O <em>Histograma de Capabilidade</em> confronta a <strong>Voz do Processo</strong> (distribuição observada das peças) contra a <strong>Voz do Cliente</strong> (limites de engenharia LIE, Alvo e LSE).
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Curva Vermelha Sólida (Curto Prazo - σ_within):</strong> Modela a dispersão potencial intrínseca do processo (Cp e Cpk), calculada a partir de R̄/d₂.</li>
                  <li><strong>Curva Azul Tracejada (Longo Prazo - σ_overall):</strong> Modela o desempenho global total (Pp e Ppk), considerando todas as oscilações acumuladas.</li>
                  <li><strong>Relação Cpk vs Ppk:</strong> Se Ppk for muito menor que Cpk, existem fontes adicionais de variação entre dias/turnos degradando a estabilidade seriada.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 2: Diagnóstico em Tempo Real do Processo Atual */}
          <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs">
            <div className="flex items-center justify-between gap-2 font-bold text-slate-900 text-sm mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>2. O Que o Gráfico Está Indicando no Seu Processo Atual</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Amostragem: N = {effectiveN} medições
              </span>
            </div>

            {/* Diagnostics according to type */}
            {type === 'raw_values' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Média Geral (X̄)</span>
                    <span className="font-bold text-slate-900">{mean.toFixed(3)} {specs.unit}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Alvo Nominal</span>
                    <span className="font-bold text-blue-700">{target !== null ? `${target.toFixed(3)} ${specs.unit}` : '—'}</span>
                  </div>
                  <div className={`p-2 rounded border ${outOfSpecCount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <span className="text-[10px] block font-sans">Fora de Cota</span>
                    <span className="font-bold">{outOfSpecCount} ({outOfSpecPct.toFixed(1)}%)</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Fora de ±3σ</span>
                    <span className="font-bold text-slate-900">{outside3SigmaCount} peças</span>
                  </div>
                </div>

                {outOfSpecCount > 0 ? (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-900">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-red-950 font-semibold">ALERTA CRÍTICO: Peças fora dos limites de engenharia</strong>
                      Foram detectadas {outOfSpecCount} medições ultrapassando o LIE ({lsl ?? '—'}) ou LSE ({usl ?? '—'}). Risco imediato de refugo ou retrabalho.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-950 font-semibold">100% das peças dentro das especificações de engenharia</strong>
                      Todas as peças individuais coletadas encontram-se dentro da tolerância do projeto.
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === 'normal_probability' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Aderência Linear (r)</span>
                    <span className={`font-bold ${isNormalityGood ? 'text-emerald-700' : isNormalityModerate ? 'text-amber-700' : 'text-red-700'}`}>
                      {(normCorrelation * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Assimetria Estimada</span>
                    <span className="font-bold text-slate-900">
                      {Math.abs(skewnessEstimate) < 0.3 ? 'Simétrica (Normal)' : skewnessEstimate > 0 ? 'Assimétrica à Direita' : 'Assimétrica à Esquerda'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Validade de Cp/Cpk</span>
                    <span className={`font-bold ${isNormalityGood ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isNormalityGood ? '100% Válido' : 'Requer Cautela'}
                    </span>
                  </div>
                </div>

                {isNormalityGood ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-950 font-semibold">Excelente Aderência à Distribuição Normal</strong>
                      Os pontos plotados acompanham a reta teórica de referência com fidelidade de {(normCorrelation * 100).toFixed(1)}%. Os índices de capabilidade possuem total validade matemática.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-950 font-semibold">Desvio nas caudas da distribuição</strong>
                      Existe curvatura moderada nos extremos. Recomenda-se investigar possíveis misturas de matéria-prima ou ferramentas distintas.
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === 'xbar_individual' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Linha Central (LC)</span>
                    <span className="font-bold text-slate-900">{limits?.cl.toFixed(3) ?? mean.toFixed(3)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">LSC (+3σ)</span>
                    <span className="font-bold text-red-700">{limits?.ucl.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">LIC (-3σ)</span>
                    <span className="font-bold text-red-700">{limits?.lcl.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className={`p-2 rounded border ${violations.length === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <span className="text-[10px] block font-sans">Causas Especiais</span>
                    <span className="font-bold">{violations.length} ocorrência(s)</span>
                  </div>
                </div>

                {violations.length === 0 ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-950 font-semibold">Processo Estatisticamente Estável (Sob Controle Shewhart)</strong>
                      Todos os pontos situam-se dentro dos limites estatísticos e nenhuma das Regras de Nelson foi violada. O processo é previsível no tempo.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-900">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-red-950 font-semibold">INSTABILIDADE DETECTADA: Presença de Causas Especiais</strong>
                      Foram identificadas {violations.length} violações das Regras de Nelson. O processo está sujeito a perturbações externas não aleatórias que exigem bloqueio e Análise Crítica (CAPA).
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === 'range_dispersion' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Amplitude Média (R̄ ou MR̄)</span>
                    <span className="font-bold text-slate-900">{limits?.cl.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Limite Superior (LSC_R)</span>
                    <span className="font-bold text-red-700">{limits?.ucl.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Limite Inferior (LIC_R)</span>
                    <span className="font-bold text-slate-700">{limits?.lcl.toFixed(3) ?? '0.000'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2 text-xs text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-blue-950 font-semibold">Repetibilidade do Processo Avaliada</strong>
                    A carta de dispersão estabelece a base para o estimador σ_within = R̄/d₂. A estabilidade aqui garante que a variação de curto prazo é consistente entre corridas sucessivas.
                  </div>
                </div>
              </div>
            )}

            {type === 'capability_histogram' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Cp (Potencial)</span>
                    <span className="font-bold text-slate-900">{capability?.cp?.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className={`p-2 rounded border ${(capability?.cpk ?? 0) >= 1.33 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <span className="text-[10px] block font-sans">Cpk (Efetivo Centrado)</span>
                    <span className="font-bold">{capability?.cpk?.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Pp (Geral)</span>
                    <span className="font-bold text-slate-900">{capability?.pp?.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Ppk (Longo Prazo)</span>
                    <span className="font-bold text-slate-900">{capability?.ppk?.toFixed(3) ?? '—'}</span>
                  </div>
                </div>

                {(capability?.cpk ?? 0) >= 1.33 ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-950 font-semibold">PROCESSO CAPAZ (Cpk ≥ 1.33 / AIAG & VDA Homologado)</strong>
                      O processo atende plenamente aos requisitos de capabilidade da indústria automotiva seriada, apresentando dispersão controlada e excelente centralização.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-900">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-red-950 font-semibold">PROCESSO INCAPAZ (Cpk &lt; 1.33)</strong>
                      O Cpk obtido ({capability?.cpk?.toFixed(3) ?? '—'}) está abaixo do mínimo exigido (≥ 1.33 ou ≥ 1.67 para cotas críticas). A margem de segurança é insuficiente e há risco de geração de peças não-conformes.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Medidas Possíveis para Resolução */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2 text-blue-950">
              <Wrench className="w-4 h-4 text-blue-700 shrink-0" />
              <span>3. Medidas Possíveis para Resolução & Ações Recomendadas (AIAG/VDA)</span>
            </div>

            {type === 'raw_values' && (
              <div className="space-y-2 text-slate-700 text-xs">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                  <div><strong>Correção de Offset da Máquina:</strong> Se a média X̄ estiver desviada do alvo nominal, ajustar os corretores de ferramenta no CNC para reconduzir ao centro da tolerância.</div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                  <div><strong>Contenção Imediata:</strong> Segregar o lote produzido se houver peças fora do LIE/LSE e realizar inspeção 100% nas peças entre a última amostra aprovada e a atual.</div>
                </div>
              </div>
            )}

            {type === 'normal_probability' && (
              <div className="space-y-2 text-slate-700 text-xs">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-700 shrink-0 mt-0.5" />
                  <div><strong>Estratificação de Dados:</strong> Separar a análise por cavidade de molde, posto de trabalho ou lote de matéria-prima para eliminar bimodalidades.</div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-700 shrink-0 mt-0.5" />
                  <div><strong>Transformação Box-Cox:</strong> Se a cota tiver um limite físico natural (ex: concentricidade com zero), utilizar a transformação Box-Cox prevista no manual AIAG SPC.</div>
                </div>
              </div>
            )}

            {type === 'xbar_individual' && (
              <div className="space-y-2 text-slate-700 text-xs">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                  <div><strong>Bloqueio da Operação em Caso de Causa Especial:</strong> Conforme IATF 16949, a ocorrência de pontos fora de LSC/LIC exige paralisação imediata, identificação da causa atribuível e abertura de Análise Crítica (CAPA).</div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                  <div><strong>Aplicação dos 5 Porquês e Ishikawa:</strong> Investigar fatores 6M (desgaste de inserto, descalibração de sensor térmico, oscilação de lote de matéria-prima ou falta de padronização na fixação).</div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                  <div><strong>Não Fazer Sobreajuste (Over-adjustment / Regra do Funil de Deming):</strong> Não alterar os parâmetros da máquina quando o ponto estiver dentro dos limites de controle; ajustes desnecessários aumentam a variabilidade do processo.</div>
                </div>
              </div>
            )}

            {type === 'range_dispersion' && (
              <div className="space-y-2 text-slate-700 text-xs">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div><strong>Verificação de Folga Mecânica e Vibração:</strong> Picos na carta de amplitude denunciam desgaste em guias lineares, folga de fuso de esferas ou fixação instável da peça.</div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div><strong>Estudo de MSA / Gage R&R:</strong> Se a amplitude variar bruscamente entre peças consecutivas, verificar a repetibilidade do instrumento de medição e a técnica do operador.</div>
                </div>
              </div>
            )}

            {type === 'capability_histogram' && (
              <div className="space-y-2 text-slate-700 text-xs">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div><strong>Se Cpk &lt; Cp (Problema de Centralização):</strong> Ajustar o setup da ferramenta na máquina para deslocar a média X̄ em direção ao Alvo Nominal. Esta é a ação mais rápida e econômica para elevar o Cpk.</div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div><strong>Se Cp &lt; 1.33 (Problema de Dispersão Ampla):</strong> A máquina possui variabilidade natural incompatível com a tolerância. Ações: aumentar a rigidez da fixação, revisar velocidades e avanços ou renegociar a especificação de engenharia.</div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div><strong>Se Ppk &lt;&lt; Cpk (Instabilidade de Longo Prazo):</strong> Padronizar os procedimentos operacionais entre turnos e monitorar variações de temperatura ambiente (dilatação térmica).</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-sans">
            Pressione <strong>ESC</strong> ou clique fora para fechar este guia.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Entendido / Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
