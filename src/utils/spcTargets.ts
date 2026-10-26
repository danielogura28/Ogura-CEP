import { CepAnalysisConfig, FeatureClassification } from '../types';

export interface CapabilityTargetPreset {
  id: string;
  name: string;
  shortLabel: string;
  targetCpk: number;
  targetPpk: number;
  description: string;
  isSystem?: boolean;
}

export const SYSTEM_CAPABILITY_TARGETS: CapabilityTargetPreset[] = [
  {
    id: 'standard',
    name: 'Padrão AIAG / VDA (Cpk ≥ 1.33 | Ppk ≥ 1.33)',
    shortLabel: 'Padrão (1.33)',
    targetCpk: 1.33,
    targetPpk: 1.33,
    description: 'Requisito normativo clássico da IATF 16949 / AIAG SPC para características padrão de produção seriada (4 Sigma).',
    isSystem: true
  },
  {
    id: 'critical',
    name: 'Crítica / Segurança (Cpk ≥ 1.67 | Ppk ≥ 1.67)',
    shortLabel: 'Crítica / Segurança (1.67)',
    targetCpk: 1.67,
    targetPpk: 1.67,
    description: 'Exigência mandatória para características críticas de produto, segurança veicular, regulatórias ou alto risco (5 Sigma).',
    isSystem: true
  },
  {
    id: 'ppap_initial',
    name: 'Estudo Inicial PPAP (Cpk ≥ 1.33 | Ppk ≥ 1.67)',
    shortLabel: 'PPAP Inicial (1.33 / 1.67)',
    targetCpk: 1.33,
    targetPpk: 1.67,
    description: 'Diretriz AIAG PPAP: Ppk ≥ 1.67 exigido para aprovação de lote piloto/inicial de curto prazo e Cpk ≥ 1.33 em série.',
    isSystem: true
  },
  {
    id: 'six_sigma',
    name: 'Excelência / 6-Sigma (Cpk ≥ 2.00 | Ppk ≥ 2.00)',
    shortLabel: '6-Sigma / Alta Precisão (2.00)',
    targetCpk: 2.00,
    targetPpk: 2.00,
    description: 'Padrão de classe mundial para componentes aeroespaciais, médicos ou eletrônica de ponta (< 3,4 PPM de defeito).',
    isSystem: true
  },
  {
    id: 'broad',
    name: 'Tolerância Ampla / Não Crítica (Cpk ≥ 1.00 | Ppk ≥ 1.00)',
    shortLabel: 'Tolerância Ampla (1.00)',
    targetCpk: 1.00,
    targetPpk: 1.00,
    description: 'Processos secundários ou características com ampla folga de montagem onde 3 Sigma (1.00) é contratualmente aceitável.',
    isSystem: true
  }
];

const LOCAL_STORAGE_TARGETS_KEY = 'ptp_spc_user_targets_v1';

/**
 * Retorna a lista de metas personalizadas gravadas pelo usuário no navegador.
 */
export function getSavedCustomTargets(): CapabilityTargetPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TARGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        ...item,
        isSystem: false
      }));
    }
    return [];
  } catch (err) {
    console.warn('Erro ao carregar metas personalizadas do localStorage:', err);
    return [];
  }
}

/**
 * Retorna todas as metas disponíveis (Pré-definidas do Sistema + Personalizadas pelo Usuário).
 */
export function getAllCapabilityTargets(): CapabilityTargetPreset[] {
  const custom = getSavedCustomTargets();
  return [...SYSTEM_CAPABILITY_TARGETS, ...custom];
}

/**
 * Salva uma nova meta personalizada no localStorage.
 */
export function saveCustomCapabilityTarget(
  target: Omit<CapabilityTargetPreset, 'id' | 'isSystem'> & { id?: string }
): CapabilityTargetPreset[] {
  const current = getSavedCustomTargets();
  const id = target.id || `custom-target-${Date.now()}`;
  const record: CapabilityTargetPreset = {
    id,
    name: target.name.trim(),
    shortLabel: target.shortLabel.trim() || target.name.trim(),
    targetCpk: Number(target.targetCpk) || 1.33,
    targetPpk: Number(target.targetPpk) || Number(target.targetCpk) || 1.33,
    description: target.description?.trim() || `Meta personalizada: Cpk ≥ ${target.targetCpk} | Ppk ≥ ${target.targetPpk}`,
    isSystem: false
  };

  const existingIndex = current.findIndex((t) => t.id === id);
  let updated: CapabilityTargetPreset[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = record;
  } else {
    updated = [...current, record];
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_TARGETS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao salvar meta no localStorage:', err);
  }

  return updated;
}

/**
 * Remove uma meta personalizada pelo ID.
 */
export function deleteCustomCapabilityTarget(id: string): CapabilityTargetPreset[] {
  const current = getSavedCustomTargets();
  const updated = current.filter((t) => t.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_TARGETS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao excluir meta personalizada:', err);
  }
  return updated;
}

/**
 * Resolve as metas ativas de Cpk e Ppk a partir do objeto CepAnalysisConfig.
 * Mantém 100% de retrocompatibilidade com configurações antigas (onde só havia featureClassification = 'critical' ou 'standard').
 */
export function resolveCapabilityTargets(config?: Partial<CepAnalysisConfig> | null): {
  targetCpk: number;
  targetPpk: number;
  targetName: string;
  classification: FeatureClassification;
  isCustom: boolean;
} {
  if (!config) {
    return {
      targetCpk: 1.33,
      targetPpk: 1.33,
      targetName: 'Padrão AIAG (Cpk ≥ 1.33)',
      classification: 'standard',
      isCustom: false
    };
  }

  // 1. Se o config já possui targetCpk explícito definido pelo usuário
  if (typeof config.targetCpk === 'number' && config.targetCpk > 0) {
    const cpk = Number(config.targetCpk);
    const ppk = typeof config.targetPpk === 'number' && config.targetPpk > 0 ? Number(config.targetPpk) : cpk;
    const name = config.targetName || (config.featureClassification === 'critical' ? 'Crítica / Segurança' : 'Personalizada');
    return {
      targetCpk: cpk,
      targetPpk: ppk,
      targetName: name,
      classification: config.featureClassification || 'custom',
      isCustom: config.featureClassification === 'custom' || !['standard', 'critical'].includes(config.featureClassification || '')
    };
  }

  // 2. Busca na lista de presets pelo ID da featureClassification
  const all = getAllCapabilityTargets();
  const matched = all.find((t) => t.id === config.featureClassification);
  if (matched) {
    return {
      targetCpk: matched.targetCpk,
      targetPpk: matched.targetPpk,
      targetName: matched.name,
      classification: matched.id,
      isCustom: !matched.isSystem
    };
  }

  // 3. Fallback clássico ('critical' -> 1.67, padrão -> 1.33)
  if (config.featureClassification === 'critical') {
    return {
      targetCpk: 1.67,
      targetPpk: 1.67,
      targetName: 'Crítica / Segurança (Cpk ≥ 1.67)',
      classification: 'critical',
      isCustom: false
    };
  }

  return {
    targetCpk: 1.33,
    targetPpk: 1.33,
    targetName: 'Padrão (Cpk ≥ 1.33)',
    classification: 'standard',
    isCustom: false
  };
}
