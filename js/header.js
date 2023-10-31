/*
Estilo Padrão
*/

// Criar novo elemento link
var styleBase = document.createElement("link");

// Definir atributos do styleBase
styleBase.href = "https://brasilia.comshalom.org/scss/styles.css";
styleBase.type = "text/css";
styleBase.rel = "stylesheet";

// Anexar o styleBase ao head da página
document.getElementsByTagName("head")[0].appendChild(styleBase);

/*
Bootstrap
*/

// Criar novo elemento link
var Bootstrap = document.createElement("link");

// Definir atributos do Bootstrap
Bootstrap.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
Bootstrap.type = "text/css";
Bootstrap.rel = "stylesheet";

// Anexar o Bootstrap ao head da página
document.getElementsByTagName("head")[0].appendChild(Bootstrap);

/* 

Fontes Google

*/
document.addEventListener('DOMContentLoaded', function() {
    var head = document.head;

    // Adiciona o link para o preconnect do Google Fonts
    var preconnectGoogleFonts = document.createElement("link");
    preconnectGoogleFonts.rel = "preconnect";
    preconnectGoogleFonts.href = "https://fonts.googleapis.com";
    head.appendChild(preconnectGoogleFonts);

    // Adiciona o link para o preconnect do Google Fonts Gstatic
    var preconnectGstatic = document.createElement("link");
    preconnectGstatic.rel = "preconnect";
    preconnectGstatic.href = "https://fonts.gstatic.com";
    preconnectGstatic.crossOrigin = "anonymous";
    head.appendChild(preconnectGstatic);

    // Adiciona o link da fonte Montserrat do Google Fonts
    var montserratFont = document.createElement("link");
    montserratFont.rel = "stylesheet";
    montserratFont.href = "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap";
    head.appendChild(montserratFont);
});

/* 

Favicon

*/
function getFaviconBasePath() {
    // Verificar se o usuário está na raiz do site
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        return 'favicon/';
    }
    // Caso contrário, retornar o caminho do favicon para subdiretórios
    return '../favicon/';
}

document.addEventListener('DOMContentLoaded', function() {
    var head = document.head;
    var basePath = getFaviconBasePath();

    var icon1 = document.createElement("link");
    icon1.rel = "apple-touch-icon";
    icon1.sizes = "180x180";
    icon1.href = basePath + "apple-touch-icon.png";
    head.appendChild(icon1);

    var icon2 = document.createElement("link");
    icon2.rel = "icon";
    icon2.type = "image/png";
    icon2.sizes = "32x32";
    icon2.href = basePath + "favicon-32x32.png";
    head.appendChild(icon2);

    var icon3 = document.createElement("link");
    icon3.rel = "icon";
    icon3.type = "image/png";
    icon3.sizes = "16x16";
    icon3.href = basePath + "favicon-16x16.png";
    head.appendChild(icon3);
});



/* 

Gtag

*/
(function() {
    // Carrega o script gtag.js
    var gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-QTBP5720DJ";
    
    document.head.appendChild(gtagScript);
  
    // Insere a parte de configuração gtag
    var inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
  
      gtag('config', 'G-QTBP5720DJ');
    `;
    
    document.head.appendChild(inlineScript);
  })();
  