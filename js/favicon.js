function getFaviconBasePath() {
    // Por exemplo, se a página atual estiver em algum subdiretório
    // você pode retornar um caminho diferente.
    if (window.location.pathname.includes('subdiretorio')) {
        return '../favicon/';
    }
    return 'favicon/';
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
