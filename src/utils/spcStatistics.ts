import {
  CapabilityResults,
  CepDataPoint,
  ControlChartType,
  ControlLimits,
  NelsonViolation,
  ProcessSpecs,
  SerialAutocorrItem,
  CavitySpatialResult
} from '../types';

// Shewhart Constants Table for Subgroups n = 2 to 25
const SHEWHART_FACTORS: Record<number, { d2: number; d3: number; c4: number; A2: number; A3: number; D3: number; D4: number; B3: number; B4: number }> = {
  2: { d2: 1.128, d3: 0.853, c4: 0.7979, A2: 1.880, A3: 2.659, D3: 0, D4: 3.267, B3: 0, B4: 3.267 },
  3: { d2: 1.693, d3: 0.888, c4: 0.8862, A2: 1.023, A3: 1.954, D3: 0, D4: 2.574, B3: 0, B4: 2.568 },
  4: { d2: 2.059, d3: 0.880, c4: 0.9213, A2: 0.729, A3: 1.628, D3: 0, D4: 2.282, B3: 0, B4: 2.266 },
  5: { d2: 2.326, d3: 0.864, c4: 0.9400, A2: 0.577, A3: 1.427, D3: 0, D4: 2.114, B3: 0, B4: 2.089 },
  6: { d2: 2.534, d3: 0.848, c4: 0.9515, A2: 0.483, A3: 1.287, D3: 0, D4: 2.004, B3: 0.030, B4: 1.970 },
  7: { d2: 2.704, d3: 0.833, c4: 0.9594, A2: 0.419, A3: 1.182, D3: 0.076, D4: 1.924, B3: 0.118, B4: 1.882 },
  8: { d2: 2.847, d3: 0.820, c4: 0.9650, A2: 0.373, A3: 1.099, D3: 0.136, D4: 1.864, B3: 0.185, B4: 1.815 },
  9: { d2: 2.970, d3: 0.808, c4: 0.9693, A2: 0.337, A3: 1.032, D3: 0.184, D4: 1.816, B3: 0.239, B4: 1.761 },
  10: { d2: 3.078, d3: 0.797, c4: 0.9727, A2: 0.308, A3: 0.975, D3: 0.223, D4: 1.777, B3: 0.284, B4: 1.716 }
};

export function getShewhartFactors(n: number) {
  const clamped = Math.max(2, Math.min(10, n));
  return SHEWHART_FACTORS[clamped] || SHEWHART_FACTORS[2];
}

// Error function approximation for normal CDF
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Calculates standard control limits for I-MR or Subgrouped Xbar charts
 */
export function computeControlLimits(
  points: CepDataPoint[],
  chartType: ControlChartType = 'I-MR',
  subgroupSize: number = 1
): {
  limits: ControlLimits;
  primaryPoints: { sample: number; value: number }[];
  secondaryPoints: { sample: number; value: number }[];
} {
  const values = points.map((p) => p.value);
  const n = values.length;

  if (n < 2) {
    return {
      limits: { centerLine: values[0] || 0, ucl: values[0] || 0, lcl: values[0] || 0, sigmaWithin: 1, sigmaOverall: 1 },
      primaryPoints: points.map((p) => ({ sample: p.sample, value: p.value })),
      secondaryPoints: []
    };
  }

  // Calculate overall standard deviation
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sumSq = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const sigmaOverall = Math.sqrt(sumSq / (n - 1));

  if (chartType === 'I-MR') {
    // Individual & Moving Range
    const mrValues: { sample: number; value: number }[] = [];
    let mrSum = 0;

    for (let i = 1; i < n; i++) {
      const mr = Math.abs(values[i] - values[i - 1]);
      mrValues.push({ sample: points[i].sample, value: mr });
      mrSum += mr;
    }

    const mrMean = mrSum / (n - 1);
    const d2 = 1.128; // for n=2 moving range
    const D4 = 3.267;
    const sigmaWithin = mrMean / d2;

    const ucl = mean + 3 * sigmaWithin;
    const lcl = mean - 3 * sigmaWithin;

    const subUcl = D4 * mrMean;
    const subLcl = 0;

    return {
      limits: {
        centerLine: mean,
        ucl,
        lcl,
        sigmaWithin,
        sigmaOverall,
        subCenterLine: mrMean,
        subUcl,
        subLcl,
        avgRange: mrMean,
        d2
      },
      primaryPoints: points.map((p) => ({ sample: p.sample, value: p.value })),
      secondaryPoints: mrValues
    };
  } else {
    // Subgrouped Xbar-R
    const k = Math.floor(n / subgroupSize);
    const subMeans: { sample: number; value: number }[] = [];
    const subRanges: { sample: number; value: number }[] = [];

    for (let i = 0; i < k; i++) {
      const chunk = values.slice(i * subgroupSize, (i + 1) * subgroupSize);
      const subMean = chunk.reduce((a, b) => a + b, 0) / subgroupSize;
      const subRange = Math.max(...chunk) - Math.min(...chunk);

      subMeans.push({ sample: i + 1, value: subMean });
      subRanges.push({ sample: i + 1, value: subRange });
    }

    const grandMean = subMeans.reduce((acc, m) => acc + m.value, 0) / k;
    const avgRange = subRanges.reduce((acc, r) => acc + r.value, 0) / k;

    const factors = getShewhartFactors(subgroupSize);
    const sigmaWithin = avgRange / factors.d2;

    const ucl = grandMean + factors.A2 * avgRange;
    const lcl = grandMean - factors.A2 * avgRange;

    const subUcl = factors.D4 * avgRange;
    const subLcl = factors.D3 * avgRange;

    return {
      limits: {
        centerLine: grandMean,
        ucl,
        lcl,
        sigmaWithin,
        sigmaOverall,
        subCenterLine: avgRange,
        subUcl,
        subLcl,
        avgRange,
        d2: factors.d2
      },
      primaryPoints: subMeans,
      secondaryPoints: subRanges
    };
  }
}

/**
 * Evaluates Nelson / Western Electric Special Cause Rules (Rules 1 to 8)
 */
export function evaluateNelsonRules(
  points: { sample: number; value: number }[],
  cl: number,
  sigma: number,
  activeRules: Record<number, boolean>
): NelsonViolation[] {
  const violations: NelsonViolation[] = [];
  const n = points.length;
  if (n === 0 || sigma <= 0) return violations;

  const vals = points.map((p) => p.value);

  // Rule 1: One point beyond 3 sigma from center line
  if (activeRules[1]) {
    for (let i = 0; i < n; i++) {
      const z = Math.abs(vals[i] - cl) / sigma;
      if (z > 3) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 1,
          ruleDescription: 'Regra 1: 1 ponto além de 3σ da linha central (Causa Especial Crítica)'
        });
      }
    }
  }

  // Rule 2: 9 points in a row on the same side of center line
  if (activeRules[2]) {
    for (let i = 8; i < n; i++) {
      const window = vals.slice(i - 8, i + 1);
      const allAbove = window.every((v) => v > cl);
      const allBelow = window.every((v) => v < cl);
      if (allAbove || allBelow) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 2,
          ruleDescription: 'Regra 2: 9 pontos consecutivos no mesmo lado da média (Deslocamento de Nível)'
        });
      }
    }
  }

  // Rule 3: 6 points in a row continuously increasing or decreasing
  if (activeRules[3]) {
    for (let i = 5; i < n; i++) {
      const window = vals.slice(i - 5, i + 1);
      let inc = true;
      let dec = true;
      for (let j = 1; j < 6; j++) {
        if (window[j] <= window[j - 1]) inc = false;
        if (window[j] >= window[j - 1]) dec = false;
      }
      if (inc || dec) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 3,
          ruleDescription: 'Regra 3: 6 pontos contínuos em tendência ascendente ou descendente (Desgaste/Deriva)'
        });
      }
    }
  }

  // Rule 4: 14 points in a row alternating up and down
  if (activeRules[4] && n >= 14) {
    for (let i = 13; i < n; i++) {
      let alternating = true;
      for (let j = i - 12; j <= i; j++) {
        const prevDiff = vals[j - 1] - vals[j - 2];
        const currDiff = vals[j] - vals[j - 1];
        if (prevDiff * currDiff >= 0) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 4,
          ruleDescription: 'Regra 4: 14 pontos alternando sistematicamente para cima e para baixo (Superajuste/Dois Fluxos)'
        });
      }
    }
  }

  // Rule 5: 2 out of 3 points beyond 2 sigma on same side
  if (activeRules[5] && n >= 3) {
    for (let i = 2; i < n; i++) {
      const w = vals.slice(i - 2, i + 1);
      const countAbove = w.filter((v) => v > cl + 2 * sigma).length;
      const countBelow = w.filter((v) => v < cl - 2 * sigma).length;
      if (countAbove >= 2 || countBelow >= 2) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 5,
          ruleDescription: 'Regra 5: 2 de 3 pontos consecutivos além de 2σ no mesmo lado (Alerta Prévio de Desvio)'
        });
      }
    }
  }

  // Rule 6: 4 out of 5 points beyond 1 sigma on same side
  if (activeRules[6] && n >= 5) {
    for (let i = 4; i < n; i++) {
      const w = vals.slice(i - 4, i + 1);
      const countAbove = w.filter((v) => v > cl + 1 * sigma).length;
      const countBelow = w.filter((v) => v < cl - 1 * sigma).length;
      if (countAbove >= 4 || countBelow >= 4) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 6,
          ruleDescription: 'Regra 6: 4 de 5 pontos consecutivos além de 1σ no mesmo lado'
        });
      }
    }
  }

  // Rule 7: 15 points in a row within 1 sigma (Stratification)
  if (activeRules[7] && n >= 15) {
    for (let i = 14; i < n; i++) {
      const w = vals.slice(i - 14, i + 1);
      const allWithin1 = w.every((v) => Math.abs(v - cl) <= 1 * sigma);
      if (allWithin1) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 7,
          ruleDescription: 'Regra 7: 15 pontos consecutivos contidos dentro de 1σ (Estratificação Indesejada)'
        });
      }
    }
  }

  // Rule 8: 8 points in a row beyond 1 sigma on both sides (Mixture)
  if (activeRules[8] && n >= 8) {
    for (let i = 7; i < n; i++) {
      const w = vals.slice(i - 7, i + 1);
      const noneWithin1 = w.every((v) => Math.abs(v - cl) > 1 * sigma);
      if (noneWithin1) {
        violations.push({
          pointIndex: i,
          sample: points[i].sample,
          value: vals[i],
          ruleNumber: 8,
          ruleDescription: 'Regra 8: 8 pontos consecutivos além de 1σ em ambos os lados (Mistura de Populações)'
        });
      }
    }
  }

  return violations;
}

/**
 * Computes Process Capability Indices (Cp, Cpk, Pp, Ppk, Cpm, PPM)
 */
export function computeProcessCapability(
  values: number[],
  specs: ProcessSpecs,
  sigmaWithin: number,
  sigmaOverall: number,
  avgRange: number = 0,
  d2: number = 1.128
): CapabilityResults {
  const n = values.length;
  if (n === 0) {
    return {
      cp: null,
      cpk: null,
      cpl: null,
      cpu: null,
      rawCpk: null,
      pp: null,
      ppk: null,
      ppl: null,
      ppu: null,
      rawPpk: null,
      cpm: null,
      ppmTotalExpected: 0,
      ppmObserved: 0,
      sigmaWithin: 0,
      sigmaOverall: 0,
      avgRange: 0,
      d2: 1.128,
      mean: 0,
      effectiveLsl: null,
      effectiveUsl: null,
      wasInverted: false,
      wasRelativeConverted: false
    };
  }

  const mean = values.reduce((a, b) => a + b, 0) / n;
  let rawLsl = specs.lsl;
  let rawUsl = specs.usl;
  const target = specs.target;

  let effectiveLsl: number | null = rawLsl;
  let effectiveUsl: number | null = rawUsl;
  let wasInverted = false;
  let wasRelativeConverted = false;

  // 1. Check if symmetric tolerance mode is active
  if (specs.toleranceMode === 'symmetric' && specs.symmetricTol !== null && specs.symmetricTol !== undefined && target !== null) {
    const tol = Math.abs(specs.symmetricTol);
    effectiveLsl = target - tol;
    effectiveUsl = target + tol;
  } else if (rawLsl !== null && rawUsl !== null) {
    // 2. Check if user typed limits inverted (e.g. LIE > LSE, 25.15 e 24.85)
    if (rawLsl > rawUsl) {
      effectiveLsl = rawUsl;
      effectiveUsl = rawLsl;
      wasInverted = true;
    }

    // 3. Check if user typed relative tolerances around nominal target
    // Example: Target = 25.00, but entered LIE = -0.15 and LSE = +0.15
    if (
      target !== null &&
      Math.abs(mean) > 1 &&
      effectiveLsl !== null &&
      effectiveUsl !== null &&
      (effectiveLsl < 0 || (Math.abs(effectiveLsl) < Math.abs(mean) * 0.25 && Math.abs(effectiveUsl) < Math.abs(mean) * 0.25))
    ) {
      effectiveLsl = target + effectiveLsl;
      effectiveUsl = target + effectiveUsl;
      wasRelativeConverted = true;

      if (effectiveLsl > effectiveUsl) {
        const temp = effectiveLsl;
        effectiveLsl = effectiveUsl;
        effectiveUsl = temp;
      }
    }
  }

  // Strict enforcement: sigmaWithin is Amplitude Média ÷ d2
  const effectiveSigmaWithin = avgRange > 0 && d2 > 0 ? avgRange / d2 : sigmaWithin > 0 ? sigmaWithin : 1;
  const effectiveSigmaOverall = sigmaOverall > 0 ? sigmaOverall : 1;

  let cp: number | null = null;
  let cpl: number | null = null;
  let cpu: number | null = null;
  let cpk: number | null = null;
  let rawCpk: number | null = null;

  let pp: number | null = null;
  let ppl: number | null = null;
  let ppu: number | null = null;
  let ppk: number | null = null;
  let rawPpk: number | null = null;
  let cpm: number | null = null;

  // Unilateral components with normalized limits
  if (effectiveLsl !== null) {
    cpl = (mean - effectiveLsl) / (3 * effectiveSigmaWithin);
    ppl = (mean - effectiveLsl) / (3 * effectiveSigmaOverall);
  }

  if (effectiveUsl !== null) {
    cpu = (effectiveUsl - mean) / (3 * effectiveSigmaWithin);
    ppu = (effectiveUsl - mean) / (3 * effectiveSigmaOverall);
  }

  // Bilateral or unilateral Cp, Cpk, Pp, Ppk
  if (effectiveLsl !== null && effectiveUsl !== null) {
    const tolerance = Math.abs(effectiveUsl - effectiveLsl);
    // Cp = (LSE - LIE) / (6 * sigmaWithin) -> Garantido estritamente positivo
    cp = tolerance / (6 * effectiveSigmaWithin);

    // Pp = (LSE - LIE) / (6 * sigmaOverall) -> Garantido estritamente positivo
    pp = tolerance / (6 * effectiveSigmaOverall);

    if (cpl !== null && cpu !== null) {
      rawCpk = Math.min(cpl, cpu);
      // Se a média do processo está dentro da tolerância, rawCpk já é positivo!
      // Conforme manual AIAG CEP 4ª Edição e práticas de chão de fábrica,
      // a capabilidade física tem piso em 0 (não existe capabilidade negativa de produção).
      cpk = rawCpk < 0 ? 0 : rawCpk;
    }

    if (ppl !== null && ppu !== null) {
      rawPpk = Math.min(ppl, ppu);
      ppk = rawPpk < 0 ? 0 : rawPpk;
    }

    if (target !== null) {
      const tau = Math.sqrt(Math.pow(effectiveSigmaWithin, 2) + Math.pow(mean - target, 2));
      cpm = tolerance / (6 * tau);
    }
  } else if (effectiveLsl !== null) {
    // Unilateral inferior
    rawCpk = cpl;
    cpk = cpl !== null ? (cpl < 0 ? 0 : cpl) : null;
    rawPpk = ppl;
    ppk = ppl !== null ? (ppl < 0 ? 0 : ppl) : null;
  } else if (effectiveUsl !== null) {
    // Unilateral superior
    rawCpk = cpu;
    cpk = cpu !== null ? (cpu < 0 ? 0 : cpu) : null;
    rawPpk = ppu;
    ppk = ppu !== null ? (ppu < 0 ? 0 : ppu) : null;
  }

  // Calculate Expected PPM using effective limits
  let pBelow = 0;
  let pAbove = 0;
  if (effectiveLsl !== null && effectiveSigmaWithin > 0) {
    const zL = (effectiveLsl - mean) / effectiveSigmaWithin;
    pBelow = normCdf(zL);
  }
  if (effectiveUsl !== null && effectiveSigmaWithin > 0) {
    const zU = (effectiveUsl - mean) / effectiveSigmaWithin;
    pAbove = 1 - normCdf(zU);
  }
  const ppmTotalExpected = Math.round((pBelow + pAbove) * 1_000_000);

  // Observed non-conforming items in current sample
  let nonConformingCount = 0;
  for (const v of values) {
    if ((effectiveLsl !== null && v < effectiveLsl) || (effectiveUsl !== null && v > effectiveUsl)) {
      nonConformingCount++;
    }
  }
  const ppmObserved = Math.round((nonConformingCount / n) * 1_000_000);

  return {
    cp,
    cpk,
    cpl,
    cpu,
    rawCpk,
    pp,
    ppk,
    ppl,
    ppu,
    rawPpk,
    cpm,
    ppmTotalExpected,
    ppmObserved,
    sigmaWithin: effectiveSigmaWithin,
    sigmaOverall: effectiveSigmaOverall,
    avgRange,
    d2,
    mean,
    effectiveLsl,
    effectiveUsl,
    wasInverted,
    wasRelativeConverted
  };
}

/**
 * Serial Autocorrelation (ACF) up to lag 12 and Durbin-Watson statistic
 */
export function computeSerialCorrelation(values: number[], maxLag: number = 10): {
  lags: SerialAutocorrItem[];
  durbinWatson: number;
} {
  const n = values.length;
  if (n < 4) return { lags: [], durbinWatson: 2 };

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sumSq = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);

  const lags: SerialAutocorrItem[] = [];
  const ciLimit = 1.96 / Math.sqrt(n);

  for (let k = 1; k <= Math.min(maxLag, Math.floor(n / 2)); k++) {
    let crossSum = 0;
    for (let t = 0; t < n - k; t++) {
      crossSum += (values[t] - mean) * (values[t + k] - mean);
    }
    const r = sumSq > 0 ? crossSum / sumSq : 0;
    lags.push({
      lag: k,
      acf: r,
      ciUpper: ciLimit,
      ciLower: -ciLimit,
      significant: Math.abs(r) > ciLimit
    });
  }

  // Durbin-Watson test
  let diffSumSq = 0;
  for (let t = 1; t < n; t++) {
    const e_t = values[t] - mean;
    const e_prev = values[t - 1] - mean;
    diffSumSq += Math.pow(e_t - e_prev, 2);
  }
  const durbinWatson = sumSq > 0 ? diffSumSq / sumSq : 2;

  return { lags, durbinWatson };
}

/**
 * Spatial Autocorrelation between Tooling Cavities / Profile Positions
 * (Moran's I on mold cavity matrix)
 */
export function computeCavitySpatialAnalysis(points: CepDataPoint[]): {
  cavities: CavitySpatialResult[];
  moranI: number;
  moranZ: number;
  moranP: number;
  hasSpatialData: boolean;
} {
  const pointsWithCavity = points.filter((p) => p.cavity !== undefined && p.cavity !== '');
  if (pointsWithCavity.length < 4) {
    return { cavities: [], moranI: 0, moranZ: 0, moranP: 1, hasSpatialData: false };
  }

  // Group by cavity
  const grouped: Record<string, { vals: number[]; x: number; y: number }> = {};
  pointsWithCavity.forEach((p) => {
    const cavKey = String(p.cavity);
    if (!grouped[cavKey]) {
      grouped[cavKey] = {
        vals: [],
        x: p.positionX !== undefined ? p.positionX : (parseInt(cavKey, 10) % 4) || 1,
        y: p.positionY !== undefined ? p.positionY : Math.floor(parseInt(cavKey, 10) / 4) || 1
      };
    }
    grouped[cavKey].vals.push(p.value);
  });

  const cavityKeys = Object.keys(grouped);
  const m = cavityKeys.length;
  if (m < 4) {
    return { cavities: [], moranI: 0, moranZ: 0, moranP: 1, hasSpatialData: false };
  }

  const overallMean = pointsWithCavity.reduce((a, b) => a + b.value, 0) / pointsWithCavity.length;

  const cavityStats = cavityKeys.map((key) => {
    const item = grouped[key];
    const mean = item.vals.reduce((a, b) => a + b, 0) / item.vals.length;
    const std = Math.sqrt(item.vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, item.vals.length - 1));
    return {
      cavity: key,
      mean,
      std,
      count: item.vals.length,
      x: item.x,
      y: item.y,
      standardizedZ: mean - overallMean
    };
  });

  // Calculate Spatial Weight matrix W based on Euclidean distance on tool grid
  const weights: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      if (i === j) continue;
      const dist = Math.sqrt(
        Math.pow(cavityStats[i].x - cavityStats[j].x, 2) + Math.pow(cavityStats[i].y - cavityStats[j].y, 2)
      );
      weights[i][j] = dist > 0 ? 1 / dist : 1;
    }
  }

  // Row standardization
  for (let i = 0; i < m; i++) {
    const rowSum = weights[i].reduce((a, b) => a + b, 0);
    if (rowSum > 0) {
      for (let j = 0; j < m; j++) {
        weights[i][j] /= rowSum;
      }
    }
  }

  // Moran's I across cavities
  const z = cavityStats.map((c) => c.standardizedZ);
  const sumSqZ = z.reduce((a, b) => a + b * b, 0);

  let numMoran = 0;
  const spatialLags = new Array(m).fill(0);

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      const w = weights[i][j];
      spatialLags[i] += w * z[j];
      numMoran += w * z[i] * z[j];
    }
  }

  const moranI = sumSqZ > 0 ? numMoran / sumSqZ : 0;
  const expectedI = -1 / (m - 1);
  const seI = Math.sqrt(2 / (m * (m - 1))) || 0.25;
  const moranZ = (moranI - expectedI) / seI;
  const moranP = Math.max(0.0001, 1 - normCdf(Math.abs(moranZ)));

  // Classify LISA quadrants for cavities
  const enrichedCavities: CavitySpatialResult[] = cavityStats.map((c, i) => {
    const zVal = c.standardizedZ;
    const lag = spatialLags[i];

    let lisaQuadrant: 'High-High' | 'Low-Low' | 'High-Low' | 'Low-High' | 'Normal' = 'Normal';
    if (zVal >= 0 && lag >= 0) lisaQuadrant = 'High-High';
    else if (zVal < 0 && lag < 0) lisaQuadrant = 'Low-Low';
    else if (zVal >= 0 && lag < 0) lisaQuadrant = 'High-Low';
    else lisaQuadrant = 'Low-High';

    return {
      ...c,
      spatialLag: lag,
      lisaQuadrant
    };
  });

  return {
    cavities: enrichedCavities,
    moranI,
    moranZ,
    moranP,
    hasSpatialData: true
  };
}
