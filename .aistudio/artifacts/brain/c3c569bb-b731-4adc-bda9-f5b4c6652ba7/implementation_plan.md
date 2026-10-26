# Plano de Implementação: Pré-Visualização de Impressão (PDF) & Exportação Excel Completa com Gráficos e Tabelas

Implementação de um sistema robusto de pré-visualização de impressão antes do envio para impressora/PDF (com controle de zoom e seleção dinâmica de seções), correção e aprimoramento da formatação de impressão A4 multipáginas sem cortes, e geração de planilha Excel (.xlsx) completa e consolidada contendo todas as tabelas descritivas, medições individuais, índices de capabilidade e os gráficos de controle e histograma inseridos como imagens de alta resolução.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário:**
> 1. **Estrutura do Excel**: Planilha consolidada em aba única contínua com layout industrial padronizado, pronta para leitura e impressão direta no Excel.
> 2. **Pré-Visualização**: Janela dedicada de pré-visualização de impressão antes do disparo do comando de impressão/PDF, com controles de zoom (50% a 150%) e filtros de seleção de seções visíveis.
> 3. **Gráficos no Excel**: Cartas de controle (Valores Individuais / Médias e Amplitude) e Histograma de Capabilidade serão renderizados e inseridos como imagens gráficas diretamente no arquivo `.xlsx`.

---

## 1. Visão Geral & Conceito Central

- **O que faz**:
  - **Pré-Visualização Interativa de Impressão**: Permite ao usuário inspecionar visualmente a folha industrial A4 exatamente como será impressa ou salva em PDF antes de confirmar o envio. Oferece controle de zoom, simulação de margens e alternância de quais blocos incluir (gráficos, medições, análise crítica, guia do operador).
  - **Ajuste Fino de Impressão / PDF**: Resolução de regras CSS de impressão (`@media print`) para evitar quebras inadequadas de página, remoção de fundos cinzas e restrições de rolagem que causavam cortes no layout oficial.
  - **Relatório Excel (.xlsx) Completo**: Exportador via biblioteca profissional (`exceljs`) que gera um arquivo `.xlsx` industrial com o cabeçalho completo de rastreabilidade (peça, máquina, tolerâncias, responsáveis), imagens embutidas dos gráficos gerados, tabela de todas as medições coletadas com desvios e status, quadro de estatísticas e capabilidade (Cp, Cpk, Pp, Ppk, Cpm, PPM), avaliação das Regras de Nelson, instrução para o operador e análise crítica IATF.
- **Público-alvo**: Engenharia da Qualidade, Métrologos, Auditores IATF 16949 e Supervisores de Produção que necessitam emitir laudos técnicos confiáveis para clientes e homologação de processos.
- **Valor Agregado**: Elimina a necessidade de capturar telas manualmente ou colar tabelas no Excel; gera documentos prontos para homologação e auditoria em poucos cliques com total fidelidade.

---

## 2. Experiência do Usuário & Design Visual

### Fluxos Principais do Usuário

1. **Acessando a Pré-Visualização**:
   - O usuário clica em **"Imprimir / PDF"** ou **"Gerar Relatório (Layout Industrial)"** na barra superior ou no rodapé do laudo.
   - Abre-se uma janela dedicada de **Pré-Visualização de Impressão** sobreposta ao sistema, simulando uma folha de papel A4 com sombra suave e réguas visuais.
   - Barra de ferramentas superior da pré-visualização:
     - Seletor de Zoom: `50%`, `75%`, `100%`, `125%`, `Ajustar à Tela`.
     - Chaves seletoras de seções: `[✓] Gráficos`, `[✓] Medições Amostrais`, `[✓] Guia do Operador`, `[✓] Análise Crítica`.
     - Botão primário **"Confirmar Impressão / Gerar PDF"** (dispara `window.print()` otimizado).
     - Botão de exportação **"Exportar Relatório Excel (.xlsx)"** com feedback de progresso da renderização dos gráficos.
     - Botão de fechamento para retornar ao ambiente de análise.

2. **Geração do Excel Completo**:
   - Ao clicar em **"Exportar Excel (.xlsx)"**, o sistema:
     1. Converte instantaneamente os elementos gráficos (Cartas de Controle e Histograma) para imagens PNG de alta densidade via Canvas/SVG.
     2. Monta a estrutura tabular no Excel com células mescladas, fontes corporativas, cores semânticas nas bordas e linhas zebradas.
     3. Anexa as imagens nas células correspondentes com dimensionamento proporcional.
     4. Dispara o download automático do arquivo `.xlsx` nomeado com a peça e data do estudo (ex: `Relatorio_CEP_PP-COMPOUND-40GF_2026-10-21.xlsx`).

### Padrão Visual e Cores
- **Paleta Neutra & Profissional**: Tons de cinza escuro industrial (`#0F172A`, `#1E293B`) nas barras de controle, fundo cinza claro de mesa de prancheta (`#E2E8F0`) para contraste com a folha de papel branca pura (`#FFFFFF`).
- **Tipografia**: Família sem serifa limpa (`Inter` / `Plus Jakarta Sans`) para interface e tabelas de parâmetros, com suporte a numerais tabulares (`tabular-nums` / `font-mono`) para todas as medições e índices estatísticos.
- **Layout de Folha A4**: Largura proporcional de $210\text{mm}$ com padding de $15\text{mm}$, cabeçalho quadriculado padrão automotivo/industrial e assinaturas no rodapé.

---

## 3. Decisões Técnicas & Trade-offs

- **Decisão 1: Biblioteca de Geração de Excel (`exceljs` vs `xlsx`/`csv`)**:
  - *Abordagem Selecionada*: Adotar `exceljs`.
  - *Justificativa*: A biblioteca padrão `xlsx` (SheetJS Community) não oferece suporte a inserção de imagens em arquivos Excel sem licença paga Pro. Já `exceljs` suporta nativamente `workbook.addImage()` com coordenadas exatas em células, estilos de célula, preenchimentos e bordas no formato `.xlsx` padrão, funcionando 100% no cliente sem depender de backend.
  - *Alternativas*: CSV puro (já existente, porém não suporta imagens nem formatação) e biblioteca HTML table export (não reconhece imagens na maioria dos visualizadores modernos).

- **Decisão 2: Captura de Imagens dos Gráficos para o Excel**:
  - *Abordagem Selecionada*: Exportar os SVGs dos gráficos de controle e do histograma de capabilidade renderizando-os em um elemento `HTMLCanvasElement` em memória para obter DataURL PNG (`image/png`), que é então injetado no `exceljs`.
  - *Justificativa*: Garante gráficos nítidos, com cores idênticas às exibidas na tela, sem depender de requisições de rede externas.

- **Decisão 3: Arquitetura de Pré-Visualização e Impressão**:
  - *Abordagem Selecionada*: Componente modal de pré-visualização com container isolado para impressão (`#printable-spc-report`), com classes CSS específicas que ocultam a interface do aplicativo durante o `window.print()` e removem restrições de altura `overflow-hidden` do `body`.
  - *Justificativa*: Elimina o problema comum onde modais com `fixed inset-0` e scroll interno sofrem corte de conteúdo após a primeira página no motor de impressão dos navegadores.

---

## 4. Arquitetura Técnica & Estratégia de Dados

### Diagrama de Componentes e Fluxo de Exportação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SpcHeader / Canvas                             │
│   [Botão: Imprimir / PDF]              [Botão: Exportar Relatório Excel]   │
└───────────────────────┬──────────────────────────────────────┬──────────────┘
                        │                                      │
                        ▼                                      ▼
┌────────────────────────────────────────────────┐  ┌─────────────────────────┐
│        PrintPreviewModal.tsx                   │  │  spcExcelExporter.ts    │
│  - Controles de Zoom (50% a 150%)              │  │  - Captura SVGs         │
│  - Seleção de Seções (Gráficos, Medições, etc) │  │  - Renderiza Canvas PNG │
│  - Renderização da Folha A4 (#printable-area)  │  │  - Gera Pasta ExcelJS   │
│  - Disparo de window.print()                   │  │  - Formata Tabelas/Cores│
└───────────────────────┬────────────────────────┘  │  - Injeta Imagens PNG   │
                        │                           │  - Download .xlsx       │
                        ▼                           └─────────────────────────┘
┌────────────────────────────────────────────────┐
│           Motor de Impressão do Navegador      │
│  - @media print otimizado                      │
│  - Quebras de página controladas (page-break)  │
│  - Sem cabeçalhos/rodapés indesejados da web   │
│  - Saída direta em Impressora Física ou PDF    │
└────────────────────────────────────────────────┘
```

### Estrutura das Seções da Planilha Consolidada (.xlsx)

1. **Linhas 1-6: Cabeçalho Industrial**
   - Nome da Empresa, Descrição da Peça, Código (Part Number), Operação, Máquina, Instrumento de Medição, Responsáveis, Data e Tolerâncias (LIE, Nominal, LSE).
2. **Linhas 8-28: Painel Gráfico**
   - Imagem 1: Carta de Controle de Valores Individuais / Médias com Limites (LIC, LC, LSC).
   - Imagem 2: Carta de Controle de Amplitude (MR / R).
   - Imagem 3: Histograma de Capabilidade com Curva Normal e Limites de Especificação.
3. **Linhas 30-45: Parâmetros Descritivos & Índices de Capabilidade**
   - Quadro A: N, Média, Mediana, R-bar, d2, Desvio Padrão Dentro e Desvio Padrão Geral.
   - Quadro B: Cp, Cpk, Cpl, Cpu, Pp, Ppk, Cpm, PPM Esperado, PPM Observado e Status de Homologação.
4. **Linhas 47-55: Conclusão Técnica & Parecer de Engenharia**
   - Status do Processo (Aprovado / Atenção / Reprovado), Diagnóstico e Justificativa.
5. **Linhas 57-70: Guia do Operador & Ações Imediatas**
   - Status operacional, passos obrigatórios para chão de fábrica.
6. **Linhas 72-85: Análise Crítica (quando aplicável)**
   - Gatilho, investigação da causa raiz, plano de ações 5W2H, prazo e responsável.
7. **Linhas 87+: Tabela Detalhada de Medições Coletadas**
   - Amostra #, Valor Medido, Desvio do Alvo, LIE, Alvo, LSE, Unidade, Conformidade.

### Roteiro de Verificação
- [ ] Instalar dependência `exceljs` e seus tipos.
- [ ] Criar utilitário `spcExcelExporter.ts` com montagem da planilha consolidada e injeção de imagens PNG.
- [ ] Criar componente `PrintPreviewModal.tsx` com visualização em folha A4, controles de zoom e seleção de blocos.
- [ ] Integrar modal de pré-visualização e ação de exportação de Excel no `SpcHeader.tsx`, `IndustrialSpcReportModal.tsx` e `App.tsx`.
- [ ] Ajustar `@media print` no `index.css` e garantir que tabelas e gráficos não sejam cortados entre páginas.
- [ ] Validar compilação (`compile_applet`) e testar todos os fluxos.
