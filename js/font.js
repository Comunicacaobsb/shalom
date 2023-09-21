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
