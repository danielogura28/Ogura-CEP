import React from 'react';
import {
  CapabilityResults,
  CavitySpatialResult,
  ControlLimits,
  FeatureClassification,
  NelsonViolation,
  ProcessSpecs,
  SpcManualStandard
} from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wrench,
  PackageCheck,
  PhoneCall,
  Flame,
  CheckSquare,
  BookOpen,
  ShieldAlert
} from 'lucide-react';

interface OperatorQuickGuideProps {
  manualStandard: SpcManualStandard;
  featureClassification: FeatureClassification;
  targetCpk?: number;
  targetPpk?: number;
  targetName?: string;
  specs: ProcessSpecs;
  limits: ControlLimits;
  capability: CapabilityResults;
  violations: NelsonViolation[];
  spatialCavity?: {
    cavities: CavitySpatialResult[];
    moranI: number;
    moranP: number;
    hasSpatialData: boolean;
  };
  onOpenCriticalAnalysis?: (triggerInfo?: string) => void;
}

export const OperatorQuickGuide: React.FC<OperatorQuickGuideProps> = ({
  manualStandard,
  featureClassification,
  targetCpk: propTargetCpk,
  targetPpk: propTargetPpk,
  targetName,
  specs,
  limits,
  capability,
  violations,
  spatialCavity,
  onOpenCriticalAnalysis
}) => {
  // Benchmark definition according to manual and classification
  const benchmarkCpk = propTargetCpk ?? (featureClassification === 'critical' ? 1.67 : 1.33);
  const benchmarkPpk = propTargetPpk ?? benchmarkCpk;
  const isAIAG_VDA = manualStandard === 'AIAG_VDA_1ST';

  const hasSpecialCauses = violations.length > 0;
  const cpk = capability.cpk ?? 0;
  const isCapable = cpk >= benchmarkCpk;
  const isMarginal = cpk >= 1.0 && cpk < benchmarkCpk;
  const isIncapable = cpk < 1.0;

  // Determine Traffic Light Status
  let status: 'VERDE' | 'AMARELO' | 'VERMELHO' = 'VERDE';
  let headline = 'PRODUÇÃO LIBERADA — PROCESSO EM ESTADO IDEAL';
  let statusSummary = 'O processo está estável (sem causas especiais) e a capabilidade atende com folga as especificações.';

  if (hasSpecialCauses || isIncapable) {
    status = 'VERMELHO';
    headline = 'PARAR A PRODUÇÃO / AÇÃO CORRETIVA IMEDIATA';
    statusSummary = hasSpecialCauses
      ? `Foram detectados pontos fora de controle (${violations.length} ocorrências de causas especiais). Risco iminente de envio de peças defeituosas.`
      : `O processo é incapaz (Cpk = ${cpk.toFixed(2)} < 1.00). Gera alto índice de refugo (${capability.ppmTotalExpected} PPM estimado).`;
  } else if (isMarginal) {
    status = 'AMARELO';
    headline = 'ATENÇÃO — AJUSTE DE PROCESSO NECESSÁRIO (NÃO PARAR A MÁQUINA)';
    statusSummary = `O processo está estável, porém a capabilidade está na faixa de alerta (${cpk.toFixed(2)} vs meta ${benchmarkCpk.toFixed(2)}). Qualquer variação futura pode gerar não-conformidade.`;
  }

  // Find problematic cavities if spatial correlation exists
  const highCavities = spatialCavity?.hasSpatialData
    ? spatialCavity.cavities.filter((c) => c.lisaQuadrant === 'High-High').map((c) => `#${c.cavity}`)
    : [];
  const lowCavities = spatialCavity?.hasSpatialData
    ? spatialCavity.cavities.filter((c) => c.lisaQuadrant === 'Low-Low').map((c) => `#${c.cavity}`)
    : [];

  return (
    <div className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden text-slate-800">
      {/* Top Banner with Norm Badge */}
      <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30">
            <CheckSquare className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-wider uppercase text-teal-400">
              Instrução Operacional de Chão de Fábrica (Fácil Leitura)
            </div>
            <h3 className="text-base md:text-lg font-serif font-bold text-white">
              Guia Prático para o Operador & Ações Imediatas
            </h3>
          </div>
        </div>

        {/* Manual Standard Tag */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
            Norma: <strong className="text-white">{isAIAG_VDA ? 'Manual AIAG & VDA (1ª Ed.)' : 'Manual AIAG CEP (4ª Ed.)'}</strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
            Metas: <strong className="text-amber-300">Cpk ≥ {benchmarkCpk.toFixed(2)}</strong> | <strong className="text-teal-300">Ppk ≥ {benchmarkPpk.toFixed(2)}</strong> ({targetName || (featureClassification === 'critical' ? 'Crítica' : 'Padrão')})
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Traffic Light Big Banner */}
        <div
          className={`p-5 rounded-xl border-2 flex flex-col sm:flex-row items-center gap-5 transition-all ${
            status === 'VERDE'
              ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950'
              : status === 'AMARELO'
              ? 'bg-amber-50/90 border-amber-500 text-amber-950'
              : 'bg-red-50/90 border-red-500 text-red-950'
          }`}
        >
          {/* Big Traffic Light Graphic */}
          <div className="flex sm:flex-col gap-2 p-2 bg-slate-900 rounded-full shrink-0 shadow-md">
            <span
              className={`w-7 h-7 rounded-full transition-all ${
                status === 'VERMELHO'
                  ? 'bg-red-600 shadow-lg shadow-red-500/70 ring-4 ring-red-400/50 scale-110'
                  : 'bg-red-950 opacity-40'
              }`}
            />
            <span
              className={`w-7 h-7 rounded-full transition-all ${
                status === 'AMARELO'
                  ? 'bg-amber-400 shadow-lg shadow-amber-400/70 ring-4 ring-amber-300/50 scale-110'
                  : 'bg-amber-950 opacity-40'
              }`}
            />
            <span
              className={`w-7 h-7 rounded-full transition-all ${
                status === 'VERDE'
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/70 ring-4 ring-emerald-400/50 scale-110'
                  : 'bg-emerald-950 opacity-40'
              }`}
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded bg-black/10">
                Status Atual do Posto de Trabalho:
              </span>
              <span className="font-mono font-black text-sm">
                {status === 'VERDE' ? '🟢 SINAL VERDE' : status === 'AMARELO' ? '🟡 SINAL AMARELO' : '🔴 SINAL VERMELHO'}
              </span>
            </div>
            <h4 className="text-lg md:text-xl font-bold font-serif leading-tight">
              {headline}
            </h4>
            <p className="text-xs mt-1.5 opacity-90 leading-relaxed max-w-3xl">
              {statusSummary}
            </p>
            {onOpenCriticalAnalysis && (status === 'VERMELHO' || status === 'AMARELO') && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => onOpenCriticalAnalysis('Guia do Operador - Alerta do Posto de Trabalho')}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Abrir Análise Crítica (Plano de Ação e Prazo)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4 Action Cards for the Shopfloor Operator */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <span>O QUE O OPERADOR DEVE FAZER AGORA? (Passo a Passo Rápido)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Máquina */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-2">
                  <div className="p-1 rounded bg-blue-100 text-blue-700">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <span>1. Ação na Máquina</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  {status === 'VERDE' && (
                    <span className="text-emerald-800 font-medium">
                      ✓ <strong>Manter Produção:</strong> Não altere nenhuma regulagem. Mantenha os parâmetros de velocidade, temperatura e ciclo atuais.
                    </span>
                  )}
                  {status === 'AMARELO' && (
                    <span className="text-amber-800 font-medium">
                      ⚠ <strong>Ajustar Parâmetros:</strong> O valor médio está em <strong>{capability.mean.toFixed(2)}</strong> (Alvo = {specs.target ?? '—'}). Realize pequena compensação de regulagem para centrar no alvo.
                    </span>
                  )}
                  {status === 'VERMELHO' && (
                    <span className="text-red-800 font-medium">
                      🛑 <strong>Parar a Máquina:</strong> Pare a injeção/extrusão imediatamente. Não tente continuar produzindo sem intervenção técnica.
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Posto: Extrusão / Injetora
              </div>
            </div>

            {/* Card 2: Peças / Produto */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-2">
                  <div className="p-1 rounded bg-teal-100 text-teal-700">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <span>2. Ação nas Peças</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  {status === 'VERDE' && (
                    <span className="text-emerald-800 font-medium">
                      ✓ <strong>Liberadas:</strong> Peças aprovadas para envio ao próximo processo ou embalagem. Amostragem normal de rotina.
                    </span>
                  )}
                  {status === 'AMARELO' && (
                    <span className="text-amber-800 font-medium">
                      ⚠ <strong>Inspecionar mais:</strong> Dobre a frequência da medição nas próximas 3 bateladas/corridas para garantir estabilidade.
                    </span>
                  )}
                  {status === 'VERMELHO' && (
                    <span className="text-red-800 font-medium">
                      🛑 <strong>Segregar e Bloquear:</strong> Isole todas as caixas/peças produzidas desde a última medição aprovada. Coloque etiqueta vermelha de PRODUTO BLOQUEADO.
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Contenção de Qualidade
              </div>
            </div>

            {/* Card 3: Ferramenta / Cavidades */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-2">
                  <div className="p-1 rounded bg-purple-100 text-purple-700">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span>3. Molde / Ferramenta</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  {spatialCavity?.hasSpatialData ? (
                    highCavities.length > 0 || lowCavities.length > 0 ? (
                      <span className="text-slate-800 font-medium">
                        Verificar cavidades:
                        {highCavities.length > 0 && <span className="text-red-700"> {highCavities.join(', ')} (altas)</span>}
                        {lowCavities.length > 0 && <span className="text-blue-700"> {lowCavities.join(', ')} (baixas)</span>}
                        . Limpar resíduos de polímero e checar circuito de refrigeração.
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-medium">
                        ✓ Molde equilibrado termicamente entre todas as cavidades.
                      </span>
                    )
                  ) : (
                    <span className="text-slate-600">
                      Checar bico de injeção, filtro e matriz quanto a entupimentos ou queima de material.
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Ferramental & Refrigeração
              </div>
            </div>

            {/* Card 4: Quem Acionar */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-2">
                  <div className="p-1 rounded bg-amber-100 text-amber-700">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <span>4. Quem Acionar</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  {status === 'VERDE' && (
                    <span className="text-slate-700">
                      Nenhum acionamento necessário. O próprio operador conduz a rotina padrão.
                    </span>
                  )}
                  {status === 'AMARELO' && (
                    <span className="text-amber-900 font-medium">
                      Informar o <strong>Preparador de Máquinas / Líder de Turno</strong> na próxima ronda para acompanhamento.
                    </span>
                  )}
                  {status === 'VERMELHO' && (
                    <span className="text-red-900 font-bold">
                      Acionar imediatamente o <strong>Preparador</strong> e o <strong>Inspetor de Qualidade</strong> para abertura de Relatório de Não-Conformidade (RNC).
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Escala de Suporte da Linha
              </div>
            </div>
          </div>
        </div>

        {/* Official Decision Matrix according to AIAG CEP 4th Ed / AIAG & VDA 1st Ed */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-serif font-bold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Matriz Oficial de Decisão — {isAIAG_VDA ? 'Manual Harmonizado AIAG & VDA (1ª Edição)' : 'Manual de Referência AIAG CEP (4ª Edição)'}
            </h5>
            <span className="text-[11px] text-slate-500">
              Posicionamento atual: <strong className={status === 'VERDE' ? 'text-emerald-700' : status === 'AMARELO' ? 'text-amber-700' : 'text-red-700'}>
                {hasSpecialCauses ? 'Instável' : 'Estável'} & {isCapable ? 'Capaz' : 'Incapaz'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Box 1: Estável e Capaz */}
            <div className={`p-3 rounded-lg border transition-all ${
              !hasSpecialCauses && isCapable
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-medium shadow-xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
                <span>1. Processo Estável & Capaz (Cpk ≥ {benchmarkCpk.toFixed(2)})</span>
                {!hasSpecialCauses && isCapable && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">SUA SITUAÇÃO</span>}
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                <strong>Diretriz do Manual:</strong> Nenhuma ação especial necessária. Continuar amostragem estatística periódica padrão. Foco em melhoria contínua e redução de custos.
              </p>
            </div>

            {/* Box 2: Instável mas Capaz */}
            <div className={`p-3 rounded-lg border transition-all ${
              hasSpecialCauses && isCapable
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400 font-medium shadow-xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between font-bold text-amber-900 mb-1">
                <span>2. Processo Instável mas com Cpk Alto</span>
                {hasSpecialCauses && isCapable && <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">SUA SITUAÇÃO</span>}
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Diretriz do Manual:</strong> A dispersão natural é boa, mas há causas especiais ativas. Investigar a causa especial, conter lotes das amostras anômalas e eliminar a perturbação.
              </p>
            </div>

            {/* Box 3: Estável mas Incapaz */}
            <div className={`p-3 rounded-lg border transition-all ${
              !hasSpecialCauses && !isCapable
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400 font-medium shadow-xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between font-bold text-amber-900 mb-1">
                <span>3. Processo Estável, mas Incapaz (Cpk &lt; {benchmarkCpk.toFixed(2)})</span>
                {!hasSpecialCauses && !isCapable && <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">SUA SITUAÇÃO</span>}
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Diretriz do Manual:</strong> Não adianta caçar causas pontuais; a variabilidade é do próprio processo/máquina. Ação: Inspeção 100% obrigatória até que a engenharia altere a capacidade do equipamento ou matéria-prima.
              </p>
            </div>

            {/* Box 4: Instável e Incapaz */}
            <div className={`p-3 rounded-lg border transition-all ${
              hasSpecialCauses && !isCapable
                ? 'bg-red-50 border-red-500 ring-2 ring-red-400 font-medium shadow-xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between font-bold text-red-900 mb-1">
                <span>4. Processo Instável & Incapaz</span>
                {hasSpecialCauses && !isCapable && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">SUA SITUAÇÃO</span>}
              </div>
              <p className="text-[11px] text-red-800 leading-relaxed">
                <strong>Diretriz do Manual:</strong> PARADA OBRIGATÓRIA. Contenção total 100% de produtos suspeitos. Reunião de emergência com engenharia, manutenção e qualidade para estabilizar antes de religar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
