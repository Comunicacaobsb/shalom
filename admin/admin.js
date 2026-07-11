/* =====================================================================
   Painel Comunidade Shalom — lógica (Supabase Auth + edição por página)
   ===================================================================== */
(function () {
  "use strict";
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var CATS = [
    { key: "funcionamento",  label: "Funcionamento" },
    { key: "missa",          label: "Missas" },
    { key: "adoracao",       label: "Adoração" },
    { key: "aconselhamento", label: "Aconselhamento" },
    { key: "grupos",         label: "Grupos de Oração" },
    { key: "servicos",       label: "Serviços" }
  ];

  var cfg = window.SHALOM_SUPABASE || {};
  var configured = cfg.url && cfg.anonKey && cfg.url.indexOf("http") === 0 &&
    cfg.url.indexOf("COLE_AQUI") === -1 && cfg.anonKey.indexOf("COLE_AQUI") === -1;

  var sb = null;
  if (configured && window.supabase) sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  var site = "asasul";          // página atualmente selecionada
  var siteName = "Asa Sul";

  /* ---------- helpers ---------- */
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[c];}); }
  function slugify(s){
    return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
      .replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,60);
  }
  function toast(m){ var t=$("#toast"); if(!t)return; t.textContent=m; t.classList.add("show"); clearTimeout(toast._t); toast._t=setTimeout(function(){t.classList.remove("show");},2200); }
  function setMsg(el,text,ok){ el.textContent=text||""; el.className="msg "+(ok?"msg--ok":"msg--err"); }

  /* ---------- views ---------- */
  var loginView=$("#loginView"), appView=$("#appView");
  function showApp(email){ loginView.classList.add("hidden"); appView.classList.remove("hidden"); $("#userEmail").textContent=email||""; loadSites(); }
  function showLogin(){ appView.classList.add("hidden"); loginView.classList.remove("hidden"); }

  if (!configured) { $("#cfgWarn").classList.remove("hidden"); $("#loginBtn").disabled = true; }

  /* ---------- auth ---------- */
  if (sb) {
    sb.auth.getSession().then(function(res){
      var s = res.data && res.data.session;
      if (s) showApp(s.user.email); else showLogin();
    });
    sb.auth.onAuthStateChange(function(_e, session){
      if (session) showApp(session.user.email); else showLogin();
    });
  }

  $("#loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    if (!sb) return;
    var btn=$("#loginBtn"); var msg=$("#loginMsg");
    setMsg(msg,"");
    btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Entrando…';
    sb.auth.signInWithPassword({ email:$("#email").value.trim(), password:$("#password").value })
      .then(function(res){
        btn.disabled=false; btn.textContent="Entrar";
        if (res.error) setMsg(msg, "E-mail ou senha inválidos.");
      })
      .catch(function(){ btn.disabled=false; btn.textContent="Entrar"; setMsg(msg,"Não foi possível entrar agora."); });
  });

  $("#logoutBtn").addEventListener("click", function(){ if(sb) sb.auth.signOut(); });

  /* ---------- seletor de página (site) ---------- */
  var siteSelect = $("#siteSelect");
  function updateChips(){ $("#siteChip").textContent = siteName; $("#siteChip2").textContent = siteName; }
  function loadSites(){
    if (!sb) return;
    sb.from("sites").select("id,name").order("name").then(function(res){
      var rows = (res.data && res.data.length) ? res.data : [{ id:"asasul", name:"Asa Sul" }];
      siteSelect.innerHTML = rows.map(function(r){ return '<option value="'+esc(r.id)+'">'+esc(r.name)+'</option>'; }).join("");
      // mantém asasul como padrão se existir
      var def = rows.filter(function(r){return r.id==="asasul";})[0] || rows[0];
      site = def.id; siteName = def.name; siteSelect.value = site;
      updateChips(); buildSchedGrid(); loadEvents(); loadSchedules();
    });
  }
  siteSelect.addEventListener("change", function(){
    site = siteSelect.value;
    siteName = siteSelect.options[siteSelect.selectedIndex].textContent;
    updateChips(); loadEvents(); loadSchedules();
  });

  /* ---------- tabs ---------- */
  $$(".tab").forEach(function(t){
    t.addEventListener("click", function(){
      $$(".tab").forEach(function(x){ x.setAttribute("aria-selected", String(x===t)); });
      $("#tab-eventos").classList.toggle("hidden", t.dataset.tab!=="eventos");
      $("#tab-horarios").classList.toggle("hidden", t.dataset.tab!=="horarios");
    });
  });

  /* =====================================================================
     HORÁRIOS & SERVIÇOS
     ===================================================================== */
  var schedGrid=$("#schedGrid");
  function buildSchedGrid(){
    schedGrid.innerHTML = CATS.map(function(c){
      return '<div class="field"><label for="sch-'+c.key+'">'+esc(c.label)+'</label>'+
        '<textarea id="sch-'+c.key+'" rows="4" placeholder="Um item por linha"></textarea></div>';
    }).join("");
  }

  function loadSchedules(){
    if (!sb) return;
    sb.from("settings").select("value").eq("site",site).eq("key","schedules").limit(1).then(function(res){
      var val = (res.data && res.data[0] && res.data[0].value) || {};
      CATS.forEach(function(c){
        var ta=$("#sch-"+c.key); if(!ta) return;
        var arr=val[c.key]||[];
        ta.value = Array.isArray(arr) ? arr.join("\n") : "";
      });
    });
  }

  $("#saveSchedBtn").addEventListener("click", function(){
    if (!sb) return;
    var btn=this, msg=$("#schedMsg");
    var value={};
    CATS.forEach(function(c){
      var ta=$("#sch-"+c.key);
      value[c.key] = ta ? ta.value.split("\n").map(function(l){return l.trim();}).filter(Boolean) : [];
    });
    btn.disabled=true; setMsg(msg,"Salvando…",true);
    sb.from("settings").upsert({ site:site, key:"schedules", value:value, updated_at:new Date().toISOString() }, { onConflict:"site,key" })
      .then(function(res){
        btn.disabled=false;
        if (res.error) { setMsg(msg,"Erro ao salvar: "+res.error.message); }
        else { setMsg(msg,"Horários salvos!",true); toast("Horários salvos"); }
      })
      .catch(function(){ btn.disabled=false; setMsg(msg,"Erro ao salvar."); });
  });

  /* =====================================================================
     EVENTOS
     ===================================================================== */
  var listEl=$("#eventList");
  var currentEvents=[];

  function loadEvents(){
    if (!sb) return;
    listEl.innerHTML='<p class="center" style="color:var(--ink-faint)">Carregando…</p>';
    sb.from("events").select("*").eq("site",site).order("position",{ascending:true}).then(function(res){
      if (res.error){ listEl.innerHTML='<p class="notice notice--err">Erro ao carregar: '+esc(res.error.message)+'</p>'; return; }
      currentEvents = res.data||[];
      renderList();
    });
  }

  function renderList(){
    if (!currentEvents.length){ listEl.innerHTML='<p class="center" style="color:var(--ink-faint)">Nenhum evento nesta página ainda. Clique em "Novo evento".</p>'; return; }
    listEl.innerHTML = currentEvents.map(function(ev,i){
      var thumb = ev.image_url ? '<img class="ev-row__thumb" src="'+esc(ev.image_url)+'" alt="">'
        : '<div class="ev-row__thumb">'+esc((ev.badge||"Evento"))+'</div>';
      var pub = ev.published ? '<span class="badge-pill badge-on">Publicado</span>' : '<span class="badge-pill badge-off">Rascunho</span>';
      return '<div class="ev-row">'+thumb+
        '<div class="ev-row__main"><h3>'+esc(ev.title)+'</h3>'+
          '<div class="ev-row__meta">'+esc(ev.date_text||"")+(ev.date_text&&ev.location?" · ":"")+esc(ev.location||"")+' &nbsp; '+pub+'</div></div>'+
        '<div class="ev-row__actions">'+
          '<button class="icon-btn" data-up="'+i+'" title="Subir" '+(i===0?"disabled":"")+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>'+
          '<button class="icon-btn" data-down="'+i+'" title="Descer" '+(i===currentEvents.length-1?"disabled":"")+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>'+
          '<button class="icon-btn" data-edit="'+ev.id+'" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'+
          '<button class="icon-btn" data-del="'+ev.id+'" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>'+
        '</div></div>';
    }).join("");

    $$("[data-edit]",listEl).forEach(function(b){ b.addEventListener("click",function(){ openModal(currentEvents.filter(function(e){return e.id===b.dataset.edit;})[0]); }); });
    $$("[data-del]",listEl).forEach(function(b){ b.addEventListener("click",function(){ delEvent(b.dataset.del); }); });
    $$("[data-up]",listEl).forEach(function(b){ b.addEventListener("click",function(){ move(+b.dataset.up,-1); }); });
    $$("[data-down]",listEl).forEach(function(b){ b.addEventListener("click",function(){ move(+b.dataset.down,1); }); });
  }

  function move(i,dir){
    var j=i+dir; if (j<0||j>=currentEvents.length) return;
    var a=currentEvents[i], b=currentEvents[j];
    var pa=a.position, pb=b.position; if (pa===pb){ pa=i; pb=j; }
    Promise.all([
      sb.from("events").update({position:pb}).eq("id",a.id),
      sb.from("events").update({position:pa}).eq("id",b.id)
    ]).then(loadEvents);
  }

  function delEvent(id){
    var ev=currentEvents.filter(function(e){return e.id===id;})[0];
    if (!confirm('Excluir o evento "'+(ev?ev.title:"")+'"? Esta ação não pode ser desfeita.')) return;
    sb.from("events").delete().eq("id",id).then(function(res){
      if (res.error) alert("Erro ao excluir: "+res.error.message);
      else { toast("Evento excluído"); loadEvents(); }
    });
  }

  /* ---------- modal / editor rico ---------- */
  var modal=$("#eventModal"), quill=null;
  function ensureQuill(){
    if (quill || !window.Quill) return;
    quill = new Quill("#ev-editor", {
      theme:"snow",
      placeholder:"Escreva os detalhes do evento…",
      modules:{ toolbar:[[{header:[2,3,false]}],["bold","italic"],[{list:"ordered"},{list:"bullet"}],["link"],["clean"]] }
    });
  }

  function setPreview(url){
    var p=$("#ev-preview");
    if (url) p.innerHTML='<img src="'+esc(url)+'" alt="">'; else p.textContent="sem imagem";
    $("#ev-image-url").value=url||"";
  }

  function openModal(ev){
    ensureQuill();
    setMsg($("#modalMsg"),"");
    $("#modalTitle").textContent = ev ? "Editar evento" : "Novo evento";
    $("#ev-id").value       = ev ? ev.id : "";
    $("#ev-title").value    = ev ? (ev.title||"") : "";
    $("#ev-badge").value    = ev ? (ev.badge||"") : "";
    $("#ev-slug").value     = ev ? (ev.slug||"") : "";
    $("#ev-slug").dataset.touched = ev ? "1" : "";
    $("#ev-date").value     = ev ? (ev.date_text||"") : "";
    $("#ev-location").value = ev ? (ev.location||"") : "";
    $("#ev-summary").value  = ev ? (ev.summary||"") : "";
    $("#ev-link-text").value= ev ? (ev.link_text||"") : "";
    $("#ev-link-url").value = ev ? (ev.link_url||"") : "";
    $("#ev-position").value = ev ? (ev.position||0) : currentEvents.length;
    $("#ev-published").value= ev ? String(ev.published!==false) : "true";
    setPreview(ev ? ev.image_url : "");
    if (quill) quill.root.innerHTML = ev ? (ev.description||"") : "";
    modal.classList.remove("hidden");
  }
  function closeModal(){ modal.classList.add("hidden"); }

  $("#newEventBtn").addEventListener("click", function(){ openModal(null); });
  $("#modalClose").addEventListener("click", closeModal);
  $("#modalCancel").addEventListener("click", closeModal);
  modal.addEventListener("click", function(e){ if (e.target===modal) closeModal(); });

  $("#ev-title").addEventListener("input", function(){
    var slugEl=$("#ev-slug");
    if (!slugEl.dataset.touched) slugEl.value = slugify(this.value);
  });
  $("#ev-slug").addEventListener("input", function(){ this.dataset.touched="1"; this.value=slugify(this.value); });

  $("#ev-upload-btn").addEventListener("click", function(){ $("#ev-image-file").click(); });
  $("#ev-image-clear").addEventListener("click", function(){ setPreview(""); });
  $("#ev-image-file").addEventListener("change", function(){
    var file=this.files && this.files[0]; if (!file || !sb) return;
    var status=$("#ev-upload-status");
    status.textContent="Enviando imagem…";
    var ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    var base=slugify($("#ev-slug").value||$("#ev-title").value||"evento")||"evento";
    var path=site+"/"+base+"-"+Date.now()+"."+ext;
    sb.storage.from("eventos").upload(path, file, { upsert:true, cacheControl:"3600" })
      .then(function(res){
        if (res.error) { status.textContent="Erro no upload: "+res.error.message; return; }
        var pub=sb.storage.from("eventos").getPublicUrl(path);
        setPreview(pub.data.publicUrl);
        status.textContent="Imagem enviada.";
      })
      .catch(function(){ status.textContent="Erro no upload."; });
    this.value="";
  });

  $("#modalSave").addEventListener("click", function(){
    if (!sb) return;
    var msg=$("#modalMsg"); var btn=this;
    var title=$("#ev-title").value.trim();
    var slug = slugify($("#ev-slug").value || title);
    if (!title){ setMsg(msg,"Informe o título."); return; }
    if (!slug){ setMsg(msg,"Informe um slug válido."); return; }

    var row={
      site:site, slug:slug, title:title,
      badge:$("#ev-badge").value.trim(),
      date_text:$("#ev-date").value.trim(),
      location:$("#ev-location").value.trim(),
      image_url:$("#ev-image-url").value.trim(),
      summary:$("#ev-summary").value.trim(),
      description: quill ? quill.root.innerHTML : "",
      link_text:$("#ev-link-text").value.trim(),
      link_url:$("#ev-link-url").value.trim(),
      published: $("#ev-published").value==="true",
      position: parseInt($("#ev-position").value,10)||0,
      updated_at:new Date().toISOString()
    };
    if (row.description === "<p><br></p>") row.description="";

    var id=$("#ev-id").value;
    btn.disabled=true; setMsg(msg,"Salvando…",true);
    var op = id ? sb.from("events").update(row).eq("id",id) : sb.from("events").insert(row);
    op.then(function(res){
      btn.disabled=false;
      if (res.error){
        if (res.error.code==="23505") setMsg(msg,"Já existe um evento com esse slug nesta página. Escolha outro.");
        else setMsg(msg,"Erro ao salvar: "+res.error.message);
        return;
      }
      toast("Evento salvo"); closeModal(); loadEvents();
    }).catch(function(){ btn.disabled=false; setMsg(msg,"Erro ao salvar."); });
  });

})();
