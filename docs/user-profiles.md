# Cadastro manual de perfis de usuário

Este projeto mantém a coleção `users` como fonte única de permissões (cargo e status). Nenhum documento é criado automaticamente. Sempre que um novo login for habilitado, siga os passos abaixo para registrar o perfil no Firestore.

## Passo 1 — Criar o usuário no Firebase Authentication

1. Abra o console Firebase → *Authentication* → *Users* → **Add user**.
2. Informe e-mail e senha provisória.
3. Salve o `uid` gerado (será usado como ID do documento).

## Passo 2 — Criar o documento em `users`

1. Vá ao console → *Firestore Database* → coleção `users`.
2. Crie um documento com **ID exatamente igual ao `uid`** copiado.
3. Preencha os campos conforme a tabela:

| Campo      | Tipo      | Exemplo             | Obrigatório | Observações                                              |
| ---------- | --------- | ------------------- | ----------- | -------------------------------------------------------- |
| `uid`      | string    | `uB93…`             | Sim         | Mesmo valor do ID do documento                           |
| `email`    | string    | `nome@exemplo.com`  | Sim         | Sempre igual ao e-mail criado no Authentication          |
| `fullName` | string    | `Nome Sobrenome`    | Sim         | Nome completo exibido no dashboard                       |
| `role`     | string    | `admin`             | Opcional    | Use `admin` para dar acesso ao painel de gestão          |
| `isActive` | boolean   | `true`              | Opcional    | Defina `false` para bloquear login dessa conta           |
| `createdAt`| timestamp | Server Timestamp    | Opcional    | Use “Valor do servidor” para registrar a data de criação |
| `updatedAt`| timestamp | Server Timestamp    | Opcional    | Mesmo que acima                                          |

> Dica: para criar rapidamente, adicione todos os campos, selecione “**Server Timestamp**” em `createdAt` e `updatedAt` e salve.

## Passo 3 — Entregar credenciais

- Usuários comuns: mantenha `role` em branco (ou remova o campo) e `isActive` como `true`.
- Administradores: defina `role` como `admin`. Apenas contas com esse campo terão acesso às telas de gerenciamento.

Se o documento **não** existir ou `isActive` for `false`, o login será bloqueado com a mensagem “Conta sem perfil configurado / desativada”.

## Atualizações posteriores

- **Promover / desativar**: use o modal de “Gerenciar usuários” dentro do dashboard — as alterações são aplicadas em tempo real.
- **Excluir acesso**: remova o documento de `users` e, em seguida, apague o usuário correspondente em Authentication.

Com esse fluxo manual, apenas administradores conseguem criar ou promover perfis, mantendo a segurança das regras do Firestore.
