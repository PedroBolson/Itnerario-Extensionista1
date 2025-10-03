# Cadastro manual de usuários administradores

Para manter o controle de cargos apenas via administradores, o app **não** cria documentos automaticamente na coleção `users`. Sempre que um novo acesso for criado no Firebase Authentication, siga estes passos para liberar o login no painel:

1. **Criar o usuário no Firebase Authentication**
   - Vá em *Authentication → Users → Add user*.
   - Informe email e senha provisória.
   - Copie o `uid` gerado; ele será usado como ID do documento no Firestore.

2. **Criar o documento na coleção `users`**
   - Acesse *Firestore Database → users*.
   - Crie um documento com **ID exatamente igual ao `uid`** copiado no passo anterior.
   - Preencha os campos abaixo:

     | Campo      | Tipo      | Exemplo                 | Observações                          |
     | ---------- | --------- | ----------------------- | ------------------------------------ |
     | `uid`      | string    | `uB93…`                 | Mesmo valor do ID do documento       |
     | `email`    | string    | `nome@exemplo.com`      | Email cadastrado no Authentication   |
     | `fullName` | string    | `Nome Sobrenome`        | Nome completo exibido no painel      |
     | `role`     | string    | `admin` ou deixar vazio | Use `admin` somente para administradores |
     | `isActive` | boolean   | `true`                  | Defina `false` para bloquear o login |
     | `createdAt`| timestamp | `Server Timestamp`      | Opcional, mas recomendado            |
     | `updatedAt`| timestamp | `Server Timestamp`      | Opcional, mas recomendado            |

3. **Compartilhar as credenciais**
   - Para usuários comuns, mantenha `role` em branco (ou `null`) e `isActive` como `true`.
   - Para administradores, defina `role` como `admin`. Apenas contas com esse valor verão as telas de gestão de usuários.

> ⚠️ Caso o documento não exista, o login será bloqueado com a mensagem “Conta sem perfil configurado. Entre em contato com um administrador”.

## Atualização ou remoção de usuários

- **Alterar cargo ou ativar/desativar**: use o painel de “Gerenciar Usuários” dentro do dashboard (somente administradores visualizam essa opção).
- **Excluir conta por completo**: além de remover o documento em `users`, exclua o usuário correspondente no Firebase Authentication para revogar o acesso totalmente.

Mantendo esse fluxo manual garantimos que apenas administradores conseguem promover contas ou reativar acessos, sem expor endpoints adicionais.
