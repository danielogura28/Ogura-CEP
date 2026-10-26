import { ArchivedSpcReport, CepDataPoint, ProcessSpecs, SpcReportMetadata, CepAnalysisConfig, CriticalAnalysisData, CapabilityResults, ControlLimits, NelsonViolation } from '../types';
import { SPC_DATASETS } from './spcDatasets';
import { computeControlLimits, evaluateNelsonRules, computeProcessCapability } from './spcStatistics';

const DB_NAME = 'PtpSpcDatabase_v1';
const DB_VERSION = 1;
const STORE_NAME = 'archived_reports';
export const MAX_ARCHIVE_CAPACITY = 100;
const LOCALSTORAGE_FALLBACK_KEY = 'ptp_archived_reports_fallback_v1';

/**
 * Opens or upgrades the IndexedDB database instance.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado no ambiente atual'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('partNumber', 'metadata.partNumber', { unique: false });
        store.createIndex('status', 'summary.status', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// LocalStorage fallback helpers in case IndexedDB is restricted in some iframe sandboxes
function getLocalStorageReports(): ArchivedSpcReport[] {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStorageReports(reports: ArchivedSpcReport[]): void {
  try {
    localStorage.setItem(LOCALSTORAGE_FALLBACK_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Falha ao gravar no localStorage fallback:', err);
  }
}

/**
 * Retrieves all saved reports from the archive, sorted by updatedAt/createdAt descending.
 */
export async function getAllArchivedReports(): Promise<ArchivedSpcReport[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: ArchivedSpcReport[] = request.result || [];
        items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        resolve(items);
      };

      request.onerror = () => {
        resolve(getLocalStorageReports());
      };
    });
  } catch {
    return getLocalStorageReports();
  }
}

/**
 * Retrieves a single report snapshot by its ID.
 */
export async function getArchivedReportById(id: string): Promise<ArchivedSpcReport | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        const local = getLocalStorageReports();
        resolve(local.find((r) => r.id === id) || null);
      };
    });
  } catch {
    const local = getLocalStorageReports();
    return local.find((r) => r.id === id) || null;
  }
}

/**
 * Saves a new report or updates an existing one in the archive.
 * Enforces the 100-report archive capacity rule.
 */
export async function saveReportToArchive(
  data: {
    id?: string;
    title?: string;
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
): Promise<{ report: ArchivedSpcReport; isNew: boolean }> {
  const existingReports = await getAllArchivedReports();
  const isUpdate = Boolean(data.id && existingReports.some((r) => r.id === data.id));

  if (!isUpdate && existingReports.length >= MAX_ARCHIVE_CAPACITY) {
    throw new Error(
      `O banco de dados atingiu a capacidade máxima de ${MAX_ARCHIVE_CAPACITY} relatórios. Exclua um relatório antigo para arquivar um novo.`
    );
  }

  const now = new Date().toISOString();
  const reportId = data.id || `REP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const reportTitle =
    data.title || `${data.metadata.partNumber} - ${data.metadata.partName} (${data.specs.metricName})`;

  const record: ArchivedSpcReport = {
    id: reportId,
    title: reportTitle,
    createdAt: isUpdate ? existingReports.find((r) => r.id === data.id)?.createdAt || now : now,
    updatedAt: now,
    metadata: data.metadata,
    specs: data.specs,
    config: data.config,
    points: data.points,
    summary: data.summary,
    criticalAnalysis: data.criticalAnalysis || null,
    isFavorite: data.isFavorite ?? false,
    tags: data.tags || [],
    notes: data.notes || data.metadata.notes || ''
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao salvar no IndexedDB, usando fallback:', err);
  }

  // Always keep localStorage fallback synchronized
  const updatedList = isUpdate
    ? existingReports.map((r) => (r.id === record.id ? record : r))
    : [record, ...existingReports];
  saveLocalStorageReports(updatedList);

  return { report: record, isNew: !isUpdate };
}

/**
 * Deletes a report from the database by ID.
 */
export async function deleteArchivedReport(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao deletar no IndexedDB, usando fallback:', err);
  }

  const list = getLocalStorageReports().filter((r) => r.id !== id);
  saveLocalStorageReports(list);
  return true;
}

/**
 * Deletes multiple reports from the database by an array of IDs.
 */
export async function deleteMultipleReports(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  const idSet = new Set(ids);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Erro ao excluir em lote no IndexedDB:', err);
  }

  const list = getLocalStorageReports().filter((r) => !idSet.has(r.id));
  saveLocalStorageReports(list);
  return ids.length;
}

/**
 * Clears all reports from the database.
 */
export async function clearAllArchivedReports(): Promise<boolean> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao limpar IndexedDB:', err);
  }

  saveLocalStorageReports([]);
  return true;
}

/**
 * Resets the database by wiping it and re-seeding the standard factory benchmark studies.
 */
export async function resetToInitialFactoryReports(): Promise<ArchivedSpcReport[]> {
  await clearAllArchivedReports();
  return await seedInitialReportsIfEmpty();
}

/**
 * Toggles the favorite flag of an archived report.
 */
export async function toggleFavoriteReport(id: string): Promise<boolean> {
  const report = await getArchivedReportById(id);
  if (!report) return false;
  report.isFavorite = !report.isFavorite;
  report.updatedAt = new Date().toISOString();
  await saveReportToArchive(report);
  return report.isFavorite;
}

/**
 * Returns current database capacity usage metrics.
 */
export async function getDatabaseStats(): Promise<{
  count: number;
  maxCapacity: number;
  available: number;
  percentUsed: number;
  approvedCount: number;
  rejectedCount: number;
  alertCount: number;
}> {
  const reports = await getAllArchivedReports();
  const count = reports.length;
  const approvedCount = reports.filter((r) => r.summary.status === 'APPROVED').length;
  const rejectedCount = reports.filter((r) => r.summary.status === 'REJECTED').length;
  const alertCount = reports.filter((r) => r.summary.status === 'CONDITIONALLY_APPROVED').length;

  return {
    count,
    maxCapacity: MAX_ARCHIVE_CAPACITY,
    available: Math.max(0, MAX_ARCHIVE_CAPACITY - count),
    percentUsed: Math.min(100, Math.round((count / MAX_ARCHIVE_CAPACITY) * 100)),
    approvedCount,
    rejectedCount,
    alertCount
  };
}

/**
 * Seeds initial benchmark studies if database is currently empty.
 */
export async function seedInitialReportsIfEmpty(): Promise<ArchivedSpcReport[]> {
  const existing = await getAllArchivedReports();
  if (existing.length > 0) return existing;

  const defaultStudies = [
    {
      dataset: SPC_DATASETS[0],
      meta: {
        companyName: 'Petropol Polímeros & Compostos Industriais',
        partName: 'Composto Termoplástico de Engenharia',
        partNumber: 'PP-COMPOUND-40GF',
        operation: 'OP-10 Extrusão e Composição Reativa',
        machine: 'Extrusora Dupla-Rosca Coperion ZSK-58',
        gauge: 'Plastômetro Melt Flow Tester ASTM D1238',
        studyDate: '21/10/2026',
        operator: 'Daniel Ogura (Resp. Métrologia & Qualidade)',
        engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
        department: 'Laboratório de Controle de Qualidade (CQ)',
        lotNumber: 'LOTE-2026-B08',
        notes: 'Estudo de Capabilidade de Processo Inicial para Homologação de Lote.'
      }
    },
    {
      dataset: SPC_DATASETS[1],
      meta: {
        companyName: 'Petropol Indústria de Transformação Plástica',
        partName: 'Bucha Guia Cilíndrica de Precisão 25mm',
        partNumber: 'BUCHA-INJ-25MM-C8',
        operation: 'OP-20 Injeção em Molde de 8 Cavidades',
        machine: 'Injetora Engel 150T (Posto #04)',
        gauge: 'Micrômetro Digital Mitutoyo 0.001mm',
        studyDate: '18/10/2026',
        operator: 'Carlos E. Mendes (Operador Turno A)',
        engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
        department: 'Garantia da Qualidade & Metrologia',
        lotNumber: 'LOTE-MOLDE-08C',
        notes: 'Estudo com Análise de Correlação Espacial entre Cavidades de Injeção.'
      }
    },
    {
      dataset: SPC_DATASETS[2],
      meta: {
        companyName: 'Petropol Laboratório de Caracterização Mecânica',
        partName: 'Corpo de Prova Normalizado para Impacto Izod',
        partNumber: 'CP-IZOD-ASTM-D256',
        operation: 'OP-30 Ensaio Físico-Mecânico de P&D',
        machine: 'Pêndulo de Impacto Digital Ceast 25J',
        gauge: 'Pêndulo Instrumentado com Entalhador Micrométrico',
        studyDate: '15/10/2026',
        operator: 'Marcos Vinicius (Técnico de Laboratório)',
        engineer: 'Eng. Roberto F. Silva (CREA 58.291/SP)',
        department: 'P&D e Desenvolvimento de Aplicações',
        lotNumber: 'LOTE-PILOTO-IZOD',
        notes: 'Estudo de Capabilidade com Subgrupos Racionais (n=5).'
      }
    }
  ];

  for (const item of defaultStudies) {
    const ds = item.dataset;
    const chartType = ds.subgroupSize > 1 ? 'Xbar-R' : 'I-MR';
    const { limits, primaryPoints } = computeControlLimits(ds.data, chartType, ds.subgroupSize);
    const violations = evaluateNelsonRules(primaryPoints, limits.centerLine, limits.sigmaWithin, {
      1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: false, 8: false
    });
    const cap = computeProcessCapability(
      ds.data.map((p) => p.value),
      ds.specs,
      limits.sigmaWithin,
      limits.sigmaOverall,
      limits.avgRange ?? 0,
      limits.d2 ?? 1.128
    );

    const isCpkOk = (cap.cpk ?? 0) >= 1.33;
    const isStable = violations.length === 0;
    const status = !isCpkOk && !isStable ? 'REJECTED' : !isCpkOk ? 'REJECTED' : !isStable ? 'CONDITIONALLY_APPROVED' : 'APPROVED';

    await saveReportToArchive({
      title: `${item.meta.partNumber} - ${item.meta.partName}`,
      metadata: item.meta,
      specs: ds.specs,
      config: {
        chartType,
        subgroupSize: ds.subgroupSize,
        manualStandard: 'AIAG_SPC_4TH',
        featureClassification: 'standard',
        rule1: true, rule2: true, rule3: true, rule4: true, rule5: true, rule6: true, rule7: false, rule8: false,
        showDescriptivesTable: true, showControlChart: true, showCapabilityAnalysis: true, showNelsonRulesTable: true,
        showSerialCorrelation: true, showSpatialCavityAnalysis: true, showInterpretation: true, showOperatorGuide: true,
        plotControlChart: true, plotSubControlChart: true, plotCapabilityHistogram: true, plotACF: true, plotSpatialCavityMap: true, plotNormalProbPlot: true
      },
      points: ds.data,
      summary: {
        n: ds.data.length,
        mean: cap.mean,
        cpk: cap.cpk,
        ppk: cap.ppk,
        status,
        violationsCount: violations.length,
        metricUnit: ds.specs.unit
      },
      notes: item.meta.notes
    });
  }

  return getAllArchivedReports();
}

/**
 * Exports all archived reports to a JSON string for full database backup.
 */
export async function exportArchiveToJson(): Promise<string> {
  const reports = await getAllArchivedReports();
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    totalReports: reports.length,
    reports
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Imports reports from a backup JSON string.
 */
export async function importArchiveFromJson(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString);
  const items: ArchivedSpcReport[] = Array.isArray(data) ? data : data.reports;
  if (!Array.isArray(items)) {
    throw new Error('Arquivo de backup inválido.');
  }

  let imported = 0;
  for (const item of items) {
    if (item.metadata && item.specs && item.points) {
      await saveReportToArchive(item);
      imported++;
    }
  }
  return imported;
}
