import React, { useState, useEffect } from 'react';
import {
  CriticalAnalysisData,
  CapabilityResults,
  NelsonViolation,
  ProcessSpecs,
  SpcReportMetadata,
  FeatureClassification
} from '../types';
import {
  AlertOctagon,
  X,
  Save,
  CheckCircle2,
  Calendar,
  User,
  ShieldAlert,
  FileCheck2,
  Lightbulb,
  Sparkles,
  Printer,
  Trash2
} from 'lucide-react';
import { getViolationDiagnosis, getCapabilityDiagnosis } from '../utils/spcDiagnostics';

interface CriticalAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: CriticalAnalysisData | null;
  onSave: (data: CriticalAnalysisData) => void;
  onDelete?: () => void;
  onOpenReport?: () => void;
  capability: CapabilityResults;
  violations: NelsonViolation[];
  specs: ProcessSpecs;
  metadata: SpcReportMetadata;
  featureClassification: FeatureClassification;
  targetCpk?: number;
  targetPpk?: number;
  initialTrigger?: string;
}

export const CriticalAnalysisModal: React.FC<CriticalAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onSave,
  onDelete,
  onOpenReport,
  capability,
  violations,
  specs,
  metadata,
  featureClassification,
  targetCpk,
  targetPpk,
  initialTrigger
}) => {
  const benchmark = targetCpk ?? (featureClassification === 'critical' ? 1.67 : 1.33);
  const benchmarkPpk = targetPpk ?? benchmark;
  const isCpkFailed = (capability.cpk ?? 0) < benchmark;
  const isPpkFailed = (capability.ppk ?? 0) < benchmarkPpk;
  const hasViolations = violations.length > 0;

  // Auto-generate suggested trigger summary
  const defaultTrigger =
    initialTrigger ||
    (hasViolations && isCpkFailed
      ? `Causas Especiais (${violations.length} ocorrências) e Cpk Reprovado (${capability.cpk?.toFixed(2)} < ${benchmark.toFixed(2)})`
      : hasViolations
      ? `Causas Especiais Detectadas nas Cartas de Controle (${violations.length} ocorrência(s))`
      : isCpkFailed
      ? `Índice de Capabilidade Cpk Reprovado (${capability.cpk?.toFixed(2)} vs meta ≥ ${benchmark.toFixed(2)})`
      : isPpkFailed
      ? `Desempenho Geral Ppk Abaixo da Meta (${capability.ppk?.toFixed(2)} vs meta ≥ ${benchmark.toFixed(2)})`
      : 'Avaliação Crítica Preventiva de Processo');

  // Intelligent pre-fill suggestions from diagnostics
  let suggestedCause = '';
  let suggestedAction = '';

  if (hasViolations) {
    const diag = getViolationDiagnosis(violations[0].ruleNumber);
    suggestedCause = diag.defaultRootCauseSuggestion || '';
    suggestedAction = diag.defaultActionPlanSuggestion || '';
  } else if (isCpkFailed) {
    const diag = getCapabilityDiagnosis('cpk', capability.cpk, benchmark, specs, capability.mean, featureClassification);
    suggestedCause = diag.defaultRootCauseSuggestion || '';
    suggestedAction = diag.defaultActionPlanSuggestion || '';
  }

  // Form states
  const [triggeredBy, setTriggeredBy] = useState(defaultTrigger);
  const [whatHappened, setWhatHappened] = useState('');
  const [actionPlans, setActionPlans] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsible, setResponsible] = useState(metadata.engineer || metadata.operator || '');
  const [lotDisposition, setLotDisposition] = useState('Lote Segregado para Inspeção e Triagem 100%');
  const [status, setStatus] = useState<'Aberta' | 'Em Andamento' | 'Concluída'>('Aberta');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when modal opens or analysis prop changes
  useEffect(() => {
    if (isOpen) {
      if (analysis) {
        setTriggeredBy(analysis.triggeredBy || defaultTrigger);
        setWhatHappened(analysis.whatHappened || '');
        setActionPlans(analysis.actionPlans || '');
        setDeadline(analysis.deadline || '');
        setResponsible(analysis.responsible || metadata.engineer || metadata.operator || '');
        setLotDisposition(analysis.lotDisposition || 'Lote Segregado para Inspeção e Triagem 100%');
        setStatus(analysis.status || 'Aberta');
      } else {
        setTriggeredBy(defaultTrigger);
        setWhatHappened(suggestedCause);
        setActionPlans(suggestedAction);
        // Default deadline: 48h from today
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 2);
        setDeadline(targetDate.toLocaleDateString('pt-BR'));
        setResponsible(metadata.engineer || metadata.operator || 'Eng. Roberto F. Silva');
        setLotDisposition('Lote Segregado para Inspeção e Triagem 100%');
        setStatus('Aberta');
      }
      setSavedSuccess(false);
    }
  }, [isOpen, analysis, defaultTrigger, suggestedCause, suggestedAction, metadata]);

  if (!isOpen) return null;

  const handleSave = (andOpenReport = false) => {
    const payload: CriticalAnalysisData = {
      id: analysis?.id || `CA-${Date.now().toString().slice(-6)}`,
      createdAt: analysis?.createdAt || new Date().toLocaleString('pt-BR'),
      triggeredBy,
      whatHappened: whatHappened.trim(),
      actionPlans: actionPlans.trim(),
      deadline: deadline.trim(),
      responsible: responsible.trim(),
      lotDisposition,
      status
    };

    onSave(payload);
    setSavedSuccess(true);

    if (andOpenReport && onOpenReport) {
      setTimeout(() => {
        onClose();
        onOpenReport();
      }, 350);
    } else {
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  const quickCauses = [
    'Desgaste acentuado da ferramenta / pastilha de corte',
    'Variação no lote de resina/matéria-prima (índice MFI divergente)',
    'Descentralização do offset na regulagem da máquina',
    'Descalibração ou folga no micrômetro / paquímetro',
    'Oscilação térmica no sistema de aquecimento do canhão/molde',
    'Velocidade de avanço ou pressão fora do padrão de processo'
  ];

  const quickActions = [
    '1. Segregar o lote produzido para triagem dimensional 100%;',
    '2. Ajustar o offset na IHM da máquina para alinhar ao alvo nominal;',
    '3. Substituição preventiva da pastilha/ferramenta desgastada;',
    '4. Recalibrar o instrumento de medição com bloco padrão de referência;',
    '5. Auditar e registrar parâmetros na folha de instrução de trabalho (SOP);',
    '6. Coletar nova amostra piloto de 25 peças para comprovação de Cpk ≥ 1.33.'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/90 border border-red-500/50 flex items-center justify-center text-white shadow-inner">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base tracking-wide text-white">
                  Análise Crítica & Plano de Ação Corretiva
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-semibold">
                  IATF 16949 / CAPA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Investigação de causas especiais e desvios de capabilidade (Cpk / Ppk) para registro e laudo industrial.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Motivo do Disparo (Alert Banner) */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-950">Gatilho do Estudo: </span>
              <span className="font-medium">{triggeredBy}</span>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Produto: <strong className="font-mono">{metadata.partNumber}</strong> — {metadata.partName} | Máquina: <strong className="font-mono">{metadata.machine}</strong>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 border border-amber-300">
              Ação Requerida
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 md:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Campo 1: O que pode ter acontecido? */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">1</span>
                <span>O que pode ter acontecido? (Investigação e Hipótese de Causa Raiz)</span>
                <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-sans">Explicação simples do desvio</span>
            </div>

            <textarea
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              rows={3}
              placeholder="Explique detalhadamente o que ocorreu no processo, máquina, matéria-prima ou medição que gerou o ponto fora de controle ou a perda de capabilidade..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-sans text-slate-800 leading-relaxed shadow-2xs"
            />

            {/* Quick Sugestões para o Campo 1 */}
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3 text-amber-600" /> Inserir hipótese comum com 1 clique:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickCauses.map((cause, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWhatHappened((prev) => (prev ? `${prev}\n• ${cause}` : `• ${cause}`));
                    }}
                    className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 px-2 py-1 rounded border border-slate-200 transition-colors cursor-pointer text-left"
                  >
                    + {cause}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Campo 2: Quais serão os planos de ações? */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">2</span>
                <span>Quais serão os planos de ações? (Contenção, Correção e Prevenção)</span>
                <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-sans">Ações práticas para resolução</span>
            </div>

            <textarea
              value={actionPlans}
              onChange={(e) => setActionPlans(e.target.value)}
              rows={4}
              placeholder="Liste as ações imediatas (segregação de peças), ações corretivas na máquina e ações preventivas para garantir que o problema não volte a ocorrer..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-sans text-slate-800 leading-relaxed shadow-2xs"
            />

            {/* Quick Sugestões para o Campo 2 */}
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <Lightbulb className="w-3 h-3 text-teal-600" /> Sugestões de planos de ação recomendados:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((act, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActionPlans((prev) => (prev ? `${prev}\n${act}` : act));
                    }}
                    className="text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-900 hover:border-teal-300 px-2 py-1 rounded border border-teal-200 transition-colors cursor-pointer text-left"
                  >
                    + {act.replace(/^[0-9]\.\s*/, '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Campos 3, 4, 5, 6: Prazo, Responsável, Disposição e Status em Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3 border-t border-slate-100">
            {/* Campo 3: Qual será o prazo? */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Qual será o prazo?</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="Ex: 24h / 22/10/2026"
                className="w-full text-xs p-2 rounded border border-slate-300 focus:border-blue-600 outline-hidden font-mono text-slate-800"
              />
              <div className="flex gap-1 text-[9px] text-slate-500 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setDeadline(`24h (${d.toLocaleDateString('pt-BR')})`);
                  }}
                  className="hover:underline text-blue-600"
                >
                  24h
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 2);
                    setDeadline(`48h (${d.toLocaleDateString('pt-BR')})`);
                  }}
                  className="hover:underline text-blue-600"
                >
                  48h
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setDeadline(`7 dias (${d.toLocaleDateString('pt-BR')})`);
                  }}
                  className="hover:underline text-blue-600"
                >
                  7 dias
                </button>
              </div>
            </div>

            {/* Campo 4: Responsável */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>Responsável</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome do responsável"
                className="w-full text-xs p-2 rounded border border-slate-300 focus:border-blue-600 outline-hidden text-slate-800 font-sans"
              />
              <span className="text-[10px] text-slate-400 block truncate">
                Líder de processo / Engenharia
              </span>
            </div>

            {/* Campo 5: Disposição do Lote */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Disposição do Lote</span>
              </label>
              <select
                value={lotDisposition}
                onChange={(e) => setLotDisposition(e.target.value)}
                className="w-full text-xs p-2 rounded border border-slate-300 focus:border-blue-600 outline-hidden text-slate-800 bg-white"
              >
                <option value="Lote Segregado para Inspeção e Triagem 100%">
                  Bloqueado / Triagem 100%
                </option>
                <option value="Aprovado sob Concessão Técnica do Cliente">
                  Aprovado com Concessão
                </option>
                <option value="Retrabalho Interno Autorizado">
                  Retrabalho Autorizado
                </option>
                <option value="Refugo Total / Sucateamento">
                  Refugo / Descarte
                </option>
                <option value="Liberado após Recentralização de Máquina">
                  Liberado após Ajuste
                </option>
              </select>
              <span className="text-[10px] text-slate-400 block truncate">
                Status físico das peças
              </span>
            </div>

            {/* Campo 6: Status */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                <span>Status da Ação</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className={`w-full text-xs p-2 rounded font-bold border focus:border-blue-600 outline-hidden ${
                  status === 'Concluída'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : status === 'Em Andamento'
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                <option value="Aberta">🔴 Aberta</option>
                <option value="Em Andamento">🟡 Em Andamento</option>
                <option value="Concluída">🟢 Concluída</option>
              </select>
              <span className="text-[10px] text-slate-400 block truncate">
                Acompanhamento CAPA
              </span>
            </div>
          </div>

          {/* Feedback de sucesso */}
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Análise Crítica e Planos de Ações salvos com sucesso! Integrados ao Relatório Oficial A4.</span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-100 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {analysis && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-xs px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors flex items-center gap-1"
                title="Remover análise crítica"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            )}
            <span className="text-[11px] text-slate-500 font-serif italic hidden sm:inline">
              Estudo plotado no relatório oficial da empresa
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3.5 py-1.5 text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-colors font-medium shadow-2xs"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="text-xs px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Salvar Análise Crítica
            </button>

            {onOpenReport && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="text-xs px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Salvar e abrir imediatamente no layout industrial A4 para impressão"
              >
                <Printer className="w-3.5 h-3.5 text-teal-400" /> Salvar & Abrir no Relatório A4
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
