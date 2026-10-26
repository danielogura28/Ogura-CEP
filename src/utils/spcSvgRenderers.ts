import { CapabilityResults, ControlLimits, NelsonViolation, ProcessSpecs } from '../types';

/**
 * Escapes characters for safe inclusion in XML / SVG strings.
 */
export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Renders a Shewhart Control Chart directly onto an HTML5 Canvas and returns a PNG base64 data URL.
 * This guarantees 100% reliable image generation without browser SVG parsing or CSP blob issues.
 */
export function renderControlChartToCanvas(
  title: string,
  points: { sample: number; value: number }[],
  limits: {
    cl: number;
    ucl: number;
    lcl: number;
    sigma: number;
  },
  violations: NelsonViolation[] = [],
  width = 760,
  height = 340,
  yLabel = 'Valor'
): string {
  const canvas = document.createElement('canvas');
  const scale = 2; // High-DPI / Retina 2x
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  // Scale all drawing operations
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (points.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dados insuficientes para plotar a Carta de Controle.', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  const paddingLeft = 70;
  const paddingRight = 100;
  const paddingTop = 45;
  const paddingBottom = 45;

  const vals = points.map((p) => p.value);
  const minVal = Math.min(...vals, limits.lcl);
  const maxVal = Math.max(...vals, limits.ucl);
  const range = maxVal - minVal || 1;

  const yMin = minVal - range * 0.12;
  const yMax = maxVal + range * 0.12;
  const ySpan = yMax - yMin;

  const scaleX = (idx: number) =>
    paddingLeft + (idx / Math.max(1, points.length - 1)) * (width - paddingLeft - paddingRight);
  const scaleY = (val: number) =>
    height - paddingBottom - ((val - yMin) / ySpan) * (height - paddingTop - paddingBottom);

  const yUCL = scaleY(limits.ucl);
  const yCL = scaleY(limits.cl);
  const yLCL = scaleY(limits.lcl);

  const yPlus1 = scaleY(limits.cl + limits.sigma);
  const yMinus1 = scaleY(limits.cl - limits.sigma);
  const yPlus2 = scaleY(limits.cl + 2 * limits.sigma);
  const yMinus2 = scaleY(limits.cl - 2 * limits.sigma);
  const innerW = width - paddingLeft - paddingRight;

  // Title and Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, paddingLeft, 24);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(
    `LSC=${limits.ucl.toFixed(3)} | LC=${limits.cl.toFixed(3)} | LIC=${limits.lcl.toFixed(3)}`,
    width - paddingRight,
    24
  );

  // Shaded Sigma Zones
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(paddingLeft, yPlus1, innerW, Math.max(1, yMinus1 - yPlus1));

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(paddingLeft, yPlus2, innerW, Math.max(1, yPlus1 - yPlus2));
  ctx.fillRect(paddingLeft, yMinus1, innerW, Math.max(1, yMinus2 - yMinus1));

  // Dashed Sigma Boundaries
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  [yPlus1, yMinus1, yPlus2, yMinus2].forEach((sy) => {
    ctx.beginPath();
    ctx.moveTo(paddingLeft, sy);
    ctx.lineTo(width - paddingRight, sy);
    ctx.stroke();
  });

  // UCL Line (LSC - Red Dashed)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(paddingLeft, yUCL);
  ctx.lineTo(width - paddingRight, yUCL);
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`LSC=${limits.ucl.toFixed(2)} (+3σ)`, width - paddingRight + 6, yUCL + 3);

  // Center Line (LC - Solid Dark)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(paddingLeft, yCL);
  ctx.lineTo(width - paddingRight, yCL);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`LC=${limits.cl.toFixed(2)}`, width - paddingRight + 6, yCL + 3);

  // LCL Line (LIC - Red Dashed)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(paddingLeft, yLCL);
  ctx.lineTo(width - paddingRight, yLCL);
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`LIC=${limits.lcl.toFixed(2)} (-3σ)`, width - paddingRight + 6, yLCL + 3);

  // Axes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, height - paddingBottom);
  ctx.lineTo(width - paddingRight, height - paddingBottom);
  ctx.stroke();

  // Y-axis Label
  ctx.save();
  ctx.translate(paddingLeft - 40, (paddingTop + height - paddingBottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#475569';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  // Connected Data Line
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  points.forEach((p, i) => {
    const cx = scaleX(i);
    const cy = scaleY(p.value);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Map violations
  const violationMap = new Map<number, NelsonViolation[]>();
  violations.forEach((v) => {
    const arr = violationMap.get(v.pointIndex) || [];
    arr.push(v);
    violationMap.set(v.pointIndex, arr);
  });

  // Points & Violation Indicators
  points.forEach((p, idx) => {
    const cx = scaleX(idx);
    const cy = scaleY(p.value);
    const pViolations = violationMap.get(idx);
    const isOutOfControl = Boolean(pViolations && pViolations.length > 0);

    if (isOutOfControl) {
      // Red halo
      ctx.fillStyle = '#fee2e2';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rule number badge
      if (pViolations && pViolations.length > 0) {
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`R${pViolations[0].ruleNumber}`, cx, cy - 11);
      }
    }

    // Point dot
    ctx.fillStyle = isOutOfControl ? '#dc2626' : '#2563eb';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, isOutOfControl ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // X-axis ticks
  const step = Math.max(1, Math.ceil(points.length / 14));
  ctx.fillStyle = '#475569';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;

  points.forEach((p, idx) => {
    if (idx % step === 0 || idx === points.length - 1) {
      const cx = scaleX(idx);
      ctx.beginPath();
      ctx.moveTo(cx, height - paddingBottom);
      ctx.lineTo(cx, height - paddingBottom + 4);
      ctx.stroke();
      ctx.fillText(String(p.sample ?? idx + 1), cx, height - paddingBottom + 16);
    }
  });

  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ordem Amostral / Subgrupo', (paddingLeft + width - paddingRight) / 2, height - 8);

  return canvas.toDataURL('image/png');
}

/**
 * Renders a Capability Histogram directly onto an HTML5 Canvas and returns a PNG base64 data URL.
 * Guarantees crisp, reliable rendering without SVG loading errors.
 */
export function renderCapabilityHistogramToCanvas(
  values: number[],
  specs: ProcessSpecs,
  capability: CapabilityResults,
  width = 760,
  height = 360,
  numBins = 14
): string {
  const canvas = document.createElement('canvas');
  const scale = 2; // Retina 2x
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (values.length < 3) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dados insuficientes para plotar o Histograma.', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  const lsl = capability.effectiveLsl ?? specs.lsl;
  const usl = capability.effectiveUsl ?? specs.usl;
  const target = specs.target ?? (lsl !== null && usl !== null ? (lsl + usl) / 2 : null);
  const mean = capability.mean;
  const sigmaW = capability.sigmaWithin || 1;
  const sigmaO = capability.sigmaOverall || 1;

  const paddingLeft = 65;
  const paddingRight = 65;
  const paddingTop = 45;
  const paddingBottom = 50;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  let plotMin = Math.min(dataMin, lsl ?? dataMin) - sigmaW * 0.9;
  let plotMax = Math.max(dataMax, usl ?? dataMax) + sigmaW * 0.9;
  const range = plotMax - plotMin || 1;

  const binWidth = (dataMax - dataMin) / numBins || 0.1;
  const bins = new Array(numBins).fill(0);
  values.forEach((v) => {
    let b = Math.floor((v - dataMin) / binWidth);
    if (b >= numBins) b = numBins - 1;
    if (b < 0) b = 0;
    bins[b]++;
  });

  const maxBinCount = Math.max(...bins, 1);

  const scaleX = (x: number) =>
    paddingLeft + ((x - plotMin) / range) * (width - paddingLeft - paddingRight);
  const scaleY = (count: number) =>
    height - paddingBottom - (count / maxBinCount) * (height - paddingTop - paddingBottom);

  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Histograma de Capabilidade & Distribuição Normal', paddingLeft, 24);

  // Subtitle / Indices
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(
    `Cp=${capability.cp?.toFixed(2) ?? '—'} | Cpk=${capability.cpk?.toFixed(2) ?? '—'} | Pp=${capability.pp?.toFixed(2) ?? '—'} | Ppk=${capability.ppk?.toFixed(2) ?? '—'}`,
    width - paddingRight,
    24
  );

  // Axes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, height - paddingBottom);
  ctx.lineTo(width - paddingRight, height - paddingBottom);
  ctx.stroke();

  // Draw Histogram Bars
  bins.forEach((count, idx) => {
    const bStart = dataMin + idx * binWidth;
    const x1 = scaleX(bStart);
    const x2 = scaleX(bStart + binWidth);
    const barW = Math.max(1, x2 - x1 - 1.5);
    const y = scaleY(count);
    const barH = height - paddingBottom - y;

    const isBelowLsl = lsl !== null && bStart + binWidth < lsl;
    const isAboveUsl = usl !== null && bStart > usl;

    ctx.fillStyle = isBelowLsl || isAboveUsl ? '#f87171' : '#60a5fa';
    ctx.strokeStyle = isBelowLsl || isAboveUsl ? '#dc2626' : '#2563eb';
    ctx.lineWidth = 1;

    ctx.fillRect(x1, y, barW, barH);
    ctx.strokeRect(x1, y, barW, barH);

    if (count > 0) {
      ctx.fillStyle = '#334155';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(count), (x1 + x2) / 2, y - 4);
    }
  });

  // Draw Normal Curves
  const steps = 70;
  const curvePointsW: { x: number; y: number }[] = [];
  const curvePointsO: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const x = plotMin + (i / steps) * range;

    const expW = Math.exp(-0.5 * Math.pow((x - mean) / sigmaW, 2));
    const densityW = (1 / (sigmaW * Math.sqrt(2 * Math.PI))) * expW;
    const freqW = densityW * values.length * binWidth;

    const expO = Math.exp(-0.5 * Math.pow((x - mean) / sigmaO, 2));
    const densityO = (1 / (sigmaO * Math.sqrt(2 * Math.PI))) * expO;
    const freqO = densityO * values.length * binWidth;

    curvePointsW.push({ x: scaleX(x), y: scaleY(freqW) });
    curvePointsO.push({ x: scaleX(x), y: scaleY(freqO) });
  }

  // Curve Overall (Dashed Gray)
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  curvePointsO.forEach((p, i) => {
    const py = Math.max(paddingTop, p.y);
    if (i === 0) ctx.moveTo(p.x, py);
    else ctx.lineTo(p.x, py);
  });
  ctx.stroke();

  // Curve Within (Solid Blue)
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  curvePointsW.forEach((p, i) => {
    const py = Math.max(paddingTop, p.y);
    if (i === 0) ctx.moveTo(p.x, py);
    else ctx.lineTo(p.x, py);
  });
  ctx.stroke();

  // Spec and Mean Lines
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';

  if (lsl !== null) {
    const xL = scaleX(lsl);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(xL, paddingTop);
    ctx.lineTo(xL, height - paddingBottom);
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.fillText(`LIE = ${lsl.toFixed(2)}`, xL, paddingTop - 8);
  }

  if (usl !== null) {
    const xU = scaleX(usl);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(xU, paddingTop);
    ctx.lineTo(xU, height - paddingBottom);
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.fillText(`LSE = ${usl.toFixed(2)}`, xU, paddingTop - 8);
  }

  if (target !== null) {
    const xT = scaleX(target);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(xT, paddingTop);
    ctx.lineTo(xT, height - paddingBottom);
    ctx.stroke();

    ctx.fillStyle = '#16a34a';
    ctx.fillText(`Alvo = ${target.toFixed(2)}`, xT, paddingTop - 8);
  }

  // Mean Line
  const xMean = scaleX(mean);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(xMean, paddingTop);
  ctx.lineTo(xMean, height - paddingBottom);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.fillText(`X̄ = ${mean.toFixed(2)}`, xMean, height - paddingBottom + 16);

  // Legend at bottom
  ctx.setLineDash([]);
  const legY = height - 16;
  ctx.fillStyle = '#60a5fa';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1;
  ctx.fillRect(paddingLeft, legY - 7, 12, 8);
  ctx.strokeRect(paddingLeft, legY - 7, 12, 8);

  ctx.fillStyle = '#475569';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Frequência', paddingLeft + 16, legY);

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(paddingLeft + 80, legY - 3);
  ctx.lineTo(paddingLeft + 100, legY - 3);
  ctx.stroke();
  ctx.fillText('Curva Normal Within (Curto Prazo)', paddingLeft + 106, legY);

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.moveTo(paddingLeft + 270, legY - 3);
  ctx.lineTo(paddingLeft + 290, legY - 3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText('Curva Normal Overall (Longo Prazo)', paddingLeft + 296, legY);

  return canvas.toDataURL('image/png');
}

/**
 * Generates an SVG string representation of a Shewhart control chart (Variables or Range)
 * with strict XML entity escaping.
 */
export function generateControlChartSvgString(
  title: string,
  points: { sample: number; value: number }[],
  limits: {
    cl: number;
    ucl: number;
    lcl: number;
    sigma: number;
  },
  violations: NelsonViolation[] = [],
  width = 800,
  height = 360,
  yLabel = 'Valor'
): string {
  if (points.length < 2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff"/><text x="${width / 2}" y="${height / 2}" fill="#64748b" text-anchor="middle" font-size="14" font-family="sans-serif">Dados insuficientes</text></svg>`;
  }

  const paddingLeft = 70;
  const paddingRight = 100;
  const paddingTop = 45;
  const paddingBottom = 45;

  const vals = points.map((p) => p.value);
  const minVal = Math.min(...vals, limits.lcl);
  const maxVal = Math.max(...vals, limits.ucl);
  const range = maxVal - minVal || 1;

  const yMin = minVal - range * 0.12;
  const yMax = maxVal + range * 0.12;
  const ySpan = yMax - yMin;

  const scaleX = (idx: number) =>
    paddingLeft + (idx / Math.max(1, points.length - 1)) * (width - paddingLeft - paddingRight);
  const scaleY = (val: number) =>
    height - paddingBottom - ((val - yMin) / ySpan) * (height - paddingTop - paddingBottom);

  const yUCL = scaleY(limits.ucl);
  const yCL = scaleY(limits.cl);
  const yLCL = scaleY(limits.lcl);

  const yPlus1 = scaleY(limits.cl + limits.sigma);
  const yMinus1 = scaleY(limits.cl - limits.sigma);
  const yPlus2 = scaleY(limits.cl + 2 * limits.sigma);
  const yMinus2 = scaleY(limits.cl - 2 * limits.sigma);

  const innerW = width - paddingLeft - paddingRight;

  const linePath = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.value).toFixed(1)}`;
  }, '');

  const violationMap = new Map<number, NelsonViolation[]>();
  violations.forEach((v) => {
    const arr = violationMap.get(v.pointIndex) || [];
    arr.push(v);
    violationMap.set(v.pointIndex, arr);
  });

  const pointsSvg = points
    .map((p, idx) => {
      const cx = scaleX(idx).toFixed(1);
      const cy = scaleY(p.value).toFixed(1);
      const pViolations = violationMap.get(idx);
      const isOutOfControl = Boolean(pViolations && pViolations.length > 0);

      let circleBadge = '';
      if (isOutOfControl) {
        circleBadge = `<circle cx="${cx}" cy="${cy}" r="10" fill="#fee2e2" stroke="#dc2626" stroke-width="1.5" />`;
      }
      const dot = `<circle cx="${cx}" cy="${cy}" r="${isOutOfControl ? 5 : 3.5}" fill="${isOutOfControl ? '#dc2626' : '#2563eb'}" stroke="#ffffff" stroke-width="1.5" />`;

      let textBadge = '';
      if (isOutOfControl && pViolations && pViolations.length > 0) {
        textBadge = `<text x="${cx}" y="${(Number(cy) - 9).toFixed(1)}" font-size="9" font-weight="bold" text-anchor="middle" fill="#dc2626" font-family="sans-serif">R${pViolations[0].ruleNumber}</text>`;
      }

      return `${circleBadge}${dot}${textBadge}`;
    })
    .join('');

  const step = Math.max(1, Math.ceil(points.length / 14));
  const ticksSvg = points
    .filter((_, idx) => idx % step === 0 || idx === points.length - 1)
    .map((p, idx) => {
      const origIdx = points.indexOf(p);
      const cx = scaleX(origIdx).toFixed(1);
      return `<line x1="${cx}" y1="${height - paddingBottom}" x2="${cx}" y2="${height - paddingBottom + 4}" stroke="#334155" />
      <text x="${cx}" y="${height - paddingBottom + 16}" text-anchor="middle" font-size="10" font-family="monospace" fill="#475569">${p.sample ?? origIdx + 1}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #ffffff; font-family: Inter, system-ui, sans-serif;">
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <text x="${paddingLeft}" y="24" font-size="13" font-weight="bold" fill="#0f172a">${escapeXml(title)}</text>
    <text x="${width - paddingRight}" y="24" text-anchor="end" font-size="10" font-family="monospace" fill="#475569">LSC=${limits.ucl.toFixed(3)} | LC=${limits.cl.toFixed(3)} | LIC=${limits.lcl.toFixed(3)}</text>
    <rect x="${paddingLeft}" y="${yPlus1.toFixed(1)}" width="${innerW}" height="${Math.max(1, yMinus1 - yPlus1).toFixed(1)}" fill="#f8fafc" fill-opacity="0.9" />
    <rect x="${paddingLeft}" y="${yPlus2.toFixed(1)}" width="${innerW}" height="${Math.max(1, yPlus1 - yPlus2).toFixed(1)}" fill="#f1f5f9" fill-opacity="0.6" />
    <rect x="${paddingLeft}" y="${yMinus1.toFixed(1)}" width="${innerW}" height="${Math.max(1, yMinus2 - yMinus1).toFixed(1)}" fill="#f1f5f9" fill-opacity="0.6" />
    <line x1="${paddingLeft}" y1="${yPlus1.toFixed(1)}" x2="${width - paddingRight}" y2="${yPlus1.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3" />
    <line x1="${paddingLeft}" y1="${yMinus1.toFixed(1)}" x2="${width - paddingRight}" y2="${yMinus1.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3" />
    <line x1="${paddingLeft}" y1="${yPlus2.toFixed(1)}" x2="${width - paddingRight}" y2="${yPlus2.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3" />
    <line x1="${paddingLeft}" y1="${yMinus2.toFixed(1)}" x2="${width - paddingRight}" y2="${yMinus2.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3" />
    <line x1="${paddingLeft}" y1="${yUCL.toFixed(1)}" x2="${width - paddingRight}" y2="${yUCL.toFixed(1)}" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 3" />
    <text x="${width - paddingRight + 6}" y="${(yUCL + 4).toFixed(1)}" font-size="10" font-family="monospace" fill="#dc2626" font-weight="bold">LSC=${limits.ucl.toFixed(2)} (+3σ)</text>
    <line x1="${paddingLeft}" y1="${yCL.toFixed(1)}" x2="${width - paddingRight}" y2="${yCL.toFixed(1)}" stroke="#0f172a" stroke-width="1.8" />
    <text x="${width - paddingRight + 6}" y="${(yCL + 4).toFixed(1)}" font-size="10" font-family="monospace" fill="#0f172a" font-weight="bold">LC=${limits.cl.toFixed(2)}</text>
    <line x1="${paddingLeft}" y1="${yLCL.toFixed(1)}" x2="${width - paddingRight}" y2="${yLCL.toFixed(1)}" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 3" />
    <text x="${width - paddingRight + 6}" y="${(yLCL + 4).toFixed(1)}" font-size="10" font-family="monospace" fill="#dc2626" font-weight="bold">LIC=${limits.lcl.toFixed(2)} (-3σ)</text>
    <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="#334155" stroke-width="1.5" />
    <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" stroke="#334155" stroke-width="1.5" />
    <text x="${paddingLeft - 40}" y="${(paddingTop + height - paddingBottom) / 2}" font-size="10" fill="#475569" font-family="sans-serif" transform="rotate(-90 ${paddingLeft - 40} ${(paddingTop + height - paddingBottom) / 2})" text-anchor="middle">${escapeXml(yLabel)}</text>
    <path d="${linePath}" fill="none" stroke="#2563eb" stroke-width="1.8" />
    ${pointsSvg}
    ${ticksSvg}
    <text x="${(paddingLeft + width - paddingRight) / 2}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#64748b" font-family="sans-serif">Ordem Amostral / Subgrupo</text>
  </svg>`;
}

/**
 * Generates an SVG string representation of a Capability Histogram with strict XML escaping.
 */
export function generateCapabilityHistogramSvgString(
  values: number[],
  specs: ProcessSpecs,
  capability: CapabilityResults,
  width = 800,
  height = 380,
  numBins = 14
): string {
  if (values.length < 3) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff"/><text x="${width / 2}" y="${height / 2}" fill="#64748b" text-anchor="middle" font-size="14" font-family="sans-serif">Dados insuficientes</text></svg>`;
  }

  const lsl = capability.effectiveLsl ?? specs.lsl;
  const usl = capability.effectiveUsl ?? specs.usl;
  const target = specs.target ?? (lsl !== null && usl !== null ? (lsl + usl) / 2 : null);
  const mean = capability.mean;
  const sigmaW = capability.sigmaWithin || 1;
  const sigmaO = capability.sigmaOverall || 1;

  const paddingLeft = 65;
  const paddingRight = 65;
  const paddingTop = 45;
  const paddingBottom = 50;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  let plotMin = Math.min(dataMin, lsl ?? dataMin) - sigmaW * 0.9;
  let plotMax = Math.max(dataMax, usl ?? dataMax) + sigmaW * 0.9;
  const range = plotMax - plotMin || 1;

  const binWidth = (dataMax - dataMin) / numBins || 0.1;
  const bins = new Array(numBins).fill(0);
  values.forEach((v) => {
    let b = Math.floor((v - dataMin) / binWidth);
    if (b >= numBins) b = numBins - 1;
    if (b < 0) b = 0;
    bins[b]++;
  });

  const maxBinCount = Math.max(...bins, 1);

  const scaleX = (x: number) =>
    paddingLeft + ((x - plotMin) / range) * (width - paddingLeft - paddingRight);
  const scaleY = (count: number) =>
    height - paddingBottom - (count / maxBinCount) * (height - paddingTop - paddingBottom);

  const steps = 70;
  const curvePointsW: { x: number; y: number }[] = [];
  const curvePointsO: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const x = plotMin + (i / steps) * range;

    const expW = Math.exp(-0.5 * Math.pow((x - mean) / sigmaW, 2));
    const densityW = (1 / (sigmaW * Math.sqrt(2 * Math.PI))) * expW;
    const freqW = densityW * values.length * binWidth;

    const expO = Math.exp(-0.5 * Math.pow((x - mean) / sigmaO, 2));
    const densityO = (1 / (sigmaO * Math.sqrt(2 * Math.PI))) * expO;
    const freqO = densityO * values.length * binWidth;

    curvePointsW.push({ x: scaleX(x), y: scaleY(freqW) });
    curvePointsO.push({ x: scaleX(x), y: scaleY(freqO) });
  }

  const pathW = curvePointsW.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${Math.max(paddingTop, p.y).toFixed(1)}`,
    ''
  );
  const pathO = curvePointsO.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${Math.max(paddingTop, p.y).toFixed(1)}`,
    ''
  );

  const barsSvg = bins
    .map((count, idx) => {
      const bStart = dataMin + idx * binWidth;
      const x1 = scaleX(bStart);
      const x2 = scaleX(bStart + binWidth);
      const barW = Math.max(1, x2 - x1 - 1.5);
      const y = scaleY(count);
      const barH = height - paddingBottom - y;

      const isBelowLsl = lsl !== null && bStart + binWidth < lsl;
      const isAboveUsl = usl !== null && bStart > usl;

      const fillColor = isBelowLsl || isAboveUsl ? '#f87171' : '#60a5fa';
      const strokeColor = isBelowLsl || isAboveUsl ? '#dc2626' : '#2563eb';

      return `<rect x="${x1.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fillColor}" fill-opacity="0.85" stroke="${strokeColor}" stroke-width="1" />
      ${count > 0 ? `<text x="${((x1 + x2) / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="9" font-family="monospace" fill="#334155">${count}</text>` : ''}`;
    })
    .join('');

  let specLinesSvg = '';
  if (lsl !== null) {
    const xL = scaleX(lsl);
    specLinesSvg += `<line x1="${xL.toFixed(1)}" y1="${paddingTop}" x2="${xL.toFixed(1)}" y2="${height - paddingBottom}" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6 3" />
    <text x="${xL.toFixed(1)}" y="${paddingTop - 8}" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626" font-family="monospace">LIE = ${lsl.toFixed(2)}</text>`;
  }
  if (usl !== null) {
    const xU = scaleX(usl);
    specLinesSvg += `<line x1="${xU.toFixed(1)}" y1="${paddingTop}" x2="${xU.toFixed(1)}" y2="${height - paddingBottom}" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6 3" />
    <text x="${xU.toFixed(1)}" y="${paddingTop - 8}" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626" font-family="monospace">LSE = ${usl.toFixed(2)}</text>`;
  }
  if (target !== null) {
    const xT = scaleX(target);
    specLinesSvg += `<line x1="${xT.toFixed(1)}" y1="${paddingTop}" x2="${xT.toFixed(1)}" y2="${height - paddingBottom}" stroke="#16a34a" stroke-width="2" stroke-dasharray="4 2" />
    <text x="${xT.toFixed(1)}" y="${paddingTop - 8}" text-anchor="middle" font-size="10" font-weight="bold" fill="#16a34a" font-family="monospace">Alvo = ${target.toFixed(2)}</text>`;
  }

  const xMean = scaleX(mean);
  const meanLineSvg = `<line x1="${xMean.toFixed(1)}" y1="${paddingTop}" x2="${xMean.toFixed(1)}" y2="${height - paddingBottom}" stroke="#0f172a" stroke-width="2" />
  <text x="${xMean.toFixed(1)}" y="${height - paddingBottom + 16}" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a" font-family="monospace">X̄ = ${mean.toFixed(2)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #ffffff; font-family: Inter, system-ui, sans-serif;">
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <text x="${paddingLeft}" y="24" font-size="13" font-weight="bold" fill="#0f172a">Histograma de Capabilidade &amp; Distribuição Normal</text>
    <text x="${width - paddingRight}" y="24" text-anchor="end" font-size="10" font-family="monospace" fill="#0f172a">Cp=${capability.cp?.toFixed(2) ?? '—'} | Cpk=${capability.cpk?.toFixed(2) ?? '—'} | Pp=${capability.pp?.toFixed(2) ?? '—'} | Ppk=${capability.ppk?.toFixed(2) ?? '—'}</text>
    <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="#334155" stroke-width="1.5" />
    <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" stroke="#334155" stroke-width="1.5" />
    ${barsSvg}
    <path d="${pathO}" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="4 2" />
    <path d="${pathW}" fill="none" stroke="#2563eb" stroke-width="2.5" />
    ${specLinesSvg}
    ${meanLineSvg}
    <g transform="translate(${paddingLeft}, ${height - 18})">
      <rect x="0" y="2" width="12" height="8" fill="#60a5fa" stroke="#2563eb" stroke-width="0.75" />
      <text x="16" y="9" font-size="9" fill="#475569" font-family="sans-serif">Frequência</text>
      <line x1="85" y1="6" x2="105" y2="6" stroke="#2563eb" stroke-width="2" />
      <text x="110" y="9" font-size="9" fill="#475569" font-family="sans-serif">Curva Normal Within (Curto Prazo)</text>
      <line x1="280" y1="6" x2="300" y2="6" stroke="#64748b" stroke-width="2" stroke-dasharray="4 2" />
      <text x="305" y="9" font-size="9" fill="#475569" font-family="sans-serif">Curva Normal Overall (Longo Prazo)</text>
    </g>
  </svg>`;
}

/**
 * Converts an SVG string into a high-density PNG base64 data URL with fallback.
 */
export async function convertSvgToPngBase64(
  svgString: string,
  width: number,
  height: number,
  scale = 2
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const cleanSvg = svgString.includes('xmlns="http://www.w3.org/2000/svg"')
        ? svgString
        : svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

      const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg)}`;
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve('');
        }
      };

      img.onerror = () => {
        resolve('');
      };

      img.src = dataUri;
    } catch {
      resolve('');
    }
  });
}

/**
 * Renders the "12 Carta de Valores Brutos" run chart onto Canvas and returns a PNG base64 data URL.
 */
export function renderRawValuesRunChartToCanvas(
  points: { sample?: number; value: number }[],
  specs: ProcessSpecs,
  mean: number,
  sigma: number,
  lsl?: number | null,
  usl?: number | null,
  width = 760,
  height = 340
): string {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (!points || points.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dados insuficientes para a Carta de Valores Brutos.', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  const paddingLeft = 65;
  const paddingRight = 95;
  const paddingTop = 45;
  const paddingBottom = 45;

  const vals = points.map((p) => p.value);
  const minVal = Math.min(...vals, lsl !== null && lsl !== undefined ? lsl : Infinity);
  const maxVal = Math.max(...vals, usl !== null && usl !== undefined ? usl : -Infinity);
  const dataSpan = maxVal - minVal || 1;

  const yMin = minVal - dataSpan * 0.12;
  const yMax = maxVal + dataSpan * 0.12;
  const ySpan = yMax - yMin;

  const scaleX = (idx: number) =>
    paddingLeft + (idx / Math.max(1, points.length - 1)) * (width - paddingLeft - paddingRight);
  const scaleY = (val: number) =>
    height - paddingBottom - ((val - yMin) / ySpan) * (height - paddingTop - paddingBottom);

  // Header Title (clean without badge 12)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Carta de Valores Brutos', paddingLeft, 26);

  ctx.fillStyle = '#475569';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  let headerText = `X̄ = ${mean.toFixed(3)}`;
  if (lsl !== null && lsl !== undefined) headerText += ` | LIE = ${lsl.toFixed(2)}`;
  if (usl !== null && usl !== undefined) headerText += ` | LSE = ${usl.toFixed(2)}`;
  headerText += ` | N = ${points.length}`;
  ctx.fillText(headerText, width - paddingRight, 25);

  // Grid
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach((pct) => {
    const y = height - paddingBottom - pct * (height - paddingTop - paddingBottom);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();
  });

  // +/- 3 Sigma bounds
  const yPlus3 = scaleY(mean + 3 * sigma);
  const yMinus3 = scaleY(mean - 3 * sigma);

  if (yPlus3 >= paddingTop && yPlus3 <= height - paddingBottom) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, yPlus3);
    ctx.lineTo(width - paddingRight, yPlus3);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`+3σ (${(mean + 3 * sigma).toFixed(2)})`, width - paddingRight + 5, yPlus3 + 3);
  }

  if (yMinus3 >= paddingTop && yMinus3 <= height - paddingBottom) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, yMinus3);
    ctx.lineTo(width - paddingRight, yMinus3);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`-3σ (${(mean - 3 * sigma).toFixed(2)})`, width - paddingRight + 5, yMinus3 + 3);
  }
  ctx.setLineDash([]);

  // LSL (LIE) line
  if (lsl !== null && lsl !== undefined) {
    const yLsl = scaleY(lsl);
    if (yLsl >= paddingTop - 5 && yLsl <= height - paddingBottom + 5) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yLsl);
      ctx.lineTo(width - paddingRight, yLsl);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`LIE = ${lsl.toFixed(2)}`, width - paddingRight + 5, yLsl + 3);
    }
  }

  // USL (LSE) line
  if (usl !== null && usl !== undefined) {
    const yUsl = scaleY(usl);
    if (yUsl >= paddingTop - 5 && yUsl <= height - paddingBottom + 5) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yUsl);
      ctx.lineTo(width - paddingRight, yUsl);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`LSE = ${usl.toFixed(2)}`, width - paddingRight + 5, yUsl + 3);
    }
  }

  // Mean Line (X-bar)
  const yMean = scaleY(mean);
  if (yMean >= paddingTop && yMean <= height - paddingBottom) {
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, yMean);
    ctx.lineTo(width - paddingRight, yMean);
    ctx.stroke();

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 9.5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`X̄ = ${mean.toFixed(3)}`, width - paddingRight + 5, yMean + 3);
  }

  // Connecting run line
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = scaleX(i);
    const y = scaleY(p.value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw point markers
  points.forEach((p, i) => {
    const x = scaleX(i);
    const y = scaleY(p.value);
    const isOutOfSpec =
      (lsl !== null && lsl !== undefined && p.value < lsl) ||
      (usl !== null && usl !== undefined && p.value > usl);

    ctx.beginPath();
    ctx.arc(x, y, isOutOfSpec ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isOutOfSpec ? '#dc2626' : '#1e40af';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Axes lines
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, height - paddingBottom);
  ctx.lineTo(width - paddingRight, height - paddingBottom);
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, height - paddingBottom);
  ctx.stroke();

  // X ticks
  const step = Math.max(1, Math.ceil(points.length / 14));
  ctx.font = '9px monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  points.forEach((p, i) => {
    if (i % step === 0 || i === points.length - 1) {
      const x = scaleX(i);
      ctx.beginPath();
      ctx.moveTo(x, height - paddingBottom);
      ctx.lineTo(x, height - paddingBottom + 4);
      ctx.stroke();
      ctx.fillText(String(p.sample ?? i + 1), x, height - paddingBottom + 15);
    }
  });

  // Y label and X label
  ctx.save();
  ctx.translate(paddingLeft - 38, (paddingTop + height - paddingBottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#475569';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(specs.unit || 'Valor', 0, 0);
  ctx.restore();

  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ordem Cronológica das Amostras Coletadas', (paddingLeft + width - paddingRight) / 2, height - 8);

  return canvas.toDataURL('image/png');
}

/**
 * Renders the "13 Gráfico de Probabilidade" normal probability plot onto Canvas and returns a PNG base64 data URL.
 */
export function renderNormalProbabilityPlotToCanvas(
  values: number[],
  specs: ProcessSpecs,
  mean: number,
  sigma: number,
  lsl?: number | null,
  usl?: number | null,
  width = 760,
  height = 340
): string {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (!values || values.length < 3) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Amostras insuficientes para gerar o Gráfico de Probabilidade Normal.', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  const paddingLeft = 65;
  const paddingRight = 95;
  const paddingTop = 45;
  const paddingBottom = 45;

  function normInvLocal(p: number): number {
    if (p <= 0.000001) return -4.5;
    if (p >= 0.999999) return 4.5;
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const q = p - 0.5;
    if (Math.abs(q) <= 0.42) {
      const r = q * q;
      return (q * (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    const r = p < 0.5 ? p : 1 - p;
    const s = Math.log(-Math.log(r));
    let t = c[0] + s * (c[1] + s * (c[2] + s * (c[3] + s * (c[4] + s * c[5]))));
    t = t / (1 + s * (d[0] + s * (d[1] + s * (d[2] + s * d[3]))));
    return p < 0.5 ? -t : t;
  }

  const probTicks = [
    { p: 0.001, label: '0,1%' },
    { p: 0.01, label: '1%' },
    { p: 0.05, label: '5%' },
    { p: 0.20, label: '20%' },
    { p: 0.50, label: '50%' },
    { p: 0.80, label: '80%' },
    { p: 0.95, label: '95%' },
    { p: 0.99, label: '99%' },
    { p: 0.999, label: '99,9%' }
  ];

  const zMin = -3.5;
  const zMax = 3.5;
  const zSpan = zMax - zMin;

  const scaleY = (z: number) => {
    const clampedZ = Math.max(zMin, Math.min(zMax, z));
    return height - paddingBottom - ((clampedZ - zMin) / zSpan) * (height - paddingTop - paddingBottom);
  };

  const sortedVals = [...values].sort((a, b) => a - b);
  const n = sortedVals.length;
  const dataMin = sortedVals[0];
  const dataMax = sortedVals[n - 1];

  let xMin = Math.min(dataMin, lsl ?? dataMin, mean - 3.5 * sigma);
  let xMax = Math.max(dataMax, usl ?? dataMax, mean + 3.5 * sigma);
  const xSpan = xMax - xMin || 1;
  xMin -= xSpan * 0.05;
  xMax += xSpan * 0.05;
  const effectiveXSpan = xMax - xMin;

  const scaleX = (x: number) =>
    paddingLeft + ((x - xMin) / effectiveXSpan) * (width - paddingLeft - paddingRight);

  // Header Title (clean without badge 13)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Gráfico de Probabilidade Normal', paddingLeft, 26);

  ctx.fillStyle = '#475569';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`X̄ = ${mean.toFixed(3)} | s = ${sigma.toFixed(3)} | N = ${n}`, width - paddingRight, 25);

  // Probability horizontal grid lines
  probTicks.forEach((pt) => {
    const z = normInvLocal(pt.p);
    const y = scaleY(z);

    ctx.strokeStyle = pt.p === 0.5 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = pt.p === 0.5 ? 1.5 : 1;
    ctx.setLineDash(pt.p === 0.5 ? [] : [3, 3]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    ctx.fillStyle = pt.p === 0.5 ? '#0f172a' : '#64748b';
    ctx.font = pt.p === 0.5 ? 'bold 9px monospace' : '8.5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(pt.label, paddingLeft - 6, y + 3);
  });
  ctx.setLineDash([]);

  // Specification lines LIE and LSE
  if (lsl !== null && lsl !== undefined) {
    const xL = scaleX(lsl);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(xL, paddingTop);
    ctx.lineTo(xL, height - paddingBottom);
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LIE = ${lsl.toFixed(2)}`, xL, paddingTop - 4);
  }

  if (usl !== null && usl !== undefined) {
    const xU = scaleX(usl);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(xU, paddingTop);
    ctx.lineTo(xU, height - paddingBottom);
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LSE = ${usl.toFixed(2)}`, xU, paddingTop - 4);
  }
  ctx.setLineDash([]);

  // Straight Gaussian theoretical reference fit line
  const xLine1 = mean - 3.2 * sigma;
  const xLine2 = mean + 3.2 * sigma;
  const fitLineX1 = scaleX(xLine1);
  const fitLineY1 = scaleY(-3.2);
  const fitLineX2 = scaleX(xLine2);
  const fitLineY2 = scaleY(3.2);

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fitLineX1, fitLineY1);
  ctx.lineTo(fitLineX2, fitLineY2);
  ctx.stroke();

  // Draw Blom plotting points
  sortedVals.forEach((val, idx) => {
    const rank = idx + 1;
    const p = (rank - 0.375) / (n + 0.25);
    const z = normInvLocal(p);
    const cx = scaleX(val);
    const cy = scaleY(z);

    const isOutOfSpec =
      (lsl !== null && lsl !== undefined && val < lsl) ||
      (usl !== null && usl !== undefined && val > usl);

    ctx.beginPath();
    ctx.arc(cx, cy, isOutOfSpec ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isOutOfSpec ? '#dc2626' : '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Axes lines
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, height - paddingBottom);
  ctx.lineTo(width - paddingRight, height - paddingBottom);
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, height - paddingBottom);
  ctx.stroke();

  // X axis tick marks
  const xStep = Math.max(1, Math.ceil(n / 10));
  ctx.font = '9px monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  sortedVals.forEach((val, idx) => {
    if (idx % xStep === 0 || idx === n - 1) {
      const cx = scaleX(val);
      ctx.beginPath();
      ctx.moveTo(cx, height - paddingBottom);
      ctx.lineTo(cx, height - paddingBottom + 4);
      ctx.stroke();
      ctx.fillText(val.toFixed(2), cx, height - paddingBottom + 15);
    }
  });

  // Right legend box (Reta Teórica Normal)
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.fillRect(width - paddingRight - 130, paddingTop + 6, 120, 48);
  ctx.strokeRect(width - paddingRight - 130, paddingTop + 6, 120, 48);

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width - paddingRight - 120, paddingTop + 20);
  ctx.lineTo(width - paddingRight - 95, paddingTop + 20);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Ajuste Normal', width - paddingRight - 90, paddingTop + 23);

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(width - paddingRight - 108, paddingTop + 38, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.fillText('Pontos (Blom)', width - paddingRight - 90, paddingTop + 41);

  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Dimensão / Característica (${specs.unit || 'mm'})`, (paddingLeft + width - paddingRight) / 2, height - 8);

  return canvas.toDataURL('image/png');
}

