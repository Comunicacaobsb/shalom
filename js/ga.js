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
