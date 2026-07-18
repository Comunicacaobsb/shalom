/* =====================================================================
   SH-82 Café — DADOS MOCK (fallback local do cardápio)
   ---------------------------------------------------------------------
   Espelho EXATO do seed da migração:
     supabase/migrations/20260718100000_cardapio_permissoes.sql
   Enquanto a anon key não estiver preenchida em js/config.js (ainda está
   como "COLE_AQUI"), é ESTE arquivo que renderiza a página. Assim que o
   Supabase estiver configurado, js/menu.js troca este mock pelos dados
   reais das tabelas menu_categories / menu_products / settings(cafe_info).

   O shape aqui espelha as COLUNAS das tabelas para que a mesma lógica de
   normalização/render de menu.js sirva para os dois casos:
     • categorias: { id, slug, name, position, active }
     • produtos:   { id, category_id, slug, name, description, price,
                     image_url, position, active, weekdays, start_date,
                     end_date, badge }
   Para simplificar o vínculo produto↔categoria sem UUIDs, no mock usamos
   o próprio slug como "id" da categoria (category_id = slug). No banco os
   ids são UUIDs, mas o vínculo continua sendo por category_id, então o
   código de render é o mesmo.

   Numeração de weekdays: 0=domingo … 6=sábado (igual a EXTRACT(dow) do
   Postgres). null = disponível todos os dias.
   ===================================================================== */
(function () {
  "use strict";

  // -------------------------------------------------------------------
  // "Hoje" no fuso America/Sao_Paulo (formato YYYY-MM-DD), calculado no
  // aparelho. O seed usa current_date do servidor para o item "Só hoje"
  // (torta de limão). Aqui reproduzimos essa semântica calculando a data
  // local de São Paulo, para que o item continue aparecendo como "Só hoje"
  // no fallback — em vez de virar uma data fixa que ficaria sempre no
  // passado. en-CA já entrega a data no formato ISO (YYYY-MM-DD).
  // -------------------------------------------------------------------
  var HOJE_SP = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  window.SH82_MOCK = {
    // ---------- Categorias (positions 0,1,2) ----------
    categorias: [
      { id: "bebidas",  slug: "bebidas",  name: "Bebidas",  position: 0, active: true },
      { id: "salgados", slug: "salgados", name: "Salgados", position: 1, active: true },
      { id: "doces",    slug: "doces",    name: "Doces",    position: 2, active: true }
    ],

    // ---------- Produtos (mesmos slugs/nomes/preços/weekdays do seed) ----------
    produtos: [
      // Bebidas
      {
        id: "espresso", category_id: "bebidas", slug: "espresso", name: "Espresso",
        description: "Espresso curto e encorpado, torra média da casa.",
        price: 6.00, image_url: null, position: 0, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      },
      {
        id: "cappuccino", category_id: "bebidas", slug: "cappuccino", name: "Cappuccino",
        description: "Espresso, leite vaporizado e espuma cremosa.",
        price: 12.00, image_url: null, position: 1, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      },
      {
        id: "cafe-coado", category_id: "bebidas", slug: "cafe-coado", name: "Café coado",
        description: "Coado na hora com grãos selecionados.",
        price: 7.00, image_url: null, position: 2, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      },
      {
        id: "chocolate-quente", category_id: "bebidas", slug: "chocolate-quente", name: "Chocolate quente",
        description: "Chocolate belga cremoso com raspas de cacau. Especial de meio de semana.",
        price: 14.00, image_url: null, position: 3, active: true,
        weekdays: [2, 3, 4], start_date: null, end_date: null, badge: null
      },

      // Salgados
      {
        id: "pao-de-queijo", category_id: "salgados", slug: "pao-de-queijo", name: "Pão de queijo",
        description: "Assado na hora, casca crocante e recheio macio.",
        price: 8.00, image_url: null, position: 0, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      },
      {
        id: "coxinha-de-frango", category_id: "salgados", slug: "coxinha-de-frango", name: "Coxinha de frango",
        description: "Recheio cremoso de frango desfiado com catupiry.",
        price: 9.00, image_url: null, position: 1, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      },
      {
        id: "quiche-alho-poro", category_id: "salgados", slug: "quiche-alho-poro", name: "Quiche de alho-poró",
        description: "Massa amanteigada com recheio de alho-poró. Só às segundas.",
        price: 16.00, image_url: null, position: 2, active: true,
        weekdays: [1], start_date: null, end_date: null, badge: null
      },
      {
        id: "empada-de-palmito", category_id: "salgados", slug: "empada-de-palmito", name: "Empada de palmito",
        description: "Palmito pupunha ao molho branco. (Fora de linha no momento.)",
        price: 10.00, image_url: null, position: 3, active: false,
        weekdays: null, start_date: null, end_date: null, badge: null
      },

      // Doces
      {
        id: "bolo-de-cenoura", category_id: "doces", slug: "bolo-de-cenoura", name: "Fatia de bolo de cenoura",
        description: "Bolo fofinho com cobertura de brigadeiro.",
        price: 11.00, image_url: null, position: 0, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      },
      {
        id: "brigadeiro-gourmet", category_id: "doces", slug: "brigadeiro-gourmet", name: "Brigadeiro gourmet",
        description: "Brigadeiro de colher com chocolate 55%.",
        price: 5.00, image_url: null, position: 1, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      },
      {
        // Seed: start_date = end_date = current_date, badge "Só hoje".
        // Reproduzimos com a data de hoje em São Paulo (ver HOJE_SP acima).
        id: "torta-de-limao", category_id: "doces", slug: "torta-de-limao", name: "Torta de limão do dia",
        description: "Base crocante, creme de limão siciliano e merengue maçaricado.",
        price: 13.00, image_url: null, position: 2, active: true,
        weekdays: null, start_date: HOJE_SP, end_date: HOJE_SP, badge: "Só hoje"
      },
      {
        id: "cheesecake-frutas-vermelhas", category_id: "doces", slug: "cheesecake-frutas-vermelhas",
        name: "Cheesecake de frutas vermelhas",
        description: "Cremoso com calda de frutas vermelhas.",
        price: 15.00, image_url: null, position: 3, active: true,
        weekdays: null, start_date: null, end_date: null, badge: null
      }
    ],

    // ---------- settings/cafe_info (mesmo objeto do seed) ----------
    cafe_info: {
      nome: "SH-82 Café",
      subtitulo: "",
      endereco: "",
      instagram: "",
      whatsapp: "",
      aviso: ""
    }
  };
})();
