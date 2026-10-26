import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface ApaColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  format?: (val: any, row: any) => React.ReactNode;
}

interface ApaTableProps {
  title: string;
  subtitle?: string;
  columns: ApaColumn[];
  data: any[];
  note?: string;
  tableNumber?: number | string;
}

export const ApaTable: React.FC<ApaTableProps> = ({
  title,
  subtitle,
  columns,
  data,
  note,
  tableNumber = 1
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const copyToClipboard = (format: 'markdown' | 'csv' | 'latex') => {
    let text = '';

    if (format === 'markdown') {
      const headerRow = `| ${columns.map((c) => c.header).join(' | ')} |`;
      const separatorRow = `| ${columns.map((c) => (c.align === 'right' ? '---:' : c.align === 'center' ? ':---:' : ':---')).join(' | ')} |`;
      const dataRows = data
        .map((row) => `| ${columns.map((c) => String(row[c.key] ?? '')).join(' | ')} |`)
        .join('\n');
      text = `### Tabela ${tableNumber}. ${title}\n\n${headerRow}\n${separatorRow}\n${dataRows}\n\n*Nota.* ${note || ''}`;
    } else if (format === 'csv') {
      const headerRow = columns.map((c) => `"${c.header}"`).join(';');
      const dataRows = data
        .map((row) => columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');
      text = `${headerRow}\n${dataRows}`;
    } else if (format === 'latex') {
      const colAligns = columns.map((c) => (c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : 'l')).join('');
      const headerRow = columns.map((c) => c.header).join(' & ') + ' \\\\ \\midrule';
      const dataRows = data
        .map((row) => columns.map((c) => String(row[c.key] ?? '')).join(' & ') + ' \\\\')
        .join('\n');
      text = `\\begin{table}[htbp]\n\\centering\n\\caption{${title}}\n\\begin{tabular}{${colAligns}}\n\\toprule\n${headerRow}\n${dataRows}\n\\bottomrule\n\\end{tabular}\n\\end{table}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-xs transition-all hover:border-slate-300 group/table">
      {/* Table Header APA Style */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tabela {tableNumber}
          </div>
          <h4 className="text-base font-serif italic text-slate-900 font-semibold mt-0.5">
            {title}
          </h4>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Copy Tools */}
        <div className="flex items-center gap-1 opacity-60 group-hover/table:opacity-100 transition-opacity text-xs">
          <button
            onClick={() => copyToClipboard('markdown')}
            title="Copiar formato Markdown"
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium flex items-center gap-1 transition-colors text-[11px]"
          >
            {copiedFormat === 'markdown' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            Markdown
          </button>
          <button
            onClick={() => copyToClipboard('csv')}
            title="Copiar formato CSV"
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium flex items-center gap-1 transition-colors text-[11px]"
          >
            {copiedFormat === 'csv' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            CSV
          </button>
          <button
            onClick={() => copyToClipboard('latex')}
            title="Copiar formato LaTeX"
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium flex items-center gap-1 transition-colors text-[11px]"
          >
            {copiedFormat === 'latex' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            LaTeX
          </button>
        </div>
      </div>

      {/* APA Table Container: strictly NO vertical borders, heavy top/bottom rules */}
      <div className="overflow-x-auto my-1">
        <table className="w-full border-collapse text-xs text-slate-800">
          <thead>
            {/* Top rule */}
            <tr className="border-t-2 border-b border-slate-900 font-serif">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2 px-3 font-semibold text-slate-900 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-6 text-slate-400 italic">
                  Nenhum registro selecionado ou dados insuficientes para esta tabela.
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  {columns.map((col) => {
                    const val = row[col.key];
                    const content = col.format ? col.format(val, row) : val ?? '—';
                    return (
                      <td
                        key={col.key}
                        className={`py-2 px-3 ${
                          col.align === 'right'
                            ? 'text-right font-mono tabular-nums'
                            : col.align === 'center'
                            ? 'text-center font-mono tabular-nums'
                            : 'text-left'
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {/* Bottom APA rule */}
          <tfoot>
            <tr className="border-b-2 border-slate-900">
              <td colSpan={columns.length} className="p-0" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Note footer in APA italics */}
      {note && (
        <div className="mt-2 text-[11px] text-slate-600 font-serif italic leading-relaxed">
          <span className="font-semibold not-italic">Nota. </span>
          {note}
        </div>
      )}
    </div>
  );
};
