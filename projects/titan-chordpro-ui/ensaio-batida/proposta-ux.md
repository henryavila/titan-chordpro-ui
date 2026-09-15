# Proposta UX — Som da batida no ensaio + Ensaio Batida

> Síntese pós-debate (Priya · Uma · Aria · Tariq-contrário) · digest: `research-digest.md`  
> **Aguardando ratificação do usuário** antes de gravar `design.md`.

## Interview (ratificada)

| Campo | Decisão |
|---|---|
| **Problema** | Controlar o som da batida no ensaio (fora do editor) + modo Ensaio Batida focado em praticar batida olhando a cifra. |
| **In-scope** | Prefs click/batida/mudo; quando rolar/metrônomo usa batida; modo Ensaio Batida; UX no chrome. |
| **Out-of-scope** | Editor de batida; sync YouTube/host; scoring/mão; multi-instrumento. |
| **Done-when** | Proposta UX + decisões ratificadas. |
| **Stakes** | Modelo de prefs de som; lens/modo na API pública. |

## O que existe hoje (repo)

- Dois toggles **independentes** no metrônomo: click + som da batida — **podem soar juntos**.
- Prefs `metSound` / `metStrumSound` (ambos default OFF, opt-in).
- Strip de batida (`strumOn`) **independente do som** e **não persiste**.
- `lens` = projeção de leitura (`none` \| `nashville` \| `letra`) — **não** é modo de prática.
- Count-in = click; Rolar vinculado ao metrônomo por default.

## Pesquisa externa (padrões)

Apps de prática (Yousician, UG Practice, Groovr, Groove Gym, Spark) separam:

| Click / metrônomo | Groove / batida / drum |
|---|---|
| Precisão, entrada, hábito | Musicalidade, feel |
| Default seguro | Opt-in consciente |

Practice modes focam **uma dimensão** sem scoring obrigatório. Defaults conservadores evitam surpresa ao vivo.

## Debate — posições

| Agenda | Priya | Uma | Aria | Tariq (contrário) |
|---|---|---|---|---|
| Som | Groove primário + click opcional | Fonte `Mudo\|Click\|Batida` + click suave | Manter booleans; UI pode agrupar | Só 2 booleans; sem 3-vias na API |
| Ensaio Batida | Perfil chrome, **não** lens | Chrome mode (chip entrar/sair) | Prop `rehearsalFocus` aditiva | **Sem** modo; só copy/docs |
| Default Rolar+batida | Ligar batida | **Nunca** auto-batida | Só se pref `undefined` | **Nunca** auto |
| Count-in | Sempre click | Sempre click | Sempre click | Sempre click |
| Strip | Auto só no perfil | Auto no modo / 1ª Batida + chip | Focus força strip | Nunca auto |

## Direção recomendada (síntese)

### Decisão A — Modelo mental: **Fonte do ensaio**

Na UI do metrônomo, substituir os dois switches iguais por:

```
Fonte do ensaio:  [ Mudo ]  [ Click ]  [ Batida ]
                  ☑ Click suave de reforço   ← só se Fonte = Batida
```

Por baixo, **prefs continuam** `metSound` / `metStrumSound` (Aria + Tariq: sem one-way door de schema).

| Fonte UI | metSound | metStrumSound |
|---|---|---|
| Mudo | false | false |
| Click | true | false |
| Batida | false (ou true se reforço) | true |
| Batida + reforço | true | true |

### Decisão B — **Ensaio Batida** = perfil de chrome, **não** `lens`

- Ortogonal a Cifra \| Letra \| Nashville.
- Prop/estado aditivo `rehearsalFocus: 'off' \| 'batida'` (nome de produto: **Ensaio Batida**).
- Entrada: chip `🎸 Ensaio batida` (só se `{x_strum:}`).
- Ao entrar: Fonte → Batida, strip abre, chrome marca o modo.
- Ao sair / trocar música no setlist: volta ao perfil anterior (seguro).
- Sem `{x_strum:}`: chip ausente ou CTA “Criar batida” (já no mapa do editor — fora deste slug se exigir content-edit).

### Decisão C — Defaults conservadores + **Rolar ≠ palco com som**

- **Rolar nunca liga batida sozinho.** Click (ou mudo) permanece o default do ensaio coletivo.
- Batida audível só por: (1) escolher Fonte = Batida **e** iniciar pelo metrônomo / Ensaio Batida, ou (2) entrar em Ensaio Batida e rolar *dentro* desse modo.
- Respeita prefs explícitas; não regrava `false` do usuário.

#### Decisão C2 — Intenção de partida (resolve ensaio → ao vivo)

**Problema observado:** com `follow=true` (default), o botão **Rolar** chama `met.start()`. Se a Fonte ficou em Batida depois do ensaio, o mesmo Rolar no culto/palco **repete o estilo do metrônomo** e pode disparar one-shots de guitarra ao vivo. verified_by: `ChordproViewer.vue` `toggleScroll` → `met.start()`; sync de `strumSound` enquanto `met.running`.

**Regra elegante (recomendada): o botão Rolar é sempre silencioso.**

| Como o músico inicia | Relógio / rolagem | Áudio |
|---|---|---|
| **Rolar** (chrome) | Scroll; se `follow`, sobe o clock do met (count-in visual, faixa, strip highlight) | **Sempre mudo** nesta corrida — não herda Fonte |
| **Metrônomo → Iniciar** | Clock (+ scroll se vinculado) | Usa **Fonte** (Mudo / Click / Batida) |
| **Ensaio Batida → Rolar / Iniciar** | Clock + strip + scroll | **Batida** (modo explícito) |

- Prefs de Fonte **não são apagadas** ao Rolar silencioso — o ensaio seguinte no painel Metrônomo ainda lembra “Batida”.
- Override de sessão: `rollAudio = 'silent'` enquanto a corrida veio do botão Rolar; limpa ao parar.
- Chrome discreto se Fonte ≠ Mudo e `follow`: chip `Rolar · sem som` (transparência, não bloqueio). Quem quiser som no tempo abre o metrônomo ou Ensaio Batida — um toque consciente.

**Alternativas rejeitadas neste ponto:**

| Alternativa | Por que não (agora) |
|---|---|
| Rolar herda Fonte + diálogo “Vai tocar batida?” | Fricção no palco; um toque a mais sob pressão |
| Perfil Palco vs Ensaio (troca manual) | Bom mapa futuro; mais estado que o mínimo para fechar o vazamento |
| Dois botões “Rolar” / “Com tempo” | Polui chrome; a maioria ao vivo quer só página |
| Desvincular `follow` por default | Quebra o job “Rolar com tempo visual” sem áudio |

Mapa futuro (E3+): perfil **Palco** pode forçar Fonte=Mudo + recolher strip; não é necessário para fechar C2.

### Decisão D — Count-in sempre click

Unânime. Com Fonte = Batida: “Contagem: click · depois: batida”. Se Fonte = Mudo: count-in visual (ou micro-click só na contagem, label explícito).

### Decisão E — Strip

- Ensaio Batida → strip **abre**.
- Fonte = Batida (manual) → abre **uma vez** na música; se o músico recolher, respeita + chip `Batida ●` no chrome.
- Som pode continuar com strip fechada (já é o comportamento técnico).

## Wireframes

### Metrônomo (ensaio normal)

```
┌─ Metrônomo ──────────────────── [×] ─┐
│  BPM · tap · Iniciar                 │
│                                      │
│  Fonte do ensaio                     │
│  [ Mudo ] [ Click ● ] [ Batida ]     │
│                                      │
│  Rolagem vinculada · Contagem · …    │
└──────────────────────────────────────┘
```

### Ensaio Batida ativo

```
┌─ ENSAIO BATIDA · [Sair] ─────────────┐
│  ↓ ↑ · · ↓ ↑ · · …   (strip grande) │
├──────────────────────────────────────┤
│  [Am]  caminhar                      │
│  [G]   na luz                        │
│  … cifra normal …                    │
└──────────────────────────────────────┘
  chrome: Fonte=Batida · Rolar · Cifra|Letra intacto
```

## Gates de entrega (mapa → depois do design)

| Gate | Capacidade |
|---|---|
| **E0** | Fonte do ensaio (UI + mapeamento prefs); count-in click; chip Batida ●; **Rolar sempre silencioso** (C2) |
| **E1** | Perfil Ensaio Batida (entrar/sair, strip, fonte, reset no song change) |
| **E2** | Prop pública `rehearsalFocus` + CONSUMER.md; persistência de sessão documentada |
| **E3** | Polish: reforço click suave, volume; opcional perfil Palco |

## Rejected alternatives

1. **`lens=batida`** — mistura projeção tipográfica com chrome de prática (Priya/Uma/Aria; Tariq reforça).
2. **Auto-ligar batida no Rolar** quando há `{x_strum:}` — surpresa em ensaio coletivo (Uma/Tariq vencem Priya).
3. **Só copy sem UI de Fonte** (mínimo Tariq) — resolve descoberta parcial, mas não o job “Ensaio Batida” da Interview.
4. **Controle exclusivo sem reforço** — mata click+groove consciente.
5. **Scoring / microfone** — out-of-scope.

## Open questions (para ratificar ou deixar abertos)

1. Persistência de `rehearsalFocus`: só sessão, ou sobrevive entre músicas do setlist como `lens`?
2. Volume do “click suave” — fixo (~30%) ou slider na v1?
3. Com `lens=letra` (cantor): esconder CTA Ensaio Batida?
4. No Rolar silencioso com `follow`: count-in visual-only, ou micro-click só na contagem (ainda “sem batida”)? Recomendação: visual-only no Rolar; click de contagem só quando o metrônomo/Ensaio Batida iniciou com Fonte ≠ Mudo.

## YAML do gate (debate)

```yaml
ready_for_validation: yes
agenda:
  - Modelo de som (fonte vs toggles vs exclusividade)
  - Ensaio Batida: lens vs perfil vs mínimo sem modo
  - Defaults ao Rolar com batida
  - Count-in
  - Auto-show do strip
positions:
  - voice: Priya
    stance: Groove primário + click opcional; perfil chrome não-lens; default Rolar liga batida
  - voice: Uma
    stance: Fonte Mudo|Click|Batida + reforço; chrome mode; default nunca auto-batida
  - voice: Aria
    stance: Prefs booleans intactas; rehearsalFocus aditivo; count-in no canal click
  - voice: Tariq
    stance: Sem modo/API nova; só copy; nunca auto; strip manual
dissent:
  - voice: Tariq
    objection: Modo nomeado sem scoring é teatro; API/default são one-way doors desnecessários
  - voice: Priya
    objection: Default Rolar sem batida desperdiça {x_strum:} no chart
open_questions:
  - Persistência de rehearsalFocus entre músicas do setlist
  - Volume do click de reforço na v1
  - CTA Ensaio Batida sob lens=letra
```
