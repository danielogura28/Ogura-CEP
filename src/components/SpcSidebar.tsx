import React, { useState } from 'react';
import {
  CepAnalysisConfig,
  ControlChartType,
  FeatureClassification,
  ProcessSpecs,
  SpcManualStandard
} from '../types';
import {
  ChevronDown,
  ChevronRight,
  Sliders,
  Activity,
  Layers,
  FileText,
  AlertOctagon,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  CheckSquare,
  FilePlus2,
  Database,
  Target,
  PlusCircle
} from 'lucide-react';
import { getAllCapabilityTargets, resolveCapabilityTargets } from '../utils/spcTargets';

interface SpcSidebarProps {
  config: CepAnalysisConfig;
  onChangeConfig: (newConfig: CepAnalysisConfig) => void;
  specs: ProcessSpecs;
  onChangeSpecs: (newSpecs: ProcessSpecs) => void;
  totalPointsCount: number;
  onOpenNewChart?: () => void;
  onOpenArchive?: () => void;
  archiveCount?: number;
  onOpenTargetsModal?: () => void;
}

export const SpcSidebar: React.FC<SpcSidebarProps> = ({
  config,
  onChangeConfig,
  specs,
  onChangeSpecs,
  totalPointsCount,
  onOpenNewChart,
  onOpenArchive,
  archiveCount,
  onOpenTargetsModal
}) => {
  const [openSections, setOpenSections] = useState({
    manuals: true,
    chartType: true,
    specs: true,
    nelsonRules: true,
    capability: true,
    correlations: true,
    plots: true,
    reporting: true
  });

  const toggleSection = (s: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const update = (partial: Partial<CepAnalysisConfig>) => {
    onChangeConfig({ ...config, ...partial });
  };

  return (
    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden select-none shrink-0 text-xs">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-red-700" />
          <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
            Painel PTP — CEP / SPC
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">{totalPointsCount} Amostras</span>
      </div>

      {/* Quick Actions: Iniciar Nova Carta & Banco de Relatórios */}
      <div className="p-2 border-b border-slate-200 bg-slate-50 space-y-1.5">
        {onOpenNewChart && (
          <button
            onClick={onOpenNewChart}
            className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer text-xs"
            title="Iniciar Nova Carta de Controle (solicitar produto, tolerâncias, máquina e responsável)"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>Iniciar Nova Carta</span>
          </button>
        )}

        {onOpenArchive && (
          <button
            onClick={onOpenArchive}
            className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-red-300 hover:text-white rounded font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer text-xs"
            title="Acessar o Banco de Relatórios para consultar estudos arquivados ou excluir"
          >
            <Database className="w-3.5 h-3.5 text-red-400" />
            <span>Banco de Relatórios</span>
            {typeof archiveCount === 'number' && archiveCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-950 text-red-300 border border-red-800 font-mono text-[10px] font-bold">
                {archiveCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Accordions */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {/* Section 0: Manual Standard Selection */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('manuals')}
            className="w-full flex items-center justify-between text-left font-medium text-slate-800 hover:text-red-700 py-1"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-red-700" /> Manual de Referência Automotivo
            </span>
            {openSections.manuals ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.manuals && (
            <div className="mt-2 space-y-2 pl-1 pt-1">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Diretriz Normativa:
                </label>
                <select
                  value={config.manualStandard}
                  onChange={(e) => update({ manualStandard: e.target.value as SpcManualStandard })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:border-red-700 focus:outline-hidden font-medium"
                >
                  <option value="AIAG_SPC_4TH">Manual AIAG CEP (4ª Edição)</option>
                  <option value="AIAG_VDA_1ST">Manual AIAG & VDA (1ª Edição)</option>
                </select>
              </div>

              {/* Targets and Classification */}
              {(() => {
                const resolved = resolveCapabilityTargets(config);
                const allTargets = getAllCapabilityTargets();

                return (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-red-700" />
                        <span>Metas de Capabilidade (Cpk & Ppk):</span>
                      </label>
                      {onOpenTargetsModal && (
                        <button
                          type="button"
                          onClick={onOpenTargetsModal}
                          className="text-[10px] text-red-700 hover:text-red-900 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Gerenciar</span>
                        </button>
                      )}
                    </div>

                    <select
                      value={config.featureClassification}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__NEW_TARGET__') {
                          onOpenTargetsModal?.();
                          return;
                        }
                        const found = allTargets.find((t) => t.id === val);
                        if (found) {
                          update({
                            featureClassification: found.id as FeatureClassification,
                            targetCpk: found.targetCpk,
                            targetPpk: found.targetPpk,
                            targetName: found.name
                          });
                        } else {
                          update({ featureClassification: val as FeatureClassification });
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:border-red-700 focus:outline-hidden font-medium"
                    >
                      {allTargets.map((tgt) => (
                        <option key={tgt.id} value={tgt.id}>
                          {tgt.name}
                        </option>
                      ))}
                      {config.featureClassification === 'custom' && (
                        <option value="custom">
                          Personalizada (Cpk ≥ {resolved.targetCpk.toFixed(2)} | Ppk ≥ {resolved.targetPpk.toFixed(2)})
                        </option>
                      )}
                      <option value="__NEW_TARGET__" className="font-bold text-red-700">
                        ➕ Adicionar Nova Meta ao Catálogo...
                      </option>
                    </select>

                    {/* Numeric Inputs for Target Cpk and Target Ppk */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">
                          Meta Mín. Cpk
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0.10"
                            max="5.00"
                            value={resolved.targetCpk}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                update({
                                  targetCpk: val,
                                  featureClassification: 'custom',
                                  targetName: `Personalizada (Cpk ≥ ${val})`
                                });
                              }
                            }}
                            className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center text-slate-800 focus:border-red-700 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">
                          Meta Mín. Ppk
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0.10"
                            max="5.00"
                            value={resolved.targetPpk}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                update({
                                  targetPpk: val,
                                  featureClassification: 'custom',
                                  targetName: `Personalizada (Ppk ≥ ${val})`
                                });
                              }
                            }}
                            className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center text-slate-800 focus:border-red-700 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600 leading-tight">
                {config.manualStandard === 'AIAG_VDA_1ST' ? (
                  <span>
                    <strong>AIAG & VDA (1ª Ed.):</strong> Enfatiza prevenção de falhas, severidade, matriz de decisão e matriz harmonizada de capabilidade.
                  </span>
                ) : (
                  <span>
                    <strong>AIAG CEP (4ª Ed.):</strong> Referência clássica da IATF 16949 para cartas de controle Shewhart e índices Cp/Cpk/Pp/Ppk.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Type of Control Chart */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('chartType')}
            className="w-full flex items-center justify-between text-left font-medium text-slate-800 hover:text-red-700 py-1"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <Activity className="w-3.5 h-3.5 text-red-700" /> Tipo de Carta de Controle
            </span>
            {openSections.chartType ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.chartType && (
            <div className="mt-2 space-y-2 pl-1 pt-1">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Modelo de Carta Shewhart:
                </label>
                <select
                  value={config.chartType}
                  onChange={(e) => update({ chartType: e.target.value as ControlChartType })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:border-red-700 focus:outline-hidden"
                >
                  <option value="I-MR">Carta I-MR (Valores Individuais & Amplitude Móvel)</option>
                  <option value="Xbar-R">Carta X̄-R (Médias & Amplitude em Subgrupos)</option>
                  <option value="Xbar-S">Carta X̄-S (Médias & Desvio Padrão em Subgrupos)</option>
                </select>
              </div>

              {config.chartType !== 'I-MR' && (
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Tamanho do Subgrupo ($n$): {config.subgroupSize}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={config.subgroupSize}
                    onChange={(e) => update({ subgroupSize: parseInt(e.target.value, 10) })}
                    className="w-full accent-red-700"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Specification Limits */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('specs')}
            className="w-full flex items-center justify-between text-left font-medium text-slate-800 hover:text-red-700 py-1"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-red-700" /> Limites de Especificação (LIE / LSE)
            </span>
            {openSections.specs ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.specs && (
            <div className="mt-2 space-y-2.5 pl-1 pt-1 text-[11px]">
              {/* Tolerance Input Mode Switcher */}
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                <button
                  type="button"
                  onClick={() => onChangeSpecs({ ...specs, toleranceMode: 'absolute' })}
                  className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors ${
                    (specs.toleranceMode ?? 'absolute') === 'absolute'
                      ? 'bg-white text-red-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Limites Diretos (LIE / LSE)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tgt = specs.target ?? 25.0;
                    const defaultTol = specs.lsl !== null && specs.usl !== null
                      ? Math.abs(specs.usl - specs.lsl) / 2
                      : 0.15;
                    onChangeSpecs({
                      ...specs,
                      toleranceMode: 'symmetric',
                      symmetricTol: defaultTol,
                      target: tgt,
                      lsl: tgt - defaultTol,
                      usl: tgt + defaultTol
                    });
                  }}
                  className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors ${
                    specs.toleranceMode === 'symmetric'
                      ? 'bg-white text-red-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Alvo ± Tolerância (ex: ±0.15)
                </button>
              </div>

              {specs.toleranceMode === 'symmetric' ? (
                <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-emerald-700 font-semibold block mb-0.5">Alvo Nominal (T):</label>
                      <input
                        type="number"
                        step="any"
                        value={specs.target ?? ''}
                        onChange={(e) => {
                          const tgt = e.target.value !== '' ? parseFloat(e.target.value) : null;
                          const tol = specs.symmetricTol ?? 0.15;
                          onChangeSpecs({
                            ...specs,
                            target: tgt,
                            lsl: tgt !== null ? tgt - tol : null,
                            usl: tgt !== null ? tgt + tol : null
                          });
                        }}
                        className="w-full px-2 py-1 font-mono border border-emerald-300 rounded text-center focus:border-emerald-600 focus:outline-hidden bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-red-700 font-semibold block mb-0.5">Tolerância (±):</label>
                      <input
                        type="number"
                        step="any"
                        value={specs.symmetricTol ?? ''}
                        onChange={(e) => {
                          const tol = e.target.value !== '' ? Math.abs(parseFloat(e.target.value)) : 0;
                          const tgt = specs.target ?? 0;
                          onChangeSpecs({
                            ...specs,
                            symmetricTol: tol,
                            lsl: tgt - tol,
                            usl: tgt + tol
                          });
                        }}
                        className="w-full px-2 py-1 font-mono border border-red-300 rounded text-center focus:border-red-600 focus:outline-hidden bg-white"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 flex justify-between bg-white px-2 py-1 rounded border border-slate-200 font-mono">
                    <span>LIE: <strong>{specs.lsl?.toFixed(3) ?? '—'}</strong></span>
                    <span>LSE: <strong>{specs.usl?.toFixed(3) ?? '—'}</strong></span>
                    <span>Tol Total: <strong>{((specs.symmetricTol ?? 0) * 2).toFixed(3)}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-red-700 font-medium block mb-0.5">LIE (LSL):</label>
                    <input
                      type="number"
                      step="any"
                      value={specs.lsl ?? ''}
                      onChange={(e) =>
                        onChangeSpecs({
                          ...specs,
                          lsl: e.target.value !== '' ? parseFloat(e.target.value) : null
                        })
                      }
                      className={`w-full px-1.5 py-1 font-mono border rounded text-center focus:outline-hidden ${
                        specs.lsl !== null && specs.usl !== null && specs.lsl > specs.usl
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-red-200 focus:border-red-600'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-emerald-700 font-medium block mb-0.5">Alvo (Target):</label>
                    <input
                      type="number"
                      step="any"
                      value={specs.target ?? ''}
                      onChange={(e) =>
                        onChangeSpecs({
                          ...specs,
                          target: e.target.value !== '' ? parseFloat(e.target.value) : null
                        })
                      }
                      className="w-full px-1.5 py-1 font-mono border border-emerald-200 rounded text-center focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-red-700 font-medium block mb-0.5">LSE (USL):</label>
                    <input
                      type="number"
                      step="any"
                      value={specs.usl ?? ''}
                      onChange={(e) =>
                        onChangeSpecs({
                          ...specs,
                          usl: e.target.value !== '' ? parseFloat(e.target.value) : null
                        })
                      }
                      className={`w-full px-1.5 py-1 font-mono border rounded text-center focus:outline-hidden ${
                        specs.lsl !== null && specs.usl !== null && specs.lsl > specs.usl
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-red-200 focus:border-red-600'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Warning and Fix Button if LIE > LSE */}
              {specs.lsl !== null && specs.usl !== null && specs.lsl > specs.usl && (
                <div className="p-2 bg-amber-50 border border-amber-300 rounded text-[10px] text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-amber-800">
                    <span>⚠️</span> LIE ({specs.lsl}) é maior que LSE ({specs.usl})!
                  </div>
                  <p className="text-amber-700 leading-tight">
                    Limites invertidos causam valores negativos em Cp e Cpk. O sistema normalizou internamente para manter cálculos positivos.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSpecs({
                        ...specs,
                        lsl: specs.usl,
                        usl: specs.lsl
                      });
                    }}
                    className="mt-1 w-full py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[10px] transition-colors shadow-2xs"
                  >
                    Inverter Campos (LIE = {specs.usl}, LSE = {specs.lsl})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Special Cause Rules (Nelson / Western Electric) */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('nelsonRules')}
            className="w-full flex items-center justify-between text-left font-medium text-slate-800 hover:text-red-700 py-1"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <AlertOctagon className="w-3.5 h-3.5 text-red-700" /> Regras de Nelson (Causas Especiais)
            </span>
            {openSections.nelsonRules ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.nelsonRules && (
            <div className="mt-2 space-y-1.5 pl-1 pt-1 text-[11px] text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-900">
                <input
                  type="checkbox"
                  checked={config.rule1}
                  onChange={(e) => update({ rule1: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 1: 1 ponto além de 3σ</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rule2}
                  onChange={(e) => update({ rule2: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 2: 9 pontos seguidos do mesmo lado da média</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rule3}
                  onChange={(e) => update({ rule3: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 3: 6 pontos seguidos crescentes ou decrescentes</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rule4}
                  onChange={(e) => update({ rule4: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 4: 14 pontos alternando acima e abaixo</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rule5}
                  onChange={(e) => update({ rule5: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 5: 2 de 3 pontos &gt; 2σ no mesmo lado</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rule6}
                  onChange={(e) => update({ rule6: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 6: 4 de 5 pontos &gt; 1σ no mesmo lado</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rule7}
                  onChange={(e) => update({ rule7: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 7: 15 pontos seguidos dentro de 1σ</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rule8}
                  onChange={(e) => update({ rule8: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Regra 8: 8 pontos seguidos &gt; 1σ em ambos os lados</span>
              </label>
            </div>
          )}
        </div>

        {/* Section 4: Serial & Spatial Process Correlation */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('correlations')}
            className="w-full flex items-center justify-between text-left font-medium text-slate-800 hover:text-red-700 py-1"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-red-700" /> Correlação Serial & Espacial
            </span>
            {openSections.correlations ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.correlations && (
            <div className="mt-2 space-y-1.5 pl-1 pt-1 text-[11px] text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSerialCorrelation}
                  onChange={(e) => update({ showSerialCorrelation: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Autocorrelação Serial (ACF / Durbin-Watson)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSpatialCavityAnalysis}
                  onChange={(e) => update({ showSpatialCavityAnalysis: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Correlação Espacial no Molde (Moran das Cavidades)</span>
              </label>
            </div>
          )}
        </div>

        {/* Section 5: Output Plots */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('plots')}
            className="w-full flex items-center justify-between text-left font-medium text-slate-800 hover:text-red-700 py-1"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <Layers className="w-3.5 h-3.5 text-red-700" /> Gráficos de Saída
            </span>
            {openSections.plots ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.plots && (
            <div className="mt-2 space-y-1.5 pl-1 pt-1 text-[11px] text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.plotControlChart}
                  onChange={(e) => update({ plotControlChart: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Carta de Controle Principal (Shewhart)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.plotSubControlChart}
                  onChange={(e) => update({ plotSubControlChart: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Carta de Dispersão (Amplitude Móvel MR ou R)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.plotCapabilityHistogram}
                  onChange={(e) => update({ plotCapabilityHistogram: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Gráfico de Capabilidade (Histograma + 2 Normais)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.plotACF}
                  onChange={(e) => update({ plotACF: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Gráfico de Autocorrelação Serial (ACF)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.plotSpatialCavityMap}
                  onChange={(e) => update({ plotSpatialCavityMap: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Matriz Espacial de Cavidades do Molde</span>
              </label>
            </div>
          )}
        </div>

        {/* Section 6: Reports & Shopfloor Operator Guide */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('reporting')}
            className="w-full flex items-center justify-between text-left font-medium text-slate-800 hover:text-red-700 py-1"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <FileText className="w-3.5 h-3.5 text-red-700" /> Relatórios & Chão de Fábrica
            </span>
            {openSections.reporting ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.reporting && (
            <div className="mt-2 space-y-2 pl-1 pt-1 text-[11px] text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-800 bg-emerald-50/70 p-1.5 rounded border border-emerald-200">
                <input
                  type="checkbox"
                  checked={config.showOperatorGuide}
                  onChange={(e) => update({ showOperatorGuide: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                  Guia do Operador (Semáforo & Ações)
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showInterpretation}
                  onChange={(e) => update({ showInterpretation: e.target.checked })}
                  className="rounded text-red-700 focus:ring-0"
                />
                <span>Laudo Técnico & Parecer de Engenharia</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
