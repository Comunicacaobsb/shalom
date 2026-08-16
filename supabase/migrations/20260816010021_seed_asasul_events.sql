-- Importa os quatro eventos que estavam apenas no fallback estático da Asa Sul.
-- Reexecução segura: eventos já existentes (inclusive editados no painel) não
-- são sobrescritos.
insert into public.events (
  site, slug, title, badge, date_text, location, image_url, summary,
  description, link_text, link_url, published, position
)
values
(
  'asasul', 'vida-plena', 'Encontro Vida Plena', 'Seminário',
  '29 e 30 de agosto', 'San Marco Brasília Hotel',
  'https://brasilia.comshalom.org/asasul/images/eventos/vida-plena.jpeg',
  'Liderança, crescimento, resultados… Onde encontrar propósito e plenitude em meio a tantos desafios?',
  $$<p>💼✨ Liderança, crescimento, resultados… Onde encontrar propósito e plenitude em meio a tantos desafios?</p>
<p>🌿 O Encontro Vida Plena é uma experiência com o Amor de Deus, promovido pelo Projeto Mundo Novo da Comunidade Católica Shalom, para profissionais e líderes que desejam integrar fé, vida e missão.</p>
<p>💫 Dois dias para aprofundar a experiência com Deus, redescobrir a vocação e encontrar um sentido mais profundo para a vida, a família e o trabalho.</p>
<p>🎤 Carmadélio Sousa (Fortaleza/CE) – Missionário e especialista em relações interpessoais.</p>
<p>🗓️ 29 e 30 de agosto<br>📍 San Marco Brasília Hotel<br>📲 Informações: (61) 99687-7406<br>👉 Inscrições: <a href="https://forms.gle/y8RxBSaj2KEAuqFNA" rel="noopener noreferrer">https://forms.gle/y8RxBSaj2KEAuqFNA</a></p>
<p>📖 "Conhecereis também o amor de Cristo, que ultrapassa todo conhecimento, para que sejais repletos de toda a plenitude de Deus." (Ef 3,19)</p>$$,
  'Inscrições', 'https://forms.gle/y8RxBSaj2KEAuqFNA', true, 0
),
(
  'asasul', 'kyrios', 'Grupo de Oração Kyrios', 'Grupo de oração',
  'Todo sábado às 15h', 'Shalom Asa Sul (507 Sul)',
  'https://brasilia.comshalom.org/asasul/images/eventos/kyrios.jpeg',
  'Um grupo de oração para jovens de 16 a 23 anos que querem viver a fé com intensidade.',
  $$<p>Kyrios é o grupo de oração da juventude no Shalom Asa Sul. Um espaço para louvar, rezar e caminhar em comunidade.</p>
<p>Para quem é: jovens de 16 a 23 anos.<br>Quando: todo sábado, às 15h.<br>Onde: Shalom Asa Sul — 507 Sul.</p>
<p>Uma iniciativa do Projeto Juventude para Jesus • Comunidade Católica Shalom. Venha e traga um amigo.</p>$$,
  null, null, true, 1
),
(
  'asasul', 'amare', 'Grupo de Oração Aberto — Amare', 'Grupo de oração',
  'Toda quinta-feira às 19h30', 'Shalom Asa Sul, 507 Sul',
  'https://brasilia.comshalom.org/asasul/images/eventos/amare.jpeg',
  'Um grupo de oração aberto a todos. Venha amar e ser amado na presença de Deus.',
  $$<p>Amare é o grupo de oração aberto do Shalom Asa Sul — todos são bem-vindos, sem exceção.</p>
<p>Quando: toda quinta-feira, às 19h30.<br>Onde: Shalom Asa Sul, 507 Sul.<br>Contato: (61) 98210-8676.</p>
<p>Entre no grupo do WhatsApp para receber os avisos e caminhar conosco.</p>$$,
  'Entrar no grupo do WhatsApp', 'https://wa.me/5561982108676', true, 2
),
(
  'asasul', 'missa-misericordia', 'Missa da Misericórdia', 'Missa especial',
  'Quinta-feira, 30/07', 'Shalom Asa Sul',
  'https://brasilia.comshalom.org/asasul/images/eventos/missa-misericordia.jpeg',
  'Uma tarde inteira de oração, aconselhamento, confissão e Santa Missa no Shalom Asa Sul.',
  $$<p>A Missa da Misericórdia é um dia dedicado a reencontrar o amor misericordioso de Deus.</p>
<p>Programação — quinta-feira, 30/07:</p>
<ul><li>14h30 — Oração e aconselhamento</li><li>18h00 — Confissão</li><li>19h30 — Santa Missa</li></ul>
<p>Onde: Shalom Asa Sul. Traga suas intenções e viva esse encontro com a Misericórdia.</p>$$,
  null, null, true, 3
)
on conflict (site, slug) do nothing;
