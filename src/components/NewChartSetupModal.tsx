import React, { useState, useEffect } from 'react';
import {
  CepAnalysisConfig,
  CepDataPoint,
  ControlChartType,
  FeatureClassification,
  ProcessSpecs,
  SpcManualStandard,
  SpcReportMetadata
} from '../types';
import {
  FilePlus2,
  X,
  Building2,
  Package,
  Wrench,
  Gauge,
  Sliders,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  HelpCircle,
  Sparkles,
  ClipboardList,
  RotateCcw,
  Target
} from 'lucide-react';
import { getAllCapabilityTargets } from '../utils/spcTargets';

interface NewChartSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMetadata: SpcReportMetadata;
  currentSpecs: ProcessSpecs;
  currentConfig: CepAnalysisConfig;
  onSubmit: (result: {
    metadata: SpcReportMetadata;
    specs: ProcessSpecs;
    config: Partial<CepAnalysisConfig>;
    points: CepDataPoint[];
  }) => void;
}

export const NewChartSetupModal: React.FC<NewChartSetupModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSubmit
}) => {
  // 1. Informações de Identificação do Produto e Processo (em branco para preenchimento posterior)
  const [companyName, setCompanyName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partName, setPartName] = useState('');
  const [operation, setOperation] = useState('');
  const [machine, setMachine] = useState('');
  const [lotNumber, setLotNumber] = useState('');

  // 2. Metrologia e Especificações Nominais / Tolerâncias
  const [metricName, setMetricName] = useState('');
  const [gauge, setGauge] = useState('');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState<string>('');
  const [lsl, setLsl] = useState<string>('');
  const [usl, setUsl] = useState<string>('');

  // Auxiliar de Tolerância Simétrica (+/- Tol)
  const [symmetricTol, setSymmetricTol] = useState<string>('');
  const [useSymmetricHelper, setUseSymmetricHelper] = useState(false);

  // 3. Responsabilidade e Rastreabilidade
  const [operator, setOperator] = useState('');
  const [studyDate, setStudyDate] = useState<string>('');
  const [collectionStartDate, setCollectionStartDate] = useState<string>('');
  const [collectionEndDate, setCollectionEndDate] = useState<string>('');
  const [collectionDuration, setCollectionDuration] = useState<string>('');
  const [engineer, setEngineer] = useState('');

  // 4. Parâmetros Normativos da Carta
  const [manualStandard, setManualStandard] = useState<SpcManualStandard>(currentConfig.manualStandard || 'AIAG_SPC_4TH');
  const [featureClassification, setFeatureClassification] = useState<FeatureClassification>(
    currentConfig.featureClassification || 'standard'
  );
  const [targetCpk, setTargetCpk] = useState<string>(
    typeof currentConfig.targetCpk === 'number' ? String(currentConfig.targetCpk) : '1.33'
  );
  const [targetPpk, setTargetPpk] = useState<string>(
    typeof currentConfig.targetPpk === 'number' ? String(currentConfig.targetPpk) : '1.33'
  );
  const [targetName, setTargetName] = useState<string>(currentConfig.targetName || 'Padrão AIAG');
  const [chartType, setChartType] = useState<ControlChartType>(currentConfig.chartType || 'I-MR');

  // 5. Inicialização dos Dados (padrão em grade em branco para preenchimento posterior)
  const [dataInitMode, setDataInitMode] = useState<'blank' | 'paste' | 'simulated'>('blank');
  const [pasteDataText, setPasteDataText] = useState('');
  const [blankCount, setBlankCount] = useState<number>(30);

  // Validação
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Função para limpar 100% dos campos
  const resetFormToBlank = () => {
    setCompanyName('');
    setPartNumber('');
    setPartName('');
    setOperation('');
    setMachine('');
    setLotNumber('');
    setMetricName('');
    setGauge('');
    setUnit('');
    setTarget('');
    setLsl('');
    setUsl('');
    setSymmetricTol('');
    setUseSymmetricHelper(false);
    setOperator('');
    setStudyDate('');
    setCollectionStartDate('');
    setCollectionEndDate('');
    setCollectionDuration('');
    setEngineer('');
    setTargetCpk('1.33');
    setTargetPpk('1.33');
    setTargetName('Padrão AIAG');
    setFeatureClassification('standard');
    setPasteDataText('');
    setDataInitMode('blank');
    setBlankCount(30);
    setErrorMessage(null);
  };

  // Sempre que a modal for aberta, todos os campos vêm totalmente em branco
  useEffect(() => {
    if (isOpen) {
      resetFormToBlank();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Atualizar LIE e LSE ao digitar Tolerância Simétrica
  const handleApplySymmetricTol = (valTol: string, currentTargetStr: string) => {
    setSymmetricTol(valTol);
    const numTarget = parseFloat(currentTargetStr.replace(',', '.'));
    const numTol = parseFloat(valTol.replace(',', '.'));
    if (!isNaN(numTarget) && !isNaN(numTol) && numTol > 0) {
      setLsl((numTarget - numTol).toFixed(3).replace(/\.?0+$/, ''));
      setUsl((numTarget + numTol).toFixed(3).replace(/\.?0+$/, ''));
    }
  };

  const handleTargetChange = (valTarget: string) => {
    setTarget(valTarget);
    if (useSymmetricHelper && symmetricTol) {
      handleApplySymmetricTol(symmetricTol, valTarget);
    }
  };

  const handleStartDateChange = (val: string) => {
    setCollectionStartDate(val);
    if (val && collectionEndDate) {
      updateCalculatedDuration(val, collectionEndDate);
    } else if (val && !collectionEndDate) {
      setCollectionEndDate(val);
      setCollectionDuration('1 dia');
    }
  };

  const handleEndDateChange = (val: string) => {
    setCollectionEndDate(val);
    if (collectionStartDate && val) {
      updateCalculatedDuration(collectionStartDate, val);
    }
  };

  const updateCalculatedDuration = (startStr: string, endStr: string) => {
    try {
      const dStart = new Date(startStr);
      const dEnd = new Date(endStr);
      const diffTime = dEnd.getTime() - dStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
      if (isNaN(diffDays) || diffDays <= 0) {
        setCollectionDuration('1 dia (mesmo dia)');
      } else if (diffDays === 1) {
        setCollectionDuration('1 dia');
      } else {
        setCollectionDuration(`${diffDays} dias`);
      }
    } catch {
      // keep current
    }
  };

  // Parsing do texto colado
  const parsedValues: number[] = pasteDataText
    .split(/[\r\n\t,; ]+/)
    .map((v) => v.trim().replace(',', '.'))
    .filter((v) => v !== '' && !isNaN(Number(v)))
    .map((v) => Number(v));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numTarget = target.trim() !== '' ? parseFloat(target.replace(',', '.')) : null;
    const numLsl = lsl.trim() !== '' ? parseFloat(lsl.replace(',', '.')) : null;
    const numUsl = usl.trim() !== '' ? parseFloat(usl.replace(',', '.')) : null;

    // Se ambos foram digitados, checa se LIE < LSE
    if (numLsl !== null && numUsl !== null && numLsl >= numUsl) {
      setErrorMessage('O Limite Inferior (LIE) deve ser estritamente menor que o Limite Superior (LSE).');
      return;
    }

    if (numTarget !== null && numLsl !== null && numTarget < numLsl) {
      setErrorMessage('A Especificação Nominal não pode ser menor que o Limite Inferior (LIE).');
      return;
    }

    if (numTarget !== null && numUsl !== null && numTarget > numUsl) {
      setErrorMessage('A Especificação Nominal não pode ser maior que o Limite Superior (LSE).');
      return;
    }

    // Formatar data em PT-BR para o cabeçalho oficial
    let formattedStudyDate = studyDate.trim();
    if (formattedStudyDate.includes('-')) {
      const [year, month, day] = formattedStudyDate.split('-');
      formattedStudyDate = `${day}/${month}/${year}`;
    }
    if (!formattedStudyDate) {
      formattedStudyDate = new Date().toLocaleDateString('pt-BR');
    }

    const formatDate = (d: string) => {
      let trimmed = d.trim();
      if (trimmed.includes('-')) {
        const [y, m, day] = trimmed.split('-');
        return `${day}/${m}/${y}`;
      }
      return trimmed || formattedStudyDate;
    };

    const formattedStartDate = formatDate(collectionStartDate);
    const formattedEndDate = formatDate(collectionEndDate);

    // Gerar pontos de dados
    let initialPoints: CepDataPoint[] = [];

    if (dataInitMode === 'paste' && parsedValues.length > 0) {
      initialPoints = parsedValues.map((val, idx) => ({
        id: `pt_${Date.now()}_${idx + 1}`,
        order: idx + 1,
        sample: chartType === 'I-MR' ? idx + 1 : Math.floor(idx / 5) + 1,
        value: val,
        notes: `Amostra ${idx + 1}`
      }));
    } else if (dataInitMode === 'simulated') {
      const nominalVal = numTarget ?? (numLsl !== null && numUsl !== null ? (numLsl + numUsl) / 2 : 25.0);
      const tolSpan = (numLsl !== null && numUsl !== null) ? (numUsl - numLsl) : (nominalVal * 0.1 || 1.0);
      const simSigma = tolSpan / (6 * 1.45);

      initialPoints = Array.from({ length: 32 }, (_, idx) => {
        const u1 = Math.random() || 0.001;
        const u2 = Math.random() || 0.001;
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const val = Number((nominalVal + z0 * simSigma).toFixed(3));

        return {
          id: `pt_${Date.now()}_${idx + 1}`,
          order: idx + 1,
          sample: chartType === 'I-MR' ? idx + 1 : Math.floor(idx / 5) + 1,
          value: val,
          notes: `Amostra piloto #${idx + 1}`
        };
      });
    } else {
      // Modo em branco: cria amostras vazias/zeradas prontas para entrada de medições posteriores
      const nominalVal = numTarget ?? (numLsl !== null && numUsl !== null ? (numLsl + numUsl) / 2 : 0);
      const count = Math.max(5, Math.min(blankCount || 30, 200));
      initialPoints = Array.from({ length: count }, (_, idx) => ({
        id: `pt_${Date.now()}_${idx + 1}`,
        order: idx + 1,
        sample: chartType === 'I-MR' ? idx + 1 : Math.floor(idx / 5) + 1,
        value: nominalVal,
        notes: ''
      }));
    }

    const newMetadata: SpcReportMetadata = {
      companyName: companyName.trim() || '—',
      partNumber: partNumber.trim() || 'S/N',
      partName: partName.trim() || 'Nova Carta de Controle',
      operation: operation.trim() || '—',
      machine: machine.trim() || '—',
      gauge: gauge.trim() || '—',
      operator: operator.trim() || '—',
      studyDate: formattedStudyDate,
      collectionStartDate: formattedStartDate,
      collectionEndDate: formattedEndDate,
      collectionDuration: collectionDuration.trim() || '1 dia',
      engineer: engineer.trim() || '—',
      lotNumber: lotNumber.trim() || undefined,
      notes: `Nova Carta de Controle iniciada em ${formattedStudyDate}. Período de coleta: ${formattedStartDate} a ${formattedEndDate} (${collectionDuration.trim() || '1 dia'}).`
    };

    const newSpecs: ProcessSpecs = {
      metricName: metricName.trim() || 'Cota 1',
      unit: unit.trim() || '—',
      target: numTarget,
      lsl: numLsl,
      usl: numUsl
    };

    onSubmit({
      metadata: newMetadata,
      specs: newSpecs,
      config: {
        manualStandard,
        featureClassification,
        targetCpk: parseFloat(targetCpk) || 1.33,
        targetPpk: parseFloat(targetPpk) || parseFloat(targetCpk) || 1.33,
        targetName: targetName.trim() || 'Padrão AIAG',
        chartType,
        subgroupSize: chartType === 'I-MR' ? 1 : 5
      },
      points: initialPoints
    });
  };

  // Cálculo de amplitude e resumo de tolerância
  const numTargetPreview = parseFloat(target.replace(',', '.'));
  const numLslPreview = parseFloat(lsl.replace(',', '.'));
  const numUslPreview = parseFloat(usl.replace(',', '.'));
  const isToleranceValid = !isNaN(numLslPreview) && !isNaN(numUslPreview) && numUslPreview > numLslPreview;
  const toleranceSpan = isToleranceValid ? (numUslPreview - numLslPreview).toFixed(3) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-300 flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header do Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Iniciar Nova Carta de Controle / Estudo CEP
              </h2>
              <p className="text-xs text-slate-300">
                Os campos iniciam em branco para você preencher os dados conforme a rotina do processo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Clean-Slate Banner */}
        <div className="px-6 py-2.5 bg-blue-50/90 border-b border-blue-200 text-blue-900 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Campos em Branco:</strong> Todas as informações começam limpas para serem preenchidas livremente agora ou posteriormente.
            </span>
          </div>
          <button
            type="button"
            onClick={resetFormToBlank}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
            title="Limpar todos os campos digitados"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar Todos os Campos</span>
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-r-md flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SEÇÃO 1: IDENTIFICAÇÃO DA EMPRESA E PRODUTO */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span className="text-xs uppercase tracking-wider">1. Identificação da Empresa & Produto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Empresa / Fornecedor
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Petropol Polímeros / Indústria Metalúrgica"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Código do Produto (Part Number)
                </label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="Ex: PT-9042 / PN-84920-REV-C"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Descrição do Produto (Nome da Peça)
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Ex: Conector Injetado / Bucha Guia 25mm"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Operação / Posto de Trabalho
                </label>
                <input
                  type="text"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  placeholder="Ex: OP-20 Injeção / OP-10 Extrusão"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Máquina / Equipamento / Linha
                </label>
                <input
                  type="text"
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                  placeholder="Ex: Injetora Engel 150T / Extrusora ZSK-58"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Lote / Corrida de Produção
                </label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="Ex: LOTE-2026-X1 / Corrida #04"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: CARACTERÍSTICA, METROLOGIA & ESPECIFICAÇÃO NOMINAL */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Gauge className="w-4 h-4 text-teal-600" />
                <span className="text-xs uppercase tracking-wider">2. Característica, Meio de Medição & Especificações</span>
              </div>
              <button
                type="button"
                onClick={() => setUseSymmetricHelper(!useSymmetricHelper)}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>{useSymmetricHelper ? 'Usar LIE e LSE manuais' : 'Calcular via Nominal ± Tolerância'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Característica Analisada
                </label>
                <input
                  type="text"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="Ex: Diâmetro Externo, MFI, Espessura"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Meio de Medição (Instrumento / MSA)
                </label>
                <input
                  type="text"
                  value={gauge}
                  onChange={(e) => setGauge(e.target.value)}
                  placeholder="Ex: Micrômetro Mitutoyo 0.001mm, Plastômetro"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Unidade de Medida
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: mm, g/10min, kgf, N, °C"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Linha das Especificações Nominais e Limites */}
            <div className="pt-1 border-t border-slate-200">
              {useSymmetricHelper && (
                <div className="mb-3 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-md flex flex-wrap items-center gap-3 text-xs text-indigo-950">
                  <div className="flex-1 min-w-[200px]">
                    <span className="font-semibold block text-[11px]">Tolerância Simétrica (± Tol):</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 0.15"
                      value={symmetricTol}
                      onChange={(e) => handleApplySymmetricTol(e.target.value, target)}
                      className="w-full bg-white border border-indigo-300 rounded px-2 py-1 text-xs mt-0.5"
                    />
                  </div>
                  <div className="text-[11px] text-indigo-800 flex-1 min-w-[240px]">
                    Ao definir a tolerância simétrica, o sistema calcula automaticamente <strong>LIE = Nominal - Tol</strong> e <strong>LSE = Nominal + Tol</strong>.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-2.5 rounded-md border border-slate-300">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    LIE (Limite Inferior de Especificação / LSL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lsl}
                    onChange={(e) => setLsl(e.target.value)}
                    placeholder="Ex: 24.85"
                    className="w-full font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-rose-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Valor mínimo aceitável pelo projeto</span>
                </div>

                <div className="bg-white p-2.5 rounded-md border border-slate-300">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Especificação Nominal (Alvo / Target)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={target}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    placeholder="Ex: 25.00"
                    className="w-full font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-blue-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Dimensão ideal do desenho técnico</span>
                </div>

                <div className="bg-white p-2.5 rounded-md border border-slate-300">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    LSE (Limite Superior de Especificação / USL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={usl}
                    onChange={(e) => setUsl(e.target.value)}
                    placeholder="Ex: 25.15"
                    className="w-full font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-rose-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">Valor máximo aceitável pelo projeto</span>
                </div>
              </div>

              {/* Barra de Status da Tolerância */}
              <div className="mt-2.5 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Campo de Tolerância Total:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {toleranceSpan !== null ? `${toleranceSpan} ${unit || ''}` : 'Pode ser definido posteriormente'}
                  </span>
                </div>
                {isToleranceValid && (
                  <div className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Intervalo de especificação coerente</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: RESPONSABILIDADE & DATA DO ESTUDO */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs uppercase tracking-wider">3. Responsável & Rastreabilidade do Estudo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Responsáveis pelo estudo (operador)
                </label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="Ex: Carlos E. Mendes / Daniel Ogura"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Responsável pela análise
                </label>
                <input
                  type="text"
                  value={engineer}
                  onChange={(e) => setEngineer(e.target.value)}
                  placeholder="Ex: Responsável pela análise / CQ"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Data do Estudo (Emissão / Fechamento)
                </label>
                <input
                  type="date"
                  value={studyDate}
                  onChange={(e) => setStudyDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Período de Realização das Coletas de Dados */}
            <div className="pt-2 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Período de Coleta das Amostras (Início, Fim e Duração do Estudo):</span>
                {collectionDuration && (
                  <span className="text-[10px] bg-red-100 text-red-900 border border-red-200 px-2 py-0.5 rounded font-mono font-bold">
                    Duração: {collectionDuration}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Data de Início da Coleta
                  </label>
                  <input
                    type="date"
                    value={collectionStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">Primeiro lote / batelada amostrada</span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Data de Fim da Coleta
                  </label>
                  <input
                    type="date"
                    value={collectionEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">Última peça / batelada finalizada</span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Tempo de Duração da Coleta
                  </label>
                  <input
                    type="text"
                    value={collectionDuration}
                    onChange={(e) => setCollectionDuration(e.target.value)}
                    placeholder="Ex: 3 dias (48 horas úteis)"
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5">Calculado ou customizado em dias / turnos</span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: CONFIGURAÇÃO NORMATIVA & TIPO DE CARTA */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span className="text-xs uppercase tracking-wider">4. Padrão Normativo & Tipo de Carta de Controle</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Manual de Referência
                </label>
                <select
                  value={manualStandard}
                  onChange={(e) => setManualStandard(e.target.value as SpcManualStandard)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="AIAG_SPC_4TH">Manual AIAG CEP (4ª Edição)</option>
                  <option value="AIAG_VDA_1ST">Manual Harmonizado AIAG & VDA (1ª Edição)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Define as regras e fórmulas de dispersão</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Classificação da Característica & Metas
                </label>
                <select
                  value={featureClassification}
                  onChange={(e) => {
                    const val = e.target.value;
                    const all = getAllCapabilityTargets();
                    const found = all.find((t) => t.id === val);
                    setFeatureClassification(val);
                    if (found) {
                      setTargetCpk(String(found.targetCpk));
                      setTargetPpk(String(found.targetPpk));
                      setTargetName(found.name);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                >
                  {getAllCapabilityTargets().map((tgt) => (
                    <option key={tgt.id} value={tgt.id}>
                      {tgt.shortLabel}
                    </option>
                  ))}
                  <option value="custom">Personalizada (Valores livres)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Critério normativo de aprovação</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tipo de Gráfico de Controle
                </label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ControlChartType)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="I-MR">Carta I-MR (Valores Individuais / Amplitude Móvel)</option>
                  <option value="Xbar-R">Carta X̄-R (Médias e Amplitudes com Subgrupos)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {chartType === 'I-MR' ? 'I-MR é a carta mais comum na indústria moderna' : 'Subgrupos racionais (ex: n=5 amostras por corrida)'}
                </span>
              </div>
            </div>

            {/* Ajuste Fino das Metas de Cpk e Ppk */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-2.5 rounded-md border border-slate-200">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-700 shrink-0" />
                <div className="flex-1">
                  <label className="block text-[10.5px] font-bold text-slate-700">
                    Meta Cpk Mínimo:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetCpk}
                    onChange={(e) => {
                      setTargetCpk(e.target.value);
                      setFeatureClassification('custom');
                    }}
                    placeholder="1.33"
                    className="w-full font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-700 shrink-0" />
                <div className="flex-1">
                  <label className="block text-[10.5px] font-bold text-slate-700">
                    Meta Ppk Mínimo:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetPpk}
                    onChange={(e) => {
                      setTargetPpk(e.target.value);
                      setFeatureClassification('custom');
                    }}
                    placeholder="1.33"
                    className="w-full font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: INICIALIZAÇÃO DOS DADOS DE MEDIÇÃO */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                <span className="text-xs uppercase tracking-wider">5. Inicialização dos Dados das Amostras</span>
              </div>
            </div>

            {/* Abas dos Modos de Dados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDataInitMode('blank')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  dataInitMode === 'blank'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Grade em Branco para Coleta Posterior</span>
              </button>

              <button
                type="button"
                onClick={() => setDataInitMode('paste')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  dataInitMode === 'paste'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Colar Dados do Excel / CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setDataInitMode('simulated')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  dataInitMode === 'simulated'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar Amostra Piloto Simulada</span>
              </button>
            </div>

            {/* Conteúdo específico de cada modo */}
            {dataInitMode === 'blank' && (
              <div className="space-y-2 bg-white p-3 rounded-md border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Quantidade de amostras em branco a criar na planilha:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={blankCount}
                    onChange={(e) => setBlankCount(parseInt(e.target.value) || 30)}
                    className="w-32 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                  <span className="text-[11px] text-slate-500">
                    O operador poderá digitar as leituras de cada peça medida diretamente na tabela do sistema.
                  </span>
                </div>
              </div>
            )}

            {dataInitMode === 'paste' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Cole os valores medidos da planilha Excel ou digite abaixo (separados por vírgula, espaço ou quebra de linha):
                </label>
                <textarea
                  rows={4}
                  value={pasteDataText}
                  onChange={(e) => setPasteDataText(e.target.value)}
                  placeholder="Exemplo:&#10;25.02&#10;24.98&#10;25.05&#10;25.01&#10;24.96&#10;..."
                  className="w-full bg-white border border-slate-300 rounded-md p-2.5 font-mono text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Valores identificados:{' '}
                    <strong className="text-indigo-700">{parsedValues.length} amostras válidas</strong>
                  </span>
                  {parsedValues.length > 0 && (
                    <span className="font-mono text-[10px] text-slate-600">
                      Primeiras leituras: {parsedValues.slice(0, 5).join(', ')}{parsedValues.length > 5 ? '...' : ''}
                    </span>
                  )}
                </div>
              </div>
            )}

            {dataInitMode === 'simulated' && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-md text-[11px] text-purple-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  O sistema gerará automaticamente <strong>32 medições simuladas centradas na especificação nominal</strong> ({target || '25.00'}) com dispersão estável, permitindo testar a carta de controle imediatamente.
                </span>
              </div>
            )}
          </div>

          {/* Botões do Rodapé */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={resetFormToBlank}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Todos os Campos</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md shadow-md flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Criar Nova Carta</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
