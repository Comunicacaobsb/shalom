function loadScripts() {
    var scripts = {
        jquery: {url: "https://code.jquery.com/jquery-3.7.1.min.js", load: true},
        popper: {url: "https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js", load: true},
        bootstrap: {url: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js", load: true}
    };

    for (var key in scripts) {
        // Se a variável correspondente for true ou não estiver definida, carrega o script
        if (window[key] !== false && scripts[key].load) {
            var script = document.createElement("script");
            script.src = scripts[key].url;
            document.body.appendChild(script);
        }
    }
}

loadScripts();


// function loadScripts() {
//     var scripts = {
//         jquery: {url: "https://code.jquery.com/jquery-3.7.1.min.js", load: true},
//         popper: {url: "https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js", load: true},
//         bootstrap: {url: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js", load: true}
//     };

//     for (var key in scripts) {
//         if (scripts[key].load) {
//             var script = document.createElement("script");
//             script.src = scripts[key].url;
//             script.async = true;

//             script.onload = function() {
//                 console.log(key + ' carregado com sucesso.');
//             };

//             script.onerror = function() {
//                 console.error('Erro ao carregar ' + key);
//             };

//             document.body.appendChild(script);
//         }
//     }
// }

// loadScripts();

