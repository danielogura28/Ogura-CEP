import React from 'react';
import { CavitySpatialResult } from '../../types';

interface SpatialCavityGridProps {
  cavities: CavitySpatialResult[];
  moranI: number;
  moranZ: number;
  moranP: number;
  metricUnit?: string;
}

export const SpatialCavityGrid: React.FC<SpatialCavityGridProps> = ({
  cavities,
  moranI,
  moranZ,
  moranP,
  metricUnit
}) => {
  if (cavities.length === 0) return null;

  // Determine grid bounds
  const xs = cavities.map((c) => c.x);
  const ys = cavities.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const isSpatialSignificant = moranP < 0.05;

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Correlação Espacial no Ferramental / Molde
          </div>
          <h4 className="text-base font-serif italic text-slate-900 font-semibold mt-0.5">
            Distribuição Espacial entre Cavidades da Matriz
          </h4>
          <p className="text-xs text-slate-500">
            Mapeamento da geometria da ferramenta com Índice de Moran Global inter-cavidades
          </p>
        </div>

        {/* Moran Test Summary */}
        <div className="text-right text-xs font-mono">
          <div className="font-semibold text-slate-800">
            Moran $I$ = <span className="text-blue-700">{moranI.toFixed(3)}</span> (z = {moranZ.toFixed(2)}, p = {moranP < 0.001 ? '< .001' : moranP.toFixed(3)})
          </div>
          <div className={`text-[11px] font-sans font-medium ${isSpatialSignificant ? 'text-red-700' : 'text-slate-500'}`}>
            {isSpatialSignificant
              ? 'Autocorrelação Espacial Significante (Gradiente Térmico/Pressão no Molde)'
              : 'Variação Espacial Aleatória entre Cavidades'}
          </div>
        </div>
      </div>

      {/* Grid of Cavities */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
          Geometria do Molde / Matriz de Injeção
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {cavities.map((cav) => {
            const isHigh = cav.standardizedZ > 0;
            let badgeBg = 'bg-slate-100 text-slate-800 border-slate-300';

            if (cav.lisaQuadrant === 'High-High') {
              badgeBg = 'bg-red-50 text-red-900 border-red-300';
            } else if (cav.lisaQuadrant === 'Low-Low') {
              badgeBg = 'bg-blue-50 text-blue-900 border-blue-300';
            } else if (cav.lisaQuadrant === 'High-Low') {
              badgeBg = 'bg-rose-50 text-rose-900 border-rose-300';
            } else if (cav.lisaQuadrant === 'Low-High') {
              badgeBg = 'bg-cyan-50 text-cyan-900 border-cyan-300';
            }

            return (
              <div
                key={cav.cavity}
                className={`p-3 rounded-lg border text-center transition-transform hover:scale-[1.02] shadow-2xs ${badgeBg}`}
              >
                <div className="text-xs font-bold text-slate-700">
                  Cavidade #{cav.cavity}
                </div>
                <div className="text-base font-mono font-bold mt-0.5">
                  {cav.mean.toFixed(3)} {metricUnit}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Desvio: {cav.standardizedZ >= 0 ? `+${cav.standardizedZ.toFixed(3)}` : cav.standardizedZ.toFixed(3)}
                </div>
                <div className="mt-1.5 pt-1 border-t border-slate-200/60 text-[10px] font-semibold uppercase tracking-wider">
                  {cav.lisaQuadrant || 'Normal'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-serif italic border-t border-slate-100 pt-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-400 inline-block"></span>
            Alto-Alto (Hotspot no Molde)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-400 inline-block"></span>
            Baixo-Baixo (Coldspot no Molde)
          </span>
        </div>
        <span>Distâncias calculadas sobre o plano $(X, Y)$ da ferramenta</span>
      </div>
    </div>
  );
};
