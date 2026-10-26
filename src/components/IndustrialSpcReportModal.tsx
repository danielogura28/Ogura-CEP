import React, { useState } from 'react';
import {
  CapabilityResults,
  CepAnalysisConfig,
  CepDataPoint,
  ControlLimits,
  CriticalAnalysisData,
  FeatureClassification,
  NelsonViolation,
  ProcessSpecs,
  SpcManualStandard,
  SpcReportMetadata
} from '../types';
import { ControlChartPlot } from './plots/ControlChartPlot';
import { CapabilityPlot } from './plots/CapabilityPlot';
import { RawValuesRunChartPlot } from './plots/RawValuesRunChartPlot';
import { NormalProbabilityPlot } from './plots/NormalProbabilityPlot';
import { ChartGuideButton } from './ChartGuideButton';
import { exportSpcToExcel } from '../utils/spcExcelExporter';
import { saveReportToArchive } from '../utils/spcReportDatabase';
import { resolveCapabilityTargets } from '../utils/spcTargets';
import {
  X,
  Printer,
  Download,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  ShieldCheck,
  FileText,
  Sliders,
  Calendar,
  User,
  Wrench,
  Factory,
  ShieldAlert,
  FileEdit,
  Eye,
  FileSpreadsheet,
  Loader2,
  Database,
  BookmarkCheck
} from 'lucide-react';

interface IndustrialSpcReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CepAnalysisConfig;
  specs: ProcessSpecs;
  points: CepDataPoint[];
  limits: ControlLimits;
  primaryPoints: { sample: number; value: number }[];
  secondaryPoints: { sample: number; value: number }[];
  violations: NelsonViolation[];
  capability: CapabilityResults;
  metadata?: SpcReportMetadata;
  onUpdateMetadata?: (metadata: SpcReportMetadata) => void;
  onUpdateManualStandard?: (standard: SpcManualStandard) => void;
  onUpdateFeatureClassification?: (feat: FeatureClassification) => void;
  criticalAnalysis?: CriticalAnalysisData | null;
  onOpenCriticalAnalysis?: (triggerInfo?: string) => void;
  onOpenPrintPreview?: () => void;
  onOpenArchive?: () => void;
  onReportArchived?: () => void;
}

export const IndustrialSpcReportModal: React.FC<IndustrialSpcReportModalProps> = ({
  isOpen,
  onClose,
  config,
  specs,
  points,
  limits,
  primaryPoints,
  secondaryPoints,
  violations,
  capability,
  metadata: propsMetadata,
  onUpdateMetadata,
  onUpdateManualStandard,
  onUpdateFeatureClassification,
  criticalAnalysis,
  onOpenCriticalAnalysis,
  onOpenPrintPreview,
  onOpenArchive,
  onReportArchived
}) => {
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccessMsg, setArchiveSuccessMsg] = useState<string | null>(null);
  const [internalMetadata, setInternalMetadata] = useState<SpcReportMetadata>({
    companyName: 'Petropol Polímeros & Compostos Industriais',
    partName: 'Composto Termoplástico de Engenharia',
    partNumber: 'PT-9042-REV-B',
    operation: 'OP-20 Injeção e Controle Dimensional',
    machine: 'Injetora Engel 150T (Posto #04)',
    gauge: 'Micrômetro Digital Mitutoyo 0-25mm',
    studyDate: new Date().toLocaleDateString('pt-BR'),
    collectionStartDate: new Date(Date.now() - 3 * 86400000).toLocaleDateString('pt-BR'),
    collectionEndDate: new Date().toLocaleDateString('pt-BR'),
    collectionDuration: '4 dias (80 horas de processo)',
    operator: 'Daniel Ogura (Resp. Métrologia & Qualidade)',
    engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
    department: 'Garantia da Qualidade & Metrologia',
    lotNumber: 'LOTE-2026-X4',
    notes: 'Estudo de Capabilidade Preliminar para Homologação de Lote Seriado.'
  });

  const metadata = propsMetadata || internalMetadata;
  const setMetadata = (newMeta: SpcReportMetadata) => {
    setInternalMetadata(newMeta);
    if (onUpdateMetadata) {
      onUpdateMetadata(newMeta);
    }
  };

  if (!isOpen) return null;

  const values = points.map((p) => p.value);
  const n = values.length;
  const isAIAG_VDA = config.manualStandard === 'AIAG_VDA_1ST';
  const { targetCpk, targetPpk, targetName } = resolveCapabilityTargets(config);
  const benchmarkCpk = targetCpk;
  const benchmarkPpk = targetPpk;

  const effectiveLsl = capability.effectiveLsl ?? specs.lsl;
  const effectiveUsl = capability.effectiveUsl ?? specs.usl;
  const effectiveTarget = specs.target ?? (effectiveLsl !== null && effectiveUsl !== null ? (effectiveLsl + effectiveUsl) / 2 : null);

  const mean = capability.mean;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)] || 0;
  const min = sorted[0] || 0;
  const max = sorted[sorted.length - 1] || 0;
  const range = max - min;

  // Process Approval Assessment
  const isCpkApproved = (capability.cpk ?? 0) >= targetCpk;
  const isPpkApproved = (capability.ppk ?? 0) >= targetPpk;
  const isStable = violations.length === 0;

  let reportStatus: 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'REJECTED' = 'APPROVED';
  let reportStatusText = 'PROCESSO CAPAZ E HOMOLOGADO';
  let reportStatusDesc = 'O processo atende a todos os requisitos normativos de estabilidade e capabilidade para produção seriada.';

  if (!isCpkApproved && !isStable) {
    reportStatus = 'REJECTED';
    reportStatusText = 'PROCESSO INCAPAZ E FORA DE CONTROLE';
    reportStatusDesc = 'A capabilidade não atinge o requisito mínimo e há causas especiais presentes. Produção seriada bloqueada até correção.';
  } else if (!isCpkApproved) {
    reportStatus = 'REJECTED';
    reportStatusText = 'PROCESSO INCAPAZ (CPK ABAIXO DA META)';
    reportStatusDesc = `O Cpk obtido (${capability.cpk?.toFixed(2) ?? '—'}) está abaixo do índice mínimo exigido (≥ ${benchmarkCpk.toFixed(2)}). Requer ajuste de centralização ou redução da dispersão.`;
  } else if (!isStable) {
    reportStatus = 'CONDITIONALLY_APPROVED';
    reportStatusText = 'CAPAZ MAS COM INSTABILIDADES DETECTADAS';
    reportStatusDesc = 'O processo possui dispersão adequada, porém apresenta violações das Regras de Nelson. Exige eliminação das causas especiais.';
  }

  // Operator Action Guidance
  let operatorColor = 'bg-emerald-50 border-emerald-500 text-emerald-950';
  let operatorBadge = 'bg-emerald-600 text-white';
  let operatorActionTitle = '🟢 PRODUÇÃO NORMAL — MANTER OPERAÇÃO';
  let operatorActionText =
    'O processo está estável e as peças atendem perfeitamente aos limites do cliente. Continue a produção no ritmo padrão e realize as medições de rotina conforme a frequência programada.';
  let operatorSteps = [
    'Manter os parâmetros de máquina inalterados;',
    'Registrar as cotas nas folhas de verificação usuais;',
    'Preservar a limpeza do ferramental e o fluxo constante de matéria-prima.'
  ];

  if (reportStatus === 'REJECTED') {
    operatorColor = 'bg-red-50 border-red-500 text-red-950';
    operatorBadge = 'bg-red-600 text-white';
    operatorActionTitle = '🔴 ATENÇÃO MÁXIMA — INTERROMPER A OPERAÇÃO';
    const isShiftedHigh = effectiveTarget !== null && mean > effectiveTarget;
    const isShiftedLow = effectiveTarget !== null && mean < effectiveTarget;
    const directionNotice = isShiftedHigh
      ? `A média está acima do alvo nominal (+${(mean - effectiveTarget).toFixed(3)} ${specs.unit}). Reduzir o ponto de trabalho/offset.`
      : isShiftedLow
      ? `A média está abaixo do alvo nominal (-${(effectiveTarget - mean).toFixed(3)} ${specs.unit}). Aumentar o ponto de trabalho/offset.`
      : 'A dispersão das peças está muito alta.';

    operatorActionText = `PARAR A PRODUÇÃO IMEDIATAMENTE. ${directionNotice} Segregar as peças produzidas após a última amostragem aprovada.`;
    operatorSteps = [
      'Pressionar o botão de parada da máquina ao final do ciclo atual;',
      'Identificar o lote com etiqueta vermelha de "PEÇAS EM ANÁLISE / RETIDAS";',
      'Acionar imediatamente o Preparador de Máquinas ou a Engenharia da Qualidade.'
    ];
  } else if (reportStatus === 'CONDITIONALLY_APPROVED') {
    operatorColor = 'bg-amber-50 border-amber-500 text-amber-950';
    operatorBadge = 'bg-amber-600 text-white';
    operatorActionTitle = '🟡 ALERTA DE INSTABILIDADE — AJUSTE NECESSÁRIO';
    operatorActionText =
      'O processo está gerando peças dentro da tolerância, mas o gráfico indicou tendência ou deriva anômala (Causa Especial). É necessário inspecionar a máquina antes que gere refugo.';
    operatorSteps = [
      'Não alterar parâmetros drásticos sem consultar o preparador;',
      'Verificar temperatura, refrigeração, pressão e desgaste da ferramenta;',
      'Realizar nova medição nas próximas 5 peças para confirmar retorno ao centro.'
    ];
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['Amostra', 'Valor Medido', 'LIE', 'Alvo', 'LSE', 'Unidade', 'Status'].join(';')
    ];
    points.forEach((p, idx) => {
      const inSpec =
        (effectiveLsl === null || p.value >= effectiveLsl) &&
        (effectiveUsl === null || p.value <= effectiveUsl);
      csvRows.push(
        [
          p.sample ?? idx + 1,
          p.value.toFixed(4),
          effectiveLsl ?? '',
          effectiveTarget ?? '',
          effectiveUsl ?? '',
          specs.unit,
          inSpec ? 'CONFORME' : 'NÃO CONFORME'
        ].join(';')
      );
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `laudo_capabilidade_${specs.metricName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportSpcToExcel({
        config,
        specs,
        points,
        limits,
        primaryPoints,
        secondaryPoints,
        violations,
        capability,
        metadata,
        criticalAnalysis
      });
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleSaveToDatabase = async () => {
    setIsArchiving(true);
    try {
      const isCpkOk = (capability.cpk ?? 0) >= benchmarkCpk;
      const isStable = violations.length === 0;
      const status: 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'REJECTED' =
        !isCpkOk && !isStable ? 'REJECTED' : !isCpkOk ? 'REJECTED' : !isStable ? 'CONDITIONALLY_APPROVED' : 'APPROVED';

      const res = await saveReportToArchive({
        metadata,
        specs,
        config,
        points,
        summary: {
          n: points.length,
          mean: capability.mean,
          cpk: capability.cpk,
          ppk: capability.ppk,
          status,
          violationsCount: violations.length,
          metricUnit: specs.unit
        },
        criticalAnalysis,
        notes: metadata.notes
      });

      setArchiveSuccessMsg(`Laudo arquivado com sucesso no banco! (ID: ${res.report.id})`);
      if (onReportArchived) {
        onReportArchived();
      }
      setTimeout(() => setArchiveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar laudo no banco.');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-slate-200 w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-slate-300">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs font-bold text-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="font-serif font-bold text-sm text-slate-100 flex items-center gap-2">
                Relatório Oficial de Capabilidade do Processo (Layout Industrial)
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  Folha Padrão AIAG / VDA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Laudo técnico de homologação para auditorias IATF 16949, PPAP e instrução simplificada de chão de fábrica.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Salvar no Banco */}
            <button
              onClick={handleSaveToDatabase}
              disabled={isArchiving}
              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Salvar e arquivar este laudo oficial no Banco de Dados"
            >
              {isArchiving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span>{isArchiving ? 'Salvando...' : 'Salvar no Banco'}</span>
            </button>

            {/* Banco de Dados Modal Shortcut */}
            {onOpenArchive && (
              <button
                onClick={onOpenArchive}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-md text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Consultar outros relatórios gravados no Banco de Dados"
              >
                <Database className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">Banco de Relatórios</span>
              </button>
            )}

            <button
              onClick={() => setIsEditingMetadata(!isEditingMetadata)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Editar dados da peça, máquina e responsáveis no cabeçalho do laudo"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingMetadata ? 'Concluir Edição' : 'Editar Cabeçalho'}</span>
            </button>

            {/* Print Preview Button */}
            {onOpenPrintPreview && (
              <button
                onClick={onOpenPrintPreview}
                className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Abrir pré-visualização de impressão com zoom e seleção de seções"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pré-Visualizar</span>
              </button>
            )}

            {/* Export Full Excel (.xlsx) */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Exportar planilha consolidada completa com tabelas e gráficos embutidos (.xlsx)"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar Excel (.xlsx)</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Exportar dados brutos de medição em CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Imprimir laudo em formato A4 ou salvar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Archive Success Banner */}
        {archiveSuccessMsg && (
          <div className="no-print bg-emerald-950/90 border-b border-emerald-800 px-5 py-2 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{archiveSuccessMsg}</span>
            </div>
            <button
              onClick={() => setArchiveSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Header Metadata Editor Drawer (Hidden in Print) */}
        {isEditingMetadata && (
          <div className="no-print bg-amber-50/95 border-b border-amber-200 p-4 shrink-0 text-xs text-amber-950">
            <div className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Dados de Rastreabilidade e Identificação do Estudo:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Empresa / Fornecedor:</label>
                <input
                  type="text"
                  value={metadata.companyName}
                  onChange={(e) => setMetadata({ ...metadata, companyName: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Descrição da Peça:</label>
                <input
                  type="text"
                  value={metadata.partName}
                  onChange={(e) => setMetadata({ ...metadata, partName: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Código (Part Number):</label>
                <input
                  type="text"
                  value={metadata.partNumber}
                  onChange={(e) => setMetadata({ ...metadata, partNumber: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Operação / Setor:</label>
                <input
                  type="text"
                  value={metadata.operation}
                  onChange={(e) => setMetadata({ ...metadata, operation: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Máquina / Equipamento:</label>
                <input
                  type="text"
                  value={metadata.machine}
                  onChange={(e) => setMetadata({ ...metadata, machine: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Meio de Medição (MSA):</label>
                <input
                  type="text"
                  value={metadata.gauge}
                  onChange={(e) => setMetadata({ ...metadata, gauge: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Responsável pela Análise:</label>
                <input
                  type="text"
                  value={metadata.engineer}
                  onChange={(e) => setMetadata({ ...metadata, engineer: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Responsáveis pelo Estudo (Operador):</label>
                <input
                  type="text"
                  value={metadata.operator}
                  onChange={(e) => setMetadata({ ...metadata, operator: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Data do Estudo (Emissão):</label>
                <input
                  type="text"
                  value={metadata.studyDate}
                  onChange={(e) => setMetadata({ ...metadata, studyDate: e.target.value })}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Início da Coleta de Dados:</label>
                <input
                  type="text"
                  value={metadata.collectionStartDate || ''}
                  onChange={(e) => setMetadata({ ...metadata, collectionStartDate: e.target.value })}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Fim da Coleta de Dados:</label>
                <input
                  type="text"
                  value={metadata.collectionEndDate || ''}
                  onChange={(e) => setMetadata({ ...metadata, collectionEndDate: e.target.value })}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-semibold block">Tempo / Duração da Coleta:</label>
                <input
                  type="text"
                  value={metadata.collectionDuration || ''}
                  onChange={(e) => setMetadata({ ...metadata, collectionDuration: e.target.value })}
                  placeholder="Ex: 4 dias (80 horas)"
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Report Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {/* Printable A4 Industrial Document Canvas */}
          <div
            id="printable-spc-report"
            className="printable-sheet-wrapper print-section-block bg-white text-slate-900 w-full max-w-[850px] shadow-lg rounded-sm border border-slate-300 p-6 sm:p-8 space-y-5 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full"
          >
            {/* Header: Company, Report Title & Normative Standard */}
            <div className="border-2 border-slate-900 pb-2">
              <div className="flex items-stretch border-b-2 border-slate-900 bg-slate-50">
                <div className="w-48 p-3 flex flex-col justify-center items-center border-r-2 border-slate-900 bg-slate-100 text-center">
                  <div className="font-sans font-black text-2xl tracking-wider text-slate-900">
                    PTP
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-600 tracking-widest mt-0.5">
                    Controle de Processo
                  </div>
                </div>

                <div className="flex-1 p-3 text-center flex flex-col justify-center">
                  <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900 font-serif">
                    PTP — Relatório de Estudo de Capabilidade do Processo
                  </h1>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5">
                    PTP - Controle Estatístico de Processo (CEP / SPC) — Análise Preliminar & Capabilidade Contínua
                  </div>
                  <div className="text-[11px] font-mono text-blue-900 font-bold mt-1">
                    Referência:{' '}
                    {isAIAG_VDA
                      ? 'Manual Harmonizado AIAG & VDA (1ª Edição)'
                      : 'Manual AIAG CEP (4ª Edição)'}
                  </div>
                </div>

                <div className="w-52 p-2 text-right border-l-2 border-slate-900 bg-slate-100 flex flex-col justify-center text-[10px] space-y-0.5 font-mono">
                  <div><strong>Doc N°:</strong> CEP-{new Date().getFullYear()}-084</div>
                  <div><strong>Data do Estudo:</strong> {metadata.studyDate}</div>
                  <div><strong>Início Coleta:</strong> {metadata.collectionStartDate || metadata.studyDate}</div>
                  <div><strong>Fim Coleta:</strong> {metadata.collectionEndDate || metadata.studyDate}</div>
                  <div><strong>Duração:</strong> {metadata.collectionDuration || '1 dia'}</div>
                </div>
              </div>

              {/* Standard Automotive Quality Header Block Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 text-[11px] divide-x divide-y border-b border-slate-300">
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Empresa / Fornecedor</span>
                  <span className="font-semibold text-slate-900">{metadata.companyName}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Código da Peça (Part Number)</span>
                  <span className="font-mono font-bold text-slate-900">{metadata.partNumber}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Descrição da Peça</span>
                  <span className="font-medium text-slate-900">{metadata.partName}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Operação / Posto</span>
                  <span className="font-medium text-slate-900">{metadata.operation}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 text-[11px] divide-x divide-y border-b border-slate-300">
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Máquina / Equipamento</span>
                  <span className="font-medium text-slate-900">{metadata.machine}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Característica / Cota</span>
                  <span className="font-bold text-red-900">{specs.metricName}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Meio de Medição (Instrumento)</span>
                  <span className="font-medium text-slate-800">{metadata.gauge}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Classificação da Cota & Metas</span>
                  <span className="font-semibold text-slate-900">
                    {targetName} (Cpk ≥ {targetCpk.toFixed(2)} | Ppk ≥ {targetPpk.toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 text-[11px] divide-x border-b border-slate-300 bg-slate-50">
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Especificação Nominal (Alvo)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {effectiveTarget !== null ? `${effectiveTarget.toFixed(3)} ${specs.unit}` : '—'}
                  </span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Tolerâncias de Engenharia</span>
                  <span className="font-mono font-semibold text-slate-900">
                    LIE: {effectiveLsl ?? '—'} | LSE: {effectiveUsl ?? '—'} {specs.unit}
                  </span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Amostragem & Subgrupo</span>
                  <span className="font-mono text-slate-900">
                    n = {config.subgroupSize} (Total: {n} medições)
                  </span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Responsáveis</span>
                  <span className="text-slate-800 truncate block">
                    {metadata.engineer.split(' ')[0]} / {metadata.operator.split(' ')[0]}
                  </span>
                </div>
              </div>

              {/* Data Collection Interval & Duration Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 text-[11px] divide-x bg-slate-100/70">
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Início da Coleta de Dados</span>
                  <span className="font-semibold text-slate-800">{metadata.collectionStartDate || metadata.studyDate}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Término da Coleta de Dados</span>
                  <span className="font-semibold text-slate-800">{metadata.collectionEndDate || metadata.studyDate}</span>
                </div>
                <div className="p-1.5 px-2.5">
                  <span className="text-[9px] uppercase font-semibold text-slate-500 block">Duração Total da Coleta</span>
                  <span className="font-bold text-red-900">{metadata.collectionDuration || '1 dia'}</span>
                </div>
              </div>
            </div>

            {/* Inverted / Relative Tolerance Correction Alert (if triggered) */}
            {capability.wasInverted && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <strong>Correção de Limites Invertidos:</strong> Os limites informados foram normalizados automaticamente para LIE = {capability.effectiveLsl} e LSE = {capability.effectiveUsl}, garantindo cálculos estritamente positivos e corretos de Cp, Cpk, Pp e Ppk conforme o manual.
                </div>
              </div>
            )}

            {/* Integrated Graphics Section: 2 Control Charts + 1 Capability Histogram */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-800 pb-1 flex items-center justify-between">
                <span>1. Monitoramento Gráfico do Processo (Cartas Shewhart & Histograma de Capabilidade)</span>
                <span className="text-[10px] font-mono font-normal text-slate-500">
                  Carta: {config.chartType} | Nelson Rules 1-8
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart 1: Variable Control Chart */}
                <div className="border border-slate-200 rounded p-2 bg-white">
                  <div className="text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Carta de Valores ({config.chartType === 'I-MR' ? 'Individuais - I' : 'Médias - X̄'})</span>
                      <ChartGuideButton
                        type="xbar_individual"
                        specs={specs}
                        mean={limits.centerLine}
                        sigma={limits.sigmaWithin}
                        limits={{
                          cl: limits.centerLine,
                          ucl: limits.ucl,
                          lcl: limits.lcl,
                          sigma: limits.sigmaWithin
                        }}
                        violations={violations}
                        pointsCount={primaryPoints.length}
                        chartTitle={`Carta de Valores (${config.chartType === 'I-MR' ? 'Individuais - I' : 'Médias - X̄'})`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">
                      LC = {limits.centerLine.toFixed(3)} | LSC = {limits.ucl.toFixed(3)} | LIC = {limits.lcl.toFixed(3)}
                    </span>
                  </div>
                  <ControlChartPlot
                    title=""
                    points={primaryPoints}
                    limits={{
                      cl: limits.centerLine,
                      ucl: limits.ucl,
                      lcl: limits.lcl,
                      sigma: limits.sigmaWithin
                    }}
                    violations={violations}
                    height={210}
                    yLabel={specs.unit}
                    chartKind="xbar_individual"
                    specs={specs}
                  />
                </div>

                {/* Chart 2: Dispersion Chart */}
                <div className="border border-slate-200 rounded p-2 bg-white">
                  <div className="text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Carta de Amplitude ({config.chartType === 'I-MR' ? 'Móvel - MR' : 'Subgrupo - R'})</span>
                      <ChartGuideButton
                        type="range_dispersion"
                        specs={specs}
                        limits={{
                          cl: limits.subCenterLine ?? limits.sigmaWithin * 1.128,
                          ucl: limits.subUcl ?? limits.sigmaWithin * 3.686,
                          lcl: limits.subLcl ?? 0,
                          sigma: limits.sigmaWithin
                        }}
                        pointsCount={secondaryPoints.length}
                        chartTitle={`Carta de Amplitude (${config.chartType === 'I-MR' ? 'Móvel - MR' : 'Subgrupo - R'})`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">
                      R̄ = {capability.avgRange.toFixed(3)} | LSC = {limits.subUcl?.toFixed(3) ?? '—'}
                    </span>
                  </div>
                  <ControlChartPlot
                    title=""
                    points={secondaryPoints}
                    limits={{
                      cl: limits.subCenterLine ?? limits.sigmaWithin * 1.128,
                      ucl: limits.subUcl ?? limits.sigmaWithin * 3.686,
                      lcl: limits.subLcl ?? 0,
                      sigma: limits.sigmaWithin
                    }}
                    violations={[]}
                    height={210}
                    yLabel={specs.unit}
                    chartKind="range_dispersion"
                    specs={specs}
                  />
                </div>
              </div>

              {/* Chart 3: Capability Histogram with Specs */}
              <div className="border border-slate-200 rounded p-3 bg-white">
                <div className="text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Histograma de Frequências e Distribuição Normal ajustada aos Limites de Especificação</span>
                    <ChartGuideButton
                      type="capability_histogram"
                      specs={specs}
                      mean={mean}
                      sigma={capability.sigmaOverall}
                      lsl={effectiveLsl}
                      usl={effectiveUsl}
                      values={values}
                      capability={capability}
                      chartTitle="Histograma de Capabilidade"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">
                    LIE = {effectiveLsl ?? '—'} | Alvo = {effectiveTarget?.toFixed(2) ?? '—'} | LSE = {effectiveUsl ?? '—'} {specs.unit}
                  </span>
                </div>
                <CapabilityPlot
                  values={values}
                  specs={specs}
                  capability={capability}
                  targetCpk={targetCpk}
                  targetPpk={targetPpk}
                />
              </div>

              {/* Additional Industrial Quality Charts: Carta de Valores Brutos & Gráfico de Probabilidade Normal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded p-2 bg-white">
                  <RawValuesRunChartPlot
                    points={points}
                    specs={specs}
                    mean={mean}
                    sigma={capability.sigmaOverall}
                    lsl={effectiveLsl}
                    usl={effectiveUsl}
                    height={210}
                  />
                </div>
                <div className="border border-slate-200 rounded p-2 bg-white">
                  <NormalProbabilityPlot
                    values={values}
                    specs={specs}
                    mean={mean}
                    sigma={capability.sigmaOverall}
                    lsl={effectiveLsl}
                    usl={effectiveUsl}
                    height={210}
                  />
                </div>
              </div>
            </div>

            {/* Collected Measurements Sample Table */}
            {/* The user noted: ( a imagem mostra um sequencia de 1 a 20 nesse caso, não precisa estar mencionado esse sequencia nesse relatorio ) */}
            {/* We display a clean, organized tabular summary of the actual measurements collected, without hardcoding 1 to 20 */}
            <div className="space-y-1.5 page-break-inside-avoid">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-800 pb-0.5 flex items-center justify-between">
                <span>2. Registro de Medições Amostrais Coletadas</span>
                <span className="text-[10px] font-mono font-normal text-slate-500">
                  Total de {n} medições consecutivas do processo
                </span>
              </div>

              <div className="border border-slate-300 rounded overflow-hidden text-[10px]">
                <div className="bg-slate-100 p-2 font-mono text-slate-700 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-36 overflow-y-auto">
                  {points.map((p, idx) => {
                    const isOutOfSpec =
                      (effectiveLsl !== null && p.value < effectiveLsl) ||
                      (effectiveUsl !== null && p.value > effectiveUsl);
                    const dev = effectiveTarget !== null ? p.value - effectiveTarget : null;

                    return (
                      <div
                        key={p.id || idx}
                        className={`p-1 rounded border flex items-center justify-between ${
                          isOutOfSpec
                            ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="text-[9px] text-slate-400 font-sans">#{p.sample ?? idx + 1}</span>
                        <span className="font-bold">{p.value.toFixed(3)}</span>
                        {dev !== null && (
                          <span className={`text-[8px] ${dev > 0 ? 'text-amber-700' : 'text-blue-700'}`}>
                            {dev >= 0 ? `+${dev.toFixed(2)}` : dev.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500 border-t border-slate-200 flex items-center justify-between">
                  <span>Mín: <strong>{min.toFixed(3)}</strong> | Máx: <strong>{max.toFixed(3)}</strong> | Amplitude Total: <strong>{range.toFixed(3)} {specs.unit}</strong></span>
                  <span>Pontos Fora de Especificação: <strong className={points.some(p => (effectiveLsl !== null && p.value < effectiveLsl) || (effectiveUsl !== null && p.value > effectiveUsl)) ? 'text-red-700' : 'text-emerald-700'}>
                    {points.filter(p => (effectiveLsl !== null && p.value < effectiveLsl) || (effectiveUsl !== null && p.value > effectiveUsl)).length} de {n}
                  </strong></span>
                </div>
              </div>
            </div>

            {/* Official Statistical Results & Capability Indices Grid */}
            <div className="space-y-2 page-break-inside-avoid">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-800 pb-1 flex items-center justify-between">
                <span>3. Quadro Resumo de Parâmetros e Índices de Capabilidade</span>
                <span className="text-[10px] font-mono text-slate-600">
                  σ_within = Amplitude Média (R̄) ÷ d₂
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Column A: Process Parameters & Spread */}
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <tbody>
                    <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                      <td colSpan={2} className="p-1.5 px-2 text-[10px] uppercase tracking-wide">
                        Parâmetros Descritivos & Estimadores de Dispersão
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2 text-slate-600">Número de Medições (N)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-slate-900">{n} amostras</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-1.5 px-2 text-slate-600">Média Amostral (X̄)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-slate-900">{mean.toFixed(4)} {specs.unit}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2 text-slate-600">Mediana / Amplitude Total</td>
                      <td className="p-1.5 px-2 font-mono text-right text-slate-800">{median.toFixed(3)} / {range.toFixed(3)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-1.5 px-2 text-slate-600">Amplitude Média (R̄ ou MR̄)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-slate-900">{capability.avgRange.toFixed(4)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2 text-slate-600">Constante de Shewhart (d₂)</td>
                      <td className="p-1.5 px-2 font-mono text-right text-slate-800">{capability.d2.toFixed(4)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-blue-50/60 font-semibold text-blue-950">
                      <td className="p-1.5 px-2">Desvio Padrão Dentro (σ_within = R̄ ÷ d₂)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-blue-900">{capability.sigmaWithin.toFixed(4)}</td>
                    </tr>
                    <tr className="bg-slate-50/60 font-semibold text-slate-900">
                      <td className="p-1.5 px-2">Desvio Padrão Geral (s / σ_overall)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right">{capability.sigmaOverall.toFixed(4)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Column B: Capability & Performance Indices */}
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <tbody>
                    <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                      <td colSpan={3} className="p-1.5 px-2 text-[10px] uppercase tracking-wide">
                        Índices de Capabilidade (Curto Prazo) & Desempenho (Longo Prazo)
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2 text-slate-600 font-semibold">Cp (Capabilidade Potencial)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-slate-900">
                        {capability.cp !== null ? capability.cp.toFixed(3) : '—'}
                      </td>
                      <td className="p-1.5 px-2 text-[10px] text-right font-medium text-slate-500">Meta ≥ {benchmarkCpk.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-blue-50/70 font-bold text-blue-950">
                      <td className="p-1.5 px-2 flex items-center gap-1">
                        <span>Cpk (Capabilidade Efetiva Centrada)</span>
                      </td>
                      <td className="p-1.5 px-2 font-mono text-right text-base text-blue-900">
                        {capability.cpk !== null ? capability.cpk.toFixed(3) : '—'}
                      </td>
                      <td className="p-1.5 px-2 text-[10px] text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isCpkApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {isCpkApproved ? 'APROVADO' : 'INSUFICIENTE'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2 text-slate-600">Cpl (Inferior) / Cpu (Superior)</td>
                      <td className="p-1.5 px-2 font-mono text-right text-slate-800" colSpan={2}>
                        Cpl = {capability.cpl?.toFixed(3) ?? '—'} | Cpu = {capability.cpu?.toFixed(3) ?? '—'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2 text-slate-600 font-semibold">Pp (Desempenho Geral)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-slate-900">
                        {capability.pp !== null ? capability.pp.toFixed(3) : '—'}
                      </td>
                      <td className="p-1.5 px-2 text-[10px] text-right font-medium text-slate-500">Meta ≥ {benchmarkPpk.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <td className="p-1.5 px-2 text-slate-700 font-semibold">Ppk (Desempenho Geral Efetivo)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-slate-900">
                        {capability.ppk !== null ? capability.ppk.toFixed(3) : '—'}
                      </td>
                      <td className="p-1.5 px-2 text-[10px] text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isPpkApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {isPpkApproved ? 'ESTÁVEL' : 'OBSERVAR'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 px-2 text-slate-600">Cpm (Taguchi para o Alvo)</td>
                      <td className="p-1.5 px-2 font-mono text-right text-slate-800" colSpan={2}>
                        {capability.cpm !== null ? capability.cpm.toFixed(3) : '—'}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 text-[10px]">
                      <td className="p-1.5 px-2 text-slate-600">Defeituosos Esperados (PPM)</td>
                      <td className="p-1.5 px-2 font-mono font-bold text-right text-slate-900" colSpan={2}>
                        {capability.ppmTotalExpected.toLocaleString()} PPM (Obs: {capability.ppmObserved} PPM)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Conclusão Técnica e Parecer de Engenharia */}
            <div className="space-y-2 page-break-inside-avoid">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-800 pb-1">
                4. Conclusão & Laudo Técnico de Homologação
              </div>

              <div
                className={`p-3.5 rounded border-2 flex items-start gap-3 ${
                  reportStatus === 'APPROVED'
                    ? 'bg-emerald-50/80 border-emerald-600 text-emerald-950'
                    : reportStatus === 'CONDITIONALLY_APPROVED'
                    ? 'bg-amber-50/80 border-amber-600 text-amber-950'
                    : 'bg-red-50/80 border-red-600 text-red-950'
                }`}
              >
                <div className="mt-0.5">
                  {reportStatus === 'APPROVED' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {reportStatus === 'CONDITIONALLY_APPROVED' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                  {reportStatus === 'REJECTED' && <XCircle className="w-5 h-5 text-red-600" />}
                </div>

                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide uppercase">
                      {reportStatusText}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-white/80 border border-current">
                      Cpk = {capability.cpk?.toFixed(3) ?? '—'} (Meta ≥ {benchmarkCpk.toFixed(2)})
                    </span>
                  </div>
                  <p className="mt-1 text-slate-800 leading-relaxed font-sans">
                    {reportStatusDesc}
                  </p>
                  <div className="mt-2 text-[10px] text-slate-600 font-mono flex flex-wrap gap-4 pt-1 border-t border-slate-300">
                    <span>Estabilidade Shewhart: <strong>{isStable ? 'Sob Controle Estatístico (0 causas especiais)' : `${violations.length} Causas Especiais`}</strong></span>
                    <span>Capabilidade Potencial (Cp): <strong>{capability.cp?.toFixed(3) ?? '—'}</strong></span>
                    <span>PPM Esperado: <strong>{capability.ppmTotalExpected.toLocaleString()} PPM</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Simplified Shopfloor Operator Analysis & Action Guide (Requisito 2 do Usuário) */}
            <div className="page-break-inside-avoid space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-800 pb-1 flex items-center justify-between">
                <span>5. Análise Simplificada para o Operador de Chão de Fábrica</span>
                <span className="text-[10px] font-mono text-slate-500 font-medium">
                  Instrução Operacional Imediata — O que o operador precisa fazer
                </span>
              </div>

              <div className={`p-4 rounded-lg border-2 ${operatorColor} space-y-2.5 shadow-xs`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${operatorBadge}`}>
                      {operatorActionTitle}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-700">
                    Média Atual: <span className="underline">{mean.toFixed(3)} {specs.unit}</span> (Alvo: {effectiveTarget?.toFixed(3) ?? '—'})
                  </div>
                </div>

                <p className="text-xs leading-relaxed font-medium">
                  {operatorActionText}
                </p>

                <div className="bg-white/90 p-3 rounded border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                    Passo a Passo Obrigatório para o Operador:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    {operatorSteps.map((step, idx) => (
                      <li key={idx} className="font-sans leading-tight">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* 6. Análise Crítica de Causas Especiais e Planos de Ação (Ação Corretiva IATF / CAPA) */}
            <div className="page-break-inside-avoid space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-800 pb-1 flex items-center justify-between">
                <span>6. Análise Crítica do Processo & Disposição do Lote (Ação Corretiva)</span>
                <span className="text-[10px] font-mono text-slate-500 font-medium">
                  {criticalAnalysis ? `Status: ${criticalAnalysis.status} • Prazo: ${criticalAnalysis.deadline}` : 'Exigência para Cpk reprovado ou causas especiais'}
                </span>
              </div>

              {criticalAnalysis ? (
                <div className="p-3.5 rounded-lg border-2 border-slate-800 bg-slate-50/90 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-300 pb-1.5 gap-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                      <span>Gatilho / Desvio Identificado:</span>
                      <span className="font-mono text-red-900">{criticalAnalysis.triggeredBy}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-bold">
                        Prazo: {criticalAnalysis.deadline}
                      </span>
                      <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-bold">
                        {criticalAnalysis.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                        1. O que pode ter acontecido? (Investigação da Causa Raiz):
                      </div>
                      <p className="text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                        {criticalAnalysis.whatHappened || 'Não informado.'}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                        2. Quais serão os planos de ações? (Contenção / Correção / Prevenção):
                      </div>
                      <p className="text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                        {criticalAnalysis.actionPlans || 'Não informado.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block uppercase">Responsável pela Execução:</span>
                      <strong className="text-slate-900 font-sans">{criticalAnalysis.responsible}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase">Disposição Física do Lote:</span>
                      <strong className="text-slate-900 font-sans">{criticalAnalysis.lotDisposition}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase">Data de Registro:</span>
                      <strong className="text-slate-900">{criticalAnalysis.createdAt}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded border border-dashed border-slate-400 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-500" />
                    <span>Nenhuma análise crítica registrada para este estudo.</span>
                  </div>
                  {onOpenCriticalAnalysis && (
                    <button
                      type="button"
                      onClick={() => onOpenCriticalAnalysis()}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer print:hidden"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Abrir Análise Crítica</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 7. Formal Sign-off and Quality Approval Stamp */}
            <div className="page-break-inside-avoid pt-2 border-t-2 border-slate-900 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                7. Homologação & Assinaturas Formais
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10px] text-slate-700">
                <div className="border-t border-slate-400 pt-1.5">
                  <div className="font-bold text-slate-900">{metadata.operator}</div>
                  <div className="text-slate-500 text-[9px]">Responsáveis pelo Estudo (Operador)</div>
                  <div className="text-slate-400 text-[8px] mt-0.5">Assinatura: ___________________________</div>
                </div>

                <div className="border-t border-slate-400 pt-1.5">
                  <div className="font-bold text-slate-900">{metadata.engineer}</div>
                  <div className="text-slate-500 text-[9px]">Responsável pela Análise</div>
                  <div className="text-slate-400 text-[8px] mt-0.5">Assinatura: ___________________________</div>
                </div>

                <div className="border-t border-slate-400 pt-1.5">
                  <div className="font-bold text-slate-900">Gerência</div>
                  <div className="text-slate-500 text-[9px]">Aprovação Final de Homologação</div>
                  <div className="text-slate-400 text-[8px] mt-0.5">Carimbo / Visto: _____________________</div>
                </div>
              </div>

              <div className="text-[9px] text-center text-slate-400 font-mono pt-3">
                Relatório gerado em conformidade com o Manual AIAG CEP (4ª Edição) e AIAG & VDA (1ª Edição) • PTP - Controle Estatístico de Processo
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
