# Implementação: Entrada Rápida Inteligente

## Visão Geral

A funcionalidade **Entrada Rápida Inteligente** permite ao usuário registrar transações financeiras
usando linguagem natural em português, sem precisar preencher formulários.

Toda a análise é feita **100% offline** — sem chamadas a APIs externas.

---

## Componentes

| Arquivo | Responsabilidade |
|---|---|
| `src/utils/quickEntryParser.ts` | Parser NLP: extrai valor, tipo, data, descrição e categoria |
| `src/utils/quickEntryParser.test.ts` | Testes unitários do parser (38 testes) |
| `src/pages/QuickEntryPage.tsx` | Página de interface com o usuário |
| `src/hooks/useQuickEntryDrafts.ts` | Hook de gerenciamento de rascunhos |
| `src/services/quickEntryRepository.ts` | Persistência de rascunhos no IndexedDB |
| `src/offline/offlineDb.ts` | Store `quick_entry_drafts_cache` (DB v3) |

---

## Parser: extração de valor numérico

O campo `parsedValue` é preenchido em dois passos (em ordem de prioridade):

### 1. `extractValue` — padrões numéricos

Reconhece formatos com dígitos:

```
R$ 38,90   →  38.90
120 reais  →  120
38.90      →  38.90
22         →  22
```

### 2. `parsePortugueseNumberWordsToNumber` — números por extenso

Acionado apenas quando `extractValue` retorna `null`. Reconhece palavras numéricas em pt-BR.

```
"gastei vinte reais no mercado"           →  20
"paguei trinta e oito"                    →  38
"paguei cento e vinte de internet"        →  120
"uber deu vinte e dois reais"             →  22
"recebi mil e duzentos reais de comissão" →  1200
"anota oitenta da farmácia"               →  80
```

#### Palavras reconhecidas

| Categoria | Palavras |
|---|---|
| Unidades (0–9) | zero, um, uma, dois, duas, três, quatro, cinco, seis, sete, oito, nove |
| 10–19 | dez, onze, doze, treze, quatorze, catorze, quinze, dezesseis, dezasseis, dezessete, dezassete, dezoito, dezenove, dezanove |
| Dezenas | vinte, trinta, quarenta, cinquenta, sessenta, setenta, oitenta, noventa |
| Centenas | cem, cento, duzentos(as), trezentos(as), quatrocentos(as), quinhentos(as), seiscentos(as), setecentos(as), oitocentos(as), novecentos(as) |
| Milhares | mil |

> **Normalização:** acentos são removidos automaticamente antes da análise.
> `vírgula → virgula`, `três → tres`, `comissão → comissao`

---

## Decimais por extenso

Três formatos suportados:

### Vírgula
```
"trinta e oito vírgula noventa"   →  38.90
"vinte e cinco vírgula cinquenta" →  25.50
```
Regra: valor decimal `1–9` → dividido por 10; `10–99` → dividido por 100.

### Centavos
```
"quarenta e dois reais e cinquenta centavos"  →  42.50
"trinta reais e vinte e cinco centavos"       →  30.25
"cinquenta centavos"                          →   0.50
```
O valor após a segunda sequência numérica é sempre dividido por 100.

### "com"
```
"quarenta e dois com cinquenta"   →  42.50
```

---

## Contexto de data (não confundir com valor)

Tokens após a palavra **"dia"** são excluídos da busca de valores:

```
"dia vinte e cinco paguei trinta reais"  →  parsedValue = 30  (não 25)
```

---

## Artigo indefinido "um/uma"

"um" e "uma" isolados (sequência de um único token) são ignorados para evitar
confundir artigos indefinidos com o número 1:

```
"comprei uma coisa"  →  parsedValue = null  (✓ "uma" = artigo)
"vinte e um reais"   →  parsedValue = 21    (✓ "um" = parte do número)
```

---

## Confiança (confidence)

```
0.3  base
+0.3 se parsedValue não é null (numérico ou por extenso)
+0.2 se descrição extraída
+0.1 se data explícita no texto
+0.1 se categoria sugerida
─────
1.0  máximo
```

---

## Testes

```bash
npm run test:run
```

**106 testes passando** (38 no parser, incluindo 15 testes do `parsePortugueseNumberWordsToNumber`
e 10 testes de integração via `parseQuickEntryText`).

Casos cobertos pelos testes:
- Valores por extenso simples (vinte, oitenta)
- Compostos (trinta e oito, cento e vinte, vinte e dois)
- Milhares (mil e duzentos, dois mil e trezentos e vinte e dois)
- Decimais via vírgula, centavos e "com"
- Centavos isolados
- Contexto de data (dia vinte e cinco → não é o valor)
- "um/uma" como artigo → null
- Natureza de transação (despesa/receita) detectada pelo verbo

---

## Deploy

O app é publicado automaticamente no GitHub Pages via GitHub Actions ao fazer push
na branch `main`.

```bash
git add -A
git commit -m "feat(parser): reconhece números por extenso em pt-BR"
git push
```
