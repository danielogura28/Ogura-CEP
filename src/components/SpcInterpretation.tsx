import React from 'react';
import {
  CapabilityResults,
  ControlLimits,
  FeatureClassification,
  NelsonViolation,
  ProcessSpecs,
  SerialAutocorrItem,
  SpcManualStandard
} from '../types';
import { Award, CheckCircle } from 'lucide-react';

interface SpcInterpretationProps {
  manualStandard: SpcManualStandard;
  featureClassification: FeatureClassification;
  targetCpk?: number;
  targetPpk?: number;
  targetName?: string;
  specs: ProcessSpecs;
  pointsCount: number;
  limits: ControlLimits;
  capability: CapabilityResults;
  violations: NelsonViolation[];
  serialAutocorr: { lags: SerialAutocorrItem[]; durbinWatson: number };
  spatialCavity: { moranI: number; moranZ: number; moranP: number; hasSpatialData: boolean };
}

export const SpcInterpretation: React.FC<SpcInterpretationProps> = ({
  manualStandard,
  featureClassification,
  targetCpk: propTargetCpk,
  targetPpk: propTargetPpk,
  targetName,
  specs,
  pointsCount,
  limits,
  capability,
  violations,
  serialAutocorr,
  spatialCavity
}) => {
  const isAIAG_VDA = manualStandard === 'AIAG_VDA_1ST';
  const benchmarkCpk = propTargetCpk ?? (featureClassification === 'critical' ? 1.67 : 1.33);
  const benchmarkPpk = propTargetPpk ?? benchmarkCpk;

  const isProcessInControl = violations.length === 0;
  const isCapable = capability.cpk !== null && capability.cpk >= benchmarkCpk;
  const isMarginal = capability.cpk !== null && capability.cpk >= 1.0 && capability.cpk < benchmarkCpk;
  const isSerialCorrelated = serialAutocorr.durbinWatson < 1.5 || serialAutocorr.durbinWatson > 2.5;
  const isSpatialCorrelated = spatialCavity.hasSpatialData && spatialCavity.moranP < 0.05;

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200/90 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-slate-700" />
          <h4 className="text-base font-serif font-semibold text-slate-900">
            Laudo Técnico e Parecer de Engenharia da Qualidade
          </h4>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Referência: <strong>{isAIAG_VDA ? 'AIAG & VDA (1ª Ed.)' : 'AIAG CEP (4ª Ed.)'}</strong>
        </div>
      </div>

      <div className="space-y-4 text-xs font-serif text-slate-800 leading-relaxed text-justify">
        {/* Paragraph 1: Process Stability & Control Limits */}
        <p>
          <strong>1. Avaliação de Estabilidade Shewhart:</strong> A análise das cartas de controle para a característica{' '}
          <em>{specs.metricName}</em> ({pointsCount} observações) estabeleceu Linha Central LC = {limits.centerLine.toFixed(3)}{' '}
          {specs.unit}, com limites 3-Sigma definidos em LSC = {limits.ucl.toFixed(3)} e LIC = {limits.lcl.toFixed(3)}{' '}
          (desvio padrão dentro dos subgrupos σ_within = {limits.sigmaWithin.toFixed(3)}).{' '}
          {isProcessInControl ? (
            <span className="text-emerald-900 bg-emerald-50/70 p-0.5 rounded">
              O processo encontra-se em <strong>estrito estado de controle estatístico</strong> conforme o {isAIAG_VDA ? 'Manual Harmonizado AIAG & VDA (1ª Edição)' : 'Manual AIAG CEP (4ª Edição)'}. Nenhuma das regras de causa especial (Regras de Nelson / Western Electric) foi violada, indicando variabilidade decorrente unicamente de causas comuns.
            </span>
          ) : (
            <span className="text-red-900 bg-red-50/70 p-0.5 rounded">
              O processo está <strong>fora de controle estatístico</strong>, tendo sido detectadas{' '}
              <strong>{violations.length} ocorrências de causas especiais</strong>. Conforme diretriz do {isAIAG_VDA ? 'Manual AIAG & VDA' : 'Manual AIAG 4ª Ed.'}, causas especiais exigem parada ou bloqueio de lote e neutralização de fatores extrínsecos antes da liberação.
            </span>
          )}
        </p>

        {/* Paragraph 2: Capability Analysis */}
        <p>
          <strong>2. Capabilidade & Desempenho Segundo o Manual {isAIAG_VDA ? 'AIAG & VDA' : 'AIAG 4ª Ed.'}:</strong>{' '}
          {capability.cpk !== null ? (
            <span>
              O índice de capabilidade potencial atingiu Cp = {capability.cp?.toFixed(3) ?? '—'}, enquanto o índice efetivo centrado resultou em{' '}
              <strong>Cpk = {capability.cpk.toFixed(3)}</strong> (com desempenho de longo prazo Ppk = {capability.ppk?.toFixed(3) ?? '—'}), frente à meta estabelecida de{' '}
              <strong>Cpk ≥ {benchmarkCpk.toFixed(2)}</strong> e <strong>Ppk ≥ {benchmarkPpk.toFixed(2)}</strong> ({targetName || (featureClassification === 'critical' ? 'Característica Crítica / Segurança' : 'Característica Padrão')}).{' '}
              {isCapable ? (
                <span className="text-emerald-900">
                  O processo é classificado como <strong>plenamente capaz e qualificado</strong>, operando com nível de não-conformidade teórica projetado em{' '}
                  <span className="font-mono">{capability.ppmTotalExpected} PPM</span>.
                </span>
              ) : isMarginal ? (
                <span className="text-amber-900">
                  O processo é classificado como <strong>marginal (1.00 ≤ Cpk &lt; {benchmarkCpk.toFixed(2)})</strong>. Recomenda-se ajuste de centralização no Alvo nominal (Alvo = {specs.target ?? '—'}) e aumento da frequência amostral.
                </span>
              ) : (
                <span className="text-red-900">
                  O processo é <strong>incapaz (Cpk &lt; 1.00)</strong>, com projeção de{' '}
                  <span className="font-mono">{capability.ppmTotalExpected} PPM defeituosos</span>. Aplica-se a matriz de ação corretiva obrigatória: inspeção 100% ou segregação de produto.
                </span>
              )}
            </span>
          ) : (
            <span>
              Limites de especificação de engenharia (LIE/LSE) não foram definidos para cálculo completo dos índices Cp e Cpk.
            </span>
          )}
        </p>

        {/* Paragraph 3: Serial & Spatial Cavity Correlation */}
        <p>
          <strong>3. Diagnóstico de Autocorrelações Seriais e Espaciais:</strong> O coeficiente de Durbin-Watson apresentou{' '}
          <em>d</em> = <span className="font-mono font-bold">{serialAutocorr.durbinWatson.toFixed(3)}</span>.{' '}
          {isSerialCorrelated ? (
            <span className="text-amber-900 bg-amber-50/50 p-0.5 rounded">
              Constatou-se <strong>dependência temporal serial significativa</strong> (deriva progressiva ou histerese de aquecimento entre bateladas consecutivas).
            </span>
          ) : (
            <span>
              Confirmou-se independência temporal entre amostras sucessivas, satisfazendo a hipótese de aleatoriedade de Shewhart.
            </span>
          )}
          {spatialCavity.hasSpatialData && (
            <span>
              {' '}Na análise espacial das cavidades do ferramental, o Índice de Moran obteve{' '}
              <em>I</em> = <span className="font-mono font-bold">{spatialCavity.moranI.toFixed(3)}</span> (<em>z</em> ={' '}
              <span className="font-mono">{spatialCavity.moranZ.toFixed(2)}</span>, <em>p</em> ={' '}
              <span className="font-mono">{spatialCavity.moranP.toFixed(3)}</span>).{' '}
              {isSpatialCorrelated ? (
                <span className="text-red-900 bg-red-50/50 p-0.5 rounded">
                  Há forte <strong>autocorrelação espacial na matriz</strong>: cavidades vizinhas compartilham desvios dimensionais idênticos, evidenciando desbalanceamento térmico de câmara quente ou gradiente de preenchimento.
                </span>
              ) : (
                <span>
                  As cavidades do ferramental comportam-se de forma espacialmente homogênea e independente.
                </span>
              )}
            </span>
          )}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans">
        <span className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Conforme diretrizes {isAIAG_VDA ? 'AIAG & VDA FMEA / Process Capability (1ª Ed.)' : 'AIAG SPC Manual (4ª Edição)'} e ISO 7870
        </span>
        <span>JASP Quality Control v0.19</span>
      </div>
    </div>
  );
};
