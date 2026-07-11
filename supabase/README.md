# Supabase por commit (integração GitHub)

Com esta pasta `supabase/` no repositório, o Supabase cria/atualiza as tabelas,
RLS e o bucket **automaticamente a cada push na branch de produção** (`main`).

```
supabase/
├── config.toml                         → id do projeto
└── migrations/
    └── 20260710120000_init_shalom.sql  → cria tudo (sites, events, settings, RLS, storage)
```

## O que você configura no painel do Supabase (uma vez)

1. **Project Settings → Integrations → GitHub Integration → Authorize GitHub.**
2. Autorize e **escolha este repositório** (o projeto já está vinculado).
3. **Working directory:** deixe `.` (a pasta `supabase/` está na raiz do repo).
4. Ligue as opções:
   - **Deploy to production** — aplica as migrações ao dar push/merge na `main`. (essencial)
   - **Automatic branching** (opcional) — cria uma branch de teste do banco a cada PR.
5. **Enable integration.**

Depois disso, **é só commitar e dar push na `main`** — o Supabase roda a migração e
cria as tabelas. Deu certo quando `sites`, `events` e `settings` aparecem em
**Table Editor** e o bucket `eventos` em **Storage**.

## O que continua manual (o Supabase não faz por migração)

Por segurança, a integração **ignora Auth/API** ao deployar em produção. Então:

1. **Anon key no site:** cole a chave `anon public` (Project Settings → API) em
   `js/config.js`. Sem ela o site não conecta.
2. **Criar editores:** Authentication → Users → Add user (e-mail + senha).
3. **Desativar cadastro público:** Authentication → Sign In / Providers → desligar
   "Allow new users to sign up" (só os convidados entram).

## Mudanças futuras no banco

Nunca edite uma migração já aplicada. Para uma mudança nova, **crie um arquivo novo**
em `migrations/` com timestamp maior, ex.: `20260815090000_membros.sql`. No próximo
push, o Supabase aplica só o que estiver pendente.

> Dica de segurança: no GitHub, ative o "required check" da integração Supabase
> (Settings → Branches) para impedir merge quando uma migração falhar.
