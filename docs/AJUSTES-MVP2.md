# Ajustes & melhorias pendentes do MVP 2

> Diagnóstico de uma varredura geral do app (jun/2026), para revisitar **depois**. Nada aqui é
> tarefa em execução — é backlog priorizado. O MVP 2 (incl. auth + configurações) está funcional;
> isto são arestas a aparar. Itens em ordem de prioridade.

## 🔴 Consistência de data / fuso (correção do que o usuário vê)

1. **Fallback de timezone divergente.** Sem linha em `Settings`, `buildTodayAgenda` usa
   `DEFAULT_TIMEZONE = 'UTC'`, enquanto `buildDayClosing`, `buildMonthCalendar`, `buildDayDetail`,
   `computeGoalProgress` e o recap usam `'America/Sao_Paulo'`. Telas podem discordar sobre "hoje".
   (O dono semeado tem Settings, então hoje não aparece — mas é frágil.) **Fix:** unificar o default.
2. **O frontend calcula "hoje/este mês" no fuso do dispositivo, não no do Settings.** O `timezone`
   das configurações só vale no backend. No app, `CalendarPage` (mês atual, destaque de hoje),
   `getTodayNote` (qual devocional/reflexão é "de hoje") e a data padrão de nova nota usam
   `new Date()` local. Se o fuso do aparelho ≠ Settings, eles divergem. **Fix:** o "hoje" do front
   deveria vir do/derivar do fuso do Settings (ou pedir ao backend).
3. **Três noções de "semana" coexistindo.** Hábito / fechar-o-dia / calendário usam **segunda fixa**
   (`dayRange` weekStartsOn=1); recap usa `recapWeekday`; captura usa `reviewWeekday` (default
   domingo). **Fix:** escolher um "início da semana" único nas configs e propagar.

## 🟠 Segurança (auth recém-introduzida)

4. **JWT não expira** (`app.jwt.sign({ sub })` sem `expiresIn`). Token vazado vale pra sempre.
   **Fix:** definir prazo (ex.: 30d); o app já trata 401→logout.
5. **Rotas por `:id` não checam dono do recurso** (GET/PATCH/archive de nota etc. não filtram por
   `userId`). Inócuo em single-user; **endurecer antes de multiusuário real.**
6. **`JWT_SECRET`** precisa ser definido em produção (hoje há default só de dev). Login sem
   throttling (ok p/ uso pessoal).

## 🟡 Lacunas de UX / simetria

7. **Não dá pra arquivar um recurso pela UI** (nota e objetivo têm; recurso só edita/avança estágio).
8. **Restaurar/desarquivar** só existe para objetivos — notas/recursos/capturas arquivados não têm.
9. **Capturas não são editáveis** (só arquivar/promover).
10. **`goalsPlanned` no calendário** usa a config **atual** do hábito para dias passados
    (aproximação; pode distorcer histórico se os dias do hábito mudaram).

## 🟢 Limpeza / dívida conhecida

11. **`AssistantPage`** ainda é uma rota viva, mas saiu da navegação (inacessível) — remover ou
    reaproveitar.
12. **`devotionalTime`/`reflectionTime`** aparecem em Configurações mas **não fazem nada** ainda
    (legenda já avisa). Virar lembrete de verdade ou remover.
13. **`Label.parentId` (árvore)** segue no schema sem uso → **F1** em `MELHORIAS.md`.
    **Backlinks reversos** entre notas → **F2** em `MELHORIAS.md`.

## ✅ Sólido (não priorizar)

Camadas (rota→usecase→repo) limpas; domínio/usecases bem testados; i18n sem texto solto; login
ponta a ponta ok; offline de captura/escrita já passa pelo token.

---

**Sugestão de foco quando voltarmos:** itens **1–3** (unificar fuso/“hoje”/início-de-semana) — é o
que mais confunde na validação — e decidir o **4** (expiração do JWT). O resto (7–13) é incremento.
