# design-handoff · chordpro-viewer

Brief para o **agente de design** (ex. claude.ai/design).  
**Isto é handoff para revisão humana** — não está “pronto/fechado” até sign-off (CP5) e correções.

| Arquivo | Conteúdo |
|---|---|
| `00-design-system.md` | DS semântico (claro/escuro), inventário, 1 template = viewer |
| `01-screens.md` | Única superfície: Viewer 1-cifra + comportamento + filosofia |
| `02-fixtures.md` | Cifras reais Ermelinda + Ministério Tons Set A |

## Decisões de produto embutidas

- Controles da **cifra** (não shell de app).
- Transpose **só com key**.
- Tema claro/escuro/auto.
- Auto-scroll: base automática + afinação humana.
- **Modo ajuste ao espaço:** opt-in (reflow + leve auto-size); **sem colunas**; fallback = layout padrão.
- Fixtures reais — não inventar.

## Próximo passo

1. Revisar/anotar este folder.  
2. Corrigir o que precisar.  
3. Enviar ao design agent.  
4. Trazer o feedback para a próxima rodada.
