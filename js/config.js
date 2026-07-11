/* =====================================================================
   CONFIGURAÇÃO DO SUPABASE — compartilhada por todo o repositório
   ---------------------------------------------------------------------
   Preencha com os dados do projeto (Supabase → Project Settings → API).
   A "anon public" pode ficar exposta — é pública por design; quem protege
   a escrita é o RLS (ver /admin/supabase-setup.sql).

   Cada página declara a qual site pertence antes de carregar os scripts:
       <script>window.SHALOM_SITE = "asasul";</script>
       <script src="../js/config.js"></script>
       <script src="../js/store.js"></script>
   ===================================================================== */
window.SHALOM_SUPABASE = {
  url:     "https://kslwekqzuqrbhwqqukjz.supabase.co",
  anonKey: "COLE_AQUI_A_ANON_KEY"   // Supabase → Project Settings → API → "anon public"
};
