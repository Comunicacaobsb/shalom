
var cart = [];
const c = (el)=>document.querySelector(el);
const cs = (el)=>document.querySelectorAll(el);


function toggleCart() {
    c('.carrinho-infos').classList.toggle('show');
}

console

function atualizarCarrinho() {
    var totalCart = 0;
    cart.forEach(function(product) {
        if (product.qt > 0) {
            totalCart += product.qt * product.valor;
        }
    });
    $(".total-cart").text(totalCart.toFixed(2));
    if (totalCart > 0) {
        $(".carrinho-infos").addClass("show");
    } else {
        $(".carrinho-infos").removeClass("show");
    }
}
