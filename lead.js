/* NexVita AI — landing "Sistema sob medida para clínicas": formulário + medição.
   - O POST vai para NV_LEAD_CONFIG.endpoint (lead-config.js), Web App novo em /apps-script/.
   - Pixels (Meta 1092369830292295, Google Ads AW-18074257274, GA4 G-KE4MM800WH) só carregam
     em nexvita.ai / www.nexvita.ai e só depois de o visitante aceitar os cookies (LGPD).
   - Em qualquer outro host (preview, localhost) nada é enviado e nenhum evento dispara. */
(function(){
  "use strict";
  var IS_PROD = location.hostname === "nexvita.ai" || location.hostname === "www.nexvita.ai";
  var CFG = window.NV_LEAD_CONFIG || {};
  var GA_ID = "G-KE4MM800WH";
  var AW_ID = "AW-18074257274", AW_LABEL = "jZSiCK-4rrEdEPqOvapD"; /* conversão "Lead formulário site" */
  var PIXEL_ID = "1092369830292295";
  var CONSENT_KEY = "nv_consent_ads";
  var DEFAULT_CAMPAIGN = "sistema_sob_medida";
  var WA_LINK = "https://wa.me/5511936244354?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20quero%20entender%20o%20sistema%20sob%20medida%20para%20a%20minha%20cl%C3%ADnica.";
  var PRIVACY = "https://www.nexvita.com/privacidade/";

  /* ---------- Medição (somente produção + consentimento) ---------- */
  function getConsent(){ try { return localStorage.getItem(CONSENT_KEY); } catch(e){ return null; } }
  function setConsent(v){ try { localStorage.setItem(CONSENT_KEY, v); } catch(e){} }

  function loadTags(){
    if (!IS_PROD || window.__nvTags) return;
    window.__nvTags = 1;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
    window.gtag("config", AW_ID);
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    if (!window.fbq) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,"script","https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", PIXEL_ID);
      window.fbq("track", "PageView");
    }
  }

  /* Dispara só depois do envio do lead (POST feito), em produção e com consentimento. */
  function fireLead(){
    if (!IS_PROD || !window.__nvTags) return;
    if (window.gtag) window.gtag("event", "conversion", { send_to: AW_ID + "/" + AW_LABEL });
    if (window.fbq) window.fbq("track", "Lead");
  }

  function cookieBanner(){
    if (document.getElementById("nv-cookies")) return;
    var b = document.createElement("div");
    b.id = "nv-cookies"; b.className = "cookies";
    b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Aviso de cookies");
    b.innerHTML = '<p>Usamos cookies de medição (Google Analytics) e de anúncios (Google Ads e Meta) para medir nossas campanhas, só com a sua permissão. ' +
      '<a href="' + PRIVACY + '" target="_blank" rel="noopener">Política de privacidade</a>.</p>' +
      '<div class="acoes"><button type="button" class="recusar">Recusar</button>' +
      '<button type="button" class="aceitar">Aceitar</button></div>';
    document.body.appendChild(b);
    b.querySelector(".aceitar").onclick = function(){ setConsent("sim"); b.remove(); loadTags(); };
    b.querySelector(".recusar").onclick = function(){ setConsent("nao"); b.remove(); };
  }

  function initTracking(){
    if (!IS_PROD) return;
    var c = getConsent();
    if (c === "sim") loadTags(); else if (c !== "nao") cookieBanner();
  }

  /* ---------- Formulário ---------- */
  var form = document.getElementById("lead");
  var card = document.getElementById("card");
  if (!form || !card) { initTracking(); return; }
  var btn = form.querySelector('button[type="submit"]');
  var btnLabel = btn ? btn.textContent : "";
  var sending = false;

  var msg = document.createElement("div");
  msg.className = "form-msg"; msg.setAttribute("role", "alert"); msg.hidden = true;
  form.appendChild(msg);

  function showMsg(text){
    msg.textContent = text + " ";
    var a = document.createElement("a");
    a.href = WA_LINK; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Falar no WhatsApp";
    msg.appendChild(a);
    msg.hidden = false;
  }

  function clearField(f){
    var m = f.querySelector(".msg"); if (m) m.remove();
    f.classList.remove("err");
    var el = f.querySelector("input,textarea"); if (el) { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); }
  }
  function setErr(el, text){
    var f = el.parentNode;
    f.classList.add("err");
    el.setAttribute("aria-invalid", "true");
    var s = document.createElement("span");
    s.className = "msg"; s.id = el.id + "-msg"; s.textContent = text;
    el.setAttribute("aria-describedby", s.id);
    f.appendChild(s);
  }

  /* WhatsApp brasileiro: DDD + 8 ou 9 dígitos, com ou sem 55 na frente. Devolve "55..." ou "". */
  function normWhatsapp(v){
    var d = String(v || "").replace(/\D/g, "");
    if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) d = d.slice(2);
    return /^[1-9][1-9](9\d{8}|[2-9]\d{7})$/.test(d) ? "55" + d : "";
  }

  function utmParams(){
    var out = { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "" };
    try {
      var q = new URLSearchParams(location.search);
      for (var k in out) if (q.get(k)) out[k] = q.get(k).slice(0, 200);
    } catch(e) {}
    if (!out.utm_campaign) out.utm_campaign = DEFAULT_CAMPAIGN;
    return out;
  }

  function val(name){ var el = form.elements[name]; return el ? String(el.value || "").trim() : ""; }

  function done(){
    card.classList.add("is-done");
    var d = card.querySelector(".done");
    if (d) { d.setAttribute("tabindex", "-1"); d.focus(); }
  }

  function setSending(on){
    sending = on;
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? "Enviando…" : btnLabel;
  }

  form.querySelectorAll("input,textarea").forEach(function(el){
    el.addEventListener("input", function(){ if (el.parentNode.classList.contains("err")) clearField(el.parentNode); });
  });

  form.addEventListener("submit", function(e){
    e.preventDefault();
    if (sending) return;
    msg.hidden = true;

    var ok = true, first = null;
    ["f-nome", "f-wa", "f-clinica"].forEach(function(id){
      var el = document.getElementById(id);
      clearField(el.parentNode);
      if (!el.value.trim()) { ok = false; setErr(el, "Campo obrigatório"); first = first || el; }
    });
    var waEl = document.getElementById("f-wa");
    var wa = normWhatsapp(waEl.value);
    if (waEl.value.trim() && !wa) { ok = false; setErr(waEl, "Informe um WhatsApp com DDD"); first = first || waEl; }
    if (!ok) { if (first) first.focus(); return; }

    /* Honeypot preenchido = robô: finge sucesso, não envia, não mede. */
    if (val("website")) { done(); return; }

    var u = utmParams();
    var payload = {
      form: "sistema_sob_medida",
      nome: val("nome").slice(0, 120),
      whatsapp: wa,
      clinica: val("clinica").slice(0, 160),
      sistema_atual: val("sistema_atual").slice(0, 160),
      maior_dor: val("maior_dor").slice(0, 2000),
      utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign,
      utm_content: u.utm_content, utm_term: u.utm_term,
      origem: "nexvita.ai — sistema sob medida para clínicas",
      pagina: location.origin + location.pathname,
      honeypot: val("website")
    };

    /* Fora de produção (preview, localhost): nunca envia nem mede; só mostra o pós-envio. */
    if (!IS_PROD) { done(); return; }
    if (CFG.stub) { done(); return; }
    if (!CFG.endpoint || !window.fetch) {
      showMsg("Não foi possível enviar agora. Fale com a gente pelo WhatsApp.");
      return;
    }

    setSending(true);
    fetch(CFG.endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function(){
      fireLead();
      setSending(false);
      done();
    }).catch(function(){
      setSending(false);
      showMsg("Não conseguimos enviar. Tente de novo ou fale com a gente pelo WhatsApp.");
    });
  });

  initTracking();
})();
