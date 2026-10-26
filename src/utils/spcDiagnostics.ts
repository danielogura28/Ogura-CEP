import { NelsonViolation, ProcessSpecs, CapabilityResults, FeatureClassification } from '../types';

export interface SpcProblemDiagnosis {
  type: 'special_cause' | 'cpk_failed' | 'ppk_failed' | 'out_of_limits' | 'process_normal';
  title: string;
  badgeText: string;
  statusSeverity: 'critical' | 'warning' | 'normal';
  simpleExplanation: string;
  possibleProblems: string[];
  suggestedActionPlans: string[];
  defaultRootCauseSuggestion?: string;
  defaultActionPlanSuggestion?: string;
}

/**
 * Retorna diagnóstico simplificado para uma regra de Nelson ou violação de limite
 */
export function getViolationDiagnosis(ruleNumber: number, sampleVal?: number, cl?: number): SpcProblemDiagnosis {
  switch (ruleNumber) {
    case 1:
      return {
        type: 'out_of_limits',
        title: 'Ponto Fora dos Limites de Controle 3-Sigma (LSC / LIC)',
        badgeText: 'Regra 1: Causa Especial Crítica',
        statusSeverity: 'critical',
        simpleExplanation:
          'Ocorreu um pico anormal ou queda extrema nesta medição, rompendo completamente a variação natural esperada da máquina. A probabilidade de isso ser variação comum é de apenas 0,27%.',
        possibleProblems: [
          'Descalibração súbita ou sujeira no micrômetro / paquímetro / dispositivo de medição.',
          'Quebra parcial de ferramenta, queima de resistência térmica ou pico na pressão de injeção/extrusão.',
          'Contaminação ou bolha de ar no lote de matéria-prima no exato momento da injeção.',
          'Erro humano na digitação ou na leitura do instrumento.'
        ],
        suggestedActionPlans: [
          'Bloquear e segregar imediatamente todas as peças produzidas entre esta medição e a anterior.',
          'Conferir a medição da mesma peça com padrão aferido e calibrado.',
          'Checar na IHM da máquina se houve alarme de temperatura, pressão ou parada não programada.',
          'Inspecionar visualmente o estado do bico, matriz, cavidade ou ferramenta.',
          'Abrir registro de Análise Crítica formal com definição de prazo e contenção do lote.'
        ],
        defaultRootCauseSuggestion: 'Pico anômalo de processo ou instabilidade momentânea de temperatura/pressão durante a produção desta batelada.',
        defaultActionPlanSuggestion: '1. Segregar lote para inspeção 100%; 2. Conferir calibração do micrômetro; 3. Inspecionar resistências da extrusora/ferramenta.'
      };

    case 2:
      return {
        type: 'special_cause',
        title: 'Deslocamento de Patamar da Média (Shift Contínuo)',
        badgeText: 'Regra 2: 9 Pontos Consecutivos no Mesmo Lado da Média',
        statusSeverity: 'critical',
        simpleExplanation:
          'O processo mudou permanentemente de nível: 9 peças consecutivas foram medidas todas acima (ou todas abaixo) da média central, provando que o processo não está oscilando de forma equilibrada.',
        possibleProblems: [
          'Troca de lote de resina/matéria-prima com índice de fluidez (MFI) ou densidade diferente da anterior.',
          'Ajuste não registrado feito pelo operador no offset ou ponto zero da máquina.',
          'Aquecimento gradual das resistências térmicas ou dilatação térmica do maquinário.',
          'Mudança de turno de trabalho com método operacional ou velocidade diferente.'
        ],
        suggestedActionPlans: [
          'Conferir o certificado de qualidade e viscosidade do lote de matéria-prima em uso.',
          'Ajustar o offset/centralização da máquina na IHM para recentralizar o valor medido no alvo nominal.',
          'Alinhar o procedimento de trabalho entre os operadores dos turnos.',
          'Registrar Análise Crítica com prazo de reavaliação de 24 horas.'
        ],
        defaultRootCauseSuggestion: 'Deslocamento contínuo da média provocado por nova batelada de matéria-prima com fluidez diferente ou aquecimento contínuo da máquina.',
        defaultActionPlanSuggestion: '1. Corrigir offset de regulagem da máquina para retornar ao alvo nominal; 2. Avaliar laudo do lote de matéria-prima; 3. Retestar novas 5 amostras.'
      };

    case 3:
      return {
        type: 'special_cause',
        title: 'Tendência Linear Contínua (Deriva do Processo)',
        badgeText: 'Regra 3: 6 Pontos Consecutivos em Ascensão ou Queda',
        statusSeverity: 'warning',
        simpleExplanation:
          'Os valores medidos estão subindo (ou descendo) de forma contínua em sequência, como uma linha reta inclinada. Isso indica um fator de desgaste ou acúmulo contínuo.',
        possibleProblems: [
          'Desgaste progressivo da ferramenta de corte, macho, guia ou rosca extrusora.',
          'Aumento contínuo da temperatura do molde ou do óleo hidráulico por refrigeração insuficiente.',
          'Entupimento gradual de filtros, canais de alimentação ou bicos de dosagem.',
          'Degradação térmica do polímero acumulado no cilindro.'
        ],
        suggestedActionPlans: [
          'Verificar se a temperatura do circuito de água gelada / chiller está estável.',
          'Inspecionar o desgaste dimensional das pastilhas/ferramenta e programar substituição preventiva.',
          'Verificar a pressão de injeção/linha para identificar entupimento progressivo.',
          'Abrir Análise Crítica para planejar manutenção preventiva e monitoramento contínuo.'
        ],
        defaultRootCauseSuggestion: 'Desgaste mecânico progressivo ou elevação gradual da temperatura da matriz por sobrecarga térmica.',
        defaultActionPlanSuggestion: '1. Inspecionar desgaste da ferramenta e filtros; 2. Ajustar vazão de água gelada no trocador de calor; 3. Limpeza do bico.'
      };

    case 4:
      return {
        type: 'special_cause',
        title: 'Alternância Sistemática (Efeito Dente-de-Serra)',
        badgeText: 'Regra 4: 14 Pontos Alternando Subindo e Descendo',
        statusSeverity: 'warning',
        simpleExplanation:
          'O processo oscila em padrão zigue-zague a cada amostra (sobe, desce, sobe, desce). Isso quase sempre indica duas fontes distintas de variação misturadas.',
        possibleProblems: [
          'Amostragem alternada entre duas cavidades com folgas diferentes no molde.',
          'Revezamento entre dois operadores com técnicas de medição desiguais.',
          'Alimentação por dois fusos de extrusão ou dois tanques com receitas ligeiramente diferentes.',
          'Sobrecompensação manual do operador (mexe na regulagem da máquina a cada medição).'
        ],
        suggestedActionPlans: [
          'Orientar o operador para NÃO mexer nas regulagens da máquina a cada amostra (evitar ajuste excessivo).',
          'Estratificar os dados separadamente por cavidade ou por posto de trabalho.',
          'Padronizar o procedimento e a força de aperto no micrômetro/paquímetro.'
        ],
        defaultRootCauseSuggestion: 'Ajuste excessivo (sobre-regulagem da máquina a cada peça) ou mistura de medições de duas cavidades diferentes.',
        defaultActionPlanSuggestion: '1. Orientar equipe para aguardar estabilização antes de ajustes; 2. Medir e segregar por cavidade individualmente.'
      };

    case 5:
    case 6:
      return {
        type: 'special_cause',
        title: 'Agrupamento Fora da Faixa de Normalidade (2 de 3 além de 2σ)',
        badgeText: `Regra ${ruleNumber}: Concentração Excessiva nos Extremos`,
        statusSeverity: 'warning',
        simpleExplanation:
          'Há uma concentração anormal de pontos distantes da média central, sinalizando início de instabilidade antes mesmo de romper os limites 3-sigma.',
        possibleProblems: [
          'Instabilidade no sistema de dosagem de aditivos ou pigmentos.',
          'Vibração mecânica irregular ou flutuações na rede de energia/pressão de ar.',
          'Folga nos rolamentos ou guias da máquina.'
        ],
        suggestedActionPlans: [
          'Aumentar temporariamente a frequência de coleta de amostras para acompanhar.',
          'Verificar o nível de ruído e vibração do motor e redutor.',
          'Ajustar os parâmetros de controle térmico da máquina.'
        ],
        defaultRootCauseSuggestion: 'Flutuação na homogeneização ou instabilidade nos atuadores de pressão/temperatura.',
        defaultActionPlanSuggestion: '1. Acompanhamento intensificado com amostragem a cada 30 min; 2. Verificação de aperto mecânico.'
      };

    default:
      return {
        type: 'special_cause',
        title: `Instabilidade Estatística (Regra de Nelson #${ruleNumber})`,
        badgeText: `Regra ${ruleNumber}: Não-Aleatoriedade Detectada`,
        statusSeverity: 'warning',
        simpleExplanation:
          'A distribuição dos pontos não segue o comportamento aleatório normal esperado pela curva de Gauss, indicando interferência de uma causa externa especial.',
        possibleProblems: [
          'Interferência não controlada no processo (setup intermediário, abastecimento manual, ar comprimido).',
          'Variação ambiental de temperatura na fábrica entre dia e noite.'
        ],
        suggestedActionPlans: [
          'Auditar a operação na linha de produção.',
          'Verificar se as instruções de processo estão sendo seguidas à risca.',
          'Abrir Análise Crítica com plano de contenção.'
        ],
        defaultRootCauseSuggestion: 'Instabilidade de causas especiais identificada nas cartas de controle.',
        defaultActionPlanSuggestion: '1. Auditoria de processo no posto; 2. Monitoramento intensivo das próximas bateladas.'
      };
  }
}

/**
 * Retorna diagnóstico para campos reprovados de Capabilidade (Cpk, Ppk, Cp)
 */
export function getCapabilityDiagnosis(
  metric: 'cpk' | 'ppk' | 'cp' | 'normality',
  value: number | null,
  benchmark: number,
  specs: ProcessSpecs,
  mean: number,
  classification: FeatureClassification
): SpcProblemDiagnosis {
  const isCritical = classification === 'critical';
  const effectiveUsl = specs.usl;
  const effectiveLsl = specs.lsl;
  const target = specs.target ?? (effectiveUsl !== null && effectiveLsl !== null ? (effectiveUsl + effectiveLsl) / 2 : mean);

  if (metric === 'cpk') {
    const isShiftedHigh = target !== null && mean > target;
    const isShiftedLow = target !== null && mean < target;

    return {
      type: 'cpk_failed',
      title: 'Capabilidade Efetiva de Curto Prazo Reprovada (Cpk Insuficiente)',
      badgeText: `Cpk = ${value?.toFixed(2) ?? '—'} (Meta: ≥ ${benchmark.toFixed(2)}) • REPROVADO`,
      statusSeverity: 'critical',
      simpleExplanation: `O Cpk mede se o produto cabe dentro da tolerância do cliente e se está bem centralizado no alvo. Com Cpk = ${value?.toFixed(2) ?? '—'}, a margem de segurança do processo é insuficiente e há risco de produzir peças defeituosas fora do ${isShiftedHigh ? 'LSE (Limite Superior)' : 'LIE (Limite Inferior)'}.`,
      possibleProblems: [
        isShiftedHigh
          ? `Descentralização para cima: a média atual (${mean.toFixed(3)} ${specs.unit}) está ${((mean - target)).toFixed(3)} acima do alvo ideal (${target.toFixed(3)} ${specs.unit}).`
          : isShiftedLow
          ? `Descentralização para baixo: a média atual (${mean.toFixed(3)} ${specs.unit}) está ${((target - mean)).toFixed(3)} abaixo do alvo ideal (${target.toFixed(3)} ${specs.unit}).`
          : 'Descentralização em relação aos limites de especificação.',
        'Dispersão intrínseca (σ dentro do subgrupo) muito larga em relação à tolerância de projeto.',
        'Folgas mecânicas ou desgaste no cilindro/molde que impedem repetibilidade.',
        'Tolerância do cliente extremamente estreita para a capacidade nativa da máquina atual.'
      ],
      suggestedActionPlans: [
        `Centralização: Ajustar o offset na IHM da máquina para ${isShiftedHigh ? 'reduzir' : 'aumentar'} a média em direção ao Alvo Nominal (${target.toFixed(3)} ${specs.unit}).`,
        'Redução de Dispersão: Executar manutenção preventiva nas vedações, folgas de fuso e termopares.',
        'Contenção: Implementar triagem 100% ou inspeção com frequência dobrada até atingir Cpk estável.',
        'Ação Corretiva: Abrir Análise Crítica formal com prazos e responsáveis para regularizar a capabilidade.'
      ],
      defaultRootCauseSuggestion: `Processo descentralizado (média = ${mean.toFixed(3)} vs alvo = ${target.toFixed(3)}) e dispersão além da meta exigida para característica ${isCritical ? 'crítica/segurança' : 'padrão'}.`,
      defaultActionPlanSuggestion: `1. Ajustar regulagem de máquina (offset) para alinhar a média ao alvo (${target.toFixed(3)} ${specs.unit}); 2. Realizar triagem das peças produzidas; 3. Medir novo subgrupo piloto de 30 peças para comprovar Cpk ≥ ${benchmark.toFixed(2)}.`
    };
  }

  if (metric === 'ppk') {
    return {
      type: 'ppk_failed',
      title: 'Desempenho Geral de Longo Prazo Reprovado (Ppk Insuficiente)',
      badgeText: `Ppk = ${value?.toFixed(2) ?? '—'} (Meta: ≥ ${benchmark.toFixed(2)}) • REPROVADO`,
      statusSeverity: 'critical',
      simpleExplanation: `O Ppk reflete o desempenho global real ao longo de dias e turnos (incluindo trocas de lotes de resina, aquecimento e regulagens). O valor de ${value?.toFixed(2) ?? '—'} indica que a variação acumulada de longo prazo está excessiva.`,
      possibleProblems: [
        'Variação na qualidade de matéria-prima entre diferentes lotes entregues pelo fornecedor.',
        'Diferença de método de trabalho ou calibragem entre os operadores do Turno A, B e C.',
        'Desgaste progressivo de ferramental não corrigido por preventiva periódica.',
        'Oscilações de temperatura ambiente (calor de dia vs frio à noite) afetando a contração do polímero.'
      ],
      suggestedActionPlans: [
        'Padronizar as fichas de regulagem (SOP) e travar permissão de alteração de parâmetros na máquina.',
        'Exigir certificado de análise (CoA) com faixa estreita de fluidez do fornecedor de resina.',
        'Implementar calibração diária dos micrômetros no início de cada turno.',
        'Abrir Análise Crítica definindo prazo para auditoria de processo nos três turnos.'
      ],
      defaultRootCauseSuggestion: 'Variabilidade excessiva de longo prazo decorrente de diferenças de lote de matéria-prima e alternância entre turnos de produção.',
      defaultActionPlanSuggestion: '1. Homologar especificação de entrada do fornecedor de polímeros; 2. Padronizar parâmetros de processo com folha de instrução de trabalho; 3. Auditoria de processo nos turnos.'
    };
  }

  // Cp failed (dispersion problem even if centered)
  return {
    type: 'cpk_failed',
    title: 'Dispersão Potencial Excessiva (Cp Insuficiente)',
    badgeText: `Cp = ${value?.toFixed(2) ?? '—'} (Meta: ≥ ${benchmark.toFixed(2)}) • DISPERSÃO ALTA`,
    statusSeverity: 'warning',
    simpleExplanation:
      'Mesmo se o processo estiver perfeitamente centralizado, a largura de dispersão das peças (6-Sigma) é maior que a tolerância permitida. É um problema mecânico ou intrínseco da máquina.',
    possibleProblems: [
      'Folga mecânica excessiva nos mancais, guias lineares ou rolamentos da máquina.',
      'Instabilidade no controle PID de aquecimento das zonas do canhão.',
      'Equipamento tecnicamente incapaz de atingir a tolerância sem reforma ou modernização.'
    ],
    suggestedActionPlans: [
      'Executar revisão mecânica detalhada no grupo injetor/extrusor.',
      'Avaliar se a tolerância pode ser renegociada com a Engenharia de Produto se não houver impacto funcional.',
      'Abrir Análise Crítica para plano de manutenção corretiva.'
    ],
    defaultRootCauseSuggestion: 'Dispersão inerente do equipamento incompatível com a faixa de tolerância de projeto.',
    defaultActionPlanSuggestion: '1. Manutenção preventiva em fusos e guias; 2. Alinhamento com engenharia de produto sobre tolerâncias.'
  };
}
