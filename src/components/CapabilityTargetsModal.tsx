import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  Trash2,
  Sliders,
  Sparkles,
  Info,
  ShieldCheck,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  CapabilityTargetPreset,
  getAllCapabilityTargets,
  saveCustomCapabilityTarget,
  deleteCustomCapabilityTarget,
  resolveCapabilityTargets
} from '../utils/spcTargets';
import { CapabilityResults, CepAnalysisConfig } from '../types';

interface CapabilityTargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CepAnalysisConfig;
  onApplyTargets: (newTarget: {
    targetCpk: number;
    targetPpk: number;
    targetName: string;
    classification: string;
  }) => void;
  capability?: CapabilityResults;
}

export const CapabilityTargetsModal: React.FC<CapabilityTargetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onApplyTargets,
  capability
}) => {
  const currentResolved = resolveCapabilityTargets(config);

  const [activeTab, setActiveTab] = useState<'current' | 'catalog'>('current');
  const [targetCpk, setTargetCpk] = useState<number>(currentResolved.targetCpk);
  const [targetPpk, setTargetPpk] = useState<number>(currentResolved.targetPpk);
  const [targetName, setTargetName] = useState<string>(currentResolved.targetName);
  const [selectedClassification, setSelectedClassification] = useState<string>(currentResolved.classification);

  // Formulário para cadastrar nova meta no catálogo
  const [newMetaName, setNewMetaName] = useState('');
  const [newMetaShortLabel, setNewMetaShortLabel] = useState('');
  const [newMetaCpk, setNewMetaCpk] = useState<string>('1.50');
  const [newMetaPpk, setNewMetaPpk] = useState<string>('1.67');
  const [newMetaDescription, setNewMetaDescription] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Lista de todas as metas
  const [allTargets, setAllTargets] = useState<CapabilityTargetPreset[]>([]);

  useEffect(() => {
    if (isOpen) {
      const resolved = resolveCapabilityTargets(config);
      setTargetCpk(resolved.targetCpk);
      setTargetPpk(resolved.targetPpk);
      setTargetName(resolved.targetName);
      setSelectedClassification(resolved.classification);
      setAllTargets(getAllCapabilityTargets());
      setSaveSuccessMsg(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const currentCpkVal = capability?.cpk ?? null;
  const currentPpkVal = capability?.ppk ?? null;

  // Avaliação em tempo real
  const isCpkMet = currentCpkVal !== null ? currentCpkVal >= targetCpk : null;
  const isPpkMet = currentPpkVal !== null ? currentPpkVal >= targetPpk : null;
  const isOverallMet = isCpkMet && isPpkMet;

  const handleSelectPreset = (preset: CapabilityTargetPreset) => {
    setTargetCpk(preset.targetCpk);
    setTargetPpk(preset.targetPpk);
    setTargetName(preset.name);
    setSelectedClassification(preset.id);
  };

  const handleCreateNewTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetaName.trim()) return;

    const numCpk = parseFloat(newMetaCpk.replace(',', '.')) || 1.33;
    const numPpk = parseFloat(newMetaPpk.replace(',', '.')) || numCpk;

    const updated = saveCustomCapabilityTarget({
      name: newMetaName.trim(),
      shortLabel: newMetaShortLabel.trim() || newMetaName.trim(),
      targetCpk: numCpk,
      targetPpk: numPpk,
      description: newMetaDescription.trim() || `Meta customizada: Cpk ≥ ${numCpk} | Ppk ≥ ${numPpk}`
    });

    setAllTargets(getAllCapabilityTargets());
    setSaveSuccessMsg(`Nova meta "${newMetaName.trim()}" cadastrada com sucesso!`);

    // Seleciona automaticamente a nova meta criada
    setTargetCpk(numCpk);
    setTargetPpk(numPpk);
    setTargetName(newMetaName.trim());
    setSelectedClassification(`custom-${Date.now()}`);

    // Limpar campos
    setNewMetaName('');
    setNewMetaShortLabel('');
    setNewMetaDescription('');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleDeleteTarget = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomCapabilityTarget(id);
    setAllTargets(getAllCapabilityTargets());
  };

  const handleApply = () => {
    onApplyTargets({
      targetCpk: Number(targetCpk) || 1.33,
      targetPpk: Number(targetPpk) || Number(targetCpk) || 1.33,
      targetName: targetName.trim() || `Cpk ≥ ${targetCpk} | Ppk ≥ ${targetPpk}`,
      classification: selectedClassification
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col overflow-hidden max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-300">
              <Target className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-white">
                  Metas de Capabilidade (Cpk & Ppk)
                </h3>
                <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  IATF 16949 / CEP
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Defina ou adicione novas metas mínimas aceitáveis para aprovação do processo e laudo industrial.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-3 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'current'
                ? 'border-red-700 text-red-800 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajustar Metas Atuais</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'catalog'
                ? 'border-red-700 text-red-800 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Adicionar & Gerenciar Catálogo</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {allTargets.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          {activeTab === 'current' ? (
            <>
              {/* Card de Configuração das Metas Ativas */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Metas Aplicadas ao Estudo Ativo
                    </span>
                    <h4 className="font-semibold text-slate-900 text-sm">{targetName}</h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    Norma: {config.manualStandard === 'AIAG_VDA_1ST' ? 'AIAG & VDA 1ª Ed.' : 'AIAG 4ª Ed.'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Meta Cpk */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <Award className="w-4 h-4 text-red-700" />
                        <span>Meta Cpk (Curto Prazo)</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-500">≥ valor mínimo</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        max="5.00"
                        value={targetCpk}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setTargetCpk(val);
                          setSelectedClassification('custom');
                          setTargetName(`Personalizada (Cpk ≥ ${e.target.value})`);
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md font-mono text-base font-bold text-slate-900 text-center focus:border-red-700 focus:outline-hidden"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = +(targetCpk + 0.05).toFixed(2);
                            setTargetCpk(next);
                            setSelectedClassification('custom');
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          +0.05
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.max(0.1, +(targetCpk - 0.05).toFixed(2));
                            setTargetCpk(next);
                            setSelectedClassification('custom');
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          -0.05
                        </button>
                      </div>
                    </div>

                    {/* Chips rápidos de Cpk */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {[1.00, 1.33, 1.50, 1.67, 2.00].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setTargetCpk(val);
                            setSelectedClassification('custom');
                          }}
                          className={`px-2 py-0.5 rounded text-[10.5px] font-mono cursor-pointer transition-colors ${
                            targetCpk === val
                              ? 'bg-red-800 text-white font-bold'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {val.toFixed(2)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meta Ppk */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="w-4 h-4 text-blue-700" />
                        <span>Meta Ppk (Longo Prazo)</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-500">≥ valor mínimo</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        max="5.00"
                        value={targetPpk}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setTargetPpk(val);
                          setSelectedClassification('custom');
                          setTargetName(`Personalizada (Ppk ≥ ${e.target.value})`);
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md font-mono text-base font-bold text-slate-900 text-center focus:border-red-700 focus:outline-hidden"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = +(targetPpk + 0.05).toFixed(2);
                            setTargetPpk(next);
                            setSelectedClassification('custom');
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          +0.05
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.max(0.1, +(targetPpk - 0.05).toFixed(2));
                            setTargetPpk(next);
                            setSelectedClassification('custom');
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          -0.05
                        </button>
                      </div>
                    </div>

                    {/* Chips rápidos de Ppk */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {[1.00, 1.33, 1.50, 1.67, 2.00].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setTargetPpk(val);
                            setSelectedClassification('custom');
                          }}
                          className={`px-2 py-0.5 rounded text-[10.5px] font-mono cursor-pointer transition-colors ${
                            targetPpk === val
                              ? 'bg-blue-800 text-white font-bold'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {val.toFixed(2)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Simulation / Feedback Banner */}
                {currentCpkVal !== null && (
                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                      isOverallMet
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-red-50 border-red-300 text-red-950'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isOverallMet ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-xs">
                          {isOverallMet
                            ? 'Processo Aprovado com Estas Metas'
                            : 'Processo Reprovado / Abaixo da Meta'}
                        </div>
                        <div className="text-[11px] opacity-90 font-mono mt-0.5">
                          • Cpk Atual: <strong>{currentCpkVal.toFixed(3)}</strong>{' '}
                          {isCpkMet ? `≥ ${targetCpk.toFixed(2)} (Aprovado)` : `< ${targetCpk.toFixed(2)} (Reprovado)`}
                          {currentPpkVal !== null && (
                            <>
                              {' '}
                              | Ppk Atual: <strong>{currentPpkVal.toFixed(3)}</strong>{' '}
                              {isPpkMet ? `≥ ${targetPpk.toFixed(2)} (Aprovado)` : `< ${targetPpk.toFixed(2)} (Reprovado)`}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-[10.5px] font-bold font-mono tracking-wider ${
                        isOverallMet ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {isOverallMet ? 'CAPAZ' : 'INSUFICIENTE'}
                    </span>
                  </div>
                )}
              </div>

              {/* Seletor Rápido de Presets / Catálogo */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Escolher a partir das Metas Cadastradas:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allTargets.map((item) => {
                    const isSelected =
                      targetCpk === item.targetCpk && targetPpk === item.targetPpk;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectPreset(item)}
                        className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-red-50/70 border-red-500 ring-1 ring-red-400'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-slate-900 text-xs">{item.shortLabel}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            Cpk ≥ {item.targetCpk} | Ppk ≥ {item.targetPpk}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Formulário de Cadastro de Nova Meta */}
              <form onSubmit={handleCreateNewTarget} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                  <Bookmark className="w-4 h-4 text-red-700" />
                  <span className="font-bold text-slate-900 text-xs">
                    Cadastrar Nova Meta Personalizada de Capabilidade
                  </span>
                </div>

                {saveSuccessMsg && (
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nome / Título da Meta: <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Montadora VW - Cota Crítica"
                      value={newMetaName}
                      onChange={(e) => setNewMetaName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:border-red-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Rótulo Curto (para botões e dropdown):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: VW Cota Crítica (1.50 / 1.67)"
                      value={newMetaShortLabel}
                      onChange={(e) => setNewMetaShortLabel(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:border-red-700 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Meta Mínima Cpk (Curto Prazo): <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 1.50"
                      value={newMetaCpk}
                      onChange={(e) => setNewMetaCpk(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold focus:border-red-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Meta Mínima Ppk (Longo Prazo): <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 1.67"
                      value={newMetaPpk}
                      onChange={(e) => setNewMetaPpk(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold focus:border-red-700 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Justificativa / Norma de Origem (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Exigência do Manual de Fornecedores do Cliente XPTO rev. 2026"
                    value={newMetaDescription}
                    onChange={(e) => setNewMetaDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:border-red-700 focus:outline-hidden"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Salvar no Catálogo de Metas</span>
                  </button>
                </div>
              </form>

              {/* Lista Completa das Metas Cadastradas */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Catálogo Atual de Metas ({allTargets.length})
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {allTargets.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate">{item.name}</span>
                          {item.isSystem ? (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium shrink-0">
                              Norma Sistema
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold shrink-0">
                              Personalizada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono text-xs">
                          <span className="text-slate-800 font-bold">Cpk ≥ {item.targetCpk.toFixed(2)}</span>
                          <span className="text-slate-400 mx-1">|</span>
                          <span className="text-slate-800 font-bold">Ppk ≥ {item.targetPpk.toFixed(2)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleSelectPreset(item);
                            setActiveTab('current');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs cursor-pointer"
                        >
                          Usar
                        </button>

                        {!item.isSystem && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTarget(item.id, e)}
                            className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Excluir meta personalizada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Meta ativa selecionada: <strong>Cpk ≥ {targetCpk.toFixed(2)}</strong> e{' '}
              <strong>Ppk ≥ {targetPpk.toFixed(2)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-md font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aplicar Metas ao Estudo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
