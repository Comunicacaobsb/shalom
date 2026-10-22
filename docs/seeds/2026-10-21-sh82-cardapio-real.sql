-- SH82 · Asa Sul · troca do cardápio fictício (julho) pelos itens da arte "Cardápio semanal".
-- Cópia do que existia antes: 2026-10-21-sh82-mock-antes-da-troca.json (mesma pasta).
-- Categorias: reaproveita as três existentes (Doces vira "Especial do dia" e sobe para o topo).
-- Domingo ("Sobremesas após a Santa Missa") não tem item nem preço na arte: entra como aviso no topo.

begin;

-- 1. Remove os 12 produtos fictícios
delete from menu_products where site = 'sh82cafe';

-- 2. Categorias: Especial do dia, Salgados, Bebidas
update menu_categories set slug = 'especial-do-dia', name = 'Especial do dia', position = 0, active = true
 where id = 'c3d01056-4eb0-4d55-860c-732986356ea3';
update menu_categories set position = 1 where id = '2b02a781-b0da-4f5c-b4fb-53a1915ca756'; -- Salgados
update menu_categories set position = 2 where id = '41b38b6f-3aa6-4b29-b9cf-f9102b2df2b7'; -- Bebidas

-- 3. Itens da arte (weekdays: 0 = domingo … 6 = sábado; null = todos os dias)
insert into menu_products (site, category_id, slug, name, description, price, position, active, weekdays) values
 ('sh82cafe','c3d01056-4eb0-4d55-860c-732986356ea3','sanduiche-natural','Sanduíche natural',null,10.00,0,true,'{1}'),
 ('sh82cafe','c3d01056-4eb0-4d55-860c-732986356ea3','tapioca','Tapioca','A partir de R$ 5,00.',5.00,1,true,'{3}'),
 ('sh82cafe','c3d01056-4eb0-4d55-860c-732986356ea3','pao-de-queijo-na-chapa','Pão de queijo na chapa',null,15.00,2,true,'{4}'),
 ('sh82cafe','c3d01056-4eb0-4d55-860c-732986356ea3','empada-de-palmito','Empada de palmito',null,6.90,3,true,'{5}'),
 ('sh82cafe','c3d01056-4eb0-4d55-860c-732986356ea3','quiche-de-alho-poro','Quiche de alho-poró',null,6.90,4,true,'{5}'),
 ('sh82cafe','c3d01056-4eb0-4d55-860c-732986356ea3','pao-com-ovo','Pão com ovo',null,6.00,5,true,'{5}'),
 ('sh82cafe','c3d01056-4eb0-4d55-860c-732986356ea3','milkshake','Milkshake',null,15.00,6,true,'{6}'),
 ('sh82cafe','2b02a781-b0da-4f5c-b4fb-53a1915ca756','salgados-variados','Salgados variados',null,6.90,0,true,null),
 ('sh82cafe','2b02a781-b0da-4f5c-b4fb-53a1915ca756','pao-de-queijo','Pão de queijo',null,3.50,1,true,null),
 ('sh82cafe','41b38b6f-3aa6-4b29-b9cf-f9102b2df2b7','cafe','Café',null,3.00,0,true,null),
 ('sh82cafe','41b38b6f-3aa6-4b29-b9cf-f9102b2df2b7','agua','Água',null,3.00,1,true,null),
 ('sh82cafe','41b38b6f-3aa6-4b29-b9cf-f9102b2df2b7','agua-com-gas','Água com gás',null,3.50,2,true,null),
 ('sh82cafe','41b38b6f-3aa6-4b29-b9cf-f9102b2df2b7','refrigerantes','Refrigerantes',null,7.00,3,true,null),
 ('sh82cafe','41b38b6f-3aa6-4b29-b9cf-f9102b2df2b7','suco-lata','Suco lata',null,7.00,4,true,null);

-- 4. Topo da página (o nome "SH-82 Café" fica como está até a decisão do nome)
update settings
   set value = value || '{"subtitulo":"Lanchonete Shalom · Asa Sul","aviso":"Domingo: sobremesas depois da Santa Missa."}'::jsonb
 where site = 'sh82cafe' and key = 'cafe_info';

commit;
