# App Titan para iOS e Android — intenção e pesquisa

> **Situação:** intenção registrada em 23/11/2026. **Não está em implementação.** A ideia é retomar em um futuro não muito distante.
> **Natureza:** análise a partir do código deste repositório, do `sda2` e de documentação pública. Nada aqui foi prototipado.
> **Relação com a visão:** este é o app `titan-chordpro` que [`VISAO.md`](./VISAO.md) §8 já prevê como repositório separado. A `titan-chordpro-ui` continua sendo a UI de uma cifra.

---

## 1. A intenção

Um app de cifras **para qualquer músico**, que funciona sem internet e tem uma biblioteca própria no aparelho.

**O grande diferencial é a integração first-party com o SDA:** quem é de uma igreja conecta o app e recebe repertório, cifras e eventos, prontos para tocar offline. Quem não é de igreja nenhuma usa o app normalmente, com as próprias cifras.

O problema de origem é o acesso offline. A web melhorou com o PR 165 do `sda2`, mas continua sujeita às regras do navegador, principalmente no iPhone.

### Decisões do produto (23/11/2026)

| # | Decisão | Consequência |
|---|---|---|
| 1 | O público é **qualquer músico** | O app precisa ser útil sem SDA e sem conta |
| 2 | O diferencial é a **integração first-party com o SDA** | SDA é uma conexão opcional, mas é a melhor experiência do app |
| 3 | **Não distribuímos áudio** | Sem armazenamento de áudio nosso e sem catálogo de áudio no app |
| 4 | **Cada usuário traz o próprio áudio** | Arquivo escolhido pela pessoa, ligado à música naquele aparelho |
| 5 | **Integrar com serviços de streaming** | Ver §5: o que cada serviço permite é bem diferente |
| 6 | Licença Apple **já existe**; taxa única do Google **aprovada** | Custo de loja deixa de ser bloqueio |
| 7 | **Não implementar agora** | Este documento é o ponto de retomada |

### Direção técnica recomendada (a confirmar no teste de viabilidade)

- **Capacitor** com a mesma `<TitanChordpro>` em Vue, em **repositório próprio**.
- **Local-first:** o aparelho é a fonte do que a pessoa tem. A rede só sincroniza.
- Biblioteca em **SQLite** + arquivos no armazenamento do app.
- React Native e Flutter ficam descartados: exigiriam reescrever mais de 40 mil linhas de interface, incluindo editor, TAB e partitura.

---

## 2. O que o app ganha em relação à web

| Área | Web hoje | App |
|---|---|---|
| Offline | Cache que o sistema pode apagar; iPhone não conferido | Biblioteca sob controle do app |
| Primeira abertura | Precisa ter visitado o site com internet | A interface vem instalada |
| Tela no iPhone | A barra do Safari fica (cerca de 110 px) | Tela cheia real |
| Edição offline | Fila da Minha versão só na memória da aba | Fila persistente, enviada quando a rede volta |
| Arquivos | Download e upload pelo navegador | Abrir `.cho`, OnSong, PDF e ZIP pelo menu Compartilhar |
| Áudio próprio | Depende de URL com CORS | Arquivo local, tocando com a tela bloqueada |
| Presença | Um site entre outros | Ícone, notificações, loja |

### Features, por ordem de valor

**Núcleo (primeira versão)**

1. Biblioteca local: busca instantânea, favoritos, pastas, tags, filtro por tom.
2. Leitura e edição completas, reaproveitando o Titan.
3. Importar ChordPro, OnSong, PDF e Cifra completa (`.zip`).
4. Repertórios pessoais, com anterior/próxima.
5. **Conectar à igreja no SDA**: cifras e repertórios sincronizados.
6. **"Preparar o culto"**: um toque deixa o repertório dos próximos eventos pronto e mostra o que falta.

**Depois**

7. Áudio próprio por música (cantado, playback), com tela bloqueada.
8. "Ouvir em…" nos serviços de streaming (§5).
9. Minha versão e sugestões sincronizadas com o SDA.
10. Pedal Bluetooth para virar página e controlar a rolagem.

**Diferencial futuro**

11. **Modo banda na rede local:** o líder troca a música e os aparelhos acompanham, sem internet.
12. Backup da biblioteca no iCloud ou Google Drive da própria pessoa.

---

## 3. Integração first-party com o SDA

É o motivo de o app existir, então precisa parecer nativa: entrar, escolher a igreja, e o repertório da semana já aparece.

**O que vem do SDA:** cifras e suas versões, solos, imagens, capas, eventos e repertórios, Minha versão, sugestões.

**O que não vem:** áudio. As cifras do SDA podem trazer `x_titan_audio_*`, e o app **ignora essas diretivas na leitura sem removê-las do source**. Se o app as apagasse, uma sugestão ou gravação poderia tirar o áudio da cifra oficial no site.

### O que falta no `sda2`

| Item | Hoje | Necessário |
|---|---|---|
| Sincronização | `GET /charts` devolve o catálogo inteiro, sem paginação nem delta | Manifesto com id, versão, hash e itens removidos |
| Login | Sessão web; o token do App do Culto é da instalação e da igreja | Token **por pessoa**, com login no navegador do sistema (PKCE) e revogação por aparelho |
| Visibilidade | `SongVisibility` varia por igreja e usuário | Cifra ocultada ou arquivada sai do aparelho na sincronização seguinte |
| Multi-igreja | Host define a igreja | Seletor de igreja; decidir se uma pessoa pode conectar mais de uma |
| Compatibilidade | Site e API atualizam juntos | Contrato versionado, como `schema=1` do App do Culto |
| Separação | — | Cifra do SDA não se mistura com a biblioteca pessoal; desconectar remove só o que veio da igreja |

**Reaproveitar do App do Culto** (`docs/v5/app-desktop-plano/` no `sda2`): manifesto aceito inteiro ou recusado, arquivos por hash, separação entre `pronto` e `pedido`, "rede caída nunca apaga o que está pronto", marcas com id idempotente.

---

## 4. O que muda no Titan

Pouco, porque a fronteira com o host já existe.

| Ponto | Hoje | Ajuste |
|---|---|---|
| Fonte do áudio | Só diretivas do `.cho`; não existe prop de áudio | **Host fornece as faixas** por música, sem reescrever o source |
| Cache de áudio | Preso ao Cache Storage | Ponto plugável, ou desligado no app |
| URLs de mídia | Aceita `https://` e caminho `/…` | Aceitar o endereço de arquivo local do Capacitor |
| `ChartStore` | Síncrono | App carrega do SQLite para a memória antes de montar a cifra |
| Tela ligada, tela cheia, Central de Mídia | APIs do navegador | Implementação nativa atrás da mesma interface |
| Áudio de streaming | Recusa YouTube e Spotify como faixa | Continua recusando; streaming é outro controle (§5) |
| Importar do Cifra Club | Host busca a página | **Fora do app público** até avaliar os termos (§7) |

**Regra nova ao retomar:** o app instalado pode ficar meses em uma versão antiga. Renomear diretiva sem alias, como já aconteceu com `x_titan_*`, deixaria esses aparelhos sem entender cifras novas. O formato da cifra precisa de política de compatibilidade antes do primeiro lançamento.

---

## 5. Áudio e streaming

### Modelo recomendado: três camadas

1. **Arquivo do usuário (base).** A pessoa escolhe o arquivo e ele **fica no aparelho**. É a única opção que funciona offline de forma garantida.
2. **"Ouvir em…" por link (todos os serviços).** Abre a música no app do serviço. Não depende de aprovação de API.
3. **Reprodução integrada (só onde a plataforma permite).** Começar por **Apple Music**.

O vínculo entre música e áudio fica em uma tabela local do app, **fora do `.cho`**.

### O que cada serviço permite

| Serviço | Dentro do app | Offline | Bloqueio | Plano |
|---|---|---|---|---|
| **Apple Music** | Sim, com MusicKit; faixa completa exige assinante e autorização | Não confirmado para apps de terceiros | Android não conferido | **Primeira integração real** |
| **Spotify** | Só controlando o app do Spotify | Não é nosso | Modo de desenvolvimento limita a 5 usuários; acesso ampliado é para organizações com grande base | **Só link** no lançamento |
| **YouTube / YouTube Music** | Player embutido do YouTube; não achei API oficial do YouTube Music | Proibido fora do Premium | Proibido tocar em segundo plano | Link; player só com a tela aberta, se valer a pena |
| **Google Play Music** | — | — | **Serviço encerrado em 2020**, substituído pelo YouTube Music | Não existe mais como alvo |

### Consequências para o produto

- **Streaming não resolve o offline.** No culto sem internet, só o arquivo do usuário toca com garantia. A interface precisa deixar isso claro em "Preparar o culto".
- **Spotify é o maior obstáculo.** O critério publicado por terceiros é organização registrada e 250 mil usuários ativos mensais. Um app novo não passa, e o modo de desenvolvimento só atende 5 pessoas.
- **Não sincronizar gravação com a cifra.** A política do Spotify proíbe sincronizar gravações com mídia visual. Rolar a cifra no tempo de uma faixa do Spotify pode se enquadrar. O Titan hoje não sincroniza, e isso deve continuar assim nas integrações de streaming.
- **Monetização afeta a integração.** O Spotify restringe uso comercial sem aprovação. Se o app for pago, revisar antes de integrar.

---

## 6. Plano para quando retomar

Estimativas grosseiras, para uma pessoa trabalhando com agentes.

| Fase | Entrega | Duração |
|---|---|---|
| **0. Viabilidade** | Titan no Capacitor em iPhone e Android reais. Medir rolagem, metrônomo, alphaTab, áudio com tela bloqueada e 500 cifras offline | ~1 semana |
| **1. App sozinho** | Biblioteca, leitura, edição, importação, repertórios. Já útil sem SDA | 3 a 5 semanas |
| **2. SDA first-party** | API de sincronização, login, conectar igreja, "Preparar o culto" | 3 a 5 semanas |
| **3. Áudio** | Arquivo próprio e "Ouvir em…" | 1 a 2 semanas |
| **4. Lojas** | TestFlight, teste fechado do Google, revisão, política de privacidade | 2 a 4 semanas |
| **5. Depois** | Apple Music, Minha versão sincronizada, pedal, modo banda | Por demanda |

**Critério de parada da fase 0:** se metrônomo ou rolagem não ficarem confiáveis no aparelho, reavaliar a stack antes de construir o resto.

---

## 7. Riscos e pendências

| Risco | Situação | O que fazer |
|---|---|---|
| **Direitos de letras e cifras** | Tirar o áudio reduz muito o risco, mas letra e cifra também têm direitos | App sem catálogo público; conteúdo vem do usuário ou da igreja conectada. Avaliar com alguém da área antes de publicar |
| **Importação do Cifra Club** | Em app público, a exposição é maior | Fora da primeira versão |
| **Versões antigas instaladas** | Risco técnico mais sério | Compatibilidade de formato e API (§4) |
| **Revisão da Apple** | Rejeita app com função mínima | Biblioteca nativa e offline são o argumento |
| **Exclusão de conta** | Obrigatória se o app criar contas; não achei a função no `sda2` | Primeira versão sem conta própria; conferir se o login SDA no app exige exclusão |
| **Google Play** | Conta pessoal criada depois de 13/11/2023 exige 12 testadores por 14 dias | Conferir o tipo da conta; recrutar músicos das igrejas |
| **Três superfícies** | Web, desktop e mobile, com o App do Culto ainda em andamento | Retomar quando o App do Culto estabilizar |
| **CocoaPods** | Registro fica somente leitura em 02/12/2026 | Usar Swift Package Manager no iOS |

### Perguntas em aberto

1. O áudio do usuário fica **só no aparelho**, ou também vai para o iCloud/Drive da própria pessoa? (Recomendação: só no aparelho na primeira versão.)
2. Modelo de negócio: gratuito, pago ou recursos pagos? Afeta Spotify, compras nas lojas e a necessidade de conta.
3. Nome e marca do app para o público geral, já que o diferencial é SDA mas o público é amplo.
4. A conta do Google será pessoal ou de organização?
5. Uma pessoa pode conectar mais de uma igreja?

### Não verificado

- Titan rodando dentro do Capacitor em aparelho real.
- Volume real de cifras em produção.
- Offline web no Safari/iOS, com usuário logado e em produção (em aberto desde o PR 165).
- MusicKit no Android e regras de download para apps de terceiros.
- Exigência de Premium no controle remoto do Spotify: as fontes divergem.
- Critério de 250 mil usuários do Spotify: confirmado só por fontes secundárias. A exigência de organização vem do anúncio oficial.
- Texto atual da diretriz 4.2 da Apple, e se o login SDA aciona a regra de login da diretriz 4.8.

---

## 8. Fontes (consultadas em 23/11/2026)

**Apple**
- [Exclusão de conta, diretriz 5.1.1(v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- [Diretrizes de revisão (PDF)](https://developer.apple.com/support/downloads/terms/app-review-guidelines/App-Review-Guidelines-English-UK.pdf)
- [MusicKit](https://developer.apple.com/musickit)
- [MusicKit, documentação](https://developer.apple.com/documentation/musickit.md)
- [WWDC 2026, sessão 254](https://developer.apple.com/videos/play/wwdc2026/254/)
- [WebKit, política de armazenamento](https://webkit.org/?p=14403)

**Google e YouTube**
- [Google Play, requisitos de teste](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Políticas para desenvolvedores do YouTube](https://developers.google.com/youtube/terms/developer-policies-guide)
- [YouTube, funcionalidade mínima exigida](https://developers.google.com/youtube/terms/required-minimum-functionality)

**Spotify**
- [Política para desenvolvedores](https://developer.spotify.com/policy/)
- [Critérios de acesso ampliado](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access)
- [Migração de fevereiro de 2026](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [SDK iOS](https://developer.spotify.com/documentation/ios/reference)
- [Resumo secundário dos limites de 2026](https://vorplabs.com/agent-tools/spotify-api-changes)

**Capacitor**
- [Capacitor 8.5](https://ionic.io/blog/capacitor-8-5-released)
- [Política de suporte](https://capacitorjs.com/docs/v7/main/reference/support-policy)

**Internas**
- [`CONSUMER.md`](./CONSUMER.md), [`BUNDLE.md`](./BUNDLE.md), `src/core/storage.ts`, `src/core/audio-url.ts`
- No `sda2`: `.ai/memory/cifras-offline.md`, `docs/v5/app-desktop-plano/arquitetura.md`, `docs/v5/app-desktop-plano/contrato.md`, `research_notes/App desktop para o culto/arquitetura-offline.md`
