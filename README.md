## Shalom Brasília — Site estático e páginas especiais

Repositório de páginas estáticas para iniciativas e eventos da missão Shalom Brasília. O código é HTML/CSS/JS puro, pensado para hospedagem simples (GitHub Pages) com domínio customizado.

### Principais características
- **Site estático**: sem build ou dependências locais obrigatórias.
- **Cabeçalho dinâmico** via `js/header.js`:
  - Carrega Bootstrap CSS (CDN), Google Fonts (Montserrat), favicons e folha `scss/styles.css` automaticamente, ajustando caminhos entre raiz e subpastas.
  - Injeta Google Analytics (G-YXNT4YQP1H).
- **Carregador de scripts** via `js/centralScript.js`:
  - Injeta jQuery, Popper e Bootstrap Bundle (CDNs). É possível desabilitar por página definindo variáveis globais (`var jquery = false; var popper = false; // var bootstrap = false;`).
- **SCSS incluído**: folhas `.scss` e versões compiladas `.css` já presentes (não há pipeline de build). Paleta em `scss/colors.scss` e utilitários em `scss/styles.scss`.
- **CNAME** configurado para domínio customizado.

### Estrutura do repositório
- Raiz
  - `index.html`: página “Em breve”.
  - `js/`: scripts compartilhados
    - `header.js`: CSS/Fonts/Favicon/Analytics dinâmicos.
    - `centralScript.js`: injeção de jQuery/Popper/Bootstrap.
  - `scss/`: estilos globais (SCSS e compilados `styles.css`).
  - `images/`, `favicon/`: imagens e ícones.
  - `CNAME`: domínio customizado da publicação.
- Subprojetos
  - `semanasanta/`: site do evento Semana Santa 2024
    - Usa Bootstrap 5, jQuery, folhas `sass/styles.css` e `sass/style-pages.css` próprias.
    - Menu e rodapé carregados via jQuery (`#menu` e `#footer`).
    - Mapa Google Maps incorporado via `<iframe>`.
  - `futsh/`: página de inscrições “Fut SH”
    - CTA para formulários (Mensalista/Avulso).
    - Botões de copiar PIX para área de transferência com toast do Bootstrap.
    - Dados de ranking em `assets/ranking.js` (JSON embutido).
  - `kyrios/`: Orações Eucarísticas (novo missal)
    - Abas com Bootstrap Pills, barra “sticky” simulada por JS.
    - Estilos dedicados em `kyrios/scss/style-page.css`.
  - `asasul/`: página da Asa Sul
    - Embeda `https://bento.me/shalomasasul` em `<iframe>`.
  - `taguatinga/`: site do CEV Taguatinga
    - Seções: horários, serviços, doações (PIX com copiar), contatos, localização e calendários.
    - Links úteis: Calendário de vigílias e calendário da missão (Google Calendar embed).

### Como desenvolver localmente
Não há dependências. Basta abrir os arquivos HTML no navegador.

Sugestão (opcional) para live reload:
1. Use a extensão “Live Server” (VS Code) ou um servidor estático simples.
2. Abra a raiz do projeto e navegue até as páginas:
   - Raiz: `/index.html`
   - Semana Santa: `/semanasanta/index.html`
   - Fut SH: `/futsh/index.html`
   - Kyrios: `/kyrios/oracoes-eucaristicas.html` e `/kyrios/novomissal.html`
   - Asa Sul: `/asasul/index.html`

Observações importantes:
- `js/header.js` detecta automaticamente se a página está na raiz ou em subpastas para resolver caminhos de `favicon/` e `scss/`.
- Se desativar alguma biblioteca no `centralScript.js`, defina as variáveis antes de importar o script (veja exemplos em `futsh/index.html` e `kyrios/novomissal.html`).

### Como criar uma nova página
1. Crie um arquivo HTML na pasta apropriada.
2. No `<head>`, importe o cabeçalho dinâmico conforme a profundidade:
   - Na raiz: `<script src="js/header.js"></script>`
   - Em subpastas: `<script src="../js/header.js"></script>`
3. Se precisar de JS do Bootstrap/jQuery, importe `../js/centralScript.js` (ou `js/centralScript.js` na raiz) e, opcionalmente, desative libs indesejadas definindo `var jquery = false; var popper = false;` antes do import.
4. Use classes utilitárias definidas em `scss/styles.css` e a paleta de cores de `scss/colors.css` conforme necessário.

### Publicação (GitHub Pages)
Este repositório está pronto para GitHub Pages:
- A publicação pode apontar para a branch `main` e a pasta raiz.
- O arquivo `CNAME` define o domínio customizado. Para trocar o domínio:
  - Atualize o conteúdo de `CNAME` para o novo domínio.
  - Ajuste o DNS do domínio (registro CNAME para o host do GitHub Pages do repositório).

### SEO e Meta
- Páginas incluem metatags Open Graph (título, descrição, imagem) específicas por seção (ex.: Fut SH e Semana Santa).
- Favicons são injetados via `js/header.js`, com caminhos relativos corretos para raiz e subpastas.

### Analytics
- `js/header.js` injeta Google Analytics (G‑YXNT4YQP1H). A pasta `semanasanta/` também possui uma tag própria (`G‑J2S6TM4YRH`).

### Licença
Não há arquivo de licença explícito no repositório. Caso precise definir uma licença, adicione um `LICENSE` na raiz.


