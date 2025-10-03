# Itinerário Extensionista — Plataforma de Conteúdo + Gerador de CV

Aplicação React que oferece mini cursos introdutórios, biblioteca de conteúdo audiovisual e um gerador de currículo com pré‑visualização fiel (WYSIWYG) e exportação em PDF. O projeto foi desenvolvido para apoiar trilhas extensionistas, oferecendo um painel administrativo para gerenciamento de materiais e usuários.

---

## Índice

1. [Stack](#stack)
2. [Execução local](#execução-local)
3. [Arquitetura e organização](#arquitetura-e-organização)
4. [Funcionalidades principais](#funcionalidades-principais)
5. [Fluxo do gerador de CV](#fluxo-do-gerador-de-cv)
6. [Autenticação, segurança e papéis](#autenticação-segurança-e-papéis)
7. [Regras do Firestore](#regras-do-firestore)
8. [Cadastro manual de perfis](#cadastro-manual-de-perfis)
9. [Padrões de código](#padrões-de-código)
10. [Scripts NPM](#scripts-npm)
11. [Próximos passos](#próximos-passos)

---

## Stack

| Tecnologia | Uso principal |
|------------|---------------|
| ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff) | SPA, componentes tipados |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=fff) | Dev server + build bundler |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=fff) | Estilização rápida e tema claro/escuro |
| ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=fff) | Transições e microinterações |
| ![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=fff) | Rotas públicas e protegidas |
| ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=000) | Auth + Firestore para dados e permissões |
| ![date-fns](https://img.shields.io/badge/date--fns-444?style=for-the-badge&logo=date-fns&logoColor=fff) ![React Datepicker](https://img.shields.io/badge/react--datepicker-026AA7?style=for-the-badge&logoColor=fff) | Seletores de datas localizados |
| ![@hello-pangea/dnd](https://img.shields.io/badge/%40hello--pangea%2Fdnd-6B7280?style=for-the-badge&logoColor=fff) | Drag & drop no dashboard e CV |
| ![html2canvas](https://img.shields.io/badge/html2canvas-3B82F6?style=for-the-badge&logo=html5&logoColor=fff) ![jsPDF](https://img.shields.io/badge/jsPDF-FFB300?style=for-the-badge&logo=javascript&logoColor=000) | Exportação PDF do currículo |

---

## Execução local

```bash
npm install
npm run dev
```

Build e preview do build:

```bash
npm run build
npm run preview
```

> Requisitos: Node 18+.

### Variáveis de ambiente

Configure `.env.local` com suas chaves Firebase (Vite exige prefixo `VITE_`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

---

## Arquitetura e organização

```
src/
  components/         Componentes reutilizáveis (modais, forms, cards)
  context/            Contextos (Auth, Learner)
  hooks/              Hooks utilitários (ex.: useAuth)
  lib/                Helpers de Firestore, Firebase e regras de negócio
  pages/              Páginas públicas e administrativas
  routes/             ProtectedRoute e utilidades de roteamento
  index.css           Variáveis de tema + utilitários globais
  main.tsx            Entry point React
```

- `src/pages/DashboardPage.tsx`: painel para manter tópicos, conteúdos e aulas, com drag & drop e CRUD.
- `src/pages/admin/LoginPage.tsx`: tela de login restrito.
- `src/components/CreateUserModal.tsx`: modal de gestão de usuários (criar, promover, desativar).
- `src/components/ResumeForm.tsx` e `src/components/ResumePreview.tsx`: fluxo completo do gerador de currículo.
- `src/lib/db.ts`: camada de acesso ao Firestore para tópicos/conteúdos/aulas.
- `src/lib/users.ts`: operações relacionadas aos perfis (leitura, escrita, promoção).

---

## Funcionalidades principais

### Mini cursos & dashboard
- Navegação progressiva (Tópicos → Conteúdos → Aulas) com player embutido.
- Busca contextual e estatísticas rápidas (aulas, duração, etc.).
- Painel administrativo com drag & drop e persistência do campo `order`.

### Gerador de currículo
- Formulário multipasso com validações (telefone BR, datas mensais, limites).
- Personalização visual (esquemas de cores, fontes, foto com recorte).
- Preview WYSIWYG lado a lado com o formulário.
- Exportação PDF preservando links clicáveis.
- Reordenar seções via drag & drop.

### UI geral
- Tema claro/escuro com persistência em `localStorage`.
- Microinterações suaves via Framer Motion.
- Layout responsivo para desktop/tablet/celular.

---

## Fluxo do gerador de CV

1. **Informações pessoais** — nome, contatos, localização, resumo, upload de foto.
2. **Experiência profissional** — cargos, empresas, descrições, datas MM/AAAA, opção “Trabalho atual”.
3. **Formação acadêmica** — instituição, curso, área, datas com opção “Em andamento”.
4. **Habilidades** — seleção livre com níveis (iniciante/intermediário/avançado).
5. **Idiomas** — idioma + nível (básico → nativo).
6. **Certificações** — certificados com descrição, link opcional.
7. **Personalização** — três esquemas de cor, duas famílias de fontes, formato da foto.
8. **Exportação** — botão “Gerar PDF” produz PDF de uma página com links e estilização fiel.

Arquivos de referência:
- `src/components/ResumeForm.tsx`
- `src/components/ResumePreview.tsx`

---

## Autenticação, segurança e papéis

- **Auth**: Firebase Email/Senha (`src/context/AuthContext.tsx`).
- **Sessão**: `AuthProvider` sincroniza o usuário firebase e o perfil Firestore (`users/{uid}`).
- **Papéis**: campo `role` no documento `users/{uid}` (`null` → usuário comum, `admin` → administrador).
- **Status**: campo `isActive` controla acesso — ao detectar `false`, o app finaliza a sessão.
- **Rotas protegidas**: `src/routes/ProtectedRoute.tsx` redireciona para `/admin` se não houver sessão; o nav só exibe itens administrativos com `profile.role === 'admin'`.

Quando um administrador cria outro usuário, o fluxo de criação reautentica automaticamente o admin para não exigir novo login manual.

---

## Regras do Firestore

Regras mais recentes (resumo):

```text
/topics, /contents, /lessons
  read: true
  write: request.auth != null

/users/{uid}
  read: isAdmin() || request.auth.uid == uid
  create: isAdmin() || (primeiro login do próprio usuário com role null)
  update/delete: isAdmin()

/learningProgress/{participantId}
  read: true
  create/update: isValidParticipant… (participante) ou isAdmin()
  delete: isAdmin()

/{document=**} fallback
  read, write: false
```

`isAdmin()` verifica se o documento `users/{uid}` existe, tem `role == 'admin'` e `isActive != false`.

> Ao alterar regras, execute `firebase deploy --only firestore:rules` para publicar.

---

## Cadastro manual de perfis

O doc `docs/user-profiles.md` descreve o passo a passo. Resumo:

1. Criar o usuário no Firebase Authentication, anotar o `uid`.
2. Criar o documento `users/{uid}` no Firestore com os campos obrigatórios (uid, email, fullName, role opcional, isActive).
3. Compartilhar credenciais. Apenas administradores devem receber `role: 'admin'`.

Se o documento não existir, o login cria um registro básico (`role: null`, `isActive: true`). A promoção (admin/ativo) continua exclusiva do painel administrativo.

---

## Padrões de código

- TypeScript estrito; evite `any`.
- Components funcionais usando hooks React.
- Tailwind + classes utilitárias, com tokens semânticos (`text-theme-primary`, etc.).
- Framer Motion para transições (evitar animações CSS complexas replicadas).
- Contextos (`AuthContext`, `LearnerContext`) encapsulam dados compartilhados.

---

## Scripts NPM

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o Vite em modo desenvolvimento |
| `npm run build` | `tsc -b` + build de produção Vite |
| `npm run preview` | Serve o build gerado |
| `npm run lint` | ESLint (config básica do projeto) |

---

## Próximos passos

- **Exportação PDF multi-página** — tratar CVs extensos sem corte.
- **Persistência local do currículo** — salvar rascunho em `localStorage`.
- **Templates adicionais** — variações de layout (Clássico/Compacto/Sidebar).
- **Painel de conteúdo** — adicionar métricas de acesso, filtragem avançada e categorização automática.
- **Audit logs** — registrar alterações críticas (promoção/desativação de usuários) em coleção separada.

---

## Contato

Dúvidas ou sugestões? Abra uma issue ou entre em contato com a equipe responsável pelo projeto.
