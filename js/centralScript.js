function loadScripts() {
    var scripts = {
        jquery: "https://code.jquery.com/jquery-3.7.1.min.js",
        bootstrap: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js../script/bootstrap.bundle.min.js"
    };
    

    for (var key in scripts) {
        // Se a variável correspondente for true, carrega o script
        if (window[key]) {
            var script = document.createElement("script");
            script.src = scripts[key];
            document.body.appendChild(script);
        }
    }
}

loadScripts();
