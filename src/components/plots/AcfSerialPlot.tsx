import React from 'react';
import { SerialAutocorrItem } from '../../types';

interface AcfSerialPlotProps {
  lags: SerialAutocorrItem[];
  durbinWatson: number;
}

export const AcfSerialPlot: React.FC<AcfSerialPlotProps> = ({ lags, durbinWatson }) => {
  if (lags.length === 0) return null;

  const width = 520;
  const height = 280;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 40;

  const scaleX = (lag: number) =>
    paddingLeft + ((lag - 0.5) / lags.length) * (width - paddingLeft - paddingRight);
  const scaleY = (r: number) =>
    height - paddingBottom - ((r + 1) / 2) * (height - paddingTop - paddingBottom);

  const yZero = scaleY(0);
  const ciUpper = lags[0]?.ciUpper ?? 0.35;
  const ciLower = lags[0]?.ciLower ?? -0.35;

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Dependência Serial & Estacionariedade
          </div>
          <h4 className="text-base font-serif italic text-slate-900 font-semibold mt-0.5">
            Função de Autocorrelação Serial (ACF)
          </h4>
          <p className="text-xs text-slate-500">
            Correlação entre amostras defasadas no tempo ($k = 1 \dots {lags.length}$)
          </p>
        </div>

        <div className="text-right text-xs font-mono">
          <div className="font-semibold text-slate-800">
            Durbin-Watson $d$ = {durbinWatson.toFixed(3)}
          </div>
          <div className="text-[11px] text-slate-500">
            {durbinWatson < 1.5
              ? 'Autocorrelação Positiva'
              : durbinWatson > 2.5
              ? 'Autocorrelação Negativa'
              : 'Sem Autocorrelação Significativa'}
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[540px] mx-auto select-none">
        {/* Shaded 95% Confidence Band (Bartlett) */}
        <rect
          x={paddingLeft}
          y={scaleY(ciUpper)}
          width={width - paddingLeft - paddingRight}
          height={Math.max(1, scaleY(ciLower) - scaleY(ciUpper))}
          fill="#dbeafe"
          fillOpacity="0.45"
        />

        {/* Confidence Lines */}
        <line
          x1={paddingLeft}
          y1={scaleY(ciUpper)}
          x2={width - paddingRight}
          y2={scaleY(ciUpper)}
          stroke="#3b82f6"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        <line
          x1={paddingLeft}
          y1={scaleY(ciLower)}
          x2={width - paddingRight}
          y2={scaleY(ciLower)}
          stroke="#3b82f6"
          strokeWidth="1"
          strokeDasharray="4 2"
        />

        {/* Zero Line */}
        <line
          x1={paddingLeft}
          y1={yZero}
          x2={width - paddingRight}
          y2={yZero}
          stroke="#0f172a"
          strokeWidth="1.5"
        />

        {/* Y Axis ticks */}
        {[-1, -0.5, 0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line x1={paddingLeft - 4} y1={scaleY(tick)} x2={paddingLeft} y2={scaleY(tick)} stroke="#334155" />
            <text x={paddingLeft - 8} y={scaleY(tick) + 3} textAnchor="end" fontSize="10" fontFamily="monospace" fill="#475569">
              {tick.toFixed(1)}
            </text>
          </g>
        ))}

        {/* ACF Bars */}
        {lags.map((item) => {
          const cx = scaleX(item.lag);
          const cy = scaleY(item.acf);
          const barH = Math.abs(cy - yZero);
          const barY = item.acf >= 0 ? cy : yZero;

          return (
            <g key={item.lag}>
              <line
                x1={cx}
                y1={yZero}
                x2={cx}
                y2={cy}
                stroke={item.significant ? '#dc2626' : '#2563eb'}
                strokeWidth="2.5"
              />
              <circle
                cx={cx}
                cy={cy}
                r="4"
                fill={item.significant ? '#dc2626' : '#2563eb'}
                stroke="#ffffff"
                strokeWidth="1"
              >
                <title>{`Lag ${item.lag}: r = ${item.acf.toFixed(3)} ${item.significant ? '(Significante!)' : ''}`}</title>
              </circle>
              {/* X Tick */}
              <text x={cx} y={height - paddingBottom + 14} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#475569">
                {item.lag}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#334155" strokeWidth="1.5" />
        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#334155" strokeWidth="1.5" />

        {/* Labels */}
        <text
          x={(width - paddingRight + paddingLeft) / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize="11"
          fontFamily="serif"
          fontStyle="italic"
          fontWeight="bold"
          fill="#1e293b"
        >
          Lag Temporal ($k$)
        </text>

        <text
          x={16}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${height / 2})`}
          fontSize="11"
          fontFamily="serif"
          fontStyle="italic"
          fontWeight="bold"
          fill="#1e293b"
        >
          Autocorrelação ($r_k$)
        </text>
      </svg>

      <div className="mt-2 text-[11px] text-slate-500 font-serif italic text-center border-t border-slate-100 pt-2">
        Nota. Barras que ultrapassam a faixa azul indicam autocorrelação serial estatisticamente significante (violação da premissa de independência entre bateladas consecutivas).
      </div>
    </div>
  );
};
