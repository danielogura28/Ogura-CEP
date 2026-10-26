import React, { useState, useMemo, useEffect } from 'react';
import {
  ArchivedSpcReport,
  CepAnalysisConfig,
  CepDataPoint,
  CriticalAnalysisData,
  FeatureClassification,
  ProcessSpecs,
  SpcManualStandard,
  SpcReportMetadata
} from './types';
import { SPC_DATASETS } from './utils/spcDatasets';
import {
  computeControlLimits,
  evaluateNelsonRules,
  computeProcessCapability,
  computeSerialCorrelation,
  computeCavitySpatialAnalysis
} from './utils/spcStatistics';
import { SpcHeader } from './components/SpcHeader';
import { SpcSidebar } from './components/SpcSidebar';
import { SpcOutputCanvas } from './components/SpcOutputCanvas';
import { SpcDataEditorModal } from './components/SpcDataEditorModal';
import { IndustrialSpcReportModal } from './components/IndustrialSpcReportModal';
import { NewChartSetupModal } from './components/NewChartSetupModal';
import { CriticalAnalysisModal } from './components/CriticalAnalysisModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { ReportArchiveModal } from './components/ReportArchiveModal';
import { CapabilityTargetsModal } from './components/CapabilityTargetsModal';
import { exportSpcToExcel } from './utils/spcExcelExporter';
import { getAllArchivedReports, seedInitialReportsIfEmpty } from './utils/spcReportDatabase';
import { getAllCapabilityTargets, resolveCapabilityTargets } from './utils/spcTargets';

const DEFAULT_CONFIG: CepAnalysisConfig = {
  chartType: 'I-MR',
  subgroupSize: 1,

  // Normative Standards
  manualStandard: 'AIAG_SPC_4TH',
  featureClassification: 'standard',

  // All 8 Nelson / Western Electric Rules
  rule1: true,
  rule2: true,
  rule3: true,
  rule4: true,
  rule5: true,
  rule6: true,
  rule7: false,
  rule8: false,

  // Sections
  showDescriptivesTable: true,
  showControlChart: true,
  showCapabilityAnalysis: true,
  showNelsonRulesTable: true,
  showSerialCorrelation: true,
  showSpatialCavityAnalysis: true,
  showInterpretation: true,
  showOperatorGuide: true, // Guia simplificado para chão de fábrica

  // Plots
  plotControlChart: true,
  plotSubControlChart: true,
  plotCapabilityHistogram: true,
  plotACF: true,
  plotSpatialCavityMap: true,
  plotNormalProbPlot: true
};

export default function App() {
  const [currentDatasetId, setCurrentDatasetId] = useState<string>('mfi-polimeros');
  const [points, setPoints] = useState<CepDataPoint[]>(SPC_DATASETS[0].data);
  const [specs, setSpecs] = useState<ProcessSpecs>(SPC_DATASETS[0].specs);
  const [config, setConfig] = useState<CepAnalysisConfig>(DEFAULT_CONFIG);
  const [isDataEditorOpen, setIsDataEditorOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isNewChartModalOpen, setIsNewChartModalOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveCount, setArchiveCount] = useState<number>(0);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);

  // Análise Crítica e Planos de Ação (Ação Corretiva IATF / CAPA)
  const [criticalAnalysis, setCriticalAnalysis] = useState<CriticalAnalysisData | null>(null);
  const [isCriticalAnalysisOpen, setIsCriticalAnalysisOpen] = useState(false);
  const [criticalAnalysisTrigger, setCriticalAnalysisTrigger] = useState<string | undefined>(undefined);

  // Inicializar e sincronizar contador do banco de dados de relatórios
  useEffect(() => {
    getAllArchivedReports().then((items) => {
      if (items.length === 0) {
        seedInitialReportsIfEmpty().then((seeded) => setArchiveCount(seeded.length));
      } else {
        setArchiveCount(items.length);
      }
    });
  }, []);

  const handleRefreshArchiveCount = () => {
    getAllArchivedReports().then((items) => setArchiveCount(items.length));
  };

  // Carregar um relatório salvo do banco diretamente para o espaço de trabalho
  const handleLoadReport = (rep: ArchivedSpcReport) => {
    setPoints(rep.points);
    setSpecs(rep.specs);
    setConfig(rep.config);
    setMetadata(rep.metadata);
    setCriticalAnalysis(rep.criticalAnalysis || null);
    setCurrentDatasetId('custom');
  };

  const handleOpenReportModalWithReport = (rep: ArchivedSpcReport) => {
    handleLoadReport(rep);
    setIsReportOpen(true);
  };

  const handleOpenPrintPreviewWithReport = (rep: ArchivedSpcReport) => {
    handleLoadReport(rep);
    setIsPrintPreviewOpen(true);
  };

  // Função centralizada para exportação da planilha Excel consolidada completa
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
      console.error('Erro ao gerar relatório Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Metadata para identificação industrial, rastreabilidade e laudo oficial
  const [metadata, setMetadata] = useState<SpcReportMetadata>({
    companyName: 'Petropol Polímeros & Compostos Industriais',
    partName: 'Composto Termoplástico de Engenharia',
    partNumber: 'PP-COMPOUND-40GF',
    operation: 'OP-10 Extrusão e Composição Reativa',
    machine: 'Extrusora Dupla-Rosca Coperion ZSK-58',
    gauge: 'Plastômetro Melt Flow Tester ASTM D1238',
    studyDate: new Date().toLocaleDateString('pt-BR'),
    collectionStartDate: new Date(Date.now() - 3 * 86400000).toLocaleDateString('pt-BR'),
    collectionEndDate: new Date().toLocaleDateString('pt-BR'),
    collectionDuration: '4 dias (coleta seriada contínua)',
    operator: 'Daniel Ogura (Resp. Métrologia & Qualidade)',
    engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
    department: 'Laboratório de Controle de Qualidade (CQ)',
    lotNumber: 'LOTE-2026-B08',
    notes: 'Estudo de Capabilidade de Processo Inicial para Homologação de Parâmetro Crítico.'
  });

  // 1. Compute Control Limits (Shewhart)
  const { limits, primaryPoints, secondaryPoints } = useMemo(() => {
    return computeControlLimits(points, config.chartType, config.subgroupSize);
  }, [points, config.chartType, config.subgroupSize]);

  // 2. Evaluate Nelson / Western Electric Rules
  const activeNelsonRules = useMemo(() => {
    return {
      1: config.rule1,
      2: config.rule2,
      3: config.rule3,
      4: config.rule4,
      5: config.rule5,
      6: config.rule6,
      7: config.rule7,
      8: config.rule8
    };
  }, [config]);

  const violations = useMemo(() => {
    return evaluateNelsonRules(
      primaryPoints,
      limits.centerLine,
      limits.sigmaWithin,
      activeNelsonRules
    );
  }, [primaryPoints, limits.centerLine, limits.sigmaWithin, activeNelsonRules]);

  // 3. Compute Process Capability (Cp, Cpk, Pp, Ppk, Cpm)
  const capability = useMemo(() => {
    const rawValues = points.map((p) => p.value);
    return computeProcessCapability(
      rawValues,
      specs,
      limits.sigmaWithin,
      limits.sigmaOverall,
      limits.avgRange ?? 0,
      limits.d2 ?? 1.128
    );
  }, [points, specs, limits.sigmaWithin, limits.sigmaOverall, limits.avgRange, limits.d2]);

  // 4. Compute Serial Autocorrelation (ACF) & Durbin-Watson
  const serialAutocorr = useMemo(() => {
    const rawValues = points.map((p) => p.value);
    return computeSerialCorrelation(rawValues, 10);
  }, [points]);

  // 5. Compute Spatial Cavity / Tooling Correlation (Moran's I on mold cavities)
  const spatialCavity = useMemo(() => {
    return computeCavitySpatialAnalysis(points);
  }, [points]);

  // Dataset switcher
  const handleSelectDataset = (id: string) => {
    if (id === 'custom') {
      setCurrentDatasetId('custom');
      setIsDataEditorOpen(true);
      return;
    }

    const found = SPC_DATASETS.find((ds) => ds.id === id);
    if (found) {
      setCurrentDatasetId(id);
      setPoints(found.data);
      setSpecs(found.specs);
      setConfig((prev) => ({
        ...prev,
        chartType: found.subgroupSize > 1 ? 'Xbar-R' : 'I-MR',
        subgroupSize: found.subgroupSize
      }));

      // Atualizar dados de identificação específicos de cada estudo pré-cadastrado
      if (id === 'mfi-polimeros') {
        setMetadata({
          companyName: 'Petropol Polímeros & Compostos Industriais',
          partName: 'Composto Termoplástico de Engenharia',
          partNumber: 'PP-COMPOUND-40GF',
          operation: 'OP-10 Extrusão e Composição Reativa',
          machine: 'Extrusora Dupla-Rosca Coperion ZSK-58',
          gauge: 'Plastômetro Melt Flow Tester ASTM D1238',
          studyDate: new Date().toLocaleDateString('pt-BR'),
          operator: 'Daniel Ogura (Resp. Métrologia & Qualidade)',
          engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
          department: 'Laboratório de Controle de Qualidade (CQ)',
          lotNumber: 'LOTE-2026-B08',
          notes: 'Estudo de Capabilidade de Processo para Homologação de Lote.'
        });
      } else if (id === 'injecao-cavidades') {
        setMetadata({
          companyName: 'Petropol Indústria de Transformação Plástica',
          partName: 'Bucha Guia Cilíndrica de Precisão 25mm',
          partNumber: 'BUCHA-INJ-25MM-C8',
          operation: 'OP-20 Injeção em Molde de 8 Cavidades',
          machine: 'Injetora Engel 150T (Posto #04)',
          gauge: 'Micrômetro Digital Mitutoyo 0.001mm',
          studyDate: new Date().toLocaleDateString('pt-BR'),
          operator: 'Carlos E. Mendes (Operador Turno A)',
          engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
          department: 'Garantia da Qualidade & Metrologia',
          lotNumber: 'LOTE-MOLDE-08C',
          notes: 'Estudo com Correlação Espacial entre Cavidades de Injeção.'
        });
      } else if (id === 'resistencia-impacto') {
        setMetadata({
          companyName: 'Petropol Laboratório de Caracterização Mecânica',
          partName: 'Corpo de Prova Normalizado para Impacto Izod',
          partNumber: 'CP-IZOD-ASTM-D256',
          operation: 'OP-30 Ensaio Físico-Mecânico de P&D',
          machine: 'Pêndulo de Impacto Digital Ceast 25J',
          gauge: 'Pêndulo Instrumentado com Entalhador Micrométrico',
          studyDate: new Date().toLocaleDateString('pt-BR'),
          operator: 'Marcos Vinicius (Técnico de Laboratório)',
          engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
          department: 'P&D e Desenvolvimento de Aplicações',
          lotNumber: 'LOTE-PILOTO-IZOD',
          notes: 'Estudo de Capabilidade com Subgrupos Racionais (n=5).'
        });
      }
    }
  };

  // Reset to default
  const handleReset = () => {
    const initial = SPC_DATASETS[0];
    setCurrentDatasetId(initial.id);
    setPoints(initial.data);
    setSpecs(initial.specs);
    setConfig(DEFAULT_CONFIG);
  };

  const handleSaveDataFromEditor = (newData: CepDataPoint[], newSpecs: ProcessSpecs) => {
    setPoints(newData);
    setSpecs(newSpecs);
    setCurrentDatasetId('custom');
  };

  const handleCreateNewChart = (result: {
    metadata: SpcReportMetadata;
    specs: ProcessSpecs;
    config: Partial<CepAnalysisConfig>;
    points: CepDataPoint[];
  }) => {
    setMetadata(result.metadata);
    setSpecs(result.specs);
    setConfig((prev) => ({ ...prev, ...result.config }));
    setPoints(result.points);
    setCriticalAnalysis(null);
    setCurrentDatasetId('custom');
    setIsNewChartModalOpen(false);
  };

  const handleScrollToOperatorGuide = () => {
    const el = document.getElementById('operator-quick-guide');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenCriticalAnalysis = (triggerInfo?: string) => {
    if (triggerInfo) {
      setCriticalAnalysisTrigger(triggerInfo);
    }
    setIsCriticalAnalysisOpen(true);
  };

  const { targetCpk, targetPpk, targetName } = resolveCapabilityTargets(config);
  const isCpkFailed = (capability.cpk ?? 0) < targetCpk;
  const isPpkFailed = (capability.ppk ?? 0) < targetPpk;
  const hasSpecialCauses = violations.length > 0;
  const hasCriticalIssue = isCpkFailed || isPpkFailed || hasSpecialCauses;

  const handleChangeFeatureClassification = (f: FeatureClassification) => {
    const all = getAllCapabilityTargets();
    const found = all.find((t) => t.id === f);
    if (found) {
      setConfig((prev) => ({
        ...prev,
        featureClassification: f,
        targetCpk: found.targetCpk,
        targetPpk: found.targetPpk,
        targetName: found.name
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        featureClassification: f
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* PTP Top Header */}
      <SpcHeader
        onOpenDataEditor={() => setIsDataEditorOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenNewChart={() => setIsNewChartModalOpen(true)}
        onSelectDataset={handleSelectDataset}
        currentDatasetId={currentDatasetId}
        onReset={handleReset}
        onPrintReport={() => setIsPrintPreviewOpen(true)}
        onExportExcel={handleExportExcel}
        isExportingExcel={isExportingExcel}
        onOpenArchive={() => setIsArchiveOpen(true)}
        archiveCount={archiveCount}
        totalPointsCount={points.length}
        metricName={specs.metricName}
        manualStandard={config.manualStandard}
        onChangeManualStandard={(m: SpcManualStandard) => setConfig({ ...config, manualStandard: m })}
        featureClassification={config.featureClassification}
        onChangeFeatureClassification={handleChangeFeatureClassification}
        targetCpk={targetCpk}
        targetPpk={targetPpk}
        targetName={targetName}
        onOpenTargetsModal={() => setIsTargetsModalOpen(true)}
        onScrollToOperatorGuide={handleScrollToOperatorGuide}
        onOpenCriticalAnalysis={() => handleOpenCriticalAnalysis()}
        hasCriticalIssue={hasCriticalIssue}
        hasCriticalAnalysisSaved={Boolean(criticalAnalysis)}
      />

      {/* Main PTP Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <SpcSidebar
          config={config}
          onChangeConfig={setConfig}
          specs={specs}
          onChangeSpecs={setSpecs}
          totalPointsCount={points.length}
          onOpenNewChart={() => setIsNewChartModalOpen(true)}
          onOpenArchive={() => setIsArchiveOpen(true)}
          archiveCount={archiveCount}
          onOpenTargetsModal={() => setIsTargetsModalOpen(true)}
        />

        <SpcOutputCanvas
          config={config}
          specs={specs}
          points={points}
          limits={limits}
          primaryPoints={primaryPoints}
          secondaryPoints={secondaryPoints}
          violations={violations}
          capability={capability}
          serialAutocorr={serialAutocorr}
          spatialCavity={spatialCavity}
          criticalAnalysis={criticalAnalysis}
          onOpenCriticalAnalysis={handleOpenCriticalAnalysis}
        />
      </div>

      {/* Data Editor & LIE/LSE Modal */}
      <SpcDataEditorModal
        isOpen={isDataEditorOpen}
        onClose={() => setIsDataEditorOpen(false)}
        data={points}
        specs={specs}
        onSave={handleSaveDataFromEditor}
      />

      {/* Official Industrial Capability Study Report (A4 Layout) */}
      <IndustrialSpcReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        config={config}
        specs={specs}
        points={points}
        limits={limits}
        primaryPoints={primaryPoints}
        secondaryPoints={secondaryPoints}
        violations={violations}
        capability={capability}
        metadata={metadata}
        onUpdateMetadata={setMetadata}
        onUpdateManualStandard={(standard: SpcManualStandard) =>
          setConfig((prev) => ({ ...prev, manualStandard: standard }))
        }
        onUpdateFeatureClassification={(feat: FeatureClassification) =>
          setConfig((prev) => ({ ...prev, featureClassification: feat }))
        }
        criticalAnalysis={criticalAnalysis}
        onOpenCriticalAnalysis={handleOpenCriticalAnalysis}
        onOpenPrintPreview={() => {
          setIsReportOpen(false);
          setIsPrintPreviewOpen(true);
        }}
        onOpenArchive={() => {
          setIsReportOpen(false);
          setIsArchiveOpen(true);
        }}
        onReportArchived={handleRefreshArchiveCount}
      />

      {/* Modal Dedicado de Pré-Visualização de Impressão (com zoom e seleção de seções) */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        config={config}
        specs={specs}
        points={points}
        limits={limits}
        primaryPoints={primaryPoints}
        secondaryPoints={secondaryPoints}
        violations={violations}
        capability={capability}
        metadata={metadata}
        onUpdateMetadata={setMetadata}
        criticalAnalysis={criticalAnalysis}
        onOpenCriticalAnalysis={handleOpenCriticalAnalysis}
        onOpenArchive={() => {
          setIsPrintPreviewOpen(false);
          setIsArchiveOpen(true);
        }}
        onReportArchived={handleRefreshArchiveCount}
      />

      {/* Modal para Solicitar Dados da Nova Carta (Empresa, Produto, Máquina, Tolerâncias, Meio de Medição, etc.) */}
      <NewChartSetupModal
        isOpen={isNewChartModalOpen}
        onClose={() => setIsNewChartModalOpen(false)}
        currentMetadata={metadata}
        currentSpecs={specs}
        currentConfig={config}
        onSubmit={handleCreateNewChart}
      />

      {/* Modal de Análise Crítica e Planos de Ações Corretivas (O que aconteceu, planos de ações e prazo) */}
      <CriticalAnalysisModal
        isOpen={isCriticalAnalysisOpen}
        onClose={() => setIsCriticalAnalysisOpen(false)}
        analysis={criticalAnalysis}
        onSave={(data) => {
          setCriticalAnalysis(data);
        }}
        onDelete={() => {
          setCriticalAnalysis(null);
          setIsCriticalAnalysisOpen(false);
        }}
        onOpenReport={() => setIsReportOpen(true)}
        capability={capability}
        violations={violations}
        specs={specs}
        metadata={metadata}
        featureClassification={config.featureClassification}
        targetCpk={targetCpk}
        targetPpk={targetPpk}
        initialTrigger={criticalAnalysisTrigger}
      />

      {/* Modal do Banco de Dados de Relatórios (Consulta, Histórico, Restauração e Exclusão) */}
      <ReportArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        currentStudy={{
          metadata,
          specs,
          config,
          points,
          capability,
          violationsCount: violations.length,
          criticalAnalysis
        }}
        onLoadReport={handleLoadReport}
        onOpenReportModalWithReport={handleOpenReportModalWithReport}
        onOpenPrintPreviewWithReport={handleOpenPrintPreviewWithReport}
        onDatabaseChange={(newCount) => setArchiveCount(newCount)}
      />

      {/* Modal de Gerenciamento e Adição de Novas Metas de Cpk & Ppk */}
      <CapabilityTargetsModal
        isOpen={isTargetsModalOpen}
        onClose={() => setIsTargetsModalOpen(false)}
        config={config}
        capability={capability}
        onApplyTargets={(newTargets) => {
          setConfig((prev) => ({
            ...prev,
            targetCpk: newTargets.targetCpk,
            targetPpk: newTargets.targetPpk,
            targetName: newTargets.targetName,
            featureClassification: newTargets.classification
          }));
        }}
      />
    </div>
  );
}
