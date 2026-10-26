import React, { useState, useEffect } from 'react';
import { CepDataPoint, ProcessSpecs } from '../types';
import {
  X,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  Sliders,
  Table as TableIcon
} from 'lucide-react';

interface SpcDataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CepDataPoint[];
  specs: ProcessSpecs;
  onSave: (newData: CepDataPoint[], newSpecs: ProcessSpecs) => void;
}

export const SpcDataEditorModal: React.FC<SpcDataEditorModalProps> = ({
  isOpen,
  onClose,
  data,
  specs,
  onSave
}) => {
  const [localData, setLocalData] = useState<CepDataPoint[]>(data);
  const [localSpecs, setLocalSpecs] = useState<ProcessSpecs>(specs);
  const [activeTab, setActiveTab] = useState<'table' | 'batch' | 'specs'>('table');
  const [batchText, setBatchText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalData(data);
      setLocalSpecs(specs);
    }
  }, [isOpen, data, specs]);

  if (!isOpen) return null;

  const handleCellChange = (id: string, field: keyof CepDataPoint, value: any) => {
    setLocalData((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'value' || field === 'sample' || field === 'order') {
          return { ...item, [field]: parseFloat(value) || 0 };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleAddRow = () => {
    const nextOrder = localData.length + 1;
    const newPoint: CepDataPoint = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: nextOrder,
      sample: nextOrder,
      value: localSpecs.target || 10.0,
      notes: ''
    };
    setLocalData((prev) => [...prev, newPoint]);
  };

  const handleDeleteRow = (id: string) => {
    setLocalData((prev) => prev.filter((item) => item.id !== id));
  };

  const handleBatchParse = () => {
    if (!batchText.trim()) return;

    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newPoints: CepDataPoint[] = [];

    lines.forEach((line) => {
      // Split by comma, semicolon, tab, or multiple spaces
      const parts = line.split(/[,;\t]+/).map((p) => p.trim()).filter((p) => p.length > 0);
      if (parts.length === 0) return;

      // Skip common table headers
      const lower = line.toLowerCase();
      if (
        lower.includes('amostra') ||
        lower.includes('sample') ||
        lower.includes('valor') ||
        lower.includes('medicao') ||
        lower.includes('ordem') ||
        lower.includes('cavidade')
      ) {
        return;
      }

      let val = 0;
      let cavity: string | undefined = undefined;
      let notes: string | undefined = undefined;

      if (parts.length === 1) {
        val = parseFloat(parts[0].replace(',', '.'));
        if (isNaN(val)) return;
      } else if (parts.length === 2) {
        const n0 = parseFloat(parts[0].replace(',', '.'));
        const n1 = parseFloat(parts[1].replace(',', '.'));

        if (!isNaN(n0) && isNaN(n1)) {
          val = n0;
          cavity = parts[1];
        } else if (isNaN(n0) && !isNaN(n1)) {
          val = n1;
          cavity = parts[0];
        } else if (!isNaN(n0) && !isNaN(n1)) {
          // Both are numbers: check if first is sample index (1, 2, 3...)
          // or if one is closer to nominal target
          const target = localSpecs.target;
          if (target !== null) {
            if (Math.abs(n0 - target) < Math.abs(n1 - target)) {
              val = n0;
              cavity = String(n1);
            } else {
              val = n1;
              cavity = String(n0);
            }
          } else {
            // Default: if parts[0] is small integer sequence, parts[1] is measurement
            if (Number.isInteger(n0) && !Number.isInteger(n1)) {
              val = n1;
              cavity = undefined;
            } else {
              val = n0;
              cavity = String(n1);
            }
          }
        }
      } else {
        // 3 or more columns: [Sample, Value, Cavity, Notes] or [Value, Cavity, Notes]
        const n0 = parseFloat(parts[0].replace(',', '.'));
        const n1 = parseFloat(parts[1].replace(',', '.'));
        if (!isNaN(n1)) {
          val = n1;
          cavity = parts[2] || undefined;
          notes = parts.slice(3).join(' ') || undefined;
        } else if (!isNaN(n0)) {
          val = n0;
          cavity = parts[1] || undefined;
          notes = parts.slice(2).join(' ') || undefined;
        }
      }

      const nextOrder = newPoints.length + 1;
      newPoints.push({
        id: `batch_${Date.now()}_${nextOrder}`,
        order: nextOrder,
        sample: nextOrder,
        value: val,
        cavity,
        notes
      });
    });

    if (newPoints.length > 0) {
      setLocalData(newPoints);
      setActiveTab('table');
      setBatchText('');
    }
  };

  const handleSaveAndClose = () => {
    let savedSpecs = { ...localSpecs };
    // Auto-normalize if user typed LIE > LSE
    if (savedSpecs.lsl !== null && savedSpecs.usl !== null && savedSpecs.lsl > savedSpecs.usl) {
      const temp = savedSpecs.lsl;
      savedSpecs.lsl = savedSpecs.usl;
      savedSpecs.usl = temp;
    }
    onSave(localData, savedSpecs);
    onClose();
  };

  const handleExportCsv = () => {
    const headers = ['Ordem', 'Amostra_Batelada', 'Valor', 'Cavidade_Posicao', 'Observacoes'];
    const rows = localData.map((d) => [
      d.order,
      d.sample,
      d.value,
      d.cavity || '',
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dados_cep_controle_processo_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Editor de Dados de Processo & Especificações (CEP)
              </h3>
              <p className="text-xs text-slate-500">
                Insira valores de medição, limites LIE/Alvo/LSE e cavidades espaciais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Planilha ({localData.length} amostras)
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'batch' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Colar em Lote (Excel/CSV)
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'specs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Limites & Especificação
              </button>
            </div>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6 bg-slate-50">
          {activeTab === 'table' ? (
            <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddRow}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Amostra
                  </button>

                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar CSV
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  {localSpecs.metricName} {localSpecs.unit ? `[${localSpecs.unit}]` : ''} | LIE: {localSpecs.lsl ?? '—'} | Alvo: {localSpecs.target ?? '—'} | LSE: {localSpecs.usl ?? '—'}
                </div>
              </div>

              {/* Table Grid */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold font-serif">
                    <tr>
                      <th className="py-2.5 px-3 text-left w-16">Ordem</th>
                      <th className="py-2.5 px-3 text-left w-24">Amostra/Lote</th>
                      <th className="py-2.5 px-3 text-right w-36">
                        Valor Medido ({localSpecs.unit || 'un'})
                      </th>
                      <th className="py-2.5 px-3 text-center w-28">Cavidade / Posição</th>
                      <th className="py-2.5 px-3 text-left">Observações / Causa</th>
                      <th className="py-2.5 px-3 text-center w-16">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {localData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-400">{row.order}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={row.sample}
                            onChange={(e) => handleCellChange(row.id, 'sample', e.target.value)}
                            className="w-20 px-2 py-1 font-mono text-xs border border-slate-200 rounded text-center"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={row.value}
                            onChange={(e) => handleCellChange(row.id, 'value', e.target.value)}
                            className="w-28 px-2 py-1 font-mono font-semibold text-xs border border-blue-300 bg-blue-50/40 rounded text-right focus:border-blue-600 focus:outline-hidden"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="text"
                            placeholder="ex: 1"
                            value={row.cavity || ''}
                            onChange={(e) => handleCellChange(row.id, 'cavity', e.target.value)}
                            className="w-20 px-2 py-1 font-mono text-xs border border-slate-200 rounded text-center"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="ex: Lote inicial, ajuste térmico..."
                            value={row.notes || ''}
                            onChange={(e) => handleCellChange(row.id, 'notes', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'batch' ? (
            <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200 p-6">
              <h4 className="text-sm font-semibold text-slate-800 mb-1">
                Colar Valores em Lote (Excel, CSV ou Bloco de Notas)
              </h4>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Copie e cole a coluna de valores diretamente da sua planilha. Pode conter apenas os valores numéricos (um por linha) ou no formato <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">Amostra, Valor, Cavidade</code>.
              </p>

              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="Exemplo de coluna simples:
12.1
11.9
12.3
11.8
12.0
12.4
14.3
12.1"
                rows={12}
                className="flex-1 w-full p-4 font-mono text-xs border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-hidden bg-slate-50/50 resize-none mb-4 text-slate-800"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Os limites de controle, índices de capabilidade (Cp, Cpk) e regras de Nelson serão calculados instantaneamente.
                </span>
                <button
                  onClick={handleBatchParse}
                  disabled={!batchText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Upload className="w-4 h-4" /> Carregar Amostras
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-lg border border-slate-200 p-6 max-w-xl mx-auto space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> Parâmetros de Engenharia & Especificação
              </h4>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Nome da Característica de Qualidade:
                </label>
                <input
                  type="text"
                  value={localSpecs.metricName}
                  onChange={(e) => setLocalSpecs({ ...localSpecs, metricName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Unidade de Medida:
                </label>
                <input
                  type="text"
                  value={localSpecs.unit}
                  onChange={(e) => setLocalSpecs({ ...localSpecs, unit: e.target.value })}
                  placeholder="ex: mm, g/10min, %, MPa, kgf"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Input mode switcher */}
              <div className="pt-2">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setLocalSpecs({ ...localSpecs, toleranceMode: 'absolute' })}
                    className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
                      (localSpecs.toleranceMode ?? 'absolute') === 'absolute'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Limites Diretos (LIE / LSE)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tgt = localSpecs.target ?? 25.0;
                      const tol = localSpecs.lsl !== null && localSpecs.usl !== null
                        ? Math.abs(localSpecs.usl - localSpecs.lsl) / 2
                        : 0.15;
                      setLocalSpecs({
                        ...localSpecs,
                        toleranceMode: 'symmetric',
                        symmetricTol: tol,
                        target: tgt,
                        lsl: tgt - tol,
                        usl: tgt + tol
                      });
                    }}
                    className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
                      localSpecs.toleranceMode === 'symmetric'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Alvo ± Tolerância (ex: ±0.15)
                  </button>
                </div>
              </div>

              {localSpecs.toleranceMode === 'symmetric' ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-emerald-800 block mb-1">
                        Alvo Nominal (Target):
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={localSpecs.target ?? ''}
                        onChange={(e) => {
                          const tgt = e.target.value !== '' ? parseFloat(e.target.value) : null;
                          const tol = localSpecs.symmetricTol ?? 0.15;
                          setLocalSpecs({
                            ...localSpecs,
                            target: tgt,
                            lsl: tgt !== null ? tgt - tol : null,
                            usl: tgt !== null ? tgt + tol : null
                          });
                        }}
                        className="w-full px-3 py-1.5 border border-emerald-300 rounded-md text-xs font-mono text-slate-800 focus:border-emerald-600 focus:outline-hidden bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-blue-800 block mb-1">
                        Tolerância Simétrica (±):
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={localSpecs.symmetricTol ?? ''}
                        onChange={(e) => {
                          const tol = e.target.value !== '' ? Math.abs(parseFloat(e.target.value)) : 0;
                          const tgt = localSpecs.target ?? 0;
                          setLocalSpecs({
                            ...localSpecs,
                            symmetricTol: tol,
                            lsl: tgt - tol,
                            usl: tgt + tol
                          });
                        }}
                        className="w-full px-3 py-1.5 border border-blue-300 rounded-md text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-hidden bg-white"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex justify-between bg-white p-2 rounded border border-slate-200 font-mono">
                    <span>LIE Calculado: <strong>{localSpecs.lsl?.toFixed(3) ?? '—'}</strong></span>
                    <span>LSE Calculado: <strong>{localSpecs.usl?.toFixed(3) ?? '—'}</strong></span>
                    <span>Faixa Total de Tolerância: <strong>{((localSpecs.symmetricTol ?? 0) * 2).toFixed(3)}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-red-700 block mb-1">
                      LIE (LSL):
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={localSpecs.lsl ?? ''}
                      onChange={(e) =>
                        setLocalSpecs({
                          ...localSpecs,
                          lsl: e.target.value !== '' ? parseFloat(e.target.value) : null
                        })
                      }
                      placeholder="Sem limite inf."
                      className={`w-full px-2.5 py-1.5 border rounded-md text-xs font-mono text-slate-800 focus:outline-hidden ${
                        localSpecs.lsl !== null && localSpecs.usl !== null && localSpecs.lsl > localSpecs.usl
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-red-200 focus:border-red-600'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-emerald-700 block mb-1">
                      Alvo Nominal:
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={localSpecs.target ?? ''}
                      onChange={(e) =>
                        setLocalSpecs({
                          ...localSpecs,
                          target: e.target.value !== '' ? parseFloat(e.target.value) : null
                        })
                      }
                      placeholder="Alvo de projeto"
                      className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-md text-xs font-mono text-slate-800 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-red-700 block mb-1">
                      LSE (USL):
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={localSpecs.usl ?? ''}
                      onChange={(e) =>
                        setLocalSpecs({
                          ...localSpecs,
                          usl: e.target.value !== '' ? parseFloat(e.target.value) : null
                        })
                      }
                      placeholder="Sem limite sup."
                      className={`w-full px-2.5 py-1.5 border rounded-md text-xs font-mono text-slate-800 focus:outline-hidden ${
                        localSpecs.lsl !== null && localSpecs.usl !== null && localSpecs.lsl > localSpecs.usl
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-red-200 focus:border-red-600'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Inverted Warning Alert */}
              {localSpecs.lsl !== null && localSpecs.usl !== null && localSpecs.lsl > localSpecs.usl && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <span>⚠️</span> Limites Invertidos Detectados: LIE ({localSpecs.lsl}) é maior que LSE ({localSpecs.usl})!
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Quando o limite inferior é maior que o superior, a diferença (LSE - LIE) torna-se negativa e resulta em valores negativos de Cp e Cpk.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSpecs({
                        ...localSpecs,
                        lsl: localSpecs.usl,
                        usl: localSpecs.lsl
                      });
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs transition-colors shadow-2xs"
                  >
                    Inverter Automaticamente (LIE = {localSpecs.usl}, LSE = {localSpecs.lsl})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{localData.length} amostras carregadas para análise de CEP</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Aplicar e Atualizar Cartas JASP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
