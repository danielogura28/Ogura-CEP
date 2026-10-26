import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CapabilityResults,
  CavitySpatialResult,
  CepAnalysisConfig,
  CepDataPoint,
  ControlLimits,
  CriticalAnalysisData,
  NelsonViolation,
  ProcessSpecs,
  SerialAutocorrItem
} from '../types';
import { ApaColumn, ApaTable } from './ApaTable';
import { ControlChartPlot } from './plots/ControlChartPlot';
import { CapabilityPlot } from './plots/CapabilityPlot';
import { AcfSerialPlot } from './plots/AcfSerialPlot';
import { SpatialCavityGrid } from './plots/SpatialCavityGrid';
import { SpcInterpretation } from './SpcInterpretation';
import { OperatorQuickGuide } from './OperatorQuickGuide';
import { DiagnosticPopover } from './DiagnosticPopover';
import { getCapabilityDiagnosis, getViolationDiagnosis } from '../utils/spcDiagnostics';
import { resolveCapabilityTargets } from '../utils/spcTargets';
import {
  Award,
  ShieldCheck,
  Activity,
  BarChart2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FileEdit,
  ArrowRight
} from 'lucide-react';

interface SpcOutputCanvasProps {
  config: CepAnalysisConfig;
  specs: ProcessSpecs;
  points: CepDataPoint[];
  limits: ControlLimits;
  primaryPoints: { sample: number; value: number }[];
  secondaryPoints: { sample: number; value: number }[];
  violations: NelsonViolation[];
  capability: CapabilityResults;
  serialAutocorr: { lags: SerialAutocorrItem[]; durbinWatson: number };
  spatialCavity: {
    cavities: CavitySpatialResult[];
    moranI: number;
    moranZ: number;
    moranP: number;
    hasSpatialData: boolean;
  };
  criticalAnalysis?: CriticalAnalysisData | null;
  onOpenCriticalAnalysis?: (triggerInfo?: string) => void;
}

export const SpcOutputCanvas: React.FC<SpcOutputCanvasProps> = ({
  config,
  specs,
  points,
  limits,
  primaryPoints,
  secondaryPoints,
  violations,
  capability,
  serialAutocorr,
  spatialCavity,
  criticalAnalysis,
  onOpenCriticalAnalysis
}) => {
  const values = points.map((p) => p.value);
  const n = values.length;
  const isAIAG_VDA = config.manualStandard === 'AIAG_VDA_1ST';
  const { targetCpk, targetPpk, targetName } = resolveCapabilityTargets(config);

  // Active unclipped portal popover for Table 2 & Table 3
  const [activePopover, setActivePopover] = useState<{
    diagnosis: any;
    sampleNumber?: number;
    measuredValue?: number;
    top: number;
    left: number;
  } | null>(null);
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showPopover = (
    e: React.MouseEvent<HTMLElement>,
    diagnosis: any,
    sampleNumber?: number,
    measuredValue?: number
  ) => {
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 380;
    const popoverHeight = 240;

    // Determine vertical placement: place above if there's room, otherwise below
    const spaceAbove = rect.top;
    const placeAbove = spaceAbove >= popoverHeight + 12;

    const top = placeAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8;

    // Determine horizontal placement within viewport
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    setActivePopover({
      diagnosis,
      sampleNumber,
      measuredValue,
      top: Math.max(12, top),
      left
    });
  };

  const hidePopover = () => {
    popoverTimeoutRef.current = setTimeout(() => {
      setActivePopover(null);
    }, 250);
  };

  const keepPopover = () => {
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
  };

  // 1. Descriptive Stats APA Table
  const descColumns: ApaColumn[] = [
    { key: 'metric', header: 'Estatística Descritiva', align: 'left' },
    { key: 'value', header: `${specs.metricName} [${specs.unit}]`, align: 'right' }
  ];

  const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)] || 0;
  const min = sorted[0] || 0;
  const max = sorted[sorted.length - 1] || 0;

  // Skewness and Kurtosis
  let m3 = 0;
  let m4 = 0;
  values.forEach((v) => {
    m3 += Math.pow((v - mean) / (limits.sigmaOverall || 1), 3);
    m4 += Math.pow((v - mean) / (limits.sigmaOverall || 1), 4);
  });
  const skewness = n > 2 ? m3 / n : 0;
  const kurtosis = n > 3 ? m4 / n - 3 : 0;

  const descData = [
    { metric: 'N de Observações', value: String(n) },
    { metric: 'Média (M)', value: mean.toFixed(3) },
    { metric: 'Mediana', value: median.toFixed(3) },
    { metric: 'Desvio Padrão Total (s / σ_overall)', value: limits.sigmaOverall.toFixed(3) },
    { metric: 'Desvio Padrão Dentro (σ_within = MR̄ / d₂)', value: limits.sigmaWithin.toFixed(3) },
    { metric: 'Mínimo / Máximo', value: `${min.toFixed(3)} / ${max.toFixed(3)}` },
    { metric: 'Amplitude Total (Range)', value: (max - min).toFixed(3) },
    { metric: 'Assimetria (Skewness)', value: skewness.toFixed(3) },
    { metric: 'Curtose (Kurtosis)', value: kurtosis.toFixed(3) }
  ];

  // 2. Control Limits Table
  const limitsColumns: ApaColumn[] = [
    { key: 'chart', header: 'Carta Shewhart', align: 'left' },
    { key: 'lcl', header: 'LIC (-3σ)', align: 'right' },
    { key: 'cl', header: 'Linha Central (LC)', align: 'right' },
    { key: 'ucl', header: 'LSC (+3σ)', align: 'right' },
    { key: 'sigma', header: 'Desvio σ (Within)', align: 'right' }
  ];

  const limitsData = [
    {
      chart: config.chartType === 'I-MR' ? 'Valores Individuais (I)' : 'Médias dos Subgrupos (X̄)',
      lcl: limits.lcl.toFixed(3),
      cl: limits.centerLine.toFixed(3),
      ucl: limits.ucl.toFixed(3),
      sigma: limits.sigmaWithin.toFixed(3)
    }
  ];

  if (limits.subCenterLine !== undefined && limits.subUcl !== undefined && limits.subLcl !== undefined) {
    limitsData.push({
      chart: config.chartType === 'I-MR' ? 'Amplitude Móvel (MR)' : 'Amplitude do Subgrupo (R)',
      lcl: limits.subLcl.toFixed(3),
      cl: limits.subCenterLine.toFixed(3),
      ucl: limits.subUcl.toFixed(3),
      sigma: (limits.subCenterLine / 1.128).toFixed(3)
    });
  }

  // 3. Capability Indices Table with interactive hover diagnosis
  const capabilityColumns: ApaColumn[] = [
    { key: 'indice', header: 'Índice de Capabilidade', align: 'left' },
    { key: 'valor', header: 'Estimativa', align: 'right' },
    { key: 'benchmark', header: 'Referência Normativa', align: 'center' },
    {
      key: 'status',
      header: 'Avaliação de Engenharia (Passe o mouse)',
      align: 'left',
      format: (val: string, row: any) => {
        const isReproved =
          val === 'Incapaz ou Descentralizado' ||
          val === 'Abaixo do Benchmark' ||
          val === 'Dispersão Excessiva' ||
          val === 'Afastado do Alvo';

        if (!isReproved) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{val}</span>
            </span>
          );
        }

        const metricType = row.indice.startsWith('Cpk')
          ? 'cpk'
          : row.indice.startsWith('Ppk')
          ? 'ppk'
          : 'cp';
        const numVal =
          metricType === 'cpk' ? capability.cpk : metricType === 'ppk' ? capability.ppk : capability.cp;
        const diag = getCapabilityDiagnosis(
          metricType,
          numVal,
          metricType === 'ppk' ? targetPpk : targetCpk,
          specs,
          capability.mean,
          config.featureClassification
        );

        return (
          <div className="inline-block">
            <button
              type="button"
              onMouseEnter={(e) => showPopover(e, diag)}
              onMouseLeave={hidePopover}
              onClick={() => onOpenCriticalAnalysis?.(`${row.indice} - ${diag.badgeText}`)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 transition-colors cursor-pointer shadow-2xs"
              title="Passe o mouse para ver possíveis causas e planos de ação sugeridos"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{val} (Reprovado)</span>
              <span className="text-[10px] text-red-700 underline font-normal ml-0.5">Diagnóstico</span>
            </button>
          </div>
        );
      }
    }
  ];

  const capabilityData = [
    {
      indice: 'Cp (Capabilidade Potencial)',
      valor: capability.cp !== null ? capability.cp.toFixed(3) : '—',
      benchmark: `≥ ${targetCpk.toFixed(2)}`,
      status: capability.cp && capability.cp >= targetCpk ? 'Atende com Folga' : 'Dispersão Excessiva'
    },
    {
      indice: 'Cpk (Capabilidade Efetiva Centrada)',
      valor: capability.cpk !== null ? capability.cpk.toFixed(3) : '—',
      benchmark: `≥ ${targetCpk.toFixed(2)}`,
      status: capability.cpk && capability.cpk >= targetCpk ? 'Capaz e Centrado' : 'Incapaz ou Descentralizado'
    },
    {
      indice: 'Pp (Desempenho Geral do Processo)',
      valor: capability.pp !== null ? capability.pp.toFixed(3) : '—',
      benchmark: `≥ ${targetPpk.toFixed(2)}`,
      status: capability.pp && capability.pp >= targetPpk ? 'Estável no Longo Prazo' : 'Variabilidade Ampla'
    },
    {
      indice: 'Ppk (Desempenho Efetivo de Longo Prazo)',
      valor: capability.ppk !== null ? capability.ppk.toFixed(3) : '—',
      benchmark: `≥ ${targetPpk.toFixed(2)}`,
      status: capability.ppk && capability.ppk >= targetPpk ? 'Excelente Desempenho' : 'Abaixo do Benchmark'
    }
  ];

  if (capability.cpm !== null) {
    capabilityData.push({
      indice: 'Cpm (Índice de Taguchi para o Alvo)',
      valor: capability.cpm.toFixed(3),
      benchmark: `≥ ${targetCpk.toFixed(2)}`,
      status: capability.cpm >= targetCpk ? 'Centrado no Alvo Nominal' : 'Afastado do Alvo'
    });
  }

  // 4. Nelson Violations Table with interactive unclipped hover diagnosis
  const violationsColumns: ApaColumn[] = [
    { key: 'sample', header: 'Amostra / Batelada', align: 'center' },
    { key: 'value', header: 'Valor Medido', align: 'right' },
    { key: 'rule', header: 'Regra de Nelson Violada', align: 'left' },
    {
      key: 'desc',
      header: 'Classificação da Causa Especial (Passe o mouse)',
      align: 'left',
      format: (val: string, row: any) => {
        const v = row._rawViolation as NelsonViolation;
        const diag = getViolationDiagnosis(v.ruleNumber, v.value, limits.centerLine);

        return (
          <div className="inline-block">
            <button
              type="button"
              onMouseEnter={(e) => showPopover(e, diag, v.sample, v.value)}
              onMouseLeave={hidePopover}
              onClick={() => onOpenCriticalAnalysis?.(`Amostra #${v.sample} - ${diag.title}`)}
              className="inline-flex items-center gap-1.5 text-left text-red-700 hover:text-red-900 font-medium cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{val}</span>
              <span className="text-[10px] bg-red-100 text-red-900 px-1.5 py-0.5 rounded border border-red-300 underline font-sans ml-1">
                Ver causas & ação
              </span>
            </button>
          </div>
        );
      }
    }
  ];

  const violationsData = violations.map((v) => ({
    sample: `#${v.sample}`,
    value: v.value.toFixed(3),
    rule: `Regra ${v.ruleNumber}`,
    desc: v.ruleDescription,
    _rawViolation: v
  }));

  const isCpkFailed = (capability.cpk ?? 0) < targetCpk;
  const isPpkFailed = (capability.ppk ?? 0) < targetPpk;
  const hasSpecialCauses = violations.length > 0;
  const hasCriticalIssue = isCpkFailed || isPpkFailed || hasSpecialCauses;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 md:p-8 space-y-8 print:p-0 print:bg-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Document Header */}
        <div className="bg-white p-6 rounded-lg border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-red-800 uppercase tracking-widest">
              <Award className="w-4 h-4" /> Relatório Oficial de Controle de Qualidade
            </div>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mt-1">
              PTP — Controle Estatístico de Processo (CEP)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Avaliação de Estabilidade Shewhart, Regras de Nelson, Índices de Capabilidade (Cp / Cpk) conforme{' '}
              <strong className="text-slate-700 font-semibold">
                {isAIAG_VDA ? 'Manual AIAG & VDA (1ª Edição)' : 'Manual AIAG CEP (4ª Edição)'}
              </strong>
            </p>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Norma: <strong className="text-slate-800 font-mono">{isAIAG_VDA ? 'AIAG & VDA 1ª Ed.' : 'AIAG 4ª Ed.'}</strong></div>
            <div>Amostras: <strong className="text-slate-800 font-mono">{n}</strong> medições</div>
            <div>
              Metas: <strong className="text-red-800 font-mono">Cpk ≥ {targetCpk.toFixed(2)}</strong> | <strong className="text-blue-800 font-mono">Ppk ≥ {targetPpk.toFixed(2)}</strong>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 truncate max-w-xs">{targetName}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Padronização APA 7ª Edição / IATF 16949</div>
          </div>
        </div>

        {/* Banner de Análise Crítica Obrigatória / Registrada */}
        {hasCriticalIssue && (
          <div
            className={`p-4 rounded-lg border-2 shadow-xs transition-all ${
              criticalAnalysis
                ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950'
                : 'bg-red-50/90 border-red-500 text-red-950'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {criticalAnalysis ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-red-600 animate-bounce" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide">
                      {criticalAnalysis
                        ? '✅ ANÁLISE CRÍTICA REGISTRADA & PLANO DE AÇÃO DEFINIDO'
                        : '⚠️ ABERTURA DE ANÁLISE CRÍTICA NECESSÁRIA (IATF / CEP)'}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        criticalAnalysis
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {criticalAnalysis ? `Status: ${criticalAnalysis.status}` : 'Ação Requerida'}
                    </span>
                  </div>

                  {criticalAnalysis ? (
                    <div className="mt-1 text-xs space-y-1">
                      <p className="font-medium text-emerald-900">
                        <strong>Causa Raiz:</strong> {criticalAnalysis.whatHappened}
                      </p>
                      <div className="flex flex-wrap gap-4 text-[11px] text-emerald-800 pt-0.5">
                        <span>Prazo: <strong>{criticalAnalysis.deadline}</strong></span>
                        <span>Responsável: <strong>{criticalAnalysis.responsible}</strong></span>
                        <span>Disposição: <strong>{criticalAnalysis.lotDisposition}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-red-900 leading-relaxed font-medium">
                      {hasSpecialCauses
                        ? `Detectadas ${violations.length} ocorrência(s) de causas especiais nas cartas de controle.`
                        : ''}{' '}
                      {isCpkFailed
                        ? `O Cpk obtido (${capability.cpk?.toFixed(2) ?? '—'}) está abaixo do mínimo exigido (≥ ${targetCpk.toFixed(2)}).`
                        : ''}{' '}
                      O sistema exige o preenchimento da Análise Crítica explicando o que aconteceu, quais serão os planos de ações e qual será o prazo.
                    </p>
                  )}
                </div>
              </div>

              {onOpenCriticalAnalysis && (
                <button
                  type="button"
                  onClick={() => onOpenCriticalAnalysis()}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0 ${
                    criticalAnalysis
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>{criticalAnalysis ? 'Ver / Editar Análise Crítica' : 'Abrir Análise Crítica'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 1: Descriptive Statistics Table */}
        {config.showDescriptivesTable && (
          <section className="space-y-4">
            <ApaTable
              tableNumber={1}
              title={`Estatísticas Descritivas do Processo para ${specs.metricName}`}
              subtitle="Parâmetros de tendência central, dispersão total e dispersão dentro do subgrupo"
              columns={descColumns}
              data={descData}
              note="O desvio padrão dentro do subgrupo (σ_within) é obtido a partir da amplitude móvel média ponderada pela constante d2 de Shewhart, isolando a variação intrínseca do processo."
            />
          </section>
        )}

        {/* Section 2: Shewhart Control Limits Table */}
        <section className="space-y-4">
          <ApaTable
            tableNumber={2}
            title="Limites de Controle 3-Sigma do Processo"
            subtitle={`Parâmetros da Carta Shewhart ${config.chartType}`}
            columns={limitsColumns}
            data={limitsData}
            note="Limites calculados em ±3σ em torno da Linha Central (LC). Pontos além dos limites representam causas especiais com probabilidade de falso alarme de apenas 0,27% sob normalidade."
          />
        </section>

        {/* Section 3: Shewhart Control Charts */}
        {config.plotControlChart && (
          <section className="space-y-6">
            <ControlChartPlot
              title={`Carta de Controle Shewhart — ${config.chartType === 'I-MR' ? 'Valores Individuais (I)' : 'Médias dos Subgrupos (X̄)'}`}
              subTitle={`${specs.metricName} [${specs.unit}] — Pontos vermelhos indicam causas especiais. Clique no ponto para ver causas e planos de ação`}
              points={primaryPoints}
              limits={{
                cl: limits.centerLine,
                ucl: limits.ucl,
                lcl: limits.lcl,
                sigma: limits.sigmaWithin
              }}
              violations={violations}
              yLabel={`${specs.metricName} (${specs.unit})`}
              height={320}
              onOpenCriticalAnalysis={onOpenCriticalAnalysis}
            />

            {config.plotSubControlChart && limits.subCenterLine !== undefined && limits.subUcl !== undefined && (
              <ControlChartPlot
                title={`Carta de Dispersão — ${config.chartType === 'I-MR' ? 'Amplitude Móvel (MR)' : 'Amplitude do Subgrupo (R)'}`}
                subTitle="Monitoramento da variabilidade de curto prazo entre amostras sucessivas"
                points={secondaryPoints}
                limits={{
                  cl: limits.subCenterLine,
                  ucl: limits.subUcl,
                  lcl: limits.subLcl ?? 0,
                  sigma: limits.subCenterLine / 1.128
                }}
                violations={[]}
                yLabel={`Amplitude (${specs.unit})`}
                height={260}
                onOpenCriticalAnalysis={onOpenCriticalAnalysis}
              />
            )}
          </section>
        )}

        {/* Section 4: Nelson Rules Violations Table */}
        {config.showNelsonRulesTable && (
          <section className="space-y-4">
            <ApaTable
              tableNumber={3}
              title="Registro de Causas Especiais Detectadas (Regras de Nelson / Western Electric)"
              subtitle={`${violations.length} ocorrência(s) de instabilidade identificada(s)`}
              columns={violationsColumns}
              data={violationsData}
              note={
                violations.length === 0
                  ? 'Nenhuma causa especial identificada. O processo opera sob estrito controle estatístico.'
                  : 'A presença de causas especiais exige investigação imediata na linha para neutralização de fatores anômalos.'
              }
            />
          </section>
        )}

        {/* Section 5: Process Capability Analysis */}
        {config.showCapabilityAnalysis && (
          <section className="space-y-6">
            {config.plotCapabilityHistogram && (
              <CapabilityPlot
                values={values}
                specs={specs}
                capability={capability}
                targetCpk={targetCpk}
                targetPpk={targetPpk}
              />
            )}

            {capability.wasInverted && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
                <span className="text-base">⚠️</span>
                <div>
                  <strong className="font-semibold">Ajuste de Especificação (Limites Invertidos Corrigidos):</strong>
                  <p className="mt-0.5 text-amber-800">
                    Os valores de LIE ({specs.lsl}) e LSE ({specs.usl}) foram informados invertidos. O sistema normalizou automaticamente para <strong>LIE = {capability.effectiveLsl}</strong> e <strong>LSE = {capability.effectiveUsl}</strong>, garantindo que os índices <strong>Cp, Cpk, Pp e Ppk resultem em valores positivos</strong> conformes à norma AIAG CEP 4ª Edição e AIAG & VDA 1ª Edição.
                  </p>
                </div>
              </div>
            )}

            {capability.wasRelativeConverted && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-950 flex items-start gap-2.5 shadow-xs">
                <span className="text-base">ℹ️</span>
                <div>
                  <strong className="font-semibold">Conversão de Tolerâncias Relativas ao Alvo:</strong>
                  <p className="mt-0.5 text-red-900">
                    As tolerâncias foram informadas como desvio ao redor do Alvo Nominal ({specs.target} {specs.unit}) e foram convertidas para limites absolutos de engenharia: <strong>LIE = {capability.effectiveLsl} {specs.unit}</strong> e <strong>LSE = {capability.effectiveUsl} {specs.unit}</strong>.
                  </p>
                </div>
              </div>
            )}

            <ApaTable
              tableNumber={4}
              title={`Índices de Capabilidade e Desempenho do Processo (${specs.metricName})`}
              subtitle={`Especificações: LIE = ${capability.effectiveLsl ?? specs.lsl ?? '—'} | Alvo = ${specs.target ?? '—'} | LSE = ${capability.effectiveUsl ?? specs.usl ?? '—'} ${specs.unit}`}
              columns={capabilityColumns}
              data={capabilityData}
              note={`Nível de não-conformidade esperado: ${capability.ppmTotalExpected.toLocaleString()} PPM | Não-conformidade observada: ${capability.ppmObserved.toLocaleString()} PPM.${capability.rawCpk != null && capability.rawCpk < 0 ? ' Nota: A média está além do limite de especificação; o índice Cpk físico é considerado 0,000 (incapaz).' : ''}`}
            />

            {/* Memorial de Cálculo Passo a Passo (AIAG CEP 4ª Edição / AIAG & VDA) */}
            <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="font-serif font-bold text-slate-900 text-sm">
                  Memorial de Cálculo Detalhado (Conforme Manual AIAG CEP 4ª Ed. / AIAG & VDA)
                </div>
                <div className="text-[11px] font-mono bg-red-50 text-red-900 px-2.5 py-0.5 rounded border border-red-200 font-semibold">
                  σ_within = Amplitude Média (R̄) ÷ d₂
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-700">
                {/* Coluna 1: Estimadores de Dispersão */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="font-sans font-bold text-slate-800 border-b border-slate-200 pb-1 text-xs">
                    1. Estimativas de Dispersão do Processo
                  </div>

                  <div>
                    <div className="text-slate-500 font-sans text-[11px]">Amplitude Média do Processo (R̄ ou MR̄):</div>
                    <div className="font-bold text-slate-900">
                      R̄ = {capability.avgRange.toFixed(4)} {specs.unit}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500 font-sans text-[11px]">Fator d₂ de Shewhart (n = {config.chartType === 'I-MR' ? 2 : config.subgroupSize}):</div>
                    <div className="font-bold text-slate-900">
                      d₂ = {capability.d2.toFixed(4)}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200">
                    <div className="text-red-800 font-sans font-bold text-[11px]">
                      Desvio Padrão Dentro (Curto Prazo / Within):
                    </div>
                    <div className="text-xs font-bold text-red-950 bg-red-100/50 p-1.5 rounded mt-0.5 border border-red-200">
                      σ_within = R̄ ÷ d₂ = {capability.avgRange.toFixed(4)} ÷ {capability.d2.toFixed(4)} = <span className="text-red-700 underline font-extrabold">{capability.sigmaWithin.toFixed(4)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500 font-sans text-[11px]">
                      Desvio Padrão Amostral Geral (Longo Prazo / Overall):
                    </div>
                    <div className="text-xs font-bold text-slate-900 bg-slate-100 p-1.5 rounded mt-0.5 border border-slate-200">
                      s = σ_overall = √[∑(X - X̄)² / (N - 1)] = <span className="underline">{capability.sigmaOverall.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Fórmulas de Cp, Cpk, Pp e Ppk */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="font-sans font-bold text-slate-800 border-b border-slate-200 pb-1 text-xs">
                    2. Aplicação das Fórmulas de Capabilidade
                  </div>

                  {capability.effectiveLsl !== null && capability.effectiveUsl !== null ? (
                    <>
                      <div>
                        <div className="text-slate-500 font-sans text-[11px]">Cp (Capabilidade Potencial):</div>
                        <div className="text-[11px] text-slate-800">
                          Cp = |LSE - LIE| / (6 × σ_within)
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          Cp = ({capability.effectiveUsl} - {capability.effectiveLsl}) / (6 × {capability.sigmaWithin.toFixed(4)}) = <span className="text-red-700 font-bold">{capability.cp?.toFixed(3) ?? '—'}</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-200">
                        <div className="text-slate-500 font-sans text-[11px]">Cpk (Capabilidade Efetiva Centrada):</div>
                        <div className="text-[10px] text-slate-700">
                          Cpu = ({capability.effectiveUsl} - {capability.mean.toFixed(3)}) / (3 × {capability.sigmaWithin.toFixed(4)}) = {capability.cpu?.toFixed(3) ?? '—'}
                          <br />
                          Cpl = ({capability.mean.toFixed(3)} - {capability.effectiveLsl}) / (3 × {capability.sigmaWithin.toFixed(4)}) = {capability.cpl?.toFixed(3) ?? '—'}
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          Cpk = min(Cpl, Cpu) = <span className="text-red-700 font-bold">{capability.cpk?.toFixed(3) ?? '—'}</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-200">
                        <div className="text-slate-500 font-sans text-[11px]">Pp (Desempenho Geral Amostral):</div>
                        <div className="text-[11px] text-slate-800">
                          Pp = |LSE - LIE| / (6 × s)
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          Pp = ({capability.effectiveUsl} - {capability.effectiveLsl}) / (6 × {capability.sigmaOverall.toFixed(4)}) = <span className="text-slate-900 font-bold">{capability.pp?.toFixed(3) ?? '—'}</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-200">
                        <div className="text-slate-500 font-sans text-[11px]">Ppk (Desempenho Efetivo Geral):</div>
                        <div className="text-[10px] text-slate-700">
                          Ppu = ({capability.effectiveUsl} - {capability.mean.toFixed(3)}) / (3 × {capability.sigmaOverall.toFixed(4)}) = {capability.ppu?.toFixed(3) ?? '—'}
                          <br />
                          Ppl = ({capability.mean.toFixed(3)} - {capability.effectiveLsl}) / (3 × {capability.sigmaOverall.toFixed(4)}) = {capability.ppl?.toFixed(3) ?? '—'}
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          Ppk = min(Ppl, Ppu) = <span className="text-slate-900 font-bold">{capability.ppk?.toFixed(3) ?? '—'}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500 italic text-[11px] pt-4">
                      Defina os limites LIE e LSE para exibir o memorial numérico completo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 6: Serial & Spatial Correlations in Tooling */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {config.plotACF && serialAutocorr.lags.length > 0 && (
              <AcfSerialPlot
                lags={serialAutocorr.lags}
                durbinWatson={serialAutocorr.durbinWatson}
              />
            )}

            {config.plotSpatialCavityMap && spatialCavity.hasSpatialData && (
              <SpatialCavityGrid
                cavities={spatialCavity.cavities}
                moranI={spatialCavity.moranI}
                moranZ={spatialCavity.moranZ}
                moranP={spatialCavity.moranP}
                metricUnit={specs.unit}
              />
            )}
          </div>
        </section>

        {/* Section 7: Technical Interpretation Report */}
        {config.showInterpretation && (
          <section className="space-y-4">
            <SpcInterpretation
              manualStandard={config.manualStandard}
              featureClassification={config.featureClassification}
              targetCpk={targetCpk}
              targetPpk={targetPpk}
              targetName={targetName}
              specs={specs}
              pointsCount={n}
              limits={limits}
              capability={capability}
              violations={violations}
              serialAutocorr={serialAutocorr}
              spatialCavity={spatialCavity}
            />
          </section>
        )}

        {/* Section 8: Final Simplified Shopfloor Operator Analysis & Action Guide */}
        {config.showOperatorGuide && (
          <section id="operator-quick-guide" className="space-y-4 pt-2">
            <OperatorQuickGuide
              manualStandard={config.manualStandard}
              featureClassification={config.featureClassification}
              targetCpk={targetCpk}
              targetPpk={targetPpk}
              targetName={targetName}
              specs={specs}
              limits={limits}
              capability={capability}
              violations={violations}
              spatialCavity={spatialCavity}
              onOpenCriticalAnalysis={onOpenCriticalAnalysis}
            />
          </section>
        )}
      </div>

      {/* Unclipped Portal Popover for Table 2 & Table 3 Diagnostics */}
      {activePopover &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${activePopover.top}px`,
              left: `${activePopover.left}px`,
              zIndex: 99999,
              width: '380px',
              maxWidth: 'calc(100vw - 32px)'
            }}
            onMouseEnter={keepPopover}
            onMouseLeave={hidePopover}
            className="pointer-events-auto filter drop-shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          >
            <DiagnosticPopover
              diagnosis={activePopover.diagnosis}
              sampleNumber={activePopover.sampleNumber}
              measuredValue={activePopover.measuredValue}
              onOpenCriticalAnalysis={
                onOpenCriticalAnalysis
                  ? () => {
                      const title =
                        activePopover.sampleNumber !== undefined
                          ? `Amostra #${activePopover.sampleNumber} - ${activePopover.diagnosis.title}`
                          : activePopover.diagnosis.title;
                      setActivePopover(null);
                      onOpenCriticalAnalysis(title);
                    }
                  : undefined
              }
            />
          </div>,
          document.body
        )}
    </main>
  );
};
