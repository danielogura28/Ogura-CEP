import React from 'react';
import { SpcProblemDiagnosis } from '../utils/spcDiagnostics';
import { AlertTriangle, ShieldAlert, Wrench, Lightbulb, ArrowRight, ExternalLink } from 'lucide-react';

interface DiagnosticPopoverProps {
  diagnosis: SpcProblemDiagnosis;
  onOpenCriticalAnalysis?: () => void;
  sampleNumber?: number;
  measuredValue?: number;
  className?: string;
  isCompact?: boolean;
}

export const DiagnosticPopover: React.FC<DiagnosticPopoverProps> = ({
  diagnosis,
  onOpenCriticalAnalysis,
  sampleNumber,
  measuredValue,
  className = '',
  isCompact = false
}) => {
  const isCritical = diagnosis.statusSeverity === 'critical';

  return (
    <div
      className={`rounded-lg border shadow-xl p-3.5 text-xs text-left select-none animate-in fade-in zoom-in-95 duration-150 ${
        isCritical
          ? 'bg-slate-900 text-white border-red-500/80 ring-2 ring-red-500/20'
          : 'bg-slate-900 text-white border-amber-500/80 ring-2 ring-amber-500/20'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="font-bold text-slate-100 text-[12px] leading-tight">
              {diagnosis.title}
            </div>
            {sampleNumber !== undefined && (
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Amostra #{sampleNumber} {measuredValue !== undefined ? `• Valor: ${measuredValue.toFixed(3)}` : ''}
              </div>
            )}
          </div>
        </div>

        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
            isCritical
              ? 'bg-red-950 text-red-300 border-red-800'
              : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}
        >
          {diagnosis.badgeText.split(':')[0]}
        </span>
      </div>

      {/* Explicação simples (O que significa) */}
      <div className="space-y-1 mb-2.5">
        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1">
          <span>💡 O que significa (Explicação Simples):</span>
        </div>
        <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
          {diagnosis.simpleExplanation}
        </p>
      </div>

      {/* Possíveis problemas */}
      <div className="space-y-1 mb-2.5 bg-slate-950/60 p-2 rounded border border-slate-800">
        <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1">
          <Wrench className="w-3 h-3" />
          <span>Possíveis Problemas Identificados:</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-slate-300">
          {diagnosis.possibleProblems.slice(0, isCompact ? 2 : 4).map((prob, idx) => (
            <li key={idx} className="leading-snug">
              {prob}
            </li>
          ))}
        </ul>
      </div>

      {/* Sugestões de Planos de Ação */}
      <div className="space-y-1 mb-3 bg-slate-950/60 p-2 rounded border border-slate-800">
        <div className="text-[10px] font-bold text-teal-300 uppercase tracking-wide flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          <span>Sugestões de Planos de Ações:</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-slate-300">
          {diagnosis.suggestedActionPlans.slice(0, isCompact ? 2 : 3).map((plan, idx) => (
            <li key={idx} className="leading-snug">
              {plan}
            </li>
          ))}
        </ul>
      </div>

      {/* Botão de Ação: Abrir Análise Crítica */}
      {onOpenCriticalAnalysis && (
        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400 italic font-sans hidden sm:inline">
            Exigência normativa IATF / CEP
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCriticalAnalysis();
            }}
            className="w-full sm:w-auto px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>Abrir Análise Crítica</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
