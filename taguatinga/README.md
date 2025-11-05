# Shalom Taguatinga — Documentação

Página web moderna estilo link-in-bio para o Centro de Evangelização Shalom Taguatinga, desenvolvida com HTML, CSS e JavaScript puro.

## 📋 Visão Geral

Site estático responsivo que apresenta informações sobre horários, serviços, doações, localização e notícias do CEV Taguatinga. O design segue estética moderna tipo Notion/Linktree com elementos de Material UI, incluindo glassmorphism, blur effects, gradientes e sombras suaves.

## 🎨 Características do Design

- **Fonte**: Montserrat (Google Fonts)
- **Cor primária**: `#204f8c` (azul institucional)
- **Estilo**: Glassmorphism, blur effects, gradientes radiais no background
- **Responsividade**: Layout adaptável (mobile-first)
- **Efeitos visuais**:
  - Hero com imagem de fundo e overlay em gradiente
  - Cards com backdrop-filter blur
  - Botões em pills com glassmorphism
  - Card hero para "Grupos de oração" com imagem de fundo desfocada

## 📁 Estrutura de Arquivos

```
taguatinga/
├── index.html          # Página principal
├── images/
│   ├── hero.jpg        # Imagem do hero (banner principal)
│   └── grupos-oracao.jpg  # Imagem para card de grupos de oração
└── README.md           # Esta documentação
```

## 🔧 Dependências

A página utiliza scripts compartilhados da raiz do projeto:

- `../js/header.js` — Carrega Bootstrap, Google Fonts, favicons e Analytics
- `../js/centralScript.js` — Carrega jQuery, Popper e Bootstrap Bundle (CDN)
- Bootstrap 5.3.2 (via CDN)
- Google Fonts — Montserrat

## 📱 Seções da Página

### 1. Hero Section
- **Imagem de fundo**: `images/hero.jpg`
- **Botões principais** (grid 2 colunas no desktop):
  - WhatsApp (link direto via `wa.me`)
  - Como chegar (âncora para seção de mapa)
  - Instagram
  - Horários e Missas
  - Comunhão de bens
  - Calendários
  - Comshalom (link para site institucional)

### 2. Horários
Cards em grid de 3 colunas (`col-md-4`):
- **Funcionamento**: Seg a sáb: 14h às 22h
- **Missas**: Segunda 18h30, Domingo 10h
- **Adoração**: Seg a sex: 14h30 às 21h

### 3. Grupos de Oração
- Card hero com imagem de fundo (`images/grupos-oracao.jpg`)
- Estilo: imagem desfocada com overlay e texto branco
- Lista de grupos:
  - Grupo de casais: sáb 17h
  - Quinta da paz: qui 19h30
  - Grupo jovem: sáb 14h30

### 4. Oração e Aconselhamento / Serviços
Cards lado a lado (`col-md-6`):
- Oração e aconselhamento: Seg a sex: 14h30 às 21h
- Serviços: Bazar, Livraria, Lanchonete (seg a sáb 14h às 21h)

### 5. Comunhão de Bens
Card com dois blocos de doação:
- **10%**: Transferência BB + PIX (`economatotaguatinga@comshalom.org`)
- **5%**: Transferência BB + PIX (`secomunitariabrasilia@comshalom.org`)

**Recursos**:
- Chaves PIX em blocos de código estilizados
- Botões de copiar com ícone SVG
- Toast notification ao copiar

### 6. Localização e Notícias
Cards lado a lado (`col-md-6`):
- **Localização**: Google Maps embed + botão "Abrir no Google Maps"
- **Avisos e Notícias** (card único):
  - **Avisos**: RSS feed do Blogger (`shalomtaguatinga.blogspot.com`)
  - **Últimas notícias**: RSS feed do Comshalom (`comshalom.org/feed`)

**Recursos**:
- Carregamento dinâmico via JavaScript
- Proxy CORS para evitar bloqueios de CORS
- Exibe apenas 2 itens mais recentes de cada feed

### 7. Calendários
Tabs com Bootstrap Pills:
- **Vigílias**: Link para calendário externo
- **Missão** (padrão): Google Calendar embed

### 8. Instagram
- Embed do Instagram do CEV Taguatinga
- Botão "Abrir perfil"

### 9. Footer
- Texto: "Shalom Taguatinga 2026, todos os direitos reservados. Problemas? chama na DM do insta: @tomina.ga"

## 🎯 Funcionalidades JavaScript

### 1. Copiar PIX
```javascript
// Botões de copiar PIX com toast notification
document.querySelectorAll('.copy-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var targetId = this.getAttribute('data-target');
    var code = document.getElementById(targetId);
    if(code){ copyText(code.textContent.trim()); }
  });
});
```

### 2. Carregar Avisos (Blogger RSS)
```javascript
async function carregarAvisos(){
  // Usa proxy CORS: api.allorigins.win
  // Feed: https://shalomtaguatinga.blogspot.com/feeds/posts/default?alt=json
  // Exibe 2 itens mais recentes
}
```

### 3. Carregar Notícias Comshalom (RSS)
```javascript
async function carregarNoticiasComShalom(){
  // Usa proxy CORS: api.allorigins.win
  // Feed: https://comshalom.org/feed
  // Exibe 2 itens mais recentes
}
```

## 🎨 Classes CSS Principais

### Hero
- `.hero` — Container do hero com overflow hidden
- `.hero-img` — Imagem do hero
- `.hero::after` — Overlay em gradiente
- `.hero-content` — Conteúdo sobreposto (z-index: 1)

### Cards
- `.card` — Card padrão com glassmorphism
- `.card-hero` — Card com imagem de fundo (Grupos de oração)
- `.card-hero-bg` — Imagem de fundo com blur
- `.card-hero-content` — Conteúdo sobreposto no card hero

### Botões
- `.link-btn` — Botão pill com glassmorphism
- `.link-btn.primary` — Botão primário com gradiente azul

### Utilitários
- `.title-icon` — Título com ícone SVG
- `.codeblock` — Bloco de código estilizado (PIX)
- `.copy-btn` — Botão de copiar com ícone

## 🔗 Links e URLs

### Externos
- **WhatsApp**: `https://wa.me/556184888904`
- **Instagram**: `https://instagram.com/shalomtaguatinga`
- **Comshalom Brasília**: `https://comshalom.org/brasilia`
- **Google Maps**: `https://g.co/kgs/ySgKBL`
- **Calendário Vigílias**: `https://vigiliash.web.app/app/pages/home.html?t=...`
- **Calendário Missão**: Google Calendar embed (ID: `n9c03lrse3tl4uvt381d3is5jo`)

### Feeds RSS
- **Avisos**: `https://shalomtaguatinga.blogspot.com/feeds/posts/default?alt=json`
- **Notícias**: `https://comshalom.org/feed`

## 📝 Como Modificar

### Atualizar Horários
Edite a seção `#horarios` em `index.html`:
```html
<div class="col-12 col-md-4">
  <div class="card h-100">
    <div class="card-body">
      <h5 class="card-title title-icon">...</h5>
      <ul class="list-unstyled mb-0">
        <li>Novo horário aqui</li>
      </ul>
    </div>
  </div>
</div>
```

### Trocar Imagem do Hero
1. Substitua `images/hero.jpg`
2. Mantenha o mesmo nome ou atualize o `src` no HTML

### Atualizar Chaves PIX
Edite os elementos `<code>` com IDs `pix-10` e `pix-5`:
```html
<code id="pix-10">nova-chave-pix@email.com</code>
```

### Modificar Cores
Edite as variáveis CSS no `:root`:
```css
:root{
  --brand:#204f8c;      /* Cor primária */
  --brand-2:#3b74c4;   /* Cor secundária (gradiente) */
  --bg:#f6f7fb;         /* Background */
  --text:#0f172a;       /* Texto principal */
  --muted:#6b7280;      /* Texto secundário */
  --card:rgba(255,255,255,0.72); /* Cards (transparência) */
  --border:#e5e7eb;     /* Bordas */
}
```

### Adicionar Novo Card
Use a estrutura base:
```html
<div class="col-12 col-md-6">
  <div class="card h-100">
    <div class="card-body">
      <h5 class="card-title title-icon">
        <svg class="icon" viewBox="0 0 24 24">...</svg>
        Título
      </h5>
      <!-- Conteúdo -->
    </div>
  </div>
</div>
```

## 🚀 Deploy

O projeto está pronto para GitHub Pages:
- Publique a branch `main` com a pasta raiz
- O arquivo `CNAME` na raiz define o domínio customizado
- Acesse via: `https://brasilia.comshalom.org/taguatinga/`

## 📊 SEO

A página inclui:
- Meta tags Open Graph completas
- Meta tags Twitter Card
- JSON-LD (Organization schema)
- Canonical URL
- Robots meta tag
- Theme color

## 🐛 Troubleshooting

### Feeds não carregam
- Verifique se os feeds estão acessíveis
- O proxy CORS pode estar temporariamente indisponível
- Verifique o console do navegador para erros

### Imagens não aparecem
- Verifique os caminhos: `images/hero.jpg` e `images/grupos-oracao.jpg`
- Certifique-se de que os arquivos existem na pasta `taguatinga/images/`

### Botões de copiar não funcionam
- Verifique se o Bootstrap está carregado (via `centralScript.js`)
- O toast notification depende do Bootstrap 5

## 📄 Licença

Este projeto faz parte do repositório Shalom Brasília. Consulte a licença do repositório principal.

---

**Última atualização**: 2026  
**Mantenedor**: Equipe Shalom Taguatinga

