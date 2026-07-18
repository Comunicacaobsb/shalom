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

  var BRL = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" });
  function fmtBRL(n){ return BRL.format(Number(n)||0); }
  function parsePrice(v){
    if (v==null) return 0;
    var s = String(v).trim().replace(/\s/g,"").replace(/r\$/i,"");
    if (s.indexOf(",")!==-1) s = s.replace(/\./g,"").replace(",",".");
    var n = parseFloat(s); return isNaN(n) ? 0 : n;
  }
  function todaySP(){ return new Intl.DateTimeFormat("en-CA",{ timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date()); }
  function uuid(){
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){ var r=Math.random()*16|0, v=c==="x"?r:(r&0x3|0x8); return v.toString(16); });
  }
  function isRlsError(err){
    if (!err) return false;
    var m = (err.message||"").toLowerCase();
    return err.code==="42501" || m.indexOf("row-level security")!==-1 || m.indexOf("violates row-level")!==-1 || m.indexOf("permission denied")!==-1;
  }
  function reportError(err, fallback){
    if (isRlsError(err)) { toast("Sem permissão para editar esta página."); return; }
    toast(fallback || (err && err.message) || "Ocorreu um erro. Tente de novo.");
  }
  // Redimensiona uma imagem no cliente (máx maxDim px) e devolve um Blob JPEG.
  function resizeImage(file, maxDim, quality){
    return new Promise(function(resolve, reject){
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function(){
        var w=img.width, h=img.height, scale=Math.min(1, maxDim/Math.max(w,h));
        var cw=Math.max(1,Math.round(w*scale)), ch=Math.max(1,Math.round(h*scale));
        var cv=document.createElement("canvas"); cv.width=cw; cv.height=ch;
        cv.getContext("2d").drawImage(img,0,0,cw,ch);
        URL.revokeObjectURL(url);
        cv.toBlob(function(b){ b ? resolve(b) : reject(new Error("toBlob")); }, "image/jpeg", quality||0.85);
      };
      img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error("img")); };
      img.src = url;
    });
  }

  /* ---------- views ---------- */
  var loginView=$("#loginView"), appView=$("#appView"), noAccessView=$("#noAccessView");
  // Perfil/permissões do usuário logado (carregado no boot).
  var me = { id:null, email:"", isMaster:false, allowedSites:[] };
  var bootedFor = null;

  function showApp(email){
    loginView.classList.add("hidden"); noAccessView.classList.add("hidden");
    appView.classList.remove("hidden");
    $("#userEmail").textContent = email||"";
    $("#tabUsuarios").classList.toggle("hidden", !me.isMaster);
    loadSites();
  }
  function showNoAccess(email){
    appView.classList.add("hidden"); loginView.classList.add("hidden");
    noAccessView.classList.remove("hidden");
    $("#noAccessEmail").textContent = email||"";
  }
  function showLogin(){
    appView.classList.add("hidden"); noAccessView.classList.add("hidden");
    loginView.classList.remove("hidden");
  }

  if (!configured) { $("#cfgWarn").classList.remove("hidden"); $("#loginBtn").disabled = true; $("#googleBtn").disabled = true; }

  // Carrega o profile próprio + permissões de página. Define me.isMaster / me.allowedSites.
  function bootPermissions(){
    me.isMaster = false; me.allowedSites = [];
    if (!sb || !me.id) return Promise.resolve();
    return Promise.all([
      sb.from("profiles").select("*").eq("id", me.id).limit(1),
      sb.from("page_permissions").select("site").eq("user_id", me.id)
    ]).then(function(r){
      var prof = r[0].data && r[0].data[0];
      me.isMaster = !!(prof && prof.is_master);
      me.allowedSites = (r[1].data || []).map(function(p){ return p.site; });
    }).catch(function(){});
  }

  function onSession(session){
    if (!session){ bootedFor=null; showLogin(); return; }
    if (session.user.id === bootedFor) return;   // evita re-boot em refresh de token
    bootedFor = session.user.id;
    me.id = session.user.id; me.email = session.user.email || "";
    bootPermissions().then(function(){
      if (!me.isMaster && me.allowedSites.length===0) showNoAccess(me.email);
      else showApp(me.email);
    });
  }

  /* ---------- auth ---------- */
  if (sb) {
    sb.auth.getSession().then(function(res){ onSession(res.data && res.data.session); });
    sb.auth.onAuthStateChange(function(_e, session){ onSession(session); });
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

  $("#googleBtn").addEventListener("click", function(){
    if (!sb) return;
    sb.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: location.origin + location.pathname } })
      .then(function(res){ if (res && res.error) setMsg($("#loginMsg"), "Não foi possível entrar com o Google."); })
      .catch(function(){ setMsg($("#loginMsg"), "Não foi possível entrar com o Google."); });
  });

  $("#logoutBtn").addEventListener("click", function(){ if(sb) sb.auth.signOut(); });
  $("#noAccessLogout").addEventListener("click", function(){ if(sb) sb.auth.signOut(); });

  /* ---------- Esqueci minha senha ---------- */
  $("#forgotBtn").addEventListener("click", function(){
    if (!sb) return;
    var msg = $("#loginMsg");
    var email = ($("#email").value || "").trim();
    if (!email) { setMsg(msg, "Digite seu e-mail acima e clique de novo."); return; }
    // redireciona para a página de reset ao lado deste index (mesma pasta /admin/)
    var redirectTo = new URL("reset.html", location.href).href;
    sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo })
      .then(function(res){
        if (res && res.error) setMsg(msg, "Não foi possível enviar o e-mail de redefinição.");
        else setMsg(msg, "Enviamos um link de redefinição para " + email + ".", true);
      })
      .catch(function(){ setMsg(msg, "Não foi possível enviar o e-mail agora."); });
  });

  /* ---------- seletor de página (site) ---------- */
  var siteSelect = $("#siteSelect");
  var activeTab = "eventos";
  function updateChips(){ $("#siteChip").textContent = siteName; $("#siteChip2").textContent = siteName; var c3=$("#siteChip3"); if(c3) c3.textContent = siteName; }
  function loadSites(){
    if (!sb) return;
    sb.from("sites").select("id,name").order("name").then(function(res){
      var rows = (res.data && res.data.length) ? res.data : [{ id:"asasul", name:"Asa Sul" }];
      // Não-master só vê os sites que tem permissão. Master vê todos.
      if (!me.isMaster) rows = rows.filter(function(r){ return me.allowedSites.indexOf(r.id) !== -1; });
      if (!rows.length) rows = [{ id:"asasul", name:"Asa Sul" }];
      siteSelect.innerHTML = rows.map(function(r){ return '<option value="'+esc(r.id)+'">'+esc(r.name)+'</option>'; }).join("");
      // mantém asasul como padrão se existir (e permitido)
      var def = rows.filter(function(r){return r.id==="asasul";})[0] || rows[0];
      site = def.id; siteName = def.name; siteSelect.value = site;
      updateChips(); buildSchedGrid(); loadEvents(); loadSchedules();
      if (activeTab==="cardapio") loadMenu();
    });
  }
  siteSelect.addEventListener("change", function(){
    site = siteSelect.value;
    siteName = siteSelect.options[siteSelect.selectedIndex].textContent;
    updateChips(); loadEvents(); loadSchedules();
    if (activeTab==="cardapio") loadMenu();
  });

  /* ---------- tabs ---------- */
  var PANELS = ["eventos","horarios","cardapio","usuarios"];
  $$(".tab").forEach(function(t){
    t.addEventListener("click", function(){
      if (t.classList.contains("hidden")) return;
      activeTab = t.dataset.tab;
      $$(".tab").forEach(function(x){ x.setAttribute("aria-selected", String(x===t)); });
      PANELS.forEach(function(name){
        var el = $("#tab-"+name);
        if (el) el.classList.toggle("hidden", name !== activeTab);
      });
      if (activeTab==="cardapio") loadMenu();
      if (activeTab==="usuarios") loadUsers();
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

  /* =====================================================================
     CARDÁPIO (categorias, produtos, disponibilidade, informações do café)
     ===================================================================== */
  var menuCats = [], menuProds = [];

  var WD_SHORT = ["D","S","T","Q","Q","S","S"];
  var WD_ABBR  = ["dom","seg","ter","qua","qui","sex","sáb"];
  var WD_FULL  = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
  function cap(s){ return String(s||"").charAt(0).toUpperCase()+String(s||"").slice(1); }
  function fmtDMY(d){ if(!d) return ""; var p=String(d).slice(0,10).split("-"); return p[2]+"/"+p[1]; }
  function weekdaysLabel(wd){
    if (!wd || !wd.length) return "";
    var s = wd.slice().sort(function(a,b){ return a-b; });
    if (s.length===1) return "Toda "+WD_FULL[s[0]];
    var contiguous=true; for (var i=1;i<s.length;i++){ if(s[i]!==s[i-1]+1){ contiguous=false; break; } }
    if (contiguous) return cap(WD_ABBR[s[0]])+" a "+WD_ABBR[s[s.length-1]];
    return s.map(function(x){ return cap(WD_ABBR[x]); }).join(", ");
  }
  // Selo curto de disponibilidade (mesma regra do banco). "" = perene.
  function availShort(p){
    if (p.weekdays && p.weekdays.length) return weekdaysLabel(p.weekdays);
    var s=p.start_date, e=p.end_date;
    if (s && e && String(s).slice(0,10)===String(e).slice(0,10)) return (String(s).slice(0,10)===todaySP()) ? "Só hoje" : "Somente "+fmtDMY(s);
    if (s && e) return fmtDMY(s)+" a "+fmtDMY(e);
    if (e) return "Até "+fmtDMY(e);
    if (s) return "A partir de "+fmtDMY(s);
    return "";
  }

  function loadMenu(){
    if (!sb) return;
    $("#catList").innerHTML='<p class="center" style="color:var(--ink-faint)">Carregando…</p>';
    $("#prodList").innerHTML='<p class="center" style="color:var(--ink-faint)">Carregando…</p>';
    loadCafeInfo();
    Promise.all([
      sb.from("menu_categories").select("*").eq("site",site).order("position",{ascending:true}),
      sb.from("menu_products").select("*").eq("site",site).order("position",{ascending:true})
    ]).then(function(r){
      if (r[0].error){ $("#catList").innerHTML='<p class="notice notice--err">Erro ao carregar categorias: '+esc(r[0].error.message)+'</p>'; menuCats=[]; }
      else { menuCats = r[0].data||[]; renderCats(); }
      if (r[1].error){ $("#prodList").innerHTML='<p class="notice notice--err">Erro ao carregar produtos: '+esc(r[1].error.message)+'</p>'; menuProds=[]; }
      else { menuProds = r[1].data||[]; renderProds(); }
    }).catch(function(){ $("#prodList").innerHTML='<p class="notice notice--err">Erro ao carregar o cardápio.</p>'; });
  }

  /* ---------- Informações do café (settings/cafe_info) ---------- */
  function loadCafeInfo(){
    if (!sb) return;
    sb.from("settings").select("value").eq("site",site).eq("key","cafe_info").limit(1).then(function(res){
      var v=(res.data && res.data[0] && res.data[0].value) || {};
      $("#ci-nome").value=v.nome||""; $("#ci-subtitulo").value=v.subtitulo||"";
      $("#ci-endereco").value=v.endereco||""; $("#ci-instagram").value=v.instagram||"";
      $("#ci-whatsapp").value=v.whatsapp||""; $("#ci-aviso").value=v.aviso||"";
    });
  }
  $("#saveCafeInfoBtn").addEventListener("click", function(){
    if (!sb) return;
    var btn=this, msg=$("#cafeInfoMsg");
    var value={
      nome:$("#ci-nome").value.trim(), subtitulo:$("#ci-subtitulo").value.trim(),
      endereco:$("#ci-endereco").value.trim(), instagram:$("#ci-instagram").value.trim(),
      whatsapp:$("#ci-whatsapp").value.trim(), aviso:$("#ci-aviso").value.trim()
    };
    btn.disabled=true; setMsg(msg,"Salvando…",true);
    sb.from("settings").upsert({ site:site, key:"cafe_info", value:value, updated_at:new Date().toISOString() }, { onConflict:"site,key" }).then(function(res){
      btn.disabled=false;
      if (res.error){ if(isRlsError(res.error)){ setMsg(msg,"Sem permissão para editar esta página."); toast("Sem permissão para editar esta página."); } else setMsg(msg,"Erro ao salvar: "+res.error.message); return; }
      setMsg(msg,"Informações salvas!",true); toast("Informações salvas");
    }).catch(function(){ btn.disabled=false; setMsg(msg,"Erro ao salvar."); });
  });

  /* ---------- Categorias ---------- */
  function renderCats(){
    var host=$("#catList");
    if (!menuCats.length){ host.innerHTML='<p class="hint">Nenhuma categoria ainda. Adicione a primeira acima.</p>'; return; }
    host.innerHTML = menuCats.map(function(c,i){
      return '<div class="cat-row" data-id="'+esc(c.id)+'">'+
        '<span class="cat-row__name'+(c.active?'':' is-off')+'">'+esc(c.name)+'</span>'+
        (c.active?'':'<span class="badge-pill badge-off">Inativa</span>')+
        '<div class="cat-row__actions">'+
          '<button class="icon-btn" data-cup="'+i+'" title="Subir" '+(i===0?'disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>'+
          '<button class="icon-btn" data-cdown="'+i+'" title="Descer" '+(i===menuCats.length-1?'disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>'+
          '<button class="icon-btn" data-crename="'+esc(c.id)+'" title="Renomear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'+
          '<button class="icon-btn" data-ctoggle="'+esc(c.id)+'" title="'+(c.active?'Desativar':'Ativar')+'">'+(c.active?
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>':
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>')+'</button>'+
          '<button class="icon-btn" data-cdel="'+esc(c.id)+'" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>'+
        '</div></div>';
    }).join("");
    $$("[data-cup]",host).forEach(function(b){ b.addEventListener("click",function(){ moveCat(+b.dataset.cup,-1); }); });
    $$("[data-cdown]",host).forEach(function(b){ b.addEventListener("click",function(){ moveCat(+b.dataset.cdown,1); }); });
    $$("[data-crename]",host).forEach(function(b){ b.addEventListener("click",function(){ renameCat(b.dataset.crename); }); });
    $$("[data-ctoggle]",host).forEach(function(b){ b.addEventListener("click",function(){ toggleCat(b.dataset.ctoggle); }); });
    $$("[data-cdel]",host).forEach(function(b){ b.addEventListener("click",function(){ delCat(b.dataset.cdel); }); });
  }
  function addCategory(){
    if (!sb) return;
    var name=$("#newCatName").value.trim(); if(!name) return;
    var slug=slugify(name); if(!slug){ toast("Nome inválido."); return; }
    var pos = menuCats.reduce(function(m,c){ return Math.max(m,c.position); }, -1) + 1;
    sb.from("menu_categories").insert({ site:site, slug:slug, name:name, position:pos, active:true }).then(function(res){
      if (res.error){ if(res.error.code==="23505"){ toast("Já existe uma categoria com esse nome."); } else reportError(res.error,"Erro ao criar categoria."); return; }
      $("#newCatName").value=""; toast("Categoria criada"); loadMenu();
    });
  }
  $("#addCatBtn").addEventListener("click", addCategory);
  $("#newCatName").addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); addCategory(); } });

  function moveCat(i,dir){
    var j=i+dir; if(j<0||j>=menuCats.length) return;
    var a=menuCats[i], b=menuCats[j];
    var pa=a.position, pb=b.position; if(pa===pb){ pa=i; pb=j; }
    Promise.all([
      sb.from("menu_categories").update({position:pb}).eq("id",a.id),
      sb.from("menu_categories").update({position:pa}).eq("id",b.id)
    ]).then(function(r){ var e=(r[0]&&r[0].error)||(r[1]&&r[1].error); if(e) reportError(e); loadMenu(); });
  }
  function renameCat(id){
    var c=menuCats.filter(function(x){return x.id===id;})[0]; if(!c) return;
    var name=prompt("Novo nome da categoria:", c.name); if(name==null) return;
    name=name.trim(); if(!name) return;
    sb.from("menu_categories").update({ name:name }).eq("id",id).then(function(res){
      if(res.error){ reportError(res.error,"Erro ao renomear."); return; }
      toast("Categoria renomeada"); loadMenu();
    });
  }
  function toggleCat(id){
    var c=menuCats.filter(function(x){return x.id===id;})[0]; if(!c) return;
    sb.from("menu_categories").update({ active: !c.active }).eq("id",id).then(function(res){
      if(res.error){ reportError(res.error); return; }
      toast(c.active?"Categoria desativada":"Categoria ativada"); loadMenu();
    });
  }
  function delCat(id){
    var c=menuCats.filter(function(x){return x.id===id;})[0]; if(!c) return;
    if(!confirm('Excluir a categoria "'+c.name+'"?\nOs produtos dela ficarão "sem categoria".')) return;
    sb.from("menu_categories").delete().eq("id",id).then(function(res){
      if(res.error){ reportError(res.error,"Erro ao excluir."); return; }
      toast("Categoria excluída"); loadMenu();
    });
  }

  /* ---------- Produtos ---------- */
  function prodRowHTML(p, items){
    var idx=items.indexOf(p);
    var thumb = p.image_url ? '<img class="prod-row__thumb" src="'+esc(p.image_url)+'" alt="">'
      : '<div class="prod-row__thumb prod-row__thumb--ph">'+esc((p.name||"?").charAt(0).toUpperCase())+'</div>';
    var badges='';
    if (p.active===false) badges += '<span class="badge-pill badge-off">Inativo</span>';
    var av=availShort(p); if (av) badges += '<span class="badge-pill badge-info">'+esc(av)+'</span>';
    if (p.badge) badges += '<span class="badge-pill badge-info">'+esc(p.badge)+'</span>';
    return '<div class="prod-row" data-id="'+esc(p.id)+'">'+thumb+
      '<div class="prod-row__main"><h3>'+esc(p.name)+'</h3>'+
        '<div class="prod-row__meta">'+fmtBRL(p.price)+(badges?' &nbsp; '+badges:'')+'</div></div>'+
      '<div class="prod-row__actions">'+
        '<button class="icon-btn" data-pup="'+esc(p.id)+'" title="Subir" '+(idx===0?'disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>'+
        '<button class="icon-btn" data-pdown="'+esc(p.id)+'" title="Descer" '+(idx===items.length-1?'disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>'+
        '<button class="icon-btn" data-pedit="'+esc(p.id)+'" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'+
        '<button class="icon-btn" data-pdel="'+esc(p.id)+'" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>'+
      '</div></div>';
  }
  function renderProds(){
    var host=$("#prodList");
    if (!menuProds.length){ host.innerHTML='<p class="hint">Nenhum produto ainda. Clique em "Novo produto".</p>'; return; }
    var norm=function(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); };
    var qn=norm(($("#prodSearch").value||"").trim());
    var list=menuProds.filter(function(p){ return !qn || norm(p.name).indexOf(qn)!==-1; });
    var groups=menuCats.map(function(c){ return { id:c.id, name:c.name, active:c.active, items:[] }; });
    var noCat={ id:null, name:"Sem categoria", active:true, items:[] };
    var byId={}; groups.forEach(function(g){ byId[g.id]=g; });
    list.forEach(function(p){ var g=(p.category_id && byId[p.category_id]) ? byId[p.category_id] : noCat; g.items.push(p); });
    var ordered=groups.concat([noCat]).filter(function(g){ return g.items.length; });
    ordered.forEach(function(g){ g.items.sort(function(a,b){ return a.position-b.position; }); });
    if (!ordered.length){ host.innerHTML='<p class="hint">Nenhum produto encontrado.</p>'; return; }
    host.innerHTML = ordered.map(function(g){
      return '<div class="prod-group"><h4 class="prod-group__title">'+esc(g.name)+(g.active?'':' <span class="badge-pill badge-off">inativa</span>')+'</h4>'+
        g.items.map(function(p){ return prodRowHTML(p,g.items); }).join("")+'</div>';
    }).join("");
    $$("[data-pedit]",host).forEach(function(b){ b.addEventListener("click",function(){ openProductModal(menuProds.filter(function(x){return x.id===b.dataset.pedit;})[0]); }); });
    $$("[data-pdel]",host).forEach(function(b){ b.addEventListener("click",function(){ delProduct(b.dataset.pdel); }); });
    $$("[data-pup]",host).forEach(function(b){ b.addEventListener("click",function(){ moveProduct(b.dataset.pup,-1); }); });
    $$("[data-pdown]",host).forEach(function(b){ b.addEventListener("click",function(){ moveProduct(b.dataset.pdown,1); }); });
  }
  $("#prodSearch").addEventListener("input", renderProds);

  function moveProduct(id,dir){
    var p=menuProds.filter(function(x){return x.id===id;})[0]; if(!p) return;
    var sibs=menuProds.filter(function(x){ return (x.category_id||null)===(p.category_id||null); }).sort(function(a,b){ return a.position-b.position; });
    var i=sibs.indexOf(p), j=i+dir; if(j<0||j>=sibs.length) return;
    var a=sibs[i], b=sibs[j];
    var pa=a.position, pb=b.position; if(pa===pb){ pa=i; pb=j; }
    Promise.all([
      sb.from("menu_products").update({position:pb}).eq("id",a.id),
      sb.from("menu_products").update({position:pa}).eq("id",b.id)
    ]).then(function(r){ var e=(r[0]&&r[0].error)||(r[1]&&r[1].error); if(e) reportError(e); loadMenu(); });
  }
  function delProduct(id){
    var p=menuProds.filter(function(x){return x.id===id;})[0]; if(!p) return;
    if(!confirm('Excluir o produto "'+p.name+'"? Esta ação não pode ser desfeita.')) return;
    sb.from("menu_products").delete().eq("id",id).then(function(res){
      if(res.error){ reportError(res.error,"Erro ao excluir."); return; }
      toast("Produto excluído"); loadMenu();
    });
  }

  /* ---------- Editor de produto ---------- */
  var productModal=$("#productModal");
  function fillCategorySelect(selected){
    $("#pm-category").innerHTML = '<option value="">Sem categoria</option>' + menuCats.map(function(c){
      return '<option value="'+esc(c.id)+'">'+esc(c.name)+(c.active?'':' (inativa)')+'</option>';
    }).join("");
    $("#pm-category").value = selected || "";
  }
  function setPmPreview(url){
    var el=$("#pm-preview");
    if (url) el.innerHTML='<img src="'+esc(url)+'" alt="">'; else el.textContent="sem imagem";
    $("#pm-image-url").value = url||"";
  }
  function buildWeekdayChips(){
    var host=$("#weekdayChips"); if(!host || host.dataset.built) return;
    host.dataset.built="1";
    host.innerHTML = WD_SHORT.map(function(l,i){ return '<button type="button" class="wd-chip" data-dow="'+i+'" title="'+cap(WD_FULL[i])+'">'+l+'</button>'; }).join("");
    $$(".wd-chip",host).forEach(function(c){ c.addEventListener("click",function(){ c.classList.toggle("on"); updateAvailUI(); }); });
  }
  function currentPreset(){ var r=$('input[name="pm-avail"]:checked'); return r?r.value:"sempre"; }
  function selectedWeekdays(){ return $$("#weekdayChips .wd-chip.on").map(function(c){ return parseInt(c.dataset.dow,10); }).sort(function(a,b){ return a-b; }); }
  function updateAvailUI(){
    var p=currentPreset();
    $("#avail-semana").classList.toggle("hidden", p!=="semana");
    $("#avail-periodo").classList.toggle("hidden", p!=="periodo");
    var txt="";
    if (p==="sempre") txt="Disponível todos os dias.";
    else if (p==="semana"){ var wd=selectedWeekdays(); txt=wd.length?("Disponível: "+weekdaysLabel(wd)):"Escolha ao menos um dia."; }
    else if (p==="periodo"){
      var s=$("#pm-start").value, e=$("#pm-end").value;
      if (s&&e) txt="Disponível de "+fmtDMY(s)+" a "+fmtDMY(e)+".";
      else if (e) txt="Disponível até "+fmtDMY(e)+".";
      else if (s) txt="Disponível a partir de "+fmtDMY(s)+".";
      else txt="Defina uma data de início ou fim.";
    } else if (p==="hoje") txt="Disponível somente hoje ("+fmtDMY(todaySP())+").";
    $("#availPreview").textContent=txt;
  }
  $$('input[name="pm-avail"]').forEach(function(r){ r.addEventListener("change", updateAvailUI); });
  $("#pm-start").addEventListener("change", updateAvailUI);
  $("#pm-end").addEventListener("change", updateAvailUI);

  function openProductModal(p){
    buildWeekdayChips();
    setMsg($("#pmMsg"),"");
    $("#pmTitle").textContent = p ? "Editar produto" : "Novo produto";
    $("#pm-id").value = p ? p.id : "";
    $("#pm-name").value = p ? (p.name||"") : "";
    $("#pm-slug").value = p ? (p.slug||"") : "";
    $("#pm-slug").dataset.touched = p ? "1" : "";
    $("#pm-price").value = p ? String(p.price==null?"":p.price).replace(".",",") : "";
    $("#pm-description").value = p ? (p.description||"") : "";
    $("#pm-badge").value = p ? (p.badge||"") : "";
    $("#pm-active").value = p ? String(p.active!==false) : "true";
    $("#pm-position").value = p ? (p.position||0) : menuProds.length;
    fillCategorySelect(p ? (p.category_id||"") : "");
    setPmPreview(p ? p.image_url : "");
    $("#pm-upload-status").textContent = "JPG ou PNG. Redimensionada para no máx. 1200px.";
    $$("#weekdayChips .wd-chip").forEach(function(c){ c.classList.remove("on"); });
    $("#pm-start").value=""; $("#pm-end").value="";
    var preset="sempre";
    if (p && p.weekdays && p.weekdays.length){
      preset="semana";
      p.weekdays.forEach(function(d){ var c=$('#weekdayChips .wd-chip[data-dow="'+d+'"]'); if(c) c.classList.add("on"); });
    } else if (p && (p.start_date || p.end_date)){
      var s=p.start_date?String(p.start_date).slice(0,10):"", e=p.end_date?String(p.end_date).slice(0,10):"";
      if (s && e && s===e && s===todaySP()) preset="hoje";
      else { preset="periodo"; $("#pm-start").value=s; $("#pm-end").value=e; }
    }
    var radio=$('input[name="pm-avail"][value="'+preset+'"]'); if(radio) radio.checked=true;
    updateAvailUI();
    productModal.classList.remove("hidden");
  }
  function closeProductModal(){ productModal.classList.add("hidden"); }

  $("#newProductBtn").addEventListener("click", function(){ openProductModal(null); });
  $("#pmClose").addEventListener("click", closeProductModal);
  $("#pmCancel").addEventListener("click", closeProductModal);
  productModal.addEventListener("click", function(e){ if(e.target===productModal) closeProductModal(); });
  $("#pm-name").addEventListener("input", function(){ var s=$("#pm-slug"); if(!s.dataset.touched) s.value=slugify(this.value); });
  $("#pm-slug").addEventListener("input", function(){ this.dataset.touched="1"; this.value=slugify(this.value); });

  $("#pm-upload-btn").addEventListener("click", function(){ $("#pm-image-file").click(); });
  $("#pm-image-clear").addEventListener("click", function(){ setPmPreview(""); });
  $("#pm-image-file").addEventListener("change", function(){
    var file=this.files && this.files[0]; this.value="";
    if (!file || !sb) return;
    var status=$("#pm-upload-status");
    status.textContent="Processando imagem…";
    resizeImage(file, 1200, 0.85).then(function(blob){
      status.textContent="Enviando imagem…";
      var path=site+"/"+uuid()+".jpg";
      return sb.storage.from("cardapio").upload(path, blob, { upsert:true, cacheControl:"3600", contentType:"image/jpeg" }).then(function(res){
        if (res.error){ if(isRlsError(res.error)){ status.textContent="Sem permissão para enviar imagem."; toast("Sem permissão para editar esta página."); } else status.textContent="Erro no upload: "+res.error.message; return; }
        var pub=sb.storage.from("cardapio").getPublicUrl(path);
        setPmPreview(pub.data.publicUrl);
        status.textContent="Imagem enviada.";
      });
    }).catch(function(){ status.textContent="Não foi possível processar a imagem."; });
  });

  $("#pmSave").addEventListener("click", function(){
    if (!sb) return;
    var msg=$("#pmMsg"), btn=this;
    var name=$("#pm-name").value.trim();
    var slug=slugify($("#pm-slug").value || name);
    if (!name){ setMsg(msg,"Informe o nome."); return; }
    if (!slug){ setMsg(msg,"Informe um slug válido."); return; }
    var preset=currentPreset(), weekdays=null, start_date=null, end_date=null;
    if (preset==="semana"){
      var wd=selectedWeekdays();
      if (!wd.length){ setMsg(msg,"Escolha ao menos um dia da semana."); return; }
      weekdays=wd;
    } else if (preset==="periodo"){
      start_date=$("#pm-start").value||null; end_date=$("#pm-end").value||null;
      if (!start_date && !end_date){ setMsg(msg,"Defina uma data de início ou fim."); return; }
    } else if (preset==="hoje"){ start_date=todaySP(); end_date=todaySP(); }
    var row={
      site:site, slug:slug, name:name,
      description:$("#pm-description").value.trim()||null,
      price:parsePrice($("#pm-price").value),
      category_id:$("#pm-category").value||null,
      image_url:$("#pm-image-url").value.trim()||null,
      badge:$("#pm-badge").value.trim()||null,
      active:$("#pm-active").value==="true",
      position:parseInt($("#pm-position").value,10)||0,
      weekdays:weekdays, start_date:start_date, end_date:end_date
    };
    var id=$("#pm-id").value;
    btn.disabled=true; setMsg(msg,"Salvando…",true);
    var op = id ? sb.from("menu_products").update(row).eq("id",id) : sb.from("menu_products").insert(row);
    op.then(function(res){
      btn.disabled=false;
      if (res.error){
        if (res.error.code==="23505"){ setMsg(msg,"Já existe um produto com esse slug nesta página."); return; }
        if (isRlsError(res.error)){ setMsg(msg,"Sem permissão para editar esta página."); toast("Sem permissão para editar esta página."); return; }
        setMsg(msg,"Erro ao salvar: "+res.error.message); return;
      }
      toast("Produto salvo"); closeProductModal(); loadMenu();
    }).catch(function(){ btn.disabled=false; setMsg(msg,"Erro ao salvar."); });
  });

  /* =====================================================================
     USUÁRIOS & PERMISSÕES (só master)
     ===================================================================== */
  var allSites=[];
  function loadUsers(){
    if (!sb || !me.isMaster) return;
    var host=$("#userList");
    host.innerHTML='<p class="center" style="color:var(--ink-faint)">Carregando…</p>';
    Promise.all([
      sb.from("profiles").select("*").order("created_at",{ascending:true}),
      sb.from("page_permissions").select("*"),
      sb.from("sites").select("id,name").order("name")
    ]).then(function(r){
      if (r[0].error){ host.innerHTML='<p class="notice notice--err">Erro ao carregar usuários: '+esc(r[0].error.message)+'</p>'; return; }
      allSites = r[2].data||[];
      renderUsers(r[0].data||[], r[1].data||[]);
    }).catch(function(){ host.innerHTML='<p class="notice notice--err">Erro ao carregar usuários.</p>'; });
  }
  function renderUsers(profiles, perms){
    var host=$("#userList");
    if (!profiles.length){ host.innerHTML='<p class="hint">Nenhum usuário ainda.</p>'; return; }
    var permSet={}; perms.forEach(function(p){ permSet[p.user_id+"|"+p.site]=true; });
    host.innerHTML = profiles.map(function(u){
      var initials=(u.display_name||u.email||"?").trim().charAt(0).toUpperCase();
      var avatar = u.avatar_url ? '<img class="user-row__avatar" src="'+esc(u.avatar_url)+'" alt="">'
        : '<div class="user-row__avatar user-row__avatar--ph">'+esc(initials)+'</div>';
      var isSelf = u.id===me.id;
      var sites = allSites.map(function(s){
        var checked = u.is_master || permSet[u.id+"|"+s.id];
        return '<label class="chk"><input type="checkbox" data-uid="'+esc(u.id)+'" data-site="'+esc(s.id)+'" '+(checked?'checked':'')+(u.is_master?' disabled':'')+'> '+esc(s.name)+'</label>';
      }).join("");
      return '<div class="user-row" data-id="'+esc(u.id)+'">'+avatar+
        '<div class="user-row__main">'+
          '<div class="user-row__name">'+esc(u.display_name||"(sem nome)")+(isSelf?' <span class="badge-pill badge-info">você</span>':'')+'</div>'+
          '<div class="user-row__email">'+esc(u.email||"")+'</div>'+
          '<div class="user-row__sites">'+(u.is_master?'<span class="hint">Master tem acesso a todas as páginas.</span>':sites)+'</div>'+
        '</div>'+
        '<label class="master-toggle"><input type="checkbox" class="uMaster" data-uid="'+esc(u.id)+'" '+(u.is_master?'checked':'')+(isSelf?' disabled':'')+'> Master</label>'+
        '</div>';
    }).join("");
    $$(".uMaster",host).forEach(function(cb){ cb.addEventListener("change",function(){ setMaster(cb.dataset.uid, cb.checked, cb); }); });
    $$(".user-row__sites input[type=checkbox]",host).forEach(function(cb){ cb.addEventListener("change",function(){ togglePermission(cb.dataset.uid, cb.dataset.site, cb.checked, cb); }); });
  }
  function setMaster(uid, val, cb){
    sb.from("profiles").update({ is_master: val }).eq("id",uid).then(function(res){
      if (res.error){ if(cb) cb.checked=!val; reportError(res.error,"Erro ao atualizar o papel."); return; }
      toast(val?"Promovido a Master":"Master removido"); loadUsers();
    });
  }
  function togglePermission(uid, siteId, val, cb){
    var op = val
      ? sb.from("page_permissions").insert({ user_id:uid, site:siteId, granted_by:me.id })
      : sb.from("page_permissions").delete().eq("user_id",uid).eq("site",siteId);
    op.then(function(res){
      if (res.error){ if(cb) cb.checked=!val; reportError(res.error,"Erro ao atualizar a permissão."); return; }
      toast(val?"Acesso concedido":"Acesso removido");
    });
  }

})();
