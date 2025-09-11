# Itinerário Extensionista 1 — Conteúdo Acessível + Gerador de CV

Aplicação React focada em conteúdo introdutório de tecnologia e dicas de currículo, com um gerador de CV que oferece pré‑visualização fiel (WYSIWYG) e personalização de cores antes do download em PDF.

Principais objetivos:
- Ajudar pessoas a aprender o básico de computador e temas digitais.
- Permitir que coordenadores publiquem/organizem conteúdos e “dicas de CV”.
- Gerar currículos com visual profissional e cores ajustáveis com preview.

## Stack

- `React 19` + `TypeScript`
- `Vite 7`
- `React Router` (rotas: Início, Dicas de CV, Criar CV)
- `Framer Motion` (animações suaves)
- `Tailwind CSS v4` (via `@tailwindcss/vite`) + variáveis CSS para tema
- `html2canvas` + `jsPDF` (exportação de PDF a partir do preview)

## Executar localmente

Pré‑requisitos: Node 18+ e PNPM/NPM/Yarn.

Instalação e dev server:

```
npm install
npm run dev
```

Build e preview do build:

```
npm run build
npm run preview
```

Scripts úteis (package.json):
- `dev`: inicia o Vite
- `build`: `tsc -b` + build do Vite
- `lint`: ESLint base
- `preview`: serve build gerado

## Estrutura de pastas

- `src/App.tsx` — Shell da aplicação, navegação fixa, rotas.
- `src/pages/` — Páginas de alto nível (`HomePage`, `TutorialPage`, `FormPage`).
- `src/components/` — Componentes reutilizáveis: `Hero`, `ResumeForm`, `ResumePreview`, `ThemeSwitch`, etc.
- `src/hooks/useTheme.ts` — Alternância Light/Dark usando class `dark` + localStorage.
- `src/index.css` — Variáveis CSS de tema e utilitários (cores, botões, bordas).
- `index.html` — Entrada do Vite.

## Rotas

- `/` — Início: destaque de conteúdo, CTA e cartões de categorias.
- `/tutorial` — “Dicas de CV”: boas práticas de conteúdo/visual com animações.
- `/criar-cv` — Formulário em etapas para montar o currículo + pré‑visualização e exportação.

## Gerador de CV (UX + Técnica)

- Pré‑visualização WYSIWYG: o PDF é renderizado a partir do preview para manter 100% do layout (html2canvas + jsPDF).
- Cores personalizáveis: cor primária, cor de destaque e cor do texto do cabeçalho.
- Foto de perfil: aceita upload local (Object URL). Não requer Firebase.
- Escala responsiva: preview ocupa a largura disponível mantendo a proporção A4 (794×1123 px lógicos), sem “espichar”.
- Exportação fiel: uma instância off‑screen em tamanho real é usada para o PDF.

Arquivos relevantes:
- `src/components/ResumeForm.tsx` — estados, escala e layout do preview, botão “Baixar PDF”.
- `src/components/ResumePreview.tsx` — layout do currículo (cabeçalho colorido, seções, chips de habilidades, foto).

## Tema e Acessibilidade

- Tema: variáveis em `src/index.css` definem cores base; `ThemeSwitch` alterna tema adicionando/removendo a classe `dark` no `html`.
- A11y: contraste de botões primários e foco visível; animações sutis via Framer Motion.

## Padrões de código

- TypeScript em todos os componentes.
- Estilo: utilitários do Tailwind e variáveis CSS (sem CSS inline complexo, exceto no preview PDF onde ajuda no WYSIWYG).
- Evitar comentários desnecessários; nomes claros para estados/props.

## Notas para evolução

- Templates de CV adicionais (Clássico, Compacto, Sidebar).
- Editor visual para blocos (arrasta‑e‑solta) e campos opcionais.
- Persistência de rascunho (LocalStorage ou backend).
- Painel de coordenadores para publicar conteúdos.

---

Qualquer dúvida sobre o fluxo do gerador ou tema, veja `ResumeForm.tsx` e `ResumePreview.tsx` — são os pontos de entrada mais diretos para evoluir a experiência do CV.
