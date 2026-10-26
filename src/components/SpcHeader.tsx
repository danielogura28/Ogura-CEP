import React from 'react';
import {
  Activity,
  Table2,
  Printer,
  Database,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Cpu,
  BookOpen,
  CheckSquare,
  FileText,
  PlusCircle,
  ShieldAlert,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Target,
  Sliders
} from 'lucide-react';
import { SPC_DATASETS } from '../utils/spcDatasets';
import { FeatureClassification, SpcManualStandard } from '../types';
import { getAllCapabilityTargets } from '../utils/spcTargets';

interface SpcHeaderProps {
  onOpenDataEditor: () => void;
  onOpenReport: () => void;
  onOpenNewChart: () => void;
  onSelectDataset: (id: string) => void;
  currentDatasetId: string;
  onReset: () => void;
  onPrintReport: () => void;
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
  onOpenArchive?: () => void;
  archiveCount?: number;
  totalPointsCount: number;
  metricName: string;
  manualStandard: SpcManualStandard;
  onChangeManualStandard: (m: SpcManualStandard) => void;
  featureClassification: FeatureClassification;
  onChangeFeatureClassification: (f: FeatureClassification) => void;
  targetCpk?: number;
  targetPpk?: number;
  targetName?: string;
  onOpenTargetsModal?: () => void;
  onScrollToOperatorGuide: () => void;
  onOpenCriticalAnalysis?: () => void;
  hasCriticalIssue?: boolean;
  hasCriticalAnalysisSaved?: boolean;
}

export const SpcHeader: React.FC<SpcHeaderProps> = ({
  onOpenDataEditor,
  onOpenReport,
  onOpenNewChart,
  onSelectDataset,
  currentDatasetId,
  onReset,
  onPrintReport,
  onExportExcel,
  isExportingExcel = false,
  onOpenArchive,
  archiveCount,
  totalPointsCount,
  metricName,
  manualStandard,
  onChangeManualStandard,
  featureClassification,
  onChangeFeatureClassification,
  targetCpk = 1.33,
  targetPpk = 1.33,
  targetName,
  onOpenTargetsModal,
  onScrollToOperatorGuide,
  onOpenCriticalAnalysis,
  hasCriticalIssue = false,
  hasCriticalAnalysisSaved = false
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 select-none shrink-0 shadow-md">
      {/* Top Brand Bar */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {/* PTP Icon */}
          <div className="w-10 h-8 rounded-md bg-gradient-to-br from-red-800 via-red-900 to-zinc-900 flex items-center justify-center font-sans font-black text-white text-xs tracking-wider shadow-sm ring-1 ring-red-400/30">
            PTP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base tracking-wide text-white">
                PTP <span className="text-red-300 font-sans text-xs uppercase px-1.5 py-0.5 rounded-sm bg-red-950/70 border border-red-800/80">Controle Estatístico de Processo</span>
              </span>
              <span className="text-[11px] text-slate-400 hidden lg:inline">
                Controle Estatístico de Processo & Capabilidade Industrial (CEP)
              </span>
            </div>
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md text-xs border border-slate-700">
            <BookOpen className="w-3.5 h-3.5 text-red-400" />
            <select
              value={manualStandard}
              onChange={(e) => onChangeManualStandard(e.target.value as SpcManualStandard)}
              className="bg-transparent text-slate-100 font-medium text-xs focus:outline-hidden cursor-pointer"
              title="Alternar entre Manual AIAG CEP 4ª Edição e Manual Harmonizado AIAG & VDA 1ª Edição"
            >
              <option value="AIAG_SPC_4TH" className="bg-slate-800 text-white">
                Manual AIAG CEP (4ª Edição)
              </option>
              <option value="AIAG_VDA_1ST" className="bg-slate-800 text-white">
                Manual AIAG & VDA (1ª Edição)
              </option>
            </select>
          </div>

          {/* Capability Targets Selector (Cpk & Ppk) */}
          <div className="flex items-center gap-1 bg-slate-800 pl-2 pr-1 py-0.5 rounded-md text-xs border border-slate-700">
            <Target className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <select
              value={featureClassification}
              onChange={(e) => {
                if (e.target.value === '__NEW_TARGET__') {
                  onOpenTargetsModal?.();
                } else {
                  onChangeFeatureClassification(e.target.value as FeatureClassification);
                }
              }}
              className="bg-transparent text-slate-200 text-xs focus:outline-hidden cursor-pointer max-w-[190px] truncate py-0.5"
              title={`Meta de Capabilidade Atual: Cpk ≥ ${targetCpk.toFixed(2)} | Ppk ≥ ${targetPpk.toFixed(2)} (${targetName || 'Personalizada'})`}
            >
              {getAllCapabilityTargets().map((tgt) => (
                <option key={tgt.id} value={tgt.id} className="bg-slate-800 text-white">
                  {tgt.shortLabel}
                </option>
              ))}
              {featureClassification === 'custom' && (
                <option value="custom" className="bg-slate-800 text-amber-300 font-mono">
                  Personalizada ({targetCpk.toFixed(2)} / {targetPpk.toFixed(2)})
                </option>
              )}
              <option value="__NEW_TARGET__" className="bg-red-900 text-white font-bold">
                ➕ Adicionar / Ajustar Metas...
              </option>
            </select>

            {onOpenTargetsModal && (
              <button
                type="button"
                onClick={onOpenTargetsModal}
                className="p-1 hover:text-white text-slate-400 hover:bg-slate-700/80 rounded transition-colors cursor-pointer"
                title="Configurar Metas de Cpk e Ppk / Adicionar Nova Meta"
              >
                <span className="sr-only">Adicionar Nova Meta</span>
                <Sliders className="w-3 h-3 text-red-300" />
              </button>
            )}
          </div>

          {/* Dataset selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md text-xs border border-slate-700">
            <Database className="w-3.5 h-3.5 text-red-300" />
            <select
              value={currentDatasetId}
              onChange={(e) => {
                if (e.target.value === '__NEW_CHART__') {
                  onOpenNewChart();
                } else {
                  onSelectDataset(e.target.value);
                }
              }}
              className="bg-transparent text-slate-200 text-xs focus:outline-hidden cursor-pointer"
            >
              {SPC_DATASETS.map((ds) => (
                <option key={ds.id} value={ds.id} className="bg-slate-800 text-white">
                  {ds.title}
                </option>
              ))}
              <option value="custom" className="bg-slate-800 text-white">
                Dados Personalizados / Inseridos
              </option>
              <option value="__NEW_CHART__" className="bg-emerald-800 text-white font-semibold">
                ➕ Iniciar Nova Carta...
              </option>
            </select>
          </div>

          {/* Start New Chart Button */}
          <button
            onClick={onOpenNewChart}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Iniciar Nova Carta de Controle (solicitar dados da empresa, produto, máquina, tolerâncias e responsável)"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nova Carta</span>
          </button>

          {/* Quick jump to Operator Shopfloor Card */}
          <button
            onClick={onScrollToOperatorGuide}
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Ir direto para a instrução simplificada de chão de fábrica"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Guia do Operador</span>
          </button>

          {/* Análise Crítica Button (Destaque quando houver causas especiais ou Cpk reprovado) */}
          {onOpenCriticalAnalysis && (
            <button
              onClick={onOpenCriticalAnalysis}
              className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                hasCriticalAnalysisSaved
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500'
                  : hasCriticalIssue
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse border border-red-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Abrir Análise Crítica e Planos de Ações Corretivas (O que aconteceu, planos de ação e prazo)"
            >
              {hasCriticalAnalysisSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Análise Crítica (Salva)</span>
                </>
              ) : hasCriticalIssue ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Análise Crítica Requerida</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  <span>Análise Crítica</span>
                </>
              )}
            </button>
          )}

          {/* Open Data Editor */}
          <button
            onClick={onOpenDataEditor}
            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Dados ({totalPointsCount} pts)</span>
          </button>

          {/* Open Industrial Report Sheet */}
          <button
            onClick={onOpenReport}
            className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 border border-red-700/80 shadow-xs transition-colors cursor-pointer"
            title="Visualizar e Imprimir o Relatório Oficial de Capabilidade (Layout Industrial A4)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Laudo Industrial</span>
          </button>

          {/* Banco de Dados / Consulta e Exclusão de Relatórios */}
          {onOpenArchive && (
            <button
              onClick={onOpenArchive}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-red-300 hover:text-white rounded-md text-xs font-semibold flex items-center gap-1.5 border border-red-800/60 shadow-xs transition-colors cursor-pointer"
              title="Banco de Dados: Consultar, pesquisar, recarregar ou excluir relatórios já elaborados"
            >
              <Database className="w-3.5 h-3.5 text-red-400" />
              <span>Banco de Relatórios</span>
              {typeof archiveCount === 'number' && archiveCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-mono text-[10px] font-bold">
                  {archiveCount}
                </span>
              )}
            </button>
          )}

          {/* Export Full Excel (.xlsx) */}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              disabled={isExportingExcel}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Gerar e baixar o relatório completo em Excel (.xlsx) com tabelas e gráficos embutidos"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Gerando...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </>
              )}
            </button>
          )}

          {/* Print Preview / Export */}
          <button
            onClick={onPrintReport}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Pré-visualizar e Imprimir ou Salvar Relatório em PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Imprimir / PDF</span>
          </button>

          <button
            onClick={onReset}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            title="Restaurar padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* JASP Ribbon Bar with QC modules */}
      <div className="px-4 py-1.5 bg-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs text-slate-300">
        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/60 text-red-300 rounded font-medium border border-red-900/40">
          <Activity className="w-3.5 h-3.5" />
          <span>Cartas Shewhart (I-MR / X̄-R)</span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/60 text-slate-200 rounded font-medium border border-slate-600/50">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Capabilidade ({manualStandard === 'AIAG_VDA_1ST' ? 'AIAG&VDA Cp/Cpk' : 'AIAG 4ª Ed.'})</span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/60 text-red-200 rounded font-medium border border-slate-600/50">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Autocorrelação Serial (ACF)</span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/60 text-zinc-300 rounded font-medium border border-slate-600/50">
          <Cpu className="w-3.5 h-3.5" />
          <span>Correlação Espacial no Molde</span>
        </div>

        <div className="ml-auto text-[11px] text-slate-400 flex items-center gap-2">
          <span>Característica: <strong className="text-white font-mono">{metricName}</strong></span>
        </div>
      </div>
    </header>
  );
};
