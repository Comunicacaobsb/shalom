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
  // Social login is intentionally unavailable until provider governance is ready.
  // Keep this deterministic in the UI; never depend on a remote settings request.

  var site = "asasul";          // página atualmente selecionada
  var siteName = "Asa Sul";
  var authMode = "login";
  var routeName = "overview";
  var routeSite = "";
  var routeModule = "";
  var SITE_CATALOG = [
    {id:"root", name:"Raiz / 25 anos", path:"../25anos/", status:"published", type:"readonly", modules:[]},
    {id:"asasul", name:"Shalom Asa Sul", path:"../asasul/", status:"published", type:"editable", modules:["home","schedules","events"], children:[
      {name:"Vida Plena",path:"../asasul/e/vida-plena/"},
      {name:"Kyrios",path:"../asasul/e/kyrios/"},
      {name:"Amare",path:"../asasul/e/amare/"},
      {name:"Missa da Misericórdia",path:"../asasul/e/missa-misericordia/"},
      {name:"Beraká para casais",path:"../asasul/e/beraka-casais/"},
      {name:"Beraká Kids",path:"../asasul/e/beraka-kids/"},
      {name:"Curada: História de Vida",path:"../asasul/e/curada-historia-de-vida/"},
      {name:"És Precioso",path:"../asasul/e/es-precioso/"}
    ]},
    {id:"taguatinga", name:"Shalom Taguatinga", path:"../taguatinga/", status:"published", type:"editable", modules:["home","schedules","events"], children:[
      {name:"Grupo de Oração Aberto",path:"../taguatinga/e/grupo-aberto/"},
      {name:"Grupo de Oração de Casais",path:"../taguatinga/e/grupo-de-casais/"},
      {name:"Grupo de Oração Jovem",path:"../taguatinga/e/grupo-jovem/"},
      {name:"Missa Jovem",path:"../taguatinga/e/missa-jovem/"}
    ]},
    {id:"santamaria", name:"Shalom Santa Maria", path:"../santamaria/", status:"published", type:"editable", modules:["home","schedules","events"], children:[
      {name:"Grupo de Oração de Adultos",path:"../santamaria/e/grupo-de-adultos/"},
      {name:"Grupo de Oração de Jovens",path:"../santamaria/e/grupo-de-jovens/"}
    ]},
    // O cardápio da Lanchonete saiu deste painel (22/10/2026): agora é editado no Portal, módulo Lanchonete.
    {id:"sh82cafe", name:"Lanchonete Shalom | SH82", path:"../asasul/sh82/", status:"published", type:"readonly", modules:[], nota:"O cardápio da Lanchonete agora é editado no Portal, no módulo Lanchonete."},
    {id:"providencia", name:"Providência", path:"../providencia/", status:"published", type:"readonly", modules:[], children:[{name:"Habilidades",path:"../providencia/habilidades/"},{name:"Necessidades",path:"../providencia/necessidades/"}]},
    {id:"adoracao", name:"Adoração", path:"../adoracao/", status:"published", type:"app", modules:[]},
    {id:"acamps", name:"Acamps", path:"../acamps/", status:"published", type:"readonly", modules:[]},
    {id:"eventos", name:"Eventos", path:"../eventos/", status:"development", type:"app", modules:[]},
    {id:"inscricoes", name:"Inscrições", path:"../inscricoes/", status:"development", type:"app", modules:[]},
  ];
  var MODULE_LABELS = { home:"Capa (topo da página)", schedules:"Horários e serviços", events:"Eventos e encontros" };

  // Para cada módulo: o que ele muda, onde isso aparece na página e a âncora
  // que leva direto ao trecho. A miniatura é desenhada em pageThumb().
  var MODULE_META = {
    home: {
      descricao: "A imagem de fundo, o título e a frase de apoio que abrem a página.",
      onde: "no topo da página, na primeira tela que a pessoa vê",
      ancora: "",
      thumbAlt: "Miniatura da página com o topo destacado"
    },
    schedules: {
      descricao: "Os seis cartões de horários: funcionamento, missas, grupos de oração, adoração, serviços e aconselhamento.",
      onde: "logo abaixo do topo, na seção “Horários e serviços”",
      ancora: "#horarios",
      thumbAlt: "Miniatura da página com a faixa de horários destacada"
    },
    events: {
      descricao: "Os cartões do carrossel “Eventos e encontros” e a página de detalhe de cada um.",
      onde: "na seção “Eventos e encontros”, mais abaixo na página",
      ancora: "#eventos",
      thumbAlt: "Miniatura da página com a faixa de eventos destacada"
    }
  };
  var PANEL_BY_MODULE = { home:"#tab-capa", schedules:"#tab-horarios", events:"#tab-eventos" };

  /* ---------- helpers ---------- */
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[c];}); }
  function slugify(s){
    return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
      .replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,60);
  }
  function toast(m){ var t=$("#toast"); if(!t)return; t.textContent=m; t.classList.add("show"); clearTimeout(toast._t); toast._t=setTimeout(function(){t.classList.remove("show");},2200); }
  // ok: true = sucesso, false = erro, "info" = recado neutro (estado vazio).
  function setMsg(el,text,ok){ el.textContent=text||""; el.className="msg "+(ok==="info"?"msg--info":ok?"msg--ok":"msg--err"); }

  var BRL = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" });
  function fmtBRL(n){ return BRL.format(Number(n)||0); }
  function parsePrice(v){
    if (v==null) return 0;
    var s = String(v).trim().replace(/\s/g,"").replace(/r\$/i,"");
    if (s.indexOf(",")!==-1) s = s.replace(/\./g,"").replace(",",".");
    var n = parseFloat(s); return isNaN(n) ? 0 : n;
  }
  function todaySP(){ return new Intl.DateTimeFormat("en-CA",{ timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date()); }
  function fmtSP(value){ if(!value) return ""; var d=new Date(value); if(!isFinite(d.getTime())) return ""; return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d); }
  function spDateTimeToIso(value){ var m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value||""); if(!m) return null; var guess=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]), parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",hour12:false,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).formatToParts(new Date(guess)), p={}; parts.forEach(function(x){p[x.type]=x.value;}); return new Date(guess-(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)-guess)).toISOString(); }
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

  /* ---------- imagens: sempre leves (no máximo 300 KB) ---------- */
  // Toda imagem enviada pelo painel passa por aqui antes de subir. A escada é:
  // reduzir para o tamanho máximo do lugar onde ela aparece, gravar em WebP com
  // qualidade 0,82 e, se ainda passar de 300 KB, baixar a qualidade; esgotadas as
  // qualidades, encolher 20% e recomeçar, até o piso de 800 px. Navegador sem
  // WebP (o toBlob devolve outro tipo) faz a mesma escada em JPEG.
  var IMAGE_LIMIT_BYTES = 300 * 1024;
  var IMAGE_MIN_DIM = 800;
  var IMAGE_QUALITIES = [0.82, 0.72, 0.62, 0.52];
  function imageTooBig(limit){ return "Não foi possível deixar a imagem abaixo de " + Math.round((limit || IMAGE_LIMIT_BYTES) / 1024) + " KB. Use uma imagem menor ou com menos detalhes."; }
  var IMAGE_NOT_IMAGE = "Este arquivo não é uma imagem. Envie um JPG, PNG ou WebP.";
  var IMAGE_UNREADABLE = "Não foi possível ler esta imagem. Tente outro arquivo.";
  var IMAGE_HINT = "JPG, PNG ou WebP. A imagem é ajustada e comprimida automaticamente (até 300 KB).";
  function kbLabel(bytes){ return Math.max(1, Math.round(Number(bytes||0)/1024)) + " KB"; }
  function canvasToBlob(cv, type, quality){
    return new Promise(function(resolve, reject){
      cv.toBlob(function(b){ b ? resolve(b) : reject(new Error(IMAGE_UNREADABLE)); }, type, quality);
    });
  }
  function readImageFile(file){
    return new Promise(function(resolve, reject){
      var img=new Image(), url=URL.createObjectURL(file);
      img.onload = function(){ URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error(IMAGE_UNREADABLE)); };
      img.src = url;
    });
  }
  // compressImage(file, {maxDim, limitBytes}) -> {blob, ext, contentType, width, height, bytes}
  // Rejeita (com mensagem pronta para o usuário) o que não for imagem e o que não
  // couber no limite. Nunca devolve um blob maior que limitBytes.
  function compressImage(file, opts){
    opts = opts || {};
    var maxDim = opts.maxDim || 1600;
    var limit  = opts.limitBytes || IMAGE_LIMIT_BYTES;
    if (!file || String(file.type||"").indexOf("image/") !== 0) return Promise.reject(new Error(IMAGE_NOT_IMAGE));
    return readImageFile(file).then(function(img){
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error(IMAGE_UNREADABLE);
      var type = "image/webp";
      var dim = Math.min(maxDim, Math.max(w, h));   // nunca amplia o original
      function attempt(){
        var scale = dim / Math.max(w, h);
        var cw = Math.max(1, Math.round(w*scale)), ch = Math.max(1, Math.round(h*scale));
        var cv = document.createElement("canvas"); cv.width=cw; cv.height=ch;
        cv.getContext("2d").drawImage(img, 0, 0, cw, ch);
        function quality(i){
          if (i >= IMAGE_QUALITIES.length) return Promise.resolve(null);
          return canvasToBlob(cv, type, IMAGE_QUALITIES[i]).then(function(blob){
            if (type === "image/webp" && blob.type !== "image/webp"){ type = "image/jpeg"; return quality(i); }
            if (blob.size <= limit) return { blob:blob, width:cw, height:ch };
            return quality(i+1);
          });
        }
        return quality(0).then(function(hit){
          if (hit) return hit;
          if (dim <= IMAGE_MIN_DIM) throw new Error(imageTooBig(limit));
          dim = Math.max(IMAGE_MIN_DIM, Math.round(dim*0.8));
          return attempt();
        });
      }
      return attempt().then(function(hit){
        return {
          blob: hit.blob,
          ext: type === "image/webp" ? "webp" : "jpg",
          contentType: type,
          width: hit.width, height: hit.height, bytes: hit.blob.size
        };
      });
    });
  }

  /* ---------- "onde isto aparece na página" ---------- */
  // Miniatura esquemática de uma página (90x120), com o trecho do módulo em azul.
  function pageThumb(module, decorative){
    var quiet = "#DCE6F2", live = "var(--blue)";
    var out = '<rect x=".9" y=".9" width="88.2" height="118.2" rx="7" fill="#FFF" stroke="#C9D5E4" stroke-width="1.6"/>';
    function block(x,y,w,h,fill,rx){ out += '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx==null?2:rx)+'" fill="'+fill+'"/>'; }
    block(10,8,42,5,quiet,2.5);                                     // barra do topo
    block(10,17,70,33, module === "home" ? live : quiet, 3);      // capa
    var s = module === "schedules" ? live : quiet;
    block(10,55,33.5,14,s); block(46.5,55,33.5,14,s);
    block(10,72,33.5,14,s); block(46.5,72,33.5,14,s);
    var e = module === "events" ? live : quiet;
    block(10,92,23,20,e,3); block(33.5,92,23,20,e,3); block(57,92,23,20,e,3);
    var meta = MODULE_META[module] || {};
    var a11y = decorative ? 'aria-hidden="true"' : 'role="img" aria-label="'+esc(meta.thumbAlt || "Miniatura da página")+'"';
    return '<svg class="page-thumb" viewBox="0 0 90 120" focusable="false" '+a11y+'>'+out+'</svg>';
  }
  // Endereço público do trecho que o módulo edita (para o botão "Ver no site").
  function moduleHref(item, module){
    var meta = MODULE_META[module] || {};
    return publicHref(item) + (meta.ancora || "");
  }
  // Faixa "Você está editando …" no topo de um editor.
  function renderEditingContext(hostSel, module){
    var host = $(hostSel); if (!host) return;
    var item = catalogFor(site);
    if (!item){ host.innerHTML = ""; return; }
    var meta = MODULE_META[module] || {};
    host.innerHTML =
      pageThumb(module) +
      '<div class="editing-context__body">' +
        '<p class="editing-context__what">Você está editando <strong>' + esc(MODULE_LABELS[module] || "") + '</strong> da página <strong>' + esc(item.name) + '</strong>.</p>' +
        (meta.onde ? '<p class="editing-context__where">Onde aparece: ' + esc(meta.onde) + '.</p>' : '') +
      '</div>' +
      '<a class="btn btn--sm" href="' + esc(moduleHref(item, module)) + '" target="_blank" rel="noopener">Ver no site<span class="sr-only"> (abre em outra aba)</span></a>';
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
    var usersNav=$("#usersNav"); if (usersNav) usersNav.classList.toggle("hidden", !me.isMaster);
    $("#accountEmail").textContent = email||"";
    $("#accountRole").textContent = me.isMaster ? "Administrador master" : "Editor de páginas autorizadas";
    renderCatalog();
    loadSites().then(function(){ renderRoute(); });
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

  if (!configured) { $("#cfgWarn").classList.remove("hidden"); $("#loginBtn").disabled = true; }

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
    sb.auth.getSession().then(function(res){
      if (res.error) { var w=$("#cfgWarn"); w.classList.remove("hidden"); w.textContent="Não foi possível conectar ao Supabase. Confirme a URL e a chave pública em js/config.js."; return; }
      onSession(res.data && res.data.session);
    }).catch(function(){ var w=$("#cfgWarn"); w.classList.remove("hidden"); w.textContent="Não foi possível conectar ao Supabase. Confirme a configuração em js/config.js."; });
    sb.auth.onAuthStateChange(function(_e, session){ onSession(session); });
  }

  $("#loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    if (!sb) return;
    var btn=$("#loginBtn"); var msg=$("#loginMsg");
    setMsg(msg,"");
    btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Entrando…';
    var email=$("#email").value.trim(), password=$("#password").value;
    var operation = authMode === "signup"
      ? sb.auth.signUp({ email:email, password:password, options:{ data:{ full_name:$("#name").value.trim() }, emailRedirectTo:new URL("./", location.href).href } })
      : sb.auth.signInWithPassword({ email:email, password:password });
    operation
      .then(function(res){
        btn.disabled=false; btn.textContent=authMode === "signup" ? "Criar conta" : "Entrar";
        if (res.error) {
          // Do not reveal whether an e-mail exists in the system.
          setMsg(msg, authMode === "signup" ? "Não foi possível criar a conta. Confira os dados e tente novamente." : "E-mail ou senha inválidos.");
          return;
        }
        if (authMode === "signup") {
          setMsg(msg, "Conta criada. Confirme seu e-mail; depois um administrador aprovará seu acesso.", true);
          $("#loginForm").reset();
        }
      })
      .catch(function(){ btn.disabled=false; btn.textContent=authMode === "signup" ? "Criar conta" : "Entrar"; setMsg(msg,authMode === "signup" ? "Não foi possível criar a conta agora." : "Não foi possível entrar agora."); });
  });

  function setAuthMode(mode){
    authMode=mode;
    var signup=mode === "signup";
    $("#loginHeading").textContent=signup ? "Criar conta" : "Entrar no painel";
    $("#loginIntro").textContent=signup ? "Crie sua identidade para solicitar acesso às páginas." : "Acesse para cuidar do conteúdo das páginas da comunidade.";
    $("#loginBtn").textContent=signup ? "Criar conta" : "Entrar";
    $("#forgotBtn").hidden=signup;
    $("#nameField").hidden=!signup; $("#confirmPasswordField").hidden=!signup; $("#signupNote").hidden=!signup;
    $("#name").required=signup; $("#confirmPassword").required=signup; $("#password").autocomplete=signup ? "new-password" : "current-password";
    $("#loginModeBtn").classList.toggle("is-selected",!signup); $("#signupModeBtn").classList.toggle("is-selected",signup);
    $("#loginModeBtn").setAttribute("aria-pressed",String(!signup)); $("#signupModeBtn").setAttribute("aria-pressed",String(signup));
    setMsg($("#loginMsg"),"");
  }
  $("#loginModeBtn").addEventListener("click",function(){setAuthMode("login");});
  $("#signupModeBtn").addEventListener("click",function(){setAuthMode("signup");});
  $("#confirmPassword").addEventListener("input",function(){
    if(authMode === "signup" && $("#password").value !== this.value) this.setCustomValidity("As senhas precisam ser iguais."); else this.setCustomValidity("");
  });
  $("#password").addEventListener("input",function(){ $("#confirmPassword").dispatchEvent(new Event("input")); });

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

  /* ---------- hub-and-spoke routing and catalog ---------- */
  function catalogFor(id){ return SITE_CATALOG.filter(function(item){ return item.id===id; })[0]; }
  function canEditCatalogItem(item){ return !!(item && item.modules && item.modules.length && (me.isMaster || me.allowedSites.indexOf(item.id)!==-1)); }
  function statusLabel(status){ return status === "published" ? "Publicada" : status === "development" ? "Em desenvolvimento" : "Arquivada"; }
  function typeLabel(type){ return type === "editable" ? "Editável" : type === "app" ? "App separado" : "Somente visualização"; }
  function publicHref(item){ return item.path || "../"; }
  function renderCatalog(){
    var map=$("#siteMap"), pages=$("#editablePages"), overview=$("#overviewGrid");
    if(!map || !pages) return;
    map.innerHTML=SITE_CATALOG.filter(function(i){return !i.parent;}).map(function(item){
      var children=(item.children||[]).map(function(c){return '<li><a href="'+esc(c.path)+'" target="_blank" rel="noopener">'+esc(c.name)+'</a></li>';}).join("");
      return '<article class="site-map-row"><div class="site-map-main"><div><h2>'+esc(item.name)+'</h2><p>'+esc(statusLabel(item.status))+' · '+esc(typeLabel(item.type))+'</p></div></div><div class="site-map-actions"><span class="module-summary">'+(item.modules.length ? item.modules.map(function(m){return esc(MODULE_LABELS[m]);}).join(" · ") : esc(item.nota || "Sem módulo conectado"))+'</span><a class="btn btn--sm" href="'+esc(publicHref(item))+'" target="_blank" rel="noopener">Ver página</a>'+(canEditCatalogItem(item)?'<a class="btn btn--sm btn--primary" href="#page/'+esc(item.id)+'">Abrir edição</a>':'')+'</div>'+(children?'<ul class="site-map-children">'+children+'</ul>':'')+'</article>';
    }).join("");
    var editable=SITE_CATALOG.filter(function(i){return canEditCatalogItem(i);});
    pages.innerHTML=editable.length ? editable.map(function(item){return '<a class="editable-page-row" href="#page/'+esc(item.id)+'"><div><h2>'+esc(item.name)+'</h2><p>'+esc(statusLabel(item.status))+' · '+item.modules.length+' módulo'+(item.modules.length===1?'':'s')+'</p></div><div class="module-chips">'+item.modules.map(function(m){return '<span class="module-chip">'+esc(MODULE_LABELS[m])+'</span>';}).join("")+'</div><span class="row-action">Abrir</span></a>';}).join(""):'<div class="empty-state"><h2>Nenhuma página editável disponível</h2><p>Quando uma página for autorizada para sua conta, ela aparecerá aqui.</p></div>';
    if(overview){ overview.innerHTML=editable.length ? '<div class="editorial-list"><h2>Páginas autorizadas para você</h2>'+editable.map(function(item){return '<a href="#page/'+esc(item.id)+'"><span><strong>'+esc(item.name)+'</strong><small>'+item.modules.map(function(m){return esc(MODULE_LABELS[m]);}).join(" · ")+'</small></span><span class="row-action">Abrir</span></a>';}).join("")+'</div>' : '<div class="empty-state"><h2>Nenhuma página autorizada</h2><p>Um administrador precisa conceder acesso a uma página antes da edição.</p></div>'; }
  }
  function renderPageWorkspace(id, module){
    var item=catalogFor(id); if(!item || !canEditCatalogItem(item)){ route("pages"); return; }
    if(routeModule && item.modules.indexOf(routeModule)===-1){ route("page/"+item.id); return; }
    site=id; siteName=item.name; updateChips(); routeSite=id; routeModule=module||"";
    $("#workspaceTitle").textContent=item.name; $("#workspaceDescription").textContent="Escolha somente um módulo suportado por esta página.";
    $("#workspacePublicLink").href=publicHref(item);
    var switcher=$("#workspaceSwitcher"), modules=$("#workspaceModules");
    switcher.innerHTML=item.modules.map(function(m){var meta=MODULE_META[m]||{};return '<a id="workspace-'+m+'-link" class="workspace-module-link '+(routeModule===m?'is-selected':'')+'" href="#page/'+esc(item.id)+'/'+esc(m)+'" title="'+esc(meta.descricao||"")+'">'+pageThumb(m,true)+esc(MODULE_LABELS[m])+'</a>';}).join("");
    modules.innerHTML=item.modules.map(function(m){var meta=MODULE_META[m]||{};return '<div class="workspace-module '+(routeModule===m?'is-current':'')+'" data-workspace-module="'+esc(m)+'"><div class="workspace-module__head"><div class="workspace-module__thumb">'+pageThumb(m)+'</div><div class="workspace-module__body"><h2>'+esc(MODULE_LABELS[m])+'</h2><p>'+esc(meta.descricao||"Edite os dados publicados nesta página.")+'</p></div></div><a class="btn btn--primary" href="#page/'+esc(item.id)+'/'+esc(m)+'">Abrir editor</a></div>';}).join("");
    $("#legacyWorkspaceLabel").textContent=item.name;
    $$(".legacy-panel").forEach(function(p){p.classList.remove("is-editor-visible");p.classList.add("hidden");});
    if(routeModule){
      var target=$(PANEL_BY_MODULE[routeModule]||"");
      if(target){ target.classList.remove("hidden"); target.classList.add("is-editor-visible"); target.setAttribute("aria-hidden","false"); }
      if(routeModule === "home"){ renderEditingContext("#capaContext","home"); loadCapa(); }
      if(routeModule === "schedules"){ renderEditingContext("#horariosContext","schedules"); loadSchedules(); }
      if(routeModule === "events"){ renderEditingContext("#eventosContext","events"); loadEvents(); }
      modules.innerHTML='<div class="active-editor-note"><a href="#page/'+esc(item.id)+'">Voltar para '+esc(item.name)+'</a><p>Editor de '+esc(MODULE_LABELS[routeModule])+'.</p></div>';
    }
  }
  function route(next){ location.hash=next.charAt(0)==="#"?next:"#"+next; }
  function renderRoute(){
    if(!appView || appView.classList.contains("hidden")) return;
    var raw=location.hash.replace(/^#/,'')||"overview", bits=raw.split("/");
    routeName=bits[0]||"overview"; routeSite=bits[1]||""; routeModule=bits[2]||"";
    if(routeName==="page"){
      $$(".admin-view").forEach(function(v){v.classList.toggle("hidden",v.dataset.view!=="page");});
      renderPageWorkspace(routeSite,routeModule); updateBreadcrumbs("Páginas editáveis / "+(catalogFor(routeSite)||{name:"Página"}).name);
      $$('[data-route]').forEach(function(a){var active=a.dataset.route==="pages";a.classList.toggle("is-active",active);if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
      return;
    }
    $$(".legacy-panel").forEach(function(p){p.classList.remove("is-editor-visible");p.classList.add("hidden");});
    if(routeName==="users" && !me.isMaster){ route("pages"); return; }
    var allowed=["overview","sitemap","pages","users","account"].indexOf(routeName)!==-1?routeName:"overview";
    $$(".admin-view").forEach(function(v){v.classList.toggle("hidden",v.dataset.view!==allowed);});
    if(allowed==="sitemap"||allowed==="pages"||allowed==="overview") renderCatalog();
    if(allowed==="users") loadUsers();
    updateBreadcrumbs({overview:"Visão geral",sitemap:"Mapa do site",pages:"Páginas editáveis",users:"Usuários e acessos",account:"Minha conta"}[allowed]);
    $$("[data-route]").forEach(function(a){var active=a.dataset.route===allowed;a.classList.toggle("is-active",active);if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  }
  function updateBreadcrumbs(label){ var b=$("#breadcrumbs"); if(b) b.innerHTML='<a href="#overview">Administração</a><span aria-hidden="true">/</span><span>'+esc(label||"Visão geral")+'</span>'; }
  window.addEventListener("hashchange",renderRoute);
  $$("[data-route]").forEach(function(a){a.addEventListener("click",function(){if($("#adminRail")) $("#adminRail").classList.remove("is-open");$("#mobileNavBtn").setAttribute("aria-expanded","false");});});
  $("#mobileNavBtn").addEventListener("click",function(){var rail=$("#adminRail"), open=rail.classList.toggle("is-open");this.setAttribute("aria-expanded",String(open));});
  $("#mobileLogoutBtn").addEventListener("click",function(){if(sb) sb.auth.signOut();});
  $("#accountLogoutBtn").addEventListener("click",function(){if(sb) sb.auth.signOut();});
  $$('[data-page-filter]').forEach(function(btn){ btn.addEventListener("click",function(){
    $$('[data-page-filter]').forEach(function(other){other.classList.toggle("is-selected",other===btn);});
    var rows=$$(".editable-page-row"); rows.forEach(function(row){row.hidden=btn.dataset.pageFilter==="editable" ? !row.querySelector(".module-chip") : false;});
  }); });

  /* ---------- seletor de página (site) ---------- */
  var siteSelect = $("#siteSelect"), siteOptions = $("#siteOptions"), siteRows = [];
  var activeTab = "eventos";
  function updateChips(){ ["#siteChip","#siteChip2","#siteChip4"].forEach(function(sel){ var el=$(sel); if(el) el.textContent = siteName; }); }
  function loadSites(){
    if (!sb) return Promise.resolve([]);
    return sb.from("sites").select("id,name").order("name").then(function(res){
      var rows = (res.data && res.data.length) ? res.data : [{ id:"asasul", name:"Asa Sul" }];
      // Não-master só vê os sites que tem permissão. Master vê todos.
      if (!me.isMaster) rows = rows.filter(function(r){ return me.allowedSites.indexOf(r.id) !== -1; });
      if (!rows.length) rows = [{ id:"asasul", name:"Asa Sul" }];
      siteRows = rows;
      siteOptions.innerHTML = rows.map(function(r){ return '<button type="button" class="choice-menu__option" role="option" data-site="'+esc(r.id)+'" aria-selected="false">'+esc(r.name)+'</button>'; }).join("");
      // mantém asasul como padrão se existir (e permitido)
      var hashParts = (location.hash || "").replace(/^#/, "").split("/");
      var requestedId = hashParts[0] === "page" ? hashParts[1] : routeSite;
      var requested = requestedId && rows.filter(function(r){return r.id===requestedId;})[0];
      var def = requested || rows.filter(function(r){return r.id==="asasul";})[0] || rows[0];
      site = def.id; siteName = def.name; siteSelect.textContent = siteName;
      siteOptions.querySelectorAll("[data-site]").forEach(function(b){ b.setAttribute("aria-selected", String(b.dataset.site===site)); });
      updateChips(); buildSchedGrid();
      return rows;
    });
  }
  function chooseSite(next){
    var chosen = siteRows.filter(function(r){ return r.id===next; })[0];
    if (!chosen) return;
    site = chosen.id; siteName = chosen.name; siteSelect.textContent = siteName;
    siteOptions.querySelectorAll("[data-site]").forEach(function(b){ b.setAttribute("aria-selected", String(b.dataset.site===site)); });
    siteOptions.hidden=true; siteSelect.setAttribute("aria-expanded","false");
    updateChips(); route("page/"+site);
  }
  function toggleChoice(trigger, options, open){
    options.hidden=!open; trigger.setAttribute("aria-expanded",String(open));
    if(open){ var selected=options.querySelector('[aria-selected="true"]') || options.querySelector("[role=option]"); if(selected) selected.focus(); }
  }
  siteSelect.addEventListener("click", function(){ toggleChoice(siteSelect,siteOptions,siteOptions.hidden); });
  siteOptions.addEventListener("click", function(e){ var b=e.target.closest("[data-site]"); if (b) chooseSite(b.dataset.site); });
  document.addEventListener("click", function(e){ if (!$("#siteMenu").contains(e.target)){ siteOptions.hidden=true; siteSelect.setAttribute("aria-expanded","false"); } });
  siteOptions.addEventListener("keydown", function(e){ var opts=$$('[data-site]',siteOptions), i=opts.indexOf(document.activeElement); if(e.key==="Escape"){e.preventDefault();toggleChoice(siteSelect,siteOptions,false);siteSelect.focus();} if(e.key==="Home"){e.preventDefault();opts[0].focus();} if(e.key==="End"){e.preventDefault();opts[opts.length-1].focus();} if(e.key==="ArrowDown"){e.preventDefault();(opts[i+1]||opts[0]).focus();} if(e.key==="ArrowUp"){e.preventDefault();(opts[i-1]||opts[opts.length-1]).focus();} if(e.key==="Enter"&&document.activeElement.dataset.site) chooseSite(document.activeElement.dataset.site); });

  /* ---------- tabs ---------- */
  var PANELS = ["capa","eventos","horarios","usuarios"];
  $$(".tab").forEach(function(t){
    t.addEventListener("click", function(){
      if (t.classList.contains("hidden")) return;
      activeTab = t.dataset.tab;
      $$(".tab").forEach(function(x){ x.setAttribute("aria-selected", String(x===t)); });
      PANELS.forEach(function(name){
        var el = $("#tab-"+name);
        if (el) el.classList.toggle("hidden", name !== activeTab);
      });
      if (activeTab==="usuarios") loadUsers();
    });
  });

  /* =====================================================================
     CAPA (topo da página) — settings.home, com prévia ao vivo
     ===================================================================== */
  var capaTitulo=$("#capa-titulo"), capaSub=$("#capa-subtitulo");
  var capaImgUrl=$("#capa-image-url"), capaImgAlt=$("#capa-image-alt");
  var capaPreview=$("#capaPreview");
  var CAPA_HINT = "Foto na horizontal, de preferência com 1600 px de largura ou mais. " + IMAGE_HINT;

  // Nome curto do centro, para o texto alternativo da imagem.
  function capaAltPadrao(){ return "Centro de Evangelização " + String(siteName||"").replace(/^Shalom\s+/i,""); }
  function drawCapaPreview(){
    if (!capaPreview) return;
    var titulo=(capaTitulo.value||"").replace(/[ \t]+\n/g,"\n").trim();
    var sub=(capaSub.value||"").trim();
    var img=(capaImgUrl.value||"").trim();
    $("#capaPreviewTitle").textContent = titulo || "Título da capa";
    $("#capaPreviewSub").textContent = sub;
    var el=capaPreview.querySelector(".capa-preview__img");
    if (img){
      if (!el){ el=document.createElement("img"); el.className="capa-preview__img"; el.alt=""; capaPreview.insertBefore(el, capaPreview.firstChild); }
      if (el.getAttribute("src") !== img) el.setAttribute("src", img);
      capaPreview.classList.remove("capa-preview--nophoto");
    } else {
      if (el) el.remove();
      capaPreview.classList.add("capa-preview--nophoto");
    }
    $("#capa-image-clear").disabled = !img;
  }
  function setCapaFields(v){
    v = v || {};
    capaTitulo.value = v.titulo || "";
    capaSub.value = v.subtitulo || "";
    capaImgUrl.value = v.imagem || "";
    capaImgAlt.value = v.imagem_alt || "";
    drawCapaPreview();
  }
  if (capaTitulo){
    capaTitulo.addEventListener("input", drawCapaPreview);
    capaSub.addEventListener("input", drawCapaPreview);
  }

  function loadCapa(){
    if (!sb) return;
    var target=site;
    setCapaFields({});
    setMsg($("#capaMsg"), "Carregando a capa desta página…", "info");
    $("#capa-upload-status").textContent = CAPA_HINT;
    sb.from("settings").select("value").eq("site",site).eq("key","home").limit(1).then(function(res){
      if (target !== site) return;
      setMsg($("#capaMsg"), "");
      if (res.error){ setMsg($("#capaMsg"), "Não foi possível carregar a capa: "+res.error.message); return; }
      var row = res.data && res.data[0] && res.data[0].value;
      if (row && (row.titulo || row.subtitulo || row.imagem)){ setCapaFields(row); return; }
      setCapaFields({});
      setMsg($("#capaMsg"), "Nenhuma capa salva ainda. Escreva o título e a frase de apoio e clique em Salvar capa.", "info");
    }).catch(function(){
      if (target !== site) return;
      setMsg($("#capaMsg"), "Não foi possível carregar a capa. Verifique a conexão e tente de novo.");
    });
  }

  if ($("#capa-upload-btn")) $("#capa-upload-btn").addEventListener("click", function(){ $("#capa-image-file").click(); });
  if ($("#capa-image-clear")) $("#capa-image-clear").addEventListener("click", function(){
    capaImgUrl.value=""; drawCapaPreview();
    $("#capa-upload-status").textContent = "Imagem removida. Clique em Salvar capa para aplicar no site.";
    capaTitulo.focus();
  });
  if ($("#capa-image-file")) $("#capa-image-file").addEventListener("change", function(){
    var file=this.files && this.files[0]; this.value="";
    if (!file || !sb) return;
    var status=$("#capa-upload-status"), target=site;
    status.textContent="Preparando a imagem…";
    compressImage(file, { maxDim:1920, limitBytes:IMAGE_LIMIT_BYTES }).then(function(out){
      status.textContent="Enviando a imagem ("+kbLabel(out.bytes)+")…";
      var path=target+"/capa-"+Date.now()+"."+out.ext;
      return sb.storage.from("eventos").upload(path, out.blob, { upsert:true, cacheControl:"3600", contentType:out.contentType }).then(function(res){
        if (res.error){
          if (isRlsError(res.error)){ status.textContent="Sem permissão para enviar imagem nesta página."; toast("Sem permissão para editar esta página."); }
          else status.textContent="Não foi possível enviar a imagem: "+res.error.message;
          return;
        }
        if (target !== site) return;
        var pub=sb.storage.from("eventos").getPublicUrl(path);
        capaImgUrl.value = (pub && pub.data && pub.data.publicUrl) || "";
        if (!capaImgAlt.value) capaImgAlt.value = capaAltPadrao();
        drawCapaPreview();
        status.textContent="Imagem enviada ("+kbLabel(out.bytes)+"). Clique em Salvar capa para aplicar no site.";
      });
    }).catch(function(err){ status.textContent=(err && err.message) || "Não foi possível preparar a imagem. Tente outro arquivo."; });
  });

  if ($("#saveCapaBtn")) $("#saveCapaBtn").addEventListener("click", function(){
    if (!sb) return;
    var btn=this, msg=$("#capaMsg");
    var titulo=(capaTitulo.value||"").split("\n").map(function(l){return l.trim();}).filter(Boolean).join("\n");
    if (!titulo){ setMsg(msg,"Escreva o título da capa antes de salvar."); capaTitulo.focus(); return; }
    var imagem=(capaImgUrl.value||"").trim();
    var value={
      titulo: titulo,
      subtitulo: (capaSub.value||"").trim(),
      imagem: imagem,
      imagem_alt: imagem ? ((capaImgAlt.value||"").trim() || capaAltPadrao()) : ""
    };
    capaTitulo.value = titulo; drawCapaPreview();
    btn.disabled=true; setMsg(msg,"Salvando…",true);
    sb.from("settings").upsert({ site:site, key:"home", value:value, updated_at:new Date().toISOString() }, { onConflict:"site,key" })
      .then(function(res){
        btn.disabled=false;
        if (res.error){
          if (isRlsError(res.error)){ setMsg(msg,"Sem permissão para editar esta página."); toast("Sem permissão para editar esta página."); }
          else setMsg(msg,"Erro ao salvar: "+res.error.message);
          return;
        }
        setMsg(msg,"Capa salva! A página já mostra estes textos.",true); toast("Capa salva");
      })
      .catch(function(){ btn.disabled=false; setMsg(msg,"Não foi possível salvar agora. Tente de novo."); });
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
  function fillSched(val){
    val = val || {};
    CATS.forEach(function(c){
      var ta=$("#sch-"+c.key); if(!ta) return;
      var arr=val[c.key]||[];
      ta.value = Array.isArray(arr) ? arr.join("\n") : "";
    });
  }
  function loadSchedules(){
    if (!sb) return;
    var target=site;
    setMsg($("#schedMsg"), "Carregando os horários desta página…", "info");
    sb.from("settings").select("value").eq("site",site).eq("key","schedules").limit(1).then(function(res){
      if (target !== site) return;
      setMsg($("#schedMsg"), "");
      if (res.error){ setMsg($("#schedMsg"), "Não foi possível carregar os horários: "+res.error.message); return; }
      var val = res.data && res.data[0] && res.data[0].value;
      if (val && Object.keys(val).length){ fillSched(val); return; }
      fillSched({});
      setMsg($("#schedMsg"), "Nenhum horário salvo ainda. Preencha e clique em Salvar horários.", "info");
    }).catch(function(){
      if (target !== site) return;
      setMsg($("#schedMsg"), "Não foi possível carregar os horários. Verifique a conexão e tente de novo.");
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
    var target=site;
    listEl.innerHTML='<p class="center" style="color:var(--ink-faint)">Carregando…</p>';
    sb.from("events").select("*").eq("site",site).order("position",{ascending:true}).then(function(res){
      if (target !== site) return;
      if (res.error){ listEl.innerHTML='<p class="notice notice--err">Erro ao carregar: '+esc(res.error.message)+'</p>'; return; }
      currentEvents = res.data||[];
      renderList();
    }).catch(function(){
      if (target !== site) return;
      listEl.innerHTML='<p class="notice notice--err">Não foi possível carregar os eventos. Verifique a conexão e tente novamente.</p>';
    });
  }

  function renderList(){
    if (!currentEvents.length){
      listEl.innerHTML = '<p class="center" style="color:var(--ink-faint)">Nenhum evento nesta página ainda. Clique em "Novo evento".</p>';
      return;
    }
    listEl.innerHTML = currentEvents.map(function(ev,i){
      var thumb = ev.image_url ? '<img class="ev-row__thumb" src="'+esc(ev.image_url)+'" alt="">'
        : '<div class="ev-row__thumb">'+esc((ev.badge||"Evento"))+'</div>';
      var now = Date.now(), starts = ev.publish_at ? Date.parse(ev.publish_at) : NaN, ends = ev.unpublish_at ? Date.parse(ev.unpublish_at) : NaN;
      var active = ev.published && (!isFinite(starts) || starts <= now) && (!isFinite(ends) || ends > now);
      var status = !ev.published ? "Rascunho" : active ? "Publicado agora" : starts > now ? "Agendado" : "Encerrado";
      var pub = '<span class="badge-pill '+(active?'badge-on':'badge-off')+'">'+status+'</span>';
      var timing = (ev.publish_at ? " · publica "+fmtSP(ev.publish_at) : "") + (ev.unpublish_at ? " · retira "+fmtSP(ev.unpublish_at) : "");
      return '<div class="ev-row">'+thumb+
        '<div class="ev-row__main"><h3>'+esc(ev.title)+'</h3>'+
          '<div class="ev-row__meta">'+esc(ev.date_text||"")+(ev.date_text&&ev.location?" · ":"")+esc(ev.location||"")+' &nbsp; '+pub+esc(timing)+'</div></div>'+
        '<div class="ev-row__actions">'+
          '<button class="icon-btn" data-up="'+i+'" title="Subir" aria-label="Subir evento" '+(i===0?"disabled":"")+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>'+
          '<button class="icon-btn" data-down="'+i+'" title="Descer" aria-label="Descer evento" '+(i===currentEvents.length-1?"disabled":"")+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>'+
          '<button class="icon-btn" data-edit="'+ev.id+'" title="Editar" aria-label="Editar evento"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'+
          '<button class="icon-btn" data-del="'+ev.id+'" title="Excluir" aria-label="Excluir evento"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>'+
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
  var EV_HINT = "Recomendado retrato (4:5). " + IMAGE_HINT;
  function ensureQuill(){
    if (quill || !window.Quill) return;
    quill = new Quill("#ev-editor", {
      theme:"snow",
      placeholder:"Escreva os detalhes do evento…",
      modules:{ toolbar:[[{header:2},{header:3}],["bold","italic"],[{list:"ordered"},{list:"bullet"}],["link"],["clean"]] }
    });
  }

  function setPreview(url){
    var p=$("#ev-preview");
    if (url) p.innerHTML='<img src="'+esc(url)+'" alt="">'; else p.textContent="sem imagem";
    $("#ev-image-url").value=url||"";
  }

  var lastModalFocus=null;
  function focusModal(el){
    lastModalFocus=document.activeElement; el.classList.remove("hidden"); var first=el.querySelector("input:not([type=hidden]), textarea, button:not([disabled])"); if(first) setTimeout(function(){first.focus();},0);
  }
  function trapModalFocus(el,e){
    if(e.key!=="Tab" || el.classList.contains("hidden")) return;
    var nodes=$$("input:not([type=hidden]), textarea, button:not([disabled]), a[href]",el).filter(function(n){return n.offsetParent!==null;}); if(!nodes.length)return;
    var first=nodes[0], last=nodes[nodes.length-1]; if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();} else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
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
    $("#ev-publish-at").value = ev && ev.publish_at ? toLocalInput(ev.publish_at) : "";
    $("#ev-unpublish-at").value = ev && ev.unpublish_at ? toLocalInput(ev.unpublish_at) : "";
    setPublishedChoice($("#ev-published").value);
    setPreview(ev ? ev.image_url : "");
    $("#ev-upload-status").textContent = EV_HINT;
    if (quill) quill.root.innerHTML = ev ? (ev.description||"") : "";
    focusModal(modal);
  }
  function toLocalInput(value){ var d=new Date(value); if(!isFinite(d.getTime())) return ""; var a=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d), o={}; a.forEach(function(x){o[x.type]=x.value;}); return o.year+"-"+o.month+"-"+o.day+"T"+o.hour+":"+o.minute; }
  function toIsoOrNull(value){ return spDateTimeToIso(value); }
  function setPublishedChoice(value){ $("#ev-published").value=String(value)==="true" ? "true" : "false"; $$("[data-published]").forEach(function(b){ b.classList.toggle("is-selected",b.dataset.published===$("#ev-published").value); b.setAttribute("aria-pressed",String(b.dataset.published===$("#ev-published").value)); }); }
  function closeModal(){ modal.classList.add("hidden"); if(lastModalFocus&&lastModalFocus.focus) lastModalFocus.focus(); }

  $("#newEventBtn").addEventListener("click", function(){ openModal(null); });
  $("#modalClose").addEventListener("click", closeModal);
  $("#modalCancel").addEventListener("click", closeModal);
  modal.addEventListener("click", function(e){ if (e.target===modal) closeModal(); });
  modal.addEventListener("keydown", function(e){ if(e.key==="Escape") closeModal(); else trapModalFocus(modal,e); });

  $("#ev-title").addEventListener("input", function(){
    var slugEl=$("#ev-slug");
    if (!slugEl.dataset.touched) slugEl.value = slugify(this.value);
  });
  $("#ev-slug").addEventListener("input", function(){ this.dataset.touched="1"; this.value=slugify(this.value); });
  $$('[data-published]').forEach(function(b){ b.addEventListener("click",function(){ setPublishedChoice(b.dataset.published); }); });

  $("#ev-upload-btn").addEventListener("click", function(){ $("#ev-image-file").click(); });
  $("#ev-image-clear").addEventListener("click", function(){ setPreview(""); });
  $("#ev-image-file").addEventListener("change", function(){
    var file=this.files && this.files[0]; this.value="";
    if (!file || !sb) return;
    var status=$("#ev-upload-status"), target=site;
    status.textContent="Preparando a imagem…";
    var base=slugify($("#ev-slug").value||$("#ev-title").value||"evento")||"evento";
    compressImage(file, { maxDim:1200, limitBytes:IMAGE_LIMIT_BYTES }).then(function(out){
      status.textContent="Enviando a imagem ("+kbLabel(out.bytes)+")…";
      var path=target+"/"+base+"-"+Date.now()+"."+out.ext;
      return sb.storage.from("eventos").upload(path, out.blob, { upsert:true, cacheControl:"3600", contentType:out.contentType }).then(function(res){
        if (res.error){
          if (isRlsError(res.error)){ status.textContent="Sem permissão para enviar imagem nesta página."; toast("Sem permissão para editar esta página."); }
          else status.textContent="Não foi possível enviar a imagem: "+res.error.message;
          return;
        }
        var pub=sb.storage.from("eventos").getPublicUrl(path);
        setPreview((pub && pub.data && pub.data.publicUrl) || "");
        status.textContent="Imagem enviada ("+kbLabel(out.bytes)+").";
      });
    }).catch(function(err){ status.textContent=(err && err.message) || "Não foi possível preparar a imagem. Tente outro arquivo."; });
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
      publish_at: toIsoOrNull($("#ev-publish-at").value),
      unpublish_at: toIsoOrNull($("#ev-unpublish-at").value),
      position: parseInt($("#ev-position").value,10)||0,
      updated_at:new Date().toISOString()
    };
    if (row.description === "<p><br></p>") row.description="";
    if (row.publish_at && row.unpublish_at && new Date(row.unpublish_at) <= new Date(row.publish_at)) { setMsg(msg,"A retirada deve acontecer depois da publicação."); return; }

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
