import React, { useState, useEffect, useMemo } from 'react';
import {
  ArchivedSpcReport,
  CapabilityResults,
  CepAnalysisConfig,
  CepDataPoint,
  ControlLimits,
  CriticalAnalysisData,
  ProcessSpecs,
  SpcReportMetadata
} from '../types';
import {
  getAllArchivedReports,
  saveReportToArchive,
  deleteArchivedReport,
  deleteMultipleReports,
  clearAllArchivedReports,
  resetToInitialFactoryReports,
  toggleFavoriteReport,
  getDatabaseStats,
  seedInitialReportsIfEmpty,
  exportArchiveToJson,
  importArchiveFromJson,
  MAX_ARCHIVE_CAPACITY
} from '../utils/spcReportDatabase';
import { exportSpcToExcel } from '../utils/spcExcelExporter';
import { computeControlLimits, computeProcessCapability, evaluateNelsonRules } from '../utils/spcStatistics';
import {
  X,
  Database,
  Search,
  Star,
  Trash2,
  ExternalLink,
  FileSpreadsheet,
  Printer,
  PlusCircle,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  SlidersHorizontal,
  FolderOpen,
  Calendar,
  Layers,
  ArrowUpDown,
  FileText,
  Loader2,
  CheckSquare,
  Square,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface ReportArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current active study in workspace to allow saving
  currentStudy: {
    metadata: SpcReportMetadata;
    specs: ProcessSpecs;
    config: CepAnalysisConfig;
    points: CepDataPoint[];
    capability: CapabilityResults;
    violationsCount: number;
    criticalAnalysis?: CriticalAnalysisData | null;
  };
  onLoadReport: (report: ArchivedSpcReport) => void;
  onOpenReportModalWithReport?: (report: ArchivedSpcReport) => void;
  onOpenPrintPreviewWithReport?: (report: ArchivedSpcReport) => void;
  onDatabaseChange?: (totalCount: number) => void;
}

export const ReportArchiveModal: React.FC<ReportArchiveModalProps> = ({
  isOpen,
  onClose,
  currentStudy,
  onLoadReport,
  onOpenReportModalWithReport,
  onOpenPrintPreviewWithReport,
  onDatabaseChange
}) => {
  const [reports, setReports] = useState<ArchivedSpcReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'REJECTED' | 'FAVORITES'>('ALL');
  const [standardFilter, setStandardFilter] = useState<'ALL' | 'AIAG_SPC_4TH' | 'AIAG_VDA_1ST'>('ALL');
  const [chartTypeFilter, setChartTypeFilter] = useState<'ALL' | 'I-MR' | 'Xbar-R'>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'cpk_desc' | 'cpk_asc' | 'title_asc'>('date_desc');
  
  // Feedback messages
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  // Deletion states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);

  // Detailed consultation drawer for a selected report
  const [inspectedReport, setInspectedReport] = useState<ArchivedSpcReport | null>(null);

  // Load reports from IndexedDB / Storage
  const refreshReports = async () => {
    setLoading(true);
    try {
      let data = await getAllArchivedReports();
      if (data.length === 0) {
        data = await seedInitialReportsIfEmpty();
      }
      setReports(data);
      if (onDatabaseChange) {
        onDatabaseChange(data.length);
      }
    } catch (err) {
      console.error('Erro ao carregar relatórios do banco:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshReports();
      setSelectedIds(new Set());
      setDeleteConfirmId(null);
    }
  }, [isOpen]);

  // Save Current Study into Archive
  const handleSaveCurrentStudy = async () => {
    try {
      const benchmarkCpk = currentStudy.config.featureClassification === 'critical' ? 1.67 : 1.33;
      const isCpkOk = (currentStudy.capability.cpk ?? 0) >= benchmarkCpk;
      const isStable = currentStudy.violationsCount === 0;
      const status: 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'REJECTED' =
        !isCpkOk && !isStable ? 'REJECTED' : !isCpkOk ? 'REJECTED' : !isStable ? 'CONDITIONALLY_APPROVED' : 'APPROVED';

      const res = await saveReportToArchive({
        metadata: currentStudy.metadata,
        specs: currentStudy.specs,
        config: currentStudy.config,
        points: currentStudy.points,
        summary: {
          n: currentStudy.points.length,
          mean: currentStudy.capability.mean,
          cpk: currentStudy.capability.cpk,
          ppk: currentStudy.capability.ppk,
          status,
          violationsCount: currentStudy.violationsCount,
          metricUnit: currentStudy.specs.unit
        },
        criticalAnalysis: currentStudy.criticalAnalysis,
        notes: currentStudy.metadata.notes
      });

      setSaveSuccessMsg(`Estudo arquivado com sucesso no banco de dados! (ID: ${res.report.id})`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      await refreshReports();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar relatório no banco.');
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavoriteReport(id);
    await refreshReports();
  };

  // Single Delete
  const handleDeleteSingle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await deleteArchivedReport(id);
    setDeleteConfirmId(null);
    if (inspectedReport?.id === id) {
      setInspectedReport(null);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSaveSuccessMsg('Relatório excluído do banco de dados com sucesso.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    await refreshReports();
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteMultipleReports(ids);
    setSelectedIds(new Set());
    setIsBatchDeleteConfirmOpen(false);
    if (inspectedReport && ids.includes(inspectedReport.id)) {
      setInspectedReport(null);
    }
    setSaveSuccessMsg(`${ids.length} relatório(s) excluído(s) do banco de dados com sucesso.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    await refreshReports();
  };

  // Wipe All Database
  const handleWipeDatabase = async () => {
    await clearAllArchivedReports();
    setIsWipeConfirmOpen(false);
    setSelectedIds(new Set());
    setInspectedReport(null);
    setSaveSuccessMsg('Todos os relatórios do banco foram excluídos.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    await refreshReports();
  };

  // Reset to Factory Samples
  const handleResetToFactorySamples = async () => {
    await resetToInitialFactoryReports();
    setIsWipeConfirmOpen(false);
    setSelectedIds(new Set());
    setInspectedReport(null);
    setSaveSuccessMsg('Banco de dados restaurado com os estudos de referência industriais de fábrica.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    await refreshReports();
  };

  // Multi-select toggle
  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible
  const handleSelectAllVisible = () => {
    if (selectedIds.size === filteredReports.length && filteredReports.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map((r) => r.id)));
    }
  };

  // Direct Excel Export for an archived report
  const handleExportExcelForReport = async (rep: ArchivedSpcReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExportingReportId(rep.id);
    try {
      const { limits, primaryPoints, secondaryPoints } = computeControlLimits(
        rep.points,
        rep.config.chartType,
        rep.config.subgroupSize
      );
      const violations = evaluateNelsonRules(primaryPoints, limits.centerLine, limits.sigmaWithin, {
        1: rep.config.rule1,
        2: rep.config.rule2,
        3: rep.config.rule3,
        4: rep.config.rule4,
        5: rep.config.rule5,
        6: rep.config.rule6,
        7: rep.config.rule7,
        8: rep.config.rule8
      });
      const capability = computeProcessCapability(
        rep.points.map((p) => p.value),
        rep.specs,
        limits.sigmaWithin,
        limits.sigmaOverall,
        limits.avgRange ?? 0,
        limits.d2 ?? 1.128
      );

      await exportSpcToExcel({
        config: rep.config,
        specs: rep.specs,
        points: rep.points,
        limits,
        primaryPoints,
        secondaryPoints,
        violations,
        capability,
        metadata: rep.metadata,
        criticalAnalysis: rep.criticalAnalysis
      });
    } catch (err) {
      console.error('Erro ao gerar Excel para o relatório arquivado:', err);
    } finally {
      setExportingReportId(null);
    }
  };

  // Backup Export
  const handleExportBackup = async () => {
    const jsonStr = await exportArchiveToJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_banco_relatorios_cep_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Backup Import
  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (re: any) => {
        try {
          const count = await importArchiveFromJson(re.target.result);
          setSaveSuccessMsg(`${count} relatório(s) importado(s) e gravado(s) no banco de dados!`);
          setTimeout(() => setSaveSuccessMsg(null), 4000);
          await refreshReports();
        } catch (err: any) {
          alert('Erro ao importar backup: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Filter & Search Logic
  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Status filter
    if (statusFilter === 'FAVORITES') {
      result = result.filter((r) => r.isFavorite);
    } else if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.summary.status === statusFilter);
    }

    // Standard filter
    if (standardFilter !== 'ALL') {
      result = result.filter((r) => r.config.manualStandard === standardFilter);
    }

    // Chart type filter
    if (chartTypeFilter !== 'ALL') {
      result = result.filter((r) => r.config.chartType === chartTypeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.metadata.partNumber?.toLowerCase().includes(q) ||
          r.metadata.partName?.toLowerCase().includes(q) ||
          r.metadata.companyName?.toLowerCase().includes(q) ||
          r.metadata.machine?.toLowerCase().includes(q) ||
          r.metadata.operator?.toLowerCase().includes(q) ||
          r.metadata.engineer?.toLowerCase().includes(q) ||
          r.metadata.lotNumber?.toLowerCase().includes(q) ||
          r.metadata.notes?.toLowerCase().includes(q) ||
          r.specs.metricName?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
      }
      if (sortBy === 'cpk_desc') {
        return (b.summary.cpk ?? -1) - (a.summary.cpk ?? -1);
      }
      if (sortBy === 'cpk_asc') {
        return (a.summary.cpk ?? 999) - (b.summary.cpk ?? 999);
      }
      if (sortBy === 'title_asc') {
        return (a.metadata.partName || a.title).localeCompare(b.metadata.partName || b.title);
      }
      return 0;
    });

    return result;
  }, [reports, statusFilter, standardFilter, chartTypeFilter, searchQuery, sortBy]);

  const totalCount = reports.length;
  const percentUsed = Math.min(100, Math.round((totalCount / MAX_ARCHIVE_CAPACITY) * 100));
  const approvedCount = reports.filter((r) => r.summary.status === 'APPROVED').length;
  const alertCount = reports.filter((r) => r.summary.status === 'CONDITIONALLY_APPROVED').length;
  const rejectedCount = reports.filter((r) => r.summary.status === 'REJECTED').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base tracking-wide text-white">
                  Banco de Dados de Relatórios & Histórico CEP
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {totalCount} de {MAX_ARCHIVE_CAPACITY} relatórios
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consulte, pesquise, recarregue para o painel, visualize laudos A4 ou exclua relatórios elaborados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCurrentStudy}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Salvar e arquivar o estudo atual do painel de trabalho no banco de dados"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Salvar Estudo Atual</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar Banco de Dados"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Stats & Quick Action Bar */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Storage Progress */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Capacidade:</span>
              <div className="w-28 sm:w-36 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-300 ${
                    percentUsed > 85 ? 'bg-red-500' : percentUsed > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
              <span className="font-mono text-slate-300 text-[11px] font-bold">
                {percentUsed}% ocupado
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono border-l border-slate-800 pl-3">
              <span className="text-emerald-400">● {approvedCount} Aprovados</span>
              <span className="text-amber-400">● {alertCount} Alertas</span>
              <span className="text-red-400">● {rejectedCount} Reprovados</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={handleExportBackup}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="Baixar backup de todos os relatórios em arquivo JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Exportar JSON</span>
            </button>
            <button
              onClick={handleImportBackup}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="Restaurar relatórios de um arquivo JSON de backup"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Importar JSON</span>
            </button>
            <button
              onClick={() => setIsWipeConfirmOpen(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-300 rounded flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="Opções de limpeza total ou restauração dos exemplos industriais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Gerenciar Banco</span>
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 px-5 py-2 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Consultation Filters & Search Toolbar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search box */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por Código, Peça, Máquina, Operador, Lote ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({reports.length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'APPROVED' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Aprovados ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('CONDITIONALLY_APPROVED')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'CONDITIONALLY_APPROVED'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Em Alerta ({alertCount})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'REJECTED' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reprovados ({rejectedCount})
            </button>
            <button
              onClick={() => setStatusFilter('FAVORITES')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === 'FAVORITES' ? 'bg-yellow-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Favoritos</span>
            </button>
          </div>

          {/* Dropdown Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Norma */}
            <select
              value={standardFilter}
              onChange={(e) => setStandardFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-slate-300 text-xs focus:outline-hidden"
              title="Filtrar por Norma de Cálculo"
            >
              <option value="ALL">Normas: Todas</option>
              <option value="AIAG_SPC_4TH">AIAG 4ª Edição</option>
              <option value="AIAG_VDA_1ST">AIAG & VDA 1ª Ed.</option>
            </select>

            {/* Carta */}
            <select
              value={chartTypeFilter}
              onChange={(e) => setChartTypeFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-slate-300 text-xs focus:outline-hidden"
              title="Filtrar por Tipo de Carta"
            >
              <option value="ALL">Cartas: Todas</option>
              <option value="I-MR">I-MR (Individuais)</option>
              <option value="Xbar-R">X̄-R (Subgrupos)</option>
            </select>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-md px-2 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-200 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="date_desc" className="bg-slate-900 text-white">Mais Recentes</option>
                <option value="date_asc" className="bg-slate-900 text-white">Mais Antigos</option>
                <option value="cpk_desc" className="bg-slate-900 text-white">Maior Cpk</option>
                <option value="cpk_asc" className="bg-slate-900 text-white">Menor Cpk</option>
                <option value="title_asc" className="bg-slate-900 text-white">Ordem Alfabética</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batch Selection Action Bar (appears when items are selected) */}
        {selectedIds.size > 0 && (
          <div className="px-5 py-2 bg-blue-950/80 border-b border-blue-800 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-200">
                {selectedIds.size} relatório(s) selecionado(s) de {filteredReports.length} visíveis
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-blue-400 hover:text-white underline text-[11px] ml-2 cursor-pointer"
              >
                Desmarcar todos
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBatchDeleteConfirmOpen(true)}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Selecionados ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Multi-Select Header Bar */}
        <div className="px-5 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllVisible}
              className="flex items-center gap-1.5 hover:text-slate-200 cursor-pointer"
              title="Selecionar ou desmarcar todos os relatórios filtrados"
            >
              {selectedIds.size === filteredReports.length && filteredReports.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>Selecionar Todos ({filteredReports.length})</span>
            </button>
          </div>
          <div className="text-slate-500">
            Clique no relatório para consultar dados completos ou utilize os botões de ação à direita.
          </div>
        </div>

        {/* Reports List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/60">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs">Consultando banco de dados de relatórios...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl p-8 space-y-3 bg-slate-950/40">
              <FolderOpen className="w-12 h-12 mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-slate-200">Nenhum relatório encontrado no banco</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'ALL' || standardFilter !== 'ALL' || chartTypeFilter !== 'ALL'
                  ? 'Nenhum relatório corresponde aos critérios de pesquisa ou filtros aplicados. Tente limpar os filtros.'
                  : 'Nenhum relatório foi cadastrado ou gerado ainda. Clique em "Salvar Estudo Atual" para gravar sua primeira carta no banco.'}
              </p>
              {(searchQuery || statusFilter !== 'ALL' || standardFilter !== 'ALL' || chartTypeFilter !== 'ALL') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setStandardFilter('ALL');
                    setChartTypeFilter('ALL');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-md transition-colors cursor-pointer"
                >
                  Limpar Todos os Filtros
                </button>
              ) : (
                <button
                  onClick={handleResetToFactorySamples}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white rounded-md transition-colors cursor-pointer font-bold inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Carregar Exemplos de Fábrica
                </button>
              )}
            </div>
          ) : (
            filteredReports.map((rep) => {
              const status = rep.summary.status;
              const isApproved = status === 'APPROVED';
              const isConditional = status === 'CONDITIONALLY_APPROVED';
              const isSelected = selectedIds.has(rep.id);
              const isInspecting = inspectedReport?.id === rep.id;

              return (
                <div
                  key={rep.id}
                  onClick={() => setInspectedReport(isInspecting ? null : rep)}
                  className={`bg-slate-950 border rounded-xl p-4 transition-all cursor-pointer relative ${
                    isInspecting
                      ? 'border-blue-500 ring-1 ring-blue-500/50 shadow-xl'
                      : isSelected
                      ? 'border-blue-700/80 bg-blue-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Top Row */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => toggleSelectId(rep.id, e)}
                        className="mt-1 text-slate-500 hover:text-white cursor-pointer"
                        title={isSelected ? 'Desmarcar' : 'Selecionar'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-blue-400 tracking-wide">
                            {rep.metadata.partNumber || 'S/N'}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="font-bold text-sm text-slate-100 hover:text-blue-300">
                            {rep.metadata.partName || rep.title}
                          </span>
                          <button
                            onClick={(e) => handleToggleFavorite(rep.id, e)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              rep.isFavorite ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'
                            }`}
                            title={rep.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                          >
                            <Star className={`w-4 h-4 ${rep.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 sm:gap-3">
                          <span>
                            Operação: <strong className="text-slate-300">{rep.metadata.operation || 'Geral'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Máquina: <strong className="text-slate-300">{rep.metadata.machine || '—'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Cota: <strong className="text-teal-400">{rep.specs.metricName}</strong> ({rep.specs.unit})
                          </span>
                          <span>•</span>
                          <span>
                            Lote: <strong className="text-slate-300">{rep.metadata.lotNumber || '—'}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {rep.metadata.studyDate || new Date(rep.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                          isApproved
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isConditional
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {isConditional && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        {!isApproved && !isConditional && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        <span>
                          {isApproved ? 'Capaz & Aprovado' : isConditional ? 'Com Alerta' : 'Incapaz / Reprovado'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* KPIs Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 font-mono my-2.5">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Índice Cpk:</span>
                      <span
                        className={`text-sm font-bold ${
                          (rep.summary.cpk ?? 0) >= 1.33 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {rep.summary.cpk?.toFixed(3) ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Índice Ppk:</span>
                      <span className="text-sm font-bold text-slate-200">
                        {rep.summary.ppk?.toFixed(3) ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Média (X̄):</span>
                      <span className="text-slate-200 font-bold">
                        {rep.summary.mean?.toFixed(3) ?? '—'} {rep.specs.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Amostras (N):</span>
                      <span className="text-slate-300">{rep.summary.n} medições</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Causas Especiais:</span>
                      <span
                        className={`font-bold ${
                          rep.summary.violationsCount > 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {rep.summary.violationsCount > 0 ? `${rep.summary.violationsCount} detectadas` : '0 (Processo Estável)'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Consultation Inspection View */}
                  {isInspecting && (
                    <div className="mt-3 p-3.5 bg-slate-900 border border-blue-900/60 rounded-xl space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                          <Info className="w-4 h-4" />
                          <span>Ficha de Consulta Detalhada do Estudo ({rep.id})</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Norma: {rep.config.manualStandard === 'AIAG_VDA_1ST' ? 'Harmonizado AIAG & VDA (1ª Ed.)' : 'AIAG SPC (4ª Edição)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* Column 1: Limits & Specs */}
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-slate-300">
                          <span className="font-bold text-slate-200 block text-[11px] uppercase border-b border-slate-800 pb-1">
                            Especificações Técnicas
                          </span>
                          <div className="flex justify-between">
                            <span className="text-slate-400">LIE (Inferior):</span>
                            <span className="font-mono text-slate-200">{rep.specs.lsl ?? '—'} {rep.specs.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Alvo (Target):</span>
                            <span className="font-mono text-teal-300">{rep.specs.target ?? '—'} {rep.specs.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">LSE (Superior):</span>
                            <span className="font-mono text-slate-200">{rep.specs.usl ?? '—'} {rep.specs.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Critério Crítico:</span>
                            <span className="font-semibold text-slate-200">
                              {rep.config.featureClassification === 'critical' ? 'Segurança (Cpk ≥ 1.67)' : 'Padrão (Cpk ≥ 1.33)'}
                            </span>
                          </div>
                        </div>

                        {/* Column 2: Rastreability */}
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-slate-300">
                          <span className="font-bold text-slate-200 block text-[11px] uppercase border-b border-slate-800 pb-1">
                            Rastreabilidade & Meios
                          </span>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Empresa:</span>
                            <span className="truncate max-w-[150px]">{rep.metadata.companyName || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Instrumento:</span>
                            <span className="truncate max-w-[150px]">{rep.metadata.gauge || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Operador:</span>
                            <span className="truncate max-w-[150px]">{rep.metadata.operator || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Engenheiro:</span>
                            <span className="truncate max-w-[150px]">{rep.metadata.engineer || '—'}</span>
                          </div>
                        </div>

                        {/* Column 3: Status & CAPA */}
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-slate-300">
                          <span className="font-bold text-slate-200 block text-[11px] uppercase border-b border-slate-800 pb-1">
                            Análise Crítica & CAPA
                          </span>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Registro CAPA:</span>
                            <span className={rep.criticalAnalysis ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                              {rep.criticalAnalysis ? 'Elaborado & Salvo' : 'Não cadastrado'}
                            </span>
                          </div>
                          {rep.criticalAnalysis && (
                            <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 italic">
                              "{rep.criticalAnalysis.whatHappened || rep.criticalAnalysis.actionPlans}"
                            </div>
                          )}
                          {rep.notes && (
                            <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                              Obs: {rep.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div className="text-[11px] text-slate-500 font-mono">
                      ID: <span className="text-slate-400">{rep.id}</span> • Carta: {rep.config.chartType}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Toggle Quick Inspection */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedReport(isInspecting ? null : rep);
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                        title="Ver ficha de consulta técnica completa deste estudo"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isInspecting ? 'Ocultar Ficha' : 'Consultar'}</span>
                      </button>

                      {/* Load into Workspace */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadReport(rep);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title="Carregar este estudo no painel principal para continuar a análise"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Carregar no Painel</span>
                      </button>

                      {/* View Industrial Report */}
                      {onOpenReportModalWithReport && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReportModalWithReport(rep);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Abrir o laudo técnico industrial oficial para este relatório"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Laudo A4</span>
                        </button>
                      )}

                      {/* Print Preview */}
                      {onOpenPrintPreviewWithReport && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPrintPreviewWithReport(rep);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                          title="Visualizar e Imprimir folha A4 deste relatório"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Imprimir / PDF</span>
                        </button>
                      )}

                      {/* Export Full Excel */}
                      <button
                        onClick={(e) => handleExportExcelForReport(rep, e)}
                        disabled={exportingReportId === rep.id}
                        className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Exportar planilha consolidada (.xlsx) com gráficos para este relatório"
                      >
                        {exportingReportId === rep.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Excel</span>
                      </button>

                      {/* Delete */}
                      {deleteConfirmId === rep.id ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 bg-red-950 p-0.5 rounded border border-red-800 animate-in fade-in"
                        >
                          <button
                            onClick={(e) => handleDeleteSingle(rep.id, e)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold cursor-pointer"
                          >
                            Confirmar Exclusão
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 text-slate-400 hover:text-white text-[11px] cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(rep.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Excluir este relatório do banco de dados"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Confirm Batch Delete */}
        {isBatchDeleteConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-red-800 w-full max-w-md rounded-xl p-5 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="font-bold text-base">Excluir Relatórios Selecionados</h4>
              </div>
              <p className="text-xs text-slate-300">
                Você tem certeza que deseja excluir permanentemente <strong>{selectedIds.size}</strong> relatório(s) selecionado(s) do banco de dados?
                Esta operação não poderá ser desfeita.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsBatchDeleteConfirmOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Confirmar e Excluir ({selectedIds.size})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Manage / Wipe Database */}
        {isWipeConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl p-5 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  <h4 className="font-bold text-sm">Gerenciamento do Banco de Relatórios</h4>
                </div>
                <button
                  onClick={() => setIsWipeConfirmOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <p>
                  Escolha uma das ações abaixo para manutenção dos relatórios gravados localmente no navegador:
                </p>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-slate-100 block">Restaurar Exemplos de Fábrica</strong>
                    <span className="text-[11px] text-slate-400">
                      Restaura os 3 estudos industriais padrão (Polímeros, Injeção 8 Cavidades, Impacto Izod).
                    </span>
                  </div>
                  <button
                    onClick={handleResetToFactorySamples}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Restaurar
                  </button>
                </div>

                <div className="p-3 bg-red-950/40 rounded-lg border border-red-900/60 flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-red-300 block">Excluir Todos os Relatórios (Limpar Banco)</strong>
                    <span className="text-[11px] text-red-400">
                      Remove todos os {totalCount} relatórios e esvazia completamente a base de dados.
                    </span>
                  </div>
                  <button
                    onClick={handleWipeDatabase}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Limpar Tudo
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsWipeConfirmOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
