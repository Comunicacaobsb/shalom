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
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbHdla3F6dXFyYmh3cXF1a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NDM0OTgsImV4cCI6MjA5OTIxOTQ5OH0.nMTt-mXjGz6pAYIUxFN_0Wse9vO2Ipt3fT8R3o7P9iw"   // Supabase → Project Settings → API → "anon public"
};
