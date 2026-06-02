# Tarefa 05b — Migrar de `new Date` para Luxon (datas/fuso)

## Objetivo

Adotar **Luxon** como a biblioteca padrão de datas do projeto e substituir os usos de
`new Date` que envolvem lógica de calendário/fuso pelo equivalente em Luxon. Centralizar o
cálculo de "dia no fuso" nos helpers de domínio. É um refactoring — comportamento observável
não muda, mas fica correto e consistente.

## Por que agora

As Tarefas 01–05 já rodaram e há vários arquivos/testes usando `new Date`. Antes de seguir
para a regra do diário (Tarefa 06), que depende de "que dia é hoje no fuso do usuário", vale
padronizar — senão a inconsistência se espalha.

## Camada(s)

Domínio (helpers de data) + UseCases que calculam intervalos/datas. Sem mudança de API.

## Regra que passa a valer (já no CLAUDE.md)

- **Luxon para lógica de calendário/fuso.** `new Date` só para instantes triviais.
- Todo cálculo "instante ↔ dia do calendário" passa por um helper (ex.: `dayRange`), nunca
  espalhado. Trocar de lib no futuro = mexer num arquivo só.
- O banco continua guardando UTC; o "dia" é sempre o dia LOCAL do usuário (via `timezone`
  de Settings).

## Passos

1. Adicionar `luxon` (e `@types/luxon` em dev) ao `packages/backend`.
2. Reescrever `domain/day-range.ts` com Luxon:

   ```ts
   import { DateTime } from 'luxon';

   export function dayRange(
     reference: Date,
     timezone: string,
     scope: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR',
   ) {
     const dt = DateTime.fromJSDate(reference, { zone: timezone });
     const unit = scope.toLowerCase() as 'day' | 'week' | 'month' | 'year';
     const from = dt.startOf(unit).toUTC().toJSDate();
     const to = dt.endOf(unit).toUTC().toJSDate();
     return { from, to };
   }
   ```

3. Varrer o backend por `new Date(` e classificar cada uso:
   - **Instante trivial** ("agora", timestamp de criação que o Prisma já gera) → pode ficar.
   - **Lógica de calendário/fuso** (início/fim de dia, comparação por dia, montar uma data
     a partir de ano/mês/dia) → migrar para Luxon, idealmente via helper.
4. Garantir que os testes existentes da Tarefa 05 (especialmente os de borda de dia em
   UTC-3) continuam verdes — e reforçar o caso de **horário de verão** se aplicável.

## Testes

- Os testes de `dayRange` e `findNoteOfTheDay` da Tarefa 05 devem continuar passando sem
  alteração de expectativa (o comportamento correto não muda; a implementação fica robusta).
- Adicionar 1 teste de borda de **DST/offset histórico** se o fuso do projeto tiver isso,
  para travar o ganho do Luxon (algo que a aritmética manual de offset erraria).

## Arquivos a tocar

- `packages/backend/package.json` (dep `luxon`, dev `@types/luxon`).
- `packages/backend/src/domain/day-range.ts` (reescrever com Luxon).
- Quaisquer UseCases/utils que façam cálculo de dia com `new Date` (migrar).
- Testes afetados (só se a forma de construir datas de teste mudar; expectativas iguais).

## Fora de escopo

- NÃO trocar `new Date` que é só instante trivial (não há ganho; evita ruído no diff).
- NÃO adicionar Luxon ao frontend agora (entra se/quando o front precisar formatar datas).
- NÃO mudar contratos de UseCase nem schemas.

## Definição de pronto

- [ ] `luxon` instalado no backend.
- [ ] `dayRange` reescrito com Luxon e centralizando o cálculo de dia/fuso.
- [ ] Usos de `new Date` com lógica de calendário migrados; instantes triviais mantidos.
- [ ] Todos os testes existentes verdes; +1 teste de DST/offset se aplicável.
- [ ] Nenhum cálculo de "dia" usa a hora do servidor.
- [ ] Reporte ao dono: arquivos tocados + checklist marcado.
