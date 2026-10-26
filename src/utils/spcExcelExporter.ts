import ExcelJS from 'exceljs';
import {
  CapabilityResults,
  CepAnalysisConfig,
  CepDataPoint,
  ControlLimits,
  CriticalAnalysisData,
  NelsonViolation,
  ProcessSpecs,
  SpcReportMetadata
} from '../types';
import {
  renderCapabilityHistogramToCanvas,
  renderControlChartToCanvas,
  renderRawValuesRunChartToCanvas,
  renderNormalProbabilityPlotToCanvas
} from './spcSvgRenderers';
import { resolveCapabilityTargets } from './spcTargets';

export interface SpcExcelExportOptions {
  config: CepAnalysisConfig;
  specs: ProcessSpecs;
  points: CepDataPoint[];
  limits: ControlLimits;
  primaryPoints: { sample: number; value: number }[];
  secondaryPoints: { sample: number; value: number }[];
  violations: NelsonViolation[];
  capability: CapabilityResults;
  metadata: SpcReportMetadata;
  criticalAnalysis?: CriticalAnalysisData | null;
}

/**
 * Generates and downloads a consolidated, comprehensive industrial SPC / Capability Excel report (.xlsx)
 * with all metadata, formatted data tables, statistical parameters, and embedded chart images.
 */
export async function exportSpcToExcel(options: SpcExcelExportOptions): Promise<void> {
  const {
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
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PTP - Controle Estatístico de Processo';
  workbook.lastModifiedBy = metadata.engineer || 'Engenharia da Qualidade';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create single consolidated worksheet for continuous printing/review
  const worksheet = workbook.addWorksheet('Relatório de Capabilidade (CEP)', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2
      }
    },
    views: [{ showGridLines: true }]
  });

  // Setup Column Widths
  worksheet.columns = [
    { width: 14 }, // A: Amostra / Chave
    { width: 18 }, // B: Valor / Métricas
    { width: 18 }, // C: LIE / Parâmetros
    { width: 18 }, // D: Alvo
    { width: 18 }, // E: LSE
    { width: 16 }, // F: Desvio / Unidade
    { width: 16 }, // G: Status
    { width: 16 }, // H: Observação / LSC
    { width: 18 }  // I: Normas / Conclusão
  ];

  // Helper styles
  const navyHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }
  };
  const blueSubHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }
  };
  const sectionTitleFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' }
  };
  const tableHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' }
  };
  const zebraLightFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' }
  };
  const approvedFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDCFCE7' }
  };
  const rejectedFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEE2E2' }
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  const effectiveLsl = capability.effectiveLsl ?? specs.lsl;
  const effectiveUsl = capability.effectiveUsl ?? specs.usl;
  const effectiveTarget = specs.target ?? (effectiveLsl !== null && effectiveUsl !== null ? (effectiveLsl + effectiveUsl) / 2 : null);
  const { targetCpk, targetPpk, targetName } = resolveCapabilityTargets(config);
  const benchmarkCpk = targetCpk;
  const benchmarkPpk = targetPpk;
  const isCpkApproved = (capability.cpk ?? 0) >= targetCpk;
  const isPpkApproved = (capability.ppk ?? 0) >= targetPpk;
  const isStable = violations.length === 0;

  let currentRow = 1;

  // 1. TOP DOCUMENT HEADER
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = 'PTP — CONTROLE ESTATÍSTICO DE PROCESSO & CAPABILIDADE INDUSTRIAL (CEP)';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = navyHeaderFill;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const subTitleCell = worksheet.getCell(`A${currentRow}`);
  subTitleCell.value = `RELATÓRIO OFICIAL DE HOMOLOGAÇÃO DE PROCESSO • ${
    config.manualStandard === 'AIAG_VDA_1ST' ? 'MANUAL AIAG & VDA (1ª EDIÇÃO)' : 'MANUAL AIAG CEP (4ª EDIÇÃO)'
  } • ${targetName.toUpperCase()} (Cpk ≥ ${targetCpk.toFixed(2)} | Ppk ≥ ${targetPpk.toFixed(2)})`;
  subTitleCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFE2E8F0' } };
  subTitleCell.fill = blueSubHeaderFill;
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  currentRow++; // blank line

  // 2. INDUSTRIAL METADATA & PROCESS SPECS GRID
  const addMetaRow = (
    label1: string, val1: string,
    label2: string, val2: string,
    label3: string, val3: string
  ) => {
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const cA = worksheet.getCell(`A${currentRow}`);
    cA.value = label1.toUpperCase();
    cA.font = { bold: true, size: 9, color: { argb: 'FF475569' } };
    cA.fill = tableHeaderFill;
    cA.border = thinBorder;

    const cC = worksheet.getCell(`C${currentRow}`);
    cC.value = val1;
    cC.font = { size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    cC.border = thinBorder;

    const cD = worksheet.getCell(`D${currentRow}`);
    cD.value = label2.toUpperCase();
    cD.font = { bold: true, size: 9, color: { argb: 'FF475569' } };
    cD.fill = tableHeaderFill;
    cD.border = thinBorder;

    worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cE = worksheet.getCell(`E${currentRow}`);
    cE.value = val2;
    cE.font = { size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    cE.border = thinBorder;

    const cG = worksheet.getCell(`G${currentRow}`);
    cG.value = label3.toUpperCase();
    cG.font = { bold: true, size: 9, color: { argb: 'FF475569' } };
    cG.fill = tableHeaderFill;
    cG.border = thinBorder;

    worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
    const cH = worksheet.getCell(`H${currentRow}`);
    cH.value = val3;
    cH.font = { size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    cH.border = thinBorder;

    worksheet.getRow(currentRow).height = 20;
    currentRow++;
  };

  addMetaRow(
    'Empresa / Unidade', metadata.companyName,
    'Código Peça (P/N)', metadata.partNumber,
    'Descrição da Peça', metadata.partName
  );
  addMetaRow(
    'Operação / Posto', metadata.operation,
    'Máquina / Linha', metadata.machine,
    'Meio de Medição', metadata.gauge
  );
  addMetaRow(
    'Resp. Estudo (Operador)', metadata.operator,
    'Resp. pela Análise', metadata.engineer,
    'Data da Análise', metadata.studyDate
  );
  addMetaRow(
    'Início da Coleta', metadata.collectionStartDate || metadata.studyDate,
    'Término da Coleta', metadata.collectionEndDate || metadata.studyDate,
    'Duração da Coleta', metadata.collectionDuration || '1 dia'
  );
  addMetaRow(
    'Característica / Cota', specs.metricName,
    'Especificação (Alvo)', effectiveTarget !== null ? `${effectiveTarget.toFixed(3)} ${specs.unit}` : '—',
    'Tolerâncias (LIE / LSE)', `LIE: ${effectiveLsl ?? '—'} | LSE: ${effectiveUsl ?? '—'} ${specs.unit}`
  );
  addMetaRow(
    'Amostragem', `n = ${config.subgroupSize} (Total: ${points.length} medições)`,
    'Tipo de Carta', config.chartType,
    'Classificação Cota & Metas', `${targetName} (Cpk ≥ ${targetCpk.toFixed(2)} | Ppk ≥ ${targetPpk.toFixed(2)})`
  );

  currentRow++; // blank line

  // 3. EMBEDDED CHARTS SECTION
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const secCharts = worksheet.getCell(`A${currentRow}`);
  secCharts.value = '1. MONITORAMENTO GRÁFICO DO PROCESSO (CARTAS SHEWHART, HISTOGRAMA, VALORES BRUTOS & PROBABILIDADE)';
  secCharts.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  secCharts.fill = sectionTitleFill;
  secCharts.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  // Generate PNG base64 for charts directly via HTML5 Canvas 2D
  try {
    const png1 = renderControlChartToCanvas(
      `Carta de Valores (${config.chartType === 'I-MR' ? 'Individuais - I' : 'Médias - X̄'})`,
      primaryPoints,
      {
        cl: limits.centerLine,
        ucl: limits.ucl,
        lcl: limits.lcl,
        sigma: limits.sigmaWithin
      },
      violations,
      760,
      340,
      specs.unit
    );

    const png2 = renderControlChartToCanvas(
      `Carta de Amplitude (${config.chartType === 'I-MR' ? 'Móvel - MR' : 'Subgrupo - R'})`,
      secondaryPoints,
      {
        cl: limits.subCenterLine ?? limits.sigmaWithin * 1.128,
        ucl: limits.subUcl ?? limits.sigmaWithin * 3.686,
        lcl: limits.subLcl ?? 0,
        sigma: limits.sigmaWithin
      },
      [],
      760,
      340,
      specs.unit
    );

    const pngHist = renderCapabilityHistogramToCanvas(
      points.map((p) => p.value),
      specs,
      capability,
      760,
      360
    );

    const pngRaw = renderRawValuesRunChartToCanvas(
      points,
      specs,
      capability.mean,
      capability.sigmaOverall,
      effectiveLsl,
      effectiveUsl,
      760,
      340
    );

    const pngProb = renderNormalProbabilityPlotToCanvas(
      points.map((p) => p.value),
      specs,
      capability.mean,
      capability.sigmaOverall,
      effectiveLsl,
      effectiveUsl,
      760,
      340
    );

    // Chart 1 (Left Col 0) & Chart 2 (Right Col 4.8)
    if (png1 && png1.includes('base64,')) {
      const imgId1 = workbook.addImage({
        base64: png1.split('base64,')[1],
        extension: 'png'
      });
      worksheet.addImage(imgId1, {
        tl: { col: 0, row: currentRow },
        ext: { width: 440, height: 230 }
      });
    }

    if (png2 && png2.includes('base64,')) {
      const imgId2 = workbook.addImage({
        base64: png2.split('base64,')[1],
        extension: 'png'
      });
      worksheet.addImage(imgId2, {
        tl: { col: 4.8, row: currentRow },
        ext: { width: 440, height: 230 }
      });
    }

    // Advance 14 rows for top charts
    currentRow += 14;

    // Capability Histogram (Centered Cols A-I)
    if (pngHist && pngHist.includes('base64,')) {
      const imgIdHist = workbook.addImage({
        base64: pngHist.split('base64,')[1],
        extension: 'png'
      });
      worksheet.addImage(imgIdHist, {
        tl: { col: 0.8, row: currentRow },
        ext: { width: 720, height: 260 }
      });
    }

    // Advance 16 rows for histogram
    currentRow += 16;

    // Additional Charts: Carta de Valores Brutos & Gráfico de Probabilidade Normal
    if (pngRaw && pngRaw.includes('base64,')) {
      const imgIdRaw = workbook.addImage({
        base64: pngRaw.split('base64,')[1],
        extension: 'png'
      });
      worksheet.addImage(imgIdRaw, {
        tl: { col: 0, row: currentRow },
        ext: { width: 440, height: 230 }
      });
    }

    if (pngProb && pngProb.includes('base64,')) {
      const imgIdProb = workbook.addImage({
        base64: pngProb.split('base64,')[1],
        extension: 'png'
      });
      worksheet.addImage(imgIdProb, {
        tl: { col: 4.8, row: currentRow },
        ext: { width: 440, height: 230 }
      });
    }

    // Advance 14 rows for additional charts
    currentRow += 14;
  } catch (err) {
    console.error('Erro ao renderizar gráficos no Excel:', err);
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value =
      'Aviso: Gráficos gerados em modo simplificado.';
    currentRow += 2;
  }

  currentRow++; // blank line

  // 4. STATISTICAL DESCRIPTIVES & CAPABILITY INDICES
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const secParams = worksheet.getCell(`A${currentRow}`);
  secParams.value = '2. QUADRO RESUMO DE PARÂMETROS ESTATÍSTICOS & ÍNDICES DE CAPABILIDADE';
  secParams.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  secParams.fill = sectionTitleFill;
  secParams.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  // Subheader columns
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const subA = worksheet.getCell(`A${currentRow}`);
  subA.value = 'PARÂMETROS DESCRITIVOS & ESTIMADORES DE DISPERSÃO';
  subA.font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
  subA.fill = tableHeaderFill;
  subA.border = thinBorder;

  worksheet.mergeCells(`E${currentRow}:I${currentRow}`);
  const subB = worksheet.getCell(`E${currentRow}`);
  subB.value = 'ÍNDICES DE CAPABILIDADE (CURTO PRAZO) & DESEMPENHO (LONGO PRAZO)';
  subB.font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
  subB.fill = tableHeaderFill;
  subB.border = thinBorder;
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  const rawValues = points.map((p) => p.value);
  const sortedVals = [...rawValues].sort((a, b) => a - b);
  const medianVal = sortedVals[Math.floor(sortedVals.length / 2)] || 0;
  const rangeVal = (sortedVals[sortedVals.length - 1] || 0) - (sortedVals[0] || 0);

  const statsRows = [
    {
      pLabel: 'Número de Medições (N)', pVal: `${points.length} amostras`,
      cLabel: 'Cp (Capabilidade Potencial)', cVal: capability.cp?.toFixed(3) ?? '—',
      cMeta: `Meta ≥ ${benchmarkCpk.toFixed(2)}`, cStatus: isCpkApproved ? 'APROVADO' : 'INSUFICIENTE'
    },
    {
      pLabel: 'Média Amostral (X̄)', pVal: `${capability.mean.toFixed(4)} ${specs.unit}`,
      cLabel: 'Cpk (Capabilidade Centrada Efetiva)', cVal: capability.cpk?.toFixed(3) ?? '—',
      cMeta: `Meta ≥ ${benchmarkCpk.toFixed(2)}`, cStatus: isCpkApproved ? 'APROVADO' : 'INSUFICIENTE'
    },
    {
      pLabel: 'Mediana / Amplitude Total', pVal: `${medianVal.toFixed(3)} / ${rangeVal.toFixed(3)}`,
      cLabel: 'Cpl (Inferior) / Cpu (Superior)', cVal: `${capability.cpl?.toFixed(3) ?? '—'} / ${capability.cpu?.toFixed(3) ?? '—'}`,
      cMeta: 'Unilateral', cStatus: 'REF'
    },
    {
      pLabel: 'Amplitude Média (R̄ ou MR̄)', pVal: capability.avgRange.toFixed(4),
      cLabel: 'Pp (Desempenho Geral)', cVal: capability.pp?.toFixed(3) ?? '—',
      cMeta: `Meta ≥ ${benchmarkPpk.toFixed(2)}`, cStatus: isPpkApproved ? 'ESTÁVEL' : 'OBSERVAR'
    },
    {
      pLabel: 'Constante de Shewhart (d₂)', pVal: capability.d2.toFixed(4),
      cLabel: 'Ppk (Desempenho Geral Efetivo)', cVal: capability.ppk?.toFixed(3) ?? '—',
      cMeta: `Meta ≥ ${benchmarkPpk.toFixed(2)}`, cStatus: isPpkApproved ? 'ESTÁVEL' : 'OBSERVAR'
    },
    {
      pLabel: 'Desvio Padrão Dentro (σ_within = R̄ ÷ d₂)', pVal: capability.sigmaWithin.toFixed(4),
      cLabel: 'Cpm (Taguchi com Foco no Alvo)', cVal: capability.cpm?.toFixed(3) ?? '—',
      cMeta: 'Aderência ao Alvo', cStatus: 'REF'
    },
    {
      pLabel: 'Desvio Padrão Geral (s / σ_overall)', pVal: capability.sigmaOverall.toFixed(4),
      cLabel: 'Defeituosos Esperados (PPM)', cVal: `${capability.ppmTotalExpected.toLocaleString()} PPM`,
      cMeta: `Obs: ${capability.ppmObserved} PPM`, cStatus: capability.ppmTotalExpected === 0 ? 'ZERO DEFEITO' : 'ACOMPANHAR'
    }
  ];

  statsRows.forEach((row, idx) => {
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const cA = worksheet.getCell(`A${currentRow}`);
    cA.value = row.pLabel;
    cA.font = { size: 9, color: { argb: 'FF334155' } };
    cA.border = thinBorder;
    if (idx % 2 === 1) cA.fill = zebraLightFill;

    const cD = worksheet.getCell(`D${currentRow}`);
    cD.value = row.pVal;
    cD.font = { size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    cD.alignment = { horizontal: 'right' };
    cD.border = thinBorder;
    if (idx % 2 === 1) cD.fill = zebraLightFill;

    worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const cE = worksheet.getCell(`E${currentRow}`);
    cE.value = row.cLabel;
    cE.font = { size: 9, bold: row.cLabel.includes('Cpk'), color: row.cLabel.includes('Cpk') ? { argb: 'FF1E3A8A' } : { argb: 'FF334155' } };
    cE.border = thinBorder;
    if (row.cLabel.includes('Cpk')) {
      cE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    } else if (idx % 2 === 1) {
      cE.fill = zebraLightFill;
    }

    const cG = worksheet.getCell(`G${currentRow}`);
    cG.value = row.cVal;
    cG.font = { size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cG.alignment = { horizontal: 'right' };
    cG.border = thinBorder;

    const cH = worksheet.getCell(`H${currentRow}`);
    cH.value = row.cMeta;
    cH.font = { size: 8.5, color: { argb: 'FF64748B' } };
    cH.border = thinBorder;

    const cI = worksheet.getCell(`I${currentRow}`);
    cI.value = row.cStatus;
    cI.font = { size: 8.5, bold: true };
    cI.alignment = { horizontal: 'center' };
    cI.border = thinBorder;
    if (row.cStatus === 'APROVADO' || row.cStatus === 'ESTÁVEL') {
      cI.fill = approvedFill;
      cI.font = { size: 8.5, bold: true, color: { argb: 'FF166534' } };
    } else if (row.cStatus === 'INSUFICIENTE') {
      cI.fill = rejectedFill;
      cI.font = { size: 8.5, bold: true, color: { argb: 'FF991B1B' } };
    }

    worksheet.getRow(currentRow).height = 19;
    currentRow++;
  });

  currentRow++; // blank line

  // 5. TECHNICAL CONCLUSION & REPORT VERDICT
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const secConcl = worksheet.getCell(`A${currentRow}`);
  secConcl.value = '3. CONCLUSÃO TÉCNICA & LAUDO DE HOMOLOGAÇÃO';
  secConcl.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  secConcl.fill = sectionTitleFill;
  secConcl.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  let conclTitle = 'PROCESSO CAPAZ E HOMOLOGADO';
  let conclDesc = 'O processo atende plenamente aos requisitos de estabilidade estatística e aos critérios mínimos de capabilidade exigidos para fornecimento seriado.';
  let conclFill = approvedFill;
  let conclFontColor = 'FF166534';

  if (!isCpkApproved && !isStable) {
    conclTitle = 'PROCESSO INCAPAZ E FORA DE CONTROLE ESTATÍSTICO';
    conclDesc = `O Cpk obtido (${capability.cpk?.toFixed(3) ?? '—'}) está abaixo da meta (≥ ${benchmarkCpk.toFixed(2)}) e foram identificadas causas especiais de variação. Liberação bloqueada até implementação de ações corretivas.`;
    conclFill = rejectedFill;
    conclFontColor = 'FF991B1B';
  } else if (!isCpkApproved) {
    conclTitle = 'PROCESSO INCAPAZ (CPK ABAIXO DO REQUISITO MÍNIMO)';
    conclDesc = `O índice Cpk (${capability.cpk?.toFixed(3) ?? '—'}) não atinge o requisito normativo (≥ ${benchmarkCpk.toFixed(2)}). Recomenda-se centralizar o processo em relação ao alvo nominal e/ou reduzir a variabilidade.`;
    conclFill = rejectedFill;
    conclFontColor = 'FF991B1B';
  } else if (!isStable) {
    conclTitle = 'PROCESSO CAPAZ MAS COM INSTABILIDADES DETECTADAS (CAUSAS ESPECIAIS)';
    conclDesc = `O processo apresenta dispersão estatisticamente conforme, porém foram detectadas violações das Regras de Nelson. Exige eliminação das causas de instabilidade.`;
    conclFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    conclFontColor = 'FF92400E';
  }

  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const cTitleBox = worksheet.getCell(`A${currentRow}`);
  cTitleBox.value = `PARECER FINAL: ${conclTitle} (Cpk = ${capability.cpk?.toFixed(3) ?? '—'} | Meta ≥ ${benchmarkCpk.toFixed(2)})`;
  cTitleBox.font = { size: 11, bold: true, color: { argb: conclFontColor } };
  cTitleBox.fill = conclFill;
  cTitleBox.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  cTitleBox.border = thinBorder;
  worksheet.getRow(currentRow).height = 24;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const cDescBox = worksheet.getCell(`A${currentRow}`);
  cDescBox.value = conclDesc;
  cDescBox.font = { size: 9.5, color: { argb: 'FF1E293B' } };
  cDescBox.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
  cDescBox.border = thinBorder;
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  currentRow++; // blank line

  // 6. OPERATOR SHOPFLOOR QUICK GUIDE
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const secOp = worksheet.getCell(`A${currentRow}`);
  secOp.value = '4. GUIA SIMPLIFICADO PARA O OPERADOR DE CHÃO DE FÁBRICA';
  secOp.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  secOp.fill = sectionTitleFill;
  secOp.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  let opTitle = '🟢 PRODUÇÃO NORMAL — MANTER OPERAÇÃO';
  let opInst = 'O processo está perfeitamente estável e as peças atendem às especificações. Mantenha a produção no ritmo padrão e realize as medições de rotina.';
  let opFill = approvedFill;
  let opTextColor = 'FF166534';

  if (!isCpkApproved || !isStable) {
    if (!isCpkApproved) {
      opTitle = '🔴 ATENÇÃO MÁXIMA — INTERROMPER A OPERAÇÃO E ACIONAR PREPARAÇÃO / QUALIDADE';
      const dev = effectiveTarget !== null ? capability.mean - effectiveTarget : 0;
      opInst = `PARAR A PRODUÇÃO IMEDIATAMENTE. A média está desviada em ${dev >= 0 ? '+' : ''}${dev.toFixed(3)} ${specs.unit}. Segregar as peças produzidas após a última amostragem aprovada.`;
      opFill = rejectedFill;
      opTextColor = 'FF991B1B';
    } else {
      opTitle = '🟡 ALERTA DE INSTABILIDADE — AJUSTE NECESSÁRIO ANTES DE GERAR REFUGOS';
      opInst = 'O processo ainda está dentro das cotas, mas o gráfico indicou tendência de deriva anômala (Causa Especial). Inspecione a máquina e as condições operacionais.';
      opFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      opTextColor = 'FF92400E';
    }
  }

  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const cOpTitle = worksheet.getCell(`A${currentRow}`);
  cOpTitle.value = opTitle;
  cOpTitle.font = { size: 10.5, bold: true, color: { argb: opTextColor } };
  cOpTitle.fill = opFill;
  cOpTitle.border = thinBorder;
  worksheet.getRow(currentRow).height = 24;
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const cOpInst = worksheet.getCell(`A${currentRow}`);
  cOpInst.value = `Instrução: ${opInst}`;
  cOpInst.font = { size: 9.5, color: { argb: 'FF1E293B' } };
  cOpInst.alignment = { wrapText: true, indent: 1 };
  cOpInst.border = thinBorder;
  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  currentRow++; // blank line

  // 7. CRITICAL ANALYSIS / CAPA SECTION (If recorded or if there are special causes)
  if (criticalAnalysis || violations.length > 0 || !isCpkApproved) {
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const secCrit = worksheet.getCell(`A${currentRow}`);
    secCrit.value = '5. ANÁLISE CRÍTICA DO PROCESSO & AÇÕES CORRETIVAS (CAPA / IATF 16949)';
    secCrit.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    secCrit.fill = sectionTitleFill;
    secCrit.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(currentRow).height = 22;
    currentRow++;

    if (criticalAnalysis) {
      addMetaRow(
        'Gatilho do Desvio', criticalAnalysis.triggeredBy,
        'Status do Plano', criticalAnalysis.status,
        'Prazo Limite', criticalAnalysis.deadline
      );
      addMetaRow(
        'Responsável', criticalAnalysis.responsible,
        'Disposição do Lote', criticalAnalysis.lotDisposition,
        'Data de Registro', criticalAnalysis.createdAt
      );

      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = 'INVESTIGAÇÃO DA CAUSA RAIZ (O QUE PODE TER ACONTECIDO?)';
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 8.5, color: { argb: 'FF1E293B' } };
      worksheet.getCell(`A${currentRow}`).fill = tableHeaderFill;
      worksheet.getCell(`A${currentRow}`).border = thinBorder;

      worksheet.mergeCells(`E${currentRow}:I${currentRow}`);
      worksheet.getCell(`E${currentRow}`).value = 'PLANO DE AÇÃO CORRETIVA / CONTENÇÃO / PREVENÇÃO (5W2H)';
      worksheet.getCell(`E${currentRow}`).font = { bold: true, size: 8.5, color: { argb: 'FF1E293B' } };
      worksheet.getCell(`E${currentRow}`).fill = tableHeaderFill;
      worksheet.getCell(`E${currentRow}`).border = thinBorder;
      worksheet.getRow(currentRow).height = 20;
      currentRow++;

      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = criticalAnalysis.whatHappened || 'Não informado.';
      worksheet.getCell(`A${currentRow}`).font = { size: 9, color: { argb: 'FF0F172A' } };
      worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
      worksheet.getCell(`A${currentRow}`).border = thinBorder;

      worksheet.mergeCells(`E${currentRow}:I${currentRow}`);
      worksheet.getCell(`E${currentRow}`).value = criticalAnalysis.actionPlans || 'Não informado.';
      worksheet.getCell(`E${currentRow}`).font = { size: 9, color: { argb: 'FF0F172A' } };
      worksheet.getCell(`E${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
      worksheet.getCell(`E${currentRow}`).border = thinBorder;
      worksheet.getRow(currentRow).height = 42;
      currentRow++;
    } else {
      worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = 'Aviso: Há desvios ou causas especiais identificadas que requerem abertura formal de Análise Crítica no sistema.';
      worksheet.getCell(`A${currentRow}`).font = { size: 9, italic: true, color: { argb: 'FF991B1B' } };
      worksheet.getCell(`A${currentRow}`).fill = rejectedFill;
      worksheet.getCell(`A${currentRow}`).border = thinBorder;
      worksheet.getRow(currentRow).height = 22;
      currentRow++;
    }

    currentRow++; // blank line
  }

  // 8. COMPLETE MEASUREMENTS DATA TABLE (ALL COLLECTED SAMPLES)
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const secData = worksheet.getCell(`A${currentRow}`);
  secData.value = `6. REGISTRO COMPLETO DE MEDIÇÕES AMOSTRAIS COLETADAS (TOTAL DE ${points.length} MEDIÇÕES)`;
  secData.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  secData.fill = sectionTitleFill;
  secData.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  // Table header
  const dataHeaders = [
    { col: 'A', text: 'Amostra #' },
    { col: 'B', text: 'Valor Medido' },
    { col: 'C', text: 'Desvio (Alvo)' },
    { col: 'D', text: 'LIE' },
    { col: 'E', text: 'Alvo Nominal' },
    { col: 'F', text: 'LSE' },
    { col: 'G', text: 'Unidade' },
    { col: 'H', text: 'Conformidade' },
    { col: 'I', text: 'Causa Especial' }
  ];

  dataHeaders.forEach((dh) => {
    const c = worksheet.getCell(`${dh.col}${currentRow}`);
    c.value = dh.text;
    c.font = { size: 9, bold: true, color: { argb: 'FF1E293B' } };
    c.fill = tableHeaderFill;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Map violations by sample index
  const violationIndices = new Set(violations.map((v) => v.pointIndex));

  points.forEach((p, idx) => {
    const isOutOfSpec =
      (effectiveLsl !== null && p.value < effectiveLsl) ||
      (effectiveUsl !== null && p.value > effectiveUsl);
    const dev = effectiveTarget !== null ? p.value - effectiveTarget : null;
    const hasSpecialCause = violationIndices.has(idx);

    const rIdx = currentRow;
    const isZebra = idx % 2 === 1;
    const rowFill = isOutOfSpec
      ? rejectedFill
      : isZebra
      ? zebraLightFill
      : undefined;

    worksheet.getCell(`A${rIdx}`).value = p.sample ?? idx + 1;
    worksheet.getCell(`B${rIdx}`).value = Number(p.value.toFixed(4));
    worksheet.getCell(`C${rIdx}`).value = dev !== null ? Number(dev.toFixed(4)) : '—';
    worksheet.getCell(`D${rIdx}`).value = effectiveLsl ?? '—';
    worksheet.getCell(`E${rIdx}`).value = effectiveTarget ?? '—';
    worksheet.getCell(`F${rIdx}`).value = effectiveUsl ?? '—';
    worksheet.getCell(`G${rIdx}`).value = specs.unit;
    worksheet.getCell(`H${rIdx}`).value = isOutOfSpec ? 'NÃO CONFORME' : 'CONFORME';
    worksheet.getCell(`I${rIdx}`).value = hasSpecialCause ? 'CAUSA ESPECIAL' : 'SOB CONTROLE';

    // Alignment and formats
    worksheet.getCell(`A${rIdx}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`B${rIdx}`).alignment = { horizontal: 'right' };
    worksheet.getCell(`C${rIdx}`).alignment = { horizontal: 'right' };
    worksheet.getCell(`D${rIdx}`).alignment = { horizontal: 'right' };
    worksheet.getCell(`E${rIdx}`).alignment = { horizontal: 'right' };
    worksheet.getCell(`F${rIdx}`).alignment = { horizontal: 'right' };
    worksheet.getCell(`G${rIdx}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`H${rIdx}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`I${rIdx}`).alignment = { horizontal: 'center' };

    // Format numbers
    worksheet.getCell(`B${rIdx}`).numFmt = '0.0000';
    if (dev !== null) worksheet.getCell(`C${rIdx}`).numFmt = '+0.0000;-0.0000;0.0000';

    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
      const cell = worksheet.getCell(`${col}${rIdx}`);
      cell.border = thinBorder;
      cell.font = { size: 9, name: 'Calibri' };
      if (rowFill) cell.fill = rowFill;
    });

    if (isOutOfSpec) {
      worksheet.getCell(`H${rIdx}`).font = { size: 9, bold: true, color: { argb: 'FF991B1B' } };
    } else {
      worksheet.getCell(`H${rIdx}`).font = { size: 9, bold: true, color: { argb: 'FF166534' } };
    }

    if (hasSpecialCause) {
      worksheet.getCell(`I${rIdx}`).font = { size: 8.5, bold: true, color: { argb: 'FFDC2626' } };
    } else {
      worksheet.getCell(`I${rIdx}`).font = { size: 8.5, color: { argb: 'FF64748B' } };
    }

    worksheet.getRow(rIdx).height = 18;
    currentRow++;
  });

  currentRow++; // blank line

  // 9. FORMAL SIGN-OFF & APPROVAL STAMPS
  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const secSign = worksheet.getCell(`A${currentRow}`);
  secSign.value = '7. HOMOLOGAÇÃO & ASSINATURAS FORMAIS';
  secSign.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  secSign.fill = sectionTitleFill;
  secSign.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  currentRow += 2; // space for physical signatures

  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const s1 = worksheet.getCell(`A${currentRow}`);
  s1.value = `${metadata.operator}\nResponsáveis pelo Estudo (Operador)`;
  s1.font = { size: 9, bold: true, color: { argb: 'FF1E293B' } };
  s1.alignment = { horizontal: 'center', wrapText: true };
  s1.border = { top: { style: 'thin', color: { argb: 'FF475569' } } };

  worksheet.mergeCells(`D${currentRow}:F${currentRow}`);
  const s2 = worksheet.getCell(`D${currentRow}`);
  s2.value = `${metadata.engineer}\nResponsável pela Análise`;
  s2.font = { size: 9, bold: true, color: { argb: 'FF1E293B' } };
  s2.alignment = { horizontal: 'center', wrapText: true };
  s2.border = { top: { style: 'thin', color: { argb: 'FF475569' } } };

  worksheet.mergeCells(`G${currentRow}:I${currentRow}`);
  const s3 = worksheet.getCell(`G${currentRow}`);
  s3.value = 'Gerência\nAprovação Final de Homologação';
  s3.font = { size: 9, bold: true, color: { argb: 'FF1E293B' } };
  s3.alignment = { horizontal: 'center', wrapText: true };
  s3.border = { top: { style: 'thin', color: { argb: 'FF475569' } } };

  worksheet.getRow(currentRow).height = 36;
  currentRow++;

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedPN = (metadata.partNumber || 'ESTUDO_CEP').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `Relatorio_Capabilidade_PTP_${sanitizedPN}_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
