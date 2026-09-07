-- =====================================================================
-- Seed opcional e idempotente — Horários, Capa e Eventos de Taguatinga e
-- Santa Maria (Centros de Evangelização Shalom Brasília).
--
-- Gerado automaticamente a partir de taguatinga/js/data.js e
-- santamaria/js/data.js em 2026-09-07, por um script Node ad-hoc
-- (não versionado neste repositório). Para atualizar, gere de novo a
-- partir dos data.js — não editar as linhas de INSERT à mão.
--
-- Este arquivo NÃO é aplicado automaticamente nesta sessão. É uma alternativa
-- para quem preferir semear o banco pelo fluxo de migrations do Portal, em vez
-- de usar o painel /admin/ (que já pré-preenche Horários, Capa e Eventos a
-- partir destes mesmos arquivos locais quando não há linha no banco — ver
-- docs/decisoes/2026-09-07-cev-capa-editavel-e-vinculo-ao-painel.md, D2).
--
-- Idempotente: cada INSERT usa "on conflict ... do nothing", então rodar este
-- arquivo mais de uma vez, ou depois que o painel já tiver salvo algo, não
-- sobrescreve dados existentes.
-- =====================================================================

-- Horários e capa (settings.value é jsonb)
insert into public.settings (site, key, value) values
  ('taguatinga', 'schedules', '{"funcionamento":["Segunda a sábado: 14h às 22h"],"missa":["Segunda: 18h30","Domingo: 10h","Missa Jovem: 2º sábado do mês, às 17h"],"grupos":["Grupo de casais: sábado às 17h","Grupo aberto: quinta às 19h30","Grupo jovem: sábado às 14h30"],"adoracao":["Segunda a sexta: 14h30 às 21h"],"servicos":["Bazar: segunda a sábado, 14h às 21h","Livraria: segunda a sábado, 14h às 21h","Lanchonete: segunda a sábado, 14h às 21h"],"aconselhamento":["Segunda a sexta: 14h30 às 21h"]}'::jsonb),
  ('taguatinga', 'home', '{"titulo":"Um lugar para\nencontrar Deus\nem Taguatinga","subtitulo":"Missas, adoração, grupos de oração e formação. Toda a vida do Centro de Evangelização, num só lugar.","imagem":"https://brasilia.comshalom.org/images/shalom-taguatinga.webp","imagem_alt":"Centro de Evangelização Shalom Taguatinga"}'::jsonb),
  ('santamaria', 'schedules', '{"funcionamento":["Segunda a sábado: 14h às 22h"],"missa":[],"grupos":["Grupo de adultos: terça às 19h30","Grupo de adultos: quinta às 19h30","Grupo de jovens: sábado às 17h"],"adoracao":["Quinta: 14h às 18h"],"servicos":["Livraria: segunda a sábado, 14h às 21h"],"aconselhamento":["Segunda a sexta: 14h às 18h"]}'::jsonb),
  ('santamaria', 'home', '{"titulo":"Um lugar para\nencontrar Deus\nem Santa Maria","subtitulo":"Missas, adoração, grupos de oração e formação. Toda a vida do Centro de Evangelização, num só lugar.","imagem":"","imagem_alt":"Centro de Evangelização Shalom Santa Maria"}'::jsonb)
on conflict (site, key) do nothing;

-- Eventos locais (grupos de oração e Missa Jovem) das duas páginas
insert into public.events (site, slug, title, badge, date_text, location, image_url, summary, description, link_text, link_url, published, position) values
  ('taguatinga', 'grupo-aberto', 'Grupo de Oração Aberto', 'Grupo de oração', 'Toda quinta-feira às 19h30', 'Shalom Taguatinga — QNA 26, Taguatinga', 'https://brasilia.comshalom.org/taguatinga/images/eventos/grupo-aberto.webp', 'Um grupo de oração aberto a todos. Venha rezar, louvar e caminhar em comunidade.', '<p>O Grupo de Oração Aberto do Shalom Taguatinga acolhe todas as pessoas que desejam rezar e louvar em comunidade. Não é preciso ser membro: basta chegar.</p><p>Quando: toda quinta-feira, às 19h30.<br>Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.</p><p>Venha e traga um amigo.</p>', null, null, true, 0),
  ('taguatinga', 'grupo-de-casais', 'Grupo de Oração de Casais', 'Grupo de oração', 'Todo sábado às 17h', 'Shalom Taguatinga — QNA 26, Taguatinga', null, 'Um espaço para os casais rezarem juntos e fortalecerem a vida a dois em Deus.', '<p>O Grupo de Oração de Casais do Shalom Taguatinga reúne casais para rezar, partilhar e crescer juntos na fé.</p><p>Quando: todo sábado, às 17h.<br>Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.</p>', null, null, true, 1),
  ('taguatinga', 'grupo-jovem', 'Grupo de Oração Jovem', 'Grupo de oração', 'Todo sábado às 14h30', 'Shalom Taguatinga — QNA 26, Taguatinga', null, 'Um grupo de oração para jovens que querem viver a fé com alegria e intensidade.', '<p>O Grupo de Oração Jovem do Shalom Taguatinga é um espaço para a juventude louvar, rezar e caminhar em comunidade.</p><p>Quando: todo sábado, às 14h30.<br>Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.</p><p>Venha e traga um amigo.</p>', null, null, true, 2),
  ('taguatinga', 'missa-jovem', 'Missa Jovem', 'Missa especial', '2º sábado do mês, às 17h', 'Shalom Taguatinga — QNA 26, Taguatinga', null, 'Uma Santa Missa celebrada com a juventude, todo segundo sábado do mês.', '<p>A Missa Jovem é a Santa Missa celebrada com a juventude do Shalom Taguatinga.</p><p>Quando: todo segundo sábado do mês, às 17h.<br>Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.</p><p>Todos são bem-vindos.</p>', null, null, true, 3),
  ('santamaria', 'grupo-de-adultos', 'Grupo de Oração de Adultos', 'Grupo de oração', 'Terças e quintas às 19h30', 'Shalom Santa Maria — QC 1, Santa Maria', null, 'Um grupo de oração para adultos rezarem, louvarem e caminharem juntos em comunidade.', '<p>O Grupo de Oração de Adultos do Shalom Santa Maria reúne a comunidade para rezar, louvar e partilhar a fé.</p><p>Quando: terças e quintas-feiras, às 19h30.<br>Onde: Shalom Santa Maria — QC 1, Casa 7, Santa Maria/DF.</p><p>Venha e traga um amigo.</p>', null, null, true, 0),
  ('santamaria', 'grupo-de-jovens', 'Grupo de Oração de Jovens', 'Grupo de oração', 'Todo sábado às 17h', 'Shalom Santa Maria — QC 1, Santa Maria', null, 'Um grupo de oração para jovens que querem viver a fé com alegria e intensidade.', '<p>O Grupo de Oração de Jovens do Shalom Santa Maria é um espaço para a juventude louvar, rezar e caminhar em comunidade.</p><p>Quando: todo sábado, às 17h.<br>Onde: Shalom Santa Maria — QC 1, Casa 7, Santa Maria/DF.</p><p>Venha e traga um amigo.</p>', null, null, true, 1)
on conflict (site, slug) do nothing;
