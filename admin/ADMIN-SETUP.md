# Painel de administração — Comunidade Shalom Brasília (repo-wide)

Área logada **compartilhada por todo o repositório**. Um único painel (`/admin/`)
edita o conteúdo de qualquer página (Asa Sul, Taguatinga, Santa Maria, …), com
**escopo por página** (cada página só vê o seu conteúdo). Usa Supabase (login +
banco + imagens, plano gratuito). O site continua no GitHub Pages.

Enquanto o Supabase não estiver configurado, cada página funciona com os dados de
exemplo do seu `js/data.js` — nada quebra.

## Estrutura
```
/
├── js/
│   ├── config.js     → credenciais do Supabase (compartilhado)
│   ├── store.js      → camada de dados por página (window.SHALOM_SITE)
│   ├── share.js      → compartilhar evento (compartilhado)
│   ├── header.js, footer.js, cev-data.js  (já existiam)
├── admin/
│   ├── index.html    → painel único (login + seletor de página)
│   ├── admin.js / admin.css
│   ├── supabase-setup.sql
│   └── ADMIN-SETUP.md (este arquivo)
├── asasul/  (index.html, evento.html, js/main.js, js/data.js, js/evento.js, e/…)
├── taguatinga/  santamaria/  …  (mesmo padrão)
```

## 1. Configurar o Supabase (uma vez)
1. Em **Project Settings → API**, copie a **anon public** e cole em `js/config.js`
   (a Project URL já está lá). A chave anon é pública — pode ir para o GitHub.
2. Em **SQL Editor → New query**, cole todo o `admin/supabase-setup.sql` e **Run**.
   Cria `sites`, `events`, `settings` (com escopo por página), o RLS e o bucket `eventos`.
3. Em **Authentication → Users → Add user**, crie os editores (e-mail + senha).
   Em **Authentication → Sign In / Providers**, **desative** o cadastro público.
4. Commit + push. Painel em `https://brasilia.comshalom.org/admin/`.

## 2. Como usar
Acesse `/admin/`, entre, e **escolha a página** no seletor do topo. Depois:
- **Eventos:** criar/editar/excluir, upload de imagem, texto curto (card),
  descrição completa (títulos/listas/negrito), link de inscrição, publicar/rascunho,
  ordem no carrossel. Vale só para a página selecionada.
- **Horários & Serviços:** um campo por categoria, uma linha = um item.

As mudanças aparecem na respectiva página em tempo real.

## 3. Ligar uma página nova (ex.: Taguatinga)
1. No painel, o site já pode existir (registre em `sites` via o SQL, ou adicione
   uma linha: `insert into sites (id,name) values ('taguatinga','Shalom Taguatinga');`).
2. Na página nova, no HTML, antes dos scripts compartilhados:
   ```html
   <script>window.SHALOM_SITE = "taguatinga";</script>
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="../js/config.js"></script>
   <script src="js/data.js"></script>      <!-- fallback local (opcional) -->
   <script src="../js/store.js"></script>
   <script src="../js/share.js"></script>
   <script src="js/main.js"></script>
   ```
3. Use os mesmos IDs de campos de horários (`field-funcionamento`, `field-missa`,
   `field-adoracao`, `field-aconselhamento`, `field-grupos`, `field-servicos`) e o
   mesmo `#comshalom-list` / carrossel. Pronto — o painel já edita essa página.

## 4. Compartilhar + prévia (og:image do evento)
Cada página tem `scripts/build-event-pages.mjs`, que gera `<pagina>/e/<slug>/index.html`
com a `og:image` do evento no HTML (o WhatsApp/Facebook não executam JS). Rode, dentro
da pasta da página, sempre que mudar os eventos do `data.js`:
```
node scripts/build-event-pages.mjs
```
> Para eventos gerenciados pelo Supabase, a prévia com a arte exige regerar essas
> páginas (ou usar um Cloudflare Worker que injeta a og:image na hora). Posso montar
> qualquer uma quando você quiser.

## 5. Próximo passo — níveis de acesso
Hoje a regra é "qualquer pessoa logada = editor". Para uma **área de membros** com
papéis (membro / líder / coordenador / admin) e permissão por página, o caminho é uma
tabela `profiles` (papel guardado no banco, não editável pelo usuário) + função
`SECURITY DEFINER` de checagem + políticas RLS por nível. Fica pronto para ativar
quando você quiser expandir.

## Observação
Os antigos `asasul/js/config.js`, `asasul/js/store.js`, `asasul/js/share.js` e
`asasul/admin/` viraram ponteiros (não deu para removê-los automaticamente).
Podem ser apagados manualmente com segurança — nada mais os usa. O mesmo vale para
`js/_rmtest.txt`, se existir.
