---
id: exportacao
status: stable
audiences: [musician, host, agent]
exports: []
dom:
  - "[aria-label=Exportar]"
  - "[data-export=cho]"
  - "[data-export=pdf]"
  - "[data-export=slides]"
  - "[data-export=ppsx]"
  - "[data-export=bundle]"
  - "[data-pdf-confirm]"
  - "[data-pdf-download]"
  - "[data-export-mine]"
  - "[data-export-orig]"
tests:
  - tests/vue/export-slides.test.ts
  - tests/vue/pdf-export-choice.test.ts
  - tests/vue/audit-fixes.test.ts
---

# Exportar a cifra

No computador, o ícone de baixar na barra de baixo abre Exportar; no telefone, o item Exportar fica em Mais.

A dica do ícone diz Exportar CHO, PDF ou slides. No Mais, o item repete ChordPro, PDF ou slides. O painel aparece na leitura, não no editor, e oferece ChordPro (`.cho`), Cifra completa (ZIP com a cifra, os solos, as imagens e os áudios, para usar offline), Documento (PDF), Slide Louvor JA (`.slja`) e PowerPoint (`.ppsx`, abre direto em apresentação, com a letra em caixa alta). Sem solo de Guitar Pro ou MusicXML, Documento baixa o PDF na hora. Com esse solo, o painel pede TAB, Partitura ou Nenhum e só baixa em Gerar PDF.

O cabeçalho mostra o tom da leitura e, se houver, o capo. Minha versão e Oficial só aparecem quando a cifra tem versão pessoal; a escolhida é a que sai no arquivo, e a leitura acompanha. No PDF dessa versão pessoal aparece o texto versão pessoal. No telefone o painel sobe de baixo. Enquanto o arquivo sai, a linha mostra gerando. Ao concluir, um aviso diz Arquivo .cho baixado, Cifra completa baixada, PDF gerado, Slides gerados ou Apresentação gerada. Se slides ou PowerPoint falham, o painel fecha e uma faixa oferece Tentar de novo. O PDF deixa o painel aberto, com a mesma faixa. A cifra completa escreve o erro debaixo do botão.
