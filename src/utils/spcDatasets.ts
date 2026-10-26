import { CepDataPoint, ProcessSpecs } from '../types';

export interface SpcDataset {
  id: string;
  title: string;
  category: string;
  description: string;
  specs: ProcessSpecs;
  subgroupSize: number;
  data: CepDataPoint[];
}

export const SPC_DATASETS: SpcDataset[] = [
  {
    id: 'mfi-polimeros',
    title: 'Índice de Fluidez (MFI) - Bateladas de Polímeros',
    category: 'Compostos & Resinas Plásticas',
    description: 'Monitoramento contínuo do Índice de Fluidez (Melt Flow Index a 230°C/2.16kg) em bateladas industriais sucessivas.',
    specs: {
      metricName: 'Índice de Fluidez (MFI)',
      unit: 'g/10min',
      lsl: 10.0,
      target: 12.0,
      usl: 14.0
    },
    subgroupSize: 1,
    data: [
      { id: '1', order: 1, sample: 1, value: 12.1, notes: 'Lote A01 - Inicialização de reator' },
      { id: '2', order: 2, sample: 2, value: 11.9, notes: 'Lote A02' },
      { id: '3', order: 3, sample: 3, value: 12.3, notes: 'Lote A03' },
      { id: '4', order: 4, sample: 4, value: 11.8, notes: 'Lote A04' },
      { id: '5', order: 5, sample: 5, value: 12.0, notes: 'Lote A05' },
      { id: '6', order: 6, sample: 6, value: 12.4, notes: 'Lote A06' },
      { id: '7', order: 7, sample: 7, value: 12.2, notes: 'Lote A07' },
      { id: '8', order: 8, sample: 8, value: 11.7, notes: 'Lote A08' },
      { id: '9', order: 9, sample: 9, value: 12.5, notes: 'Lote A09' },
      { id: '10', order: 10, sample: 10, value: 12.1, notes: 'Lote A10' },
      { id: '11', order: 11, sample: 11, value: 12.6, notes: 'Lote A11' },
      { id: '12', order: 12, sample: 12, value: 12.8, notes: 'Lote A12' },
      { id: '13', order: 13, sample: 13, value: 12.9, notes: 'Lote A13' },
      { id: '14', order: 14, sample: 14, value: 13.1, notes: 'Lote A14' },
      { id: '15', order: 15, sample: 15, value: 13.3, notes: 'Lote A15 - Pequena deriva térmica' },
      { id: '16', order: 16, sample: 16, value: 13.5, notes: 'Lote A16' },
      { id: '17', order: 17, sample: 17, value: 14.3, notes: 'Lote A17 - Causa especial: pico de temperatura' },
      { id: '18', order: 18, sample: 18, value: 12.4, notes: 'Lote A18 - Ajuste de refrigeração' },
      { id: '19', order: 19, sample: 19, value: 12.0, notes: 'Lote A19' },
      { id: '20', order: 20, sample: 20, value: 11.9, notes: 'Lote A20' },
      { id: '21', order: 21, sample: 21, value: 12.2, notes: 'Lote A21' },
      { id: '22', order: 22, sample: 22, value: 12.1, notes: 'Lote A22' },
      { id: '23', order: 23, sample: 23, value: 11.6, notes: 'Lote A23' },
      { id: '24', order: 24, sample: 24, value: 12.3, notes: 'Lote A24' },
      { id: '25', order: 25, sample: 25, value: 12.0, notes: 'Lote A25' },
      { id: '26', order: 26, sample: 26, value: 12.2, notes: 'Lote A26' },
      { id: '27', order: 27, sample: 27, value: 11.8, notes: 'Lote A27' },
      { id: '28', order: 28, sample: 28, value: 12.4, notes: 'Lote A28' },
      { id: '29', order: 29, sample: 29, value: 12.1, notes: 'Lote A29' },
      { id: '30', order: 30, sample: 30, value: 11.9, notes: 'Lote A30' },
      { id: '31', order: 31, sample: 31, value: 12.2, notes: 'Lote A31' },
      { id: '32', order: 32, sample: 32, value: 12.0, notes: 'Lote A32' },
      { id: '33', order: 33, sample: 33, value: 12.3, notes: 'Lote A33' },
      { id: '34', order: 34, sample: 34, value: 12.1, notes: 'Lote A34' },
      { id: '35', order: 35, sample: 35, value: 11.8, notes: 'Lote A35' }
    ]
  },
  {
    id: 'injecao-cavidades',
    title: 'Dimensional em Molde de 8 Cavidades (Correlação Espacial)',
    category: 'Injeção de Termoplásticos',
    description: 'Diâmetro crítico (mm) de bucha injetada em molde 2x4. Permite avaliar a correlação e dependência espacial entre cavidades adjacentes.',
    specs: {
      metricName: 'Diâmetro Externo',
      unit: 'mm',
      lsl: 24.85,
      target: 25.00,
      usl: 25.15
    },
    subgroupSize: 1,
    data: [
      // Ciclo 1 (Cavidades 1 a 8)
      { id: 'c1', order: 1, sample: 1, value: 25.08, cavity: '1', positionX: 1, positionY: 1, notes: 'Ciclo 1 - Cav 1' },
      { id: 'c2', order: 2, sample: 2, value: 25.09, cavity: '2', positionX: 2, positionY: 1, notes: 'Ciclo 1 - Cav 2' },
      { id: 'c3', order: 3, sample: 3, value: 25.01, cavity: '3', positionX: 3, positionY: 1, notes: 'Ciclo 1 - Cav 3' },
      { id: 'c4', order: 4, sample: 4, value: 24.97, cavity: '4', positionX: 4, positionY: 1, notes: 'Ciclo 1 - Cav 4' },
      { id: 'c5', order: 5, sample: 5, value: 25.11, cavity: '5', positionX: 1, positionY: 2, notes: 'Ciclo 1 - Cav 5' },
      { id: 'c6', order: 6, sample: 6, value: 25.10, cavity: '6', positionX: 2, positionY: 2, notes: 'Ciclo 1 - Cav 6' },
      { id: 'c7', order: 7, sample: 7, value: 24.99, cavity: '7', positionX: 3, positionY: 2, notes: 'Ciclo 1 - Cav 7' },
      { id: 'c8', order: 8, sample: 8, value: 24.94, cavity: '8', positionX: 4, positionY: 2, notes: 'Ciclo 1 - Cav 8' },

      // Ciclo 2
      { id: 'c9', order: 9, sample: 9, value: 25.07, cavity: '1', positionX: 1, positionY: 1, notes: 'Ciclo 2 - Cav 1' },
      { id: 'c10', order: 10, sample: 10, value: 25.12, cavity: '2', positionX: 2, positionY: 1, notes: 'Ciclo 2 - Cav 2' },
      { id: 'c11', order: 11, sample: 11, value: 25.03, cavity: '3', positionX: 3, positionY: 1, notes: 'Ciclo 2 - Cav 3' },
      { id: 'c12', order: 12, sample: 12, value: 24.96, cavity: '4', positionX: 4, positionY: 1, notes: 'Ciclo 2 - Cav 4' },
      { id: 'c13', order: 13, sample: 13, value: 25.13, cavity: '5', positionX: 1, positionY: 2, notes: 'Ciclo 2 - Cav 5' },
      { id: 'c14', order: 14, sample: 14, value: 25.08, cavity: '6', positionX: 2, positionY: 2, notes: 'Ciclo 2 - Cav 6' },
      { id: 'c15', order: 15, sample: 15, value: 24.98, cavity: '7', positionX: 3, positionY: 2, notes: 'Ciclo 2 - Cav 7' },
      { id: 'c16', order: 16, sample: 16, value: 24.95, cavity: '8', positionX: 4, positionY: 2, notes: 'Ciclo 2 - Cav 8' },

      // Ciclo 3
      { id: 'c17', order: 17, sample: 17, value: 25.06, cavity: '1', positionX: 1, positionY: 1, notes: 'Ciclo 3 - Cav 1' },
      { id: 'c18', order: 18, sample: 18, value: 25.10, cavity: '2', positionX: 2, positionY: 1, notes: 'Ciclo 3 - Cav 2' },
      { id: 'c19', order: 19, sample: 19, value: 25.02, cavity: '3', positionX: 3, positionY: 1, notes: 'Ciclo 3 - Cav 3' },
      { id: 'c20', order: 20, sample: 20, value: 24.98, cavity: '4', positionX: 4, positionY: 1, notes: 'Ciclo 3 - Cav 4' },
      { id: 'c21', order: 21, sample: 21, value: 25.12, cavity: '5', positionX: 1, positionY: 2, notes: 'Ciclo 3 - Cav 5' },
      { id: 'c22', order: 22, sample: 22, value: 25.09, cavity: '6', positionX: 2, positionY: 2, notes: 'Ciclo 3 - Cav 6' },
      { id: 'c23', order: 23, sample: 23, value: 24.97, cavity: '7', positionX: 3, positionY: 2, notes: 'Ciclo 3 - Cav 7' },
      { id: 'c24', order: 24, sample: 24, value: 24.93, cavity: '8', positionX: 4, positionY: 2, notes: 'Ciclo 3 - Cav 8' },

      // Ciclo 4
      { id: 'c25', order: 25, sample: 25, value: 25.08, cavity: '1', positionX: 1, positionY: 1, notes: 'Ciclo 4 - Cav 1' },
      { id: 'c26', order: 26, sample: 26, value: 25.11, cavity: '2', positionX: 2, positionY: 1, notes: 'Ciclo 4 - Cav 2' },
      { id: 'c27', order: 27, sample: 27, value: 25.00, cavity: '3', positionX: 3, positionY: 1, notes: 'Ciclo 4 - Cav 3' },
      { id: 'c28', order: 28, sample: 28, value: 24.96, cavity: '4', positionX: 4, positionY: 1, notes: 'Ciclo 4 - Cav 4' },
      { id: 'c29', order: 29, sample: 29, value: 25.14, cavity: '5', positionX: 1, positionY: 2, notes: 'Ciclo 4 - Cav 5' },
      { id: 'c30', order: 30, sample: 30, value: 25.07, cavity: '6', positionX: 2, positionY: 2, notes: 'Ciclo 4 - Cav 6' },
      { id: 'c31', order: 31, sample: 31, value: 24.99, cavity: '7', positionX: 3, positionY: 2, notes: 'Ciclo 4 - Cav 7' },
      { id: 'c32', order: 32, sample: 32, value: 24.95, cavity: '8', positionX: 4, positionY: 2, notes: 'Ciclo 4 - Cav 8' }
    ]
  },
  {
    id: 'resistencia-impacto',
    title: 'Ensaio de Resistência ao Impacto Izod (Subgrupos n=5)',
    category: 'Laboratório de Qualidade / P&D',
    description: 'Ensaio de impacto Izod (kJ/m²) em corpos de prova de composto termoplástico com subgrupos de 5 amostras por turno.',
    specs: {
      metricName: 'Impacto Izod Entalhado',
      unit: 'kJ/m²',
      lsl: 18.0,
      target: 24.0,
      usl: 30.0
    },
    subgroupSize: 5,
    data: [
      // Subgrupo 1
      { id: 'i1', order: 1, sample: 1, value: 23.5 },
      { id: 'i2', order: 2, sample: 1, value: 24.2 },
      { id: 'i3', order: 3, sample: 1, value: 23.8 },
      { id: 'i4', order: 4, sample: 1, value: 24.5 },
      { id: 'i5', order: 5, sample: 1, value: 23.9 },
      // Subgrupo 2
      { id: 'i6', order: 6, sample: 2, value: 24.0 },
      { id: 'i7', order: 7, sample: 2, value: 24.8 },
      { id: 'i8', order: 8, sample: 2, value: 23.7 },
      { id: 'i9', order: 9, sample: 2, value: 24.1 },
      { id: 'i10', order: 10, sample: 2, value: 24.4 },
      // Subgrupo 3
      { id: 'i11', order: 11, sample: 3, value: 23.2 },
      { id: 'i12', order: 12, sample: 3, value: 23.6 },
      { id: 'i13', order: 13, sample: 3, value: 23.9 },
      { id: 'i14', order: 14, sample: 3, value: 23.4 },
      { id: 'i15', order: 15, sample: 3, value: 23.8 },
      // Subgrupo 4
      { id: 'i16', order: 16, sample: 4, value: 24.5 },
      { id: 'i17', order: 17, sample: 4, value: 25.1 },
      { id: 'i18', order: 18, sample: 4, value: 24.7 },
      { id: 'i19', order: 19, sample: 4, value: 24.9 },
      { id: 'i20', order: 20, sample: 4, value: 25.3 },
      // Subgrupo 5
      { id: 'i21', order: 21, sample: 5, value: 23.9 },
      { id: 'i22', order: 22, sample: 5, value: 24.1 },
      { id: 'i23', order: 23, sample: 5, value: 23.6 },
      { id: 'i24', order: 24, sample: 5, value: 24.3 },
      { id: 'i25', order: 25, sample: 5, value: 24.0 },
      // Subgrupo 6
      { id: 'i26', order: 26, sample: 6, value: 24.2 },
      { id: 'i27', order: 27, sample: 6, value: 24.6 },
      { id: 'i28', order: 28, sample: 6, value: 24.4 },
      { id: 'i29', order: 29, sample: 6, value: 24.8 },
      { id: 'i30', order: 30, sample: 6, value: 24.5 }
    ]
  }
];
