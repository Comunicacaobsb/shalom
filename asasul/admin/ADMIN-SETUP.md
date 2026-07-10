# Painel de administração — Shalom Asa Sul

Área logada para a comunidade gerenciar **horários, serviços e eventos** da página.
Usa **Supabase** (login + banco + imagens, plano gratuito) e o site continua no GitHub Pages.

Enquanto o Supabase não estiver configurado, o site funciona normalmente com os dados
de exemplo de `js/data.js` — nada quebra.

---

## 1. Criar o projeto no Supabase (uma vez)

1. Acesse <https://supabase.com> → crie uma conta → **New project**.
2. Dê um nome, defina uma senha do banco e escolha a região (South America / São Paulo).
3. Espere ~2 min o projeto subir.

## 2. Criar as tabelas e permissões

1. No projeto, abra **SQL Editor** → **New query**.
2. Cole todo o conteúdo de [`supabase-setup.sql`](supabase-setup.sql) e clique em **Run**.
   Isso cria as tabelas `events` e `settings`, as regras de segurança (RLS) e o
   bucket de imagens `eventos`.

## 3. Conectar o site ao Supabase

1. No Supabase, vá em **Project Settings → API**.
2. Copie **Project URL** e a chave **anon public**.
3. Abra `asasul/js/config.js` e cole nos campos:
   ```js
   window.SHALOM_SUPABASE = {
     url:     "https://xxxxxxxx.supabase.co",
     anonKey: "eyJhbGciOi...."
   };
   ```
   > A chave *anon* é pública por natureza — pode ir para o repositório sem problema.
   > Quem protege a edição é o RLS (só usuários logados escrevem).

## 4. Criar os editores (2–5 pessoas)

1. Supabase → **Authentication → Users → Add user**.
2. Informe **e-mail e senha** de cada líder que vai editar. (Ou use *Invite*.)
3. **Importante:** em **Authentication → Sign In / Providers**, **desative** a opção de
   cadastro público ("Allow new users to sign up"), para que só os convidados entrem.

## 5. Publicar

Faça `commit` e `push`. O painel fica em:

```
https://brasilia.comshalom.org/asasul/admin/
```

---

## Como os editores usam

Acesse `/asasul/admin/`, entre com e-mail e senha.

**Aba Eventos**
- **Novo evento** ou lápis para editar. Campos: título, etiqueta, data, local,
  **imagem** (botão *Enviar imagem*), **texto curto** (aparece no card) e
  **descrição completa** com títulos, listas e negrito (aparece no "Saiba mais").
- **Link de inscrição**: preencha texto + URL (WhatsApp, formulário…). Deixe vazio se não houver.
- **Situação**: *Publicado* (aparece no site) ou *Rascunho* (oculto).
- Setas ↑↓ mudam a ordem no carrossel. A lixeira exclui.
- Todo evento tem sempre o botão **"Saiba mais"**, que abre `evento.html?id=slug`.

**Aba Horários & Serviços**
- Um campo por categoria; **uma linha = um item**. Clique em **Salvar horários**.

As mudanças aparecem no site na hora (a página lê os dados em tempo real).

---

## Estrutura técnica

```
asasul/
├── js/config.js     → credenciais do Supabase (você preenche)
├── js/store.js      → camada de dados (Supabase + fallback para data.js)
├── js/data.js       → dados de exemplo (fallback antes do Supabase)
├── admin/
│   ├── index.html    → tela de login + painel
│   ├── admin.js      → lógica (auth, edição, upload)
│   ├── admin.css     → estilo do painel
│   └── supabase-setup.sql → cria tabelas, RLS e bucket
```

Dados: tabela `events` (um registro por evento) e tabela `settings`
(registro `schedules` com o JSON dos horários). Imagens no bucket público `eventos`.
