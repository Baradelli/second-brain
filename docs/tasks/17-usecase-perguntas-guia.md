# Tarefa 17 — GuideQuestion por label + `suggestedQuestionsForNote`

## Objetivo

Permitir cadastrar perguntas-guia em labels e, ao escrever uma nota, listar as perguntas
sugeridas **agrupadas por label** — como painel de consulta (andaime para pensar), nunca
como campo obrigatório.

## Camada(s)

Domínio + UseCases + repositório + rota, ponta a ponta com testes.

## Pré-requisitos

- Tabela `GuideQuestion` (ligada a `Label`) já existe no schema.
- Tarefa 16 (labels) concluída.

## Convenção de idioma

Código/identificadores/rotas em **inglês**.

## Contrato

```ts
// shared/
export const createGuideQuestionSchema = z.object({
  labelId: z.string().min(1),
  text: z.string().min(1), // "Was it an easy read?"
  order: z.number().int().default(0),
});

interface GuideQuestion {
  id: string;
  labelId: string;
  text: string;
  order: number;
  active: boolean;
}

// Resultado agrupado para o painel:
interface SuggestedQuestionsGroup {
  label: { id: string; name: string };
  questions: GuideQuestion[]; // ativas, ordenadas por `order`
}

class CreateGuideQuestion {
  /* cria pergunta ligada a um label do usuário */
}
class ToggleGuideQuestion {
  /* active on/off, sem apagar */
}

class SuggestedQuestionsForNote {
  // Dadas as labels de uma nota, retorna as perguntas ativas agrupadas por label.
  // Só entram labels que TÊM perguntas (as sem pergunta não aparecem).
  async execute(input: {
    labelIds: string[];
  }): Promise<SuggestedQuestionsGroup[]>;
}
```

## Regras de negócio

- `CreateGuideQuestion`: o label deve existir e ser do usuário. `order` define a ordenação.
- `ToggleGuideQuestion`: liga/desliga `active` (não apaga — perguntas são reaproveitáveis).
- `SuggestedQuestionsForNote`: recebe os `labelIds` da nota, busca as perguntas **ativas**
  de cada um, agrupa por label, **omite labels sem perguntas**, ordena por `order`.
  - **Decisão a confirmar (herança pela árvore):** uma pergunta no label "Book" deve valer
    para os filhos de "Book"? O plano deixou isso em aberto. Sugestão para o MVP: **NÃO
    herdar** (só o label exato) — mais simples e previsível; herança fica para depois.
    Fixar e documentar.

## Testes (unit + integração + rota)

1. Criar pergunta num label do usuário → ok; label de outro user/inexistente → erro.
2. `ToggleGuideQuestion` desativa sem apagar; desativadas não aparecem nas sugestões.
3. `SuggestedQuestionsForNote` agrupa por label e ordena por `order`.
4. Labels sem perguntas não aparecem no resultado.
5. (Conforme decisão) sem herança: pergunta de "Book" não aparece para nota só com label filho.
6. (Rota) `POST /labels/:id/questions`, `GET /notes/suggested-questions?labelIds=...`
   validados por Zod.

## Arquivos a tocar

- `packages/shared/src/guide-question.ts` (+ export).
- `packages/backend/src/usecases/create-guide-question.ts`, `toggle-guide-question.ts`,
  `suggested-questions-for-note.ts` (+ testes).
- `packages/backend/src/usecases/ports/guide-question-repository.ts` (+ fake + teste).
- `packages/backend/src/repositories/prisma-guide-question-repository.ts` (+ integração).
- `packages/backend/src/routes/guide-question-routes.ts` (+ integração) e registro.

## Fora de escopo

- NÃO gerar perguntas por IA (MVP 5).
- NÃO herança pela árvore (a menos que você decida o contrário).
- NÃO UI (Bloco G).

## Definição de pronto

- [x] Cadastrar/ligar-desligar perguntas em labels, ponta a ponta, com testes.
- [x] `suggestedQuestionsForNote` agrupa por label, omite vazios, só ativas, ordenado.
- [x] Decisão sobre herança fixada e documentada.
- [x] Reporte ao dono: arquivos tocados + checklist marcado.
