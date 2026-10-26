export type ControlChartType = 'I-MR' | 'Xbar-R' | 'Xbar-S';

export type SpcManualStandard = 'AIAG_SPC_4TH' | 'AIAG_VDA_1ST';

export type FeatureClassification = 'standard' | 'critical' | 'ppap_initial' | 'six_sigma' | 'broad' | 'custom' | string;

export interface ProcessSpecs {
  metricName: string;
  unit: string;
  lsl: number | null; // Limite Inferior de Especificação (LIE)
  target: number | null; // Alvo nominal
  usl: number | null; // Limite Superior de Especificação (LSE)
  // Campos auxiliares para facilitar entrada do operador
  toleranceMode?: 'absolute' | 'symmetric';
  symmetricTol?: number | null;
}

export interface SpcReportMetadata {
  companyName: string;
  partName: string;
  partNumber: string;
  operation: string;
  machine: string;
  gauge: string; // Instrumento de medição
  studyDate: string; // Data do Estudo / Emissão
  collectionStartDate?: string; // Data de Início da Coleta de Dados
  collectionEndDate?: string; // Data de Término da Coleta de Dados
  collectionDuration?: string; // Duração / Período da Coleta (ex: "4 dias", "18/10 a 22/10")
  operator: string;
  engineer: string;
  department?: string;
  lotNumber?: string;
  notes?: string;
}

export interface CriticalAnalysisData {
  id?: string;
  createdAt: string;
  triggeredBy: string; // ex: 'Cpk Reprovado (0.84 < 1.33)' ou 'Causa Especial na Amostra #12'
  whatHappened: string; // O que pode ter acontecido? (Hipótese de Causa Raiz)
  actionPlans: string; // Quais serão os planos de ações? (Contenção / Correção / Prevenção)
  deadline: string; // Qual será o prazo? (Data ou período limite)
  responsible: string; // Responsável pela execução
  lotDisposition: string; // Disposição do lote (ex: Segregado, Retrabalho, etc.)
  status: 'Aberta' | 'Em Andamento' | 'Concluída';
}

export interface CepDataPoint {
  id: string;
  order: number; // Ordem de produção / corrida
  sample: number; // Subgrupo ou Batelada
  value: number; // Valor medido
  subgroup?: number;
  cavity?: string | number; // Cavidade do molde ou posição espacial
  positionX?: number; // Coordenada X na matriz/ferramenta
  positionY?: number; // Coordenada Y na matriz/ferramenta
  notes?: string;
  specialCauses?: number[]; // Regras de Nelson violadas (1 a 8)
}

export interface ControlLimits {
  centerLine: number;
  ucl: number; // Limite Superior de Controle (LSC)
  lcl: number; // Limite Inferior de Controle (LIC)
  sigmaWithin: number;
  sigmaOverall: number;
  // Second chart (MR or R or S)
  subCenterLine?: number;
  subUcl?: number;
  subLcl?: number;
  avgRange?: number; // R-barra ou MR-barra
  d2?: number; // Constante de Shewhart d2
}

export interface CapabilityResults {
  cp: number | null;
  cpk: number | null;
  cpl: number | null;
  cpu: number | null;
  rawCpk?: number | null;
  pp: number | null;
  ppk: number | null;
  ppl: number | null;
  ppu: number | null;
  rawPpk?: number | null;
  cpm: number | null;
  ppmTotalExpected: number;
  ppmObserved: number;
  sigmaWithin: number; // Amplitude Média ÷ d2
  sigmaOverall: number; // s amostral
  avgRange: number; // R-barra ou MR-barra
  d2: number; // Fator d2
  mean: number;
  effectiveLsl: number | null; // LIE normalizado (garante LIE <= LSE)
  effectiveUsl: number | null; // LSE normalizado (garante LSE >= LIE)
  wasInverted?: boolean; // Verdadeiro se o usuário digitou LIE > LSE e foi auto-corrigido
  wasRelativeConverted?: boolean; // Verdadeiro se o usuário digitou tolerância relativa ao alvo (ex: ±0.15)
}

export interface NelsonViolation {
  pointIndex: number;
  sample: number;
  value: number;
  ruleNumber: number;
  ruleDescription: string;
}

export interface SerialAutocorrItem {
  lag: number;
  acf: number;
  ciUpper: number;
  ciLower: number;
  significant: boolean;
}

export interface CavitySpatialResult {
  cavity: string;
  mean: number;
  std: number;
  count: number;
  x: number;
  y: number;
  standardizedZ: number;
  spatialLag?: number;
  lisaQuadrant?: 'High-High' | 'Low-Low' | 'High-Low' | 'Low-High' | 'Normal';
}

export interface CepAnalysisConfig {
  chartType: ControlChartType;
  subgroupSize: number; // Tamanho do subgrupo racional (padrão 1 para I-MR, 5 para Xbar)

  // Standard norm selection & capability targets
  manualStandard: SpcManualStandard; // AIAG CEP 4ª Edição vs AIAG & VDA 1ª Edição
  featureClassification: FeatureClassification; // Padrão, Crítica, etc.
  targetCpk?: number; // Meta mínima de Cpk (ex: 1.33, 1.50, 1.67, 2.00)
  targetPpk?: number; // Meta mínima de Ppk (ex: 1.33, 1.67, 2.00)
  targetName?: string; // Nome descritivo da meta (ex: "Norma Montadora VW", "Cota de Segurança")

  // Nelson rules active
  rule1: boolean; // 1 ponto além de 3 sigma
  rule2: boolean; // 9 pontos consecutivos no mesmo lado da média
  rule3: boolean; // 6 pontos consecutivos em ascensão ou descida
  rule4: boolean; // 14 pontos alternando acima e abaixo
  rule5: boolean; // 2 de 3 pontos além de 2 sigma no mesmo lado
  rule6: boolean; // 4 de 5 pontos além de 1 sigma no mesmo lado
  rule7: boolean; // 15 pontos consecutivos dentro de 1 sigma
  rule8: boolean; // 8 pontos consecutivos além de 1 sigma em ambos os lados

  // Sections toggle
  showDescriptivesTable: boolean;
  showControlChart: boolean;
  showCapabilityAnalysis: boolean;
  showNelsonRulesTable: boolean;
  showSerialCorrelation: boolean;
  showSpatialCavityAnalysis: boolean;
  showInterpretation: boolean;
  showOperatorGuide: boolean; // Guia simplificado para chão de fábrica

  // Visualizations
  plotControlChart: boolean;
  plotSubControlChart: boolean;
  plotCapabilityHistogram: boolean;
  plotACF: boolean;
  plotSpatialCavityMap: boolean;
  plotNormalProbPlot: boolean;
}

export interface ArchivedSpcReport {
  id: string;
  title: string;
  createdAt: string; // ISO date string
  updatedAt: string;
  metadata: SpcReportMetadata;
  specs: ProcessSpecs;
  config: CepAnalysisConfig;
  points: CepDataPoint[];
  summary: {
    n: number;
    mean: number;
    cpk: number | null;
    ppk: number | null;
    status: 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'REJECTED';
    violationsCount: number;
    metricUnit: string;
  };
  criticalAnalysis?: CriticalAnalysisData | null;
  isFavorite?: boolean;
  tags?: string[];
  notes?: string;
}

