const url = 'https://script.googleusercontent.com/macros/echo?user_content_key=-ob6xWTmxcinedQGiFaryOZIghjz6LviCGe4pM_3T4_0nfpIzYS_SzxwmCq94FYlGel548-tU_eypN2WTwRUaq1qBbus7keQm5_BxDlH2jW0nuo2oDemN9CCS2h10ox_1xSncGQajx_ryfhECjZEnOkNDv8y_ew8OxtJy1EtI55DmKT4bXWnITS8vlLCPLp_PIx0u8YcObM62PPlZaNH1y_8TmdKiCVK4pTAofONdLrjjhOifZ8R9dz9Jw9Md8uu&lib=M_TrEtwe5hDXdZ_Be2UfL8flUalP-BxzV';

var model = "<div class='col-md-6'>" +
  "<div class='card' data-key='{id}'>" +
  "<div class='card-body'>" +
  "<h4 class='card-title'>{produto}</h4>" +
  "<h4 class='card-subtitle preco'>{valor}</h4>" +
  "</div>" +
  "<div class='card-footer'>" +
  "<p class='card-text'>{descricao}</p>" +
  "<div class='btn-group' role='group' aria-label='Basic outlined example'>" +
  "<button type='button' class='btn btn-menos btn-outline-primary'>-</button>" +
  "<div class='btn btn-outline-primary quant'>0</div>" +
  "<button type='button' class='btn btn-mais btn-outline-primary'>+</button>" +
  "</div>" +
  "</div>" +
  "</div>" +
  "</div>";

// Mapear cada categoria aos elementos de lista correspondentes
var categoryLists = {
  comidas: $(".list-comidas"),
  doces: $(".list-doces"),
  bebidas: $(".list-bebidas"),
  kids: $(".list-kids")
};

$(".list-comidas").empty();
$(".list-doces").empty();
$(".list-bebidas").empty();
$(".list-kids").empty();

fetch(url)
  .then(rep => rep.json())
  .then((data) => {
    data.data.forEach((el) => {
      var line = model;
      line = line.replace("{id}", el.id);
      line = line.replace("{produto}", el.produto);
      line = line.replace("{descricao}", el.descricao);
      line = line.replace("{valor}", formatValor(el.valor));

      var categoryList = categoryLists[el.categoria]; // Obter a lista correspondente à categoria
      if (categoryList) {
        categoryList.append(line); // Inserir na lista correta se existir
      }

      var card = $(".card[data-key='" + el.id + "']");
      var quant = card.find(".quant");
      var valor = parseFloat(el.valor);
      var product = {
        id: el.id,
        valor: valor,
        qt: 0
      };
      cart.push(product);

      var preco = card.find(".preco");
      var btnGroup = card.find(".btn-group");

      if (!isValorDisponivel(el.valor)) {
        preco.addClass("d-none"); // Adicionar classe .d-none se o valor não estiver disponível
        btnGroup.addClass("d-none"); // Adicionar classe .d-none se o valor não estiver disponível
      }

      var btnMenos = card.find(".btn-menos");
      btnMenos.on("click", function () {
        if (product.qt > 0) {
          product.qt--;
          quant.text(product.qt);
        }
        atualizarCarrinho();
      });

      var btnMais = card.find(".btn-mais");
      btnMais.on("click", function () {
        product.qt++;
        quant.text(product.qt);
        atualizarCarrinho();
      });
    });

    // Remover o preloader após o carregamento dos dados
    $('.preloader').fadeOut(500);
  });

// Função para formatar o valor
function formatValor(valor) {
  if (typeof valor === 'number') {
    return valor.toFixed(2);
  } else {
    return "Valor não disponível";
  }
}

// Função para verificar se o valor está disponível
function isValorDisponivel(valor) {
  return typeof valor === 'number';
}
