# WORKFLOW.md — Como trabalhamos em cada tarefa

> Este arquivo descreve o ritmo de trabalho entre você (dono) e o Claude Code.
> O objetivo é você sempre saber o que esperar e nunca perder o controle do que entra.

## O ciclo de uma tarefa

Cada tarefa em `docs/tasks/` representa **uma fatia do tamanho de um ou poucos ciclos TDD**.
O fluxo:

1. **Você** abre uma sessão e aponta a tarefa: "Faça a Tarefa N (`docs/tasks/NN-*.md`)".
2. **Claude Code** lê o `CLAUDE.md` + o arquivo da tarefa e executa o ciclo TDD:
   define o mini-domínio → escreve teste → implementa o mínimo → roda → refatora.
3. **Claude Code para** ao final e reporta: o que fez, quais arquivos tocou, e marca a
   "Definição de pronto" item a item.
4. **Você revisa**: roda os testes, lê o diff, aprova ou pede ajuste.
5. Só depois passa para a próxima tarefa. **Uma de cada vez.**

## Por que uma de cada vez

- Você consegue revisar de verdade (diffs pequenos).
- O agente não acumula contexto e não "inventa" coisas fora de escopo.
- Se algo sair torto, o estrago é uma tarefa, não um MVP inteiro.

## Anatomia de um arquivo de tarefa

Todo arquivo em `docs/tasks/` tem:
- **Objetivo** — uma frase do que a fatia entrega.
- **Camada(s)** — onde o trabalho acontece (domínio? repo? rota? UI?).
- **Contrato** — assinaturas/tipos/inputs e outputs esperados.
- **Testes a escrever primeiro** — os casos que definem o comportamento.
- **Arquivos a tocar** — para o agente não espalhar mudança.
- **Fora de escopo** — o que NÃO fazer nesta tarefa.
- **Definição de pronto** — checklist objetivo de quando acabou.

## Regras de ouro durante a execução

- TDD sempre: teste antes da implementação no domínio.
- Se a tarefa estiver ambígua ou conflitar com o plano, **perguntar antes de assumir**.
- Não criar tela antes do domínio testado.
- Não emendar a próxima tarefa sozinho.
- Respeitar o "Fora de escopo" — é tão importante quanto o objetivo.

## Como você acompanha o progresso

O `BACKLOG.md` é a lista mestra com o status de cada tarefa (a fazer / em revisão / feito).
Atualize o status conforme aprova cada uma. É o seu mapa de "onde estamos".
