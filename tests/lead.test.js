/* Testes locais e sintéticos do formulário da home (lead.js + lead-config.js) e do redirecionamento
   legado de index.html. Rodar: node --test tests/
   - Sem dependências: DOM mínimo falso + vm. fetch é sempre um mock com respostas sintéticas;
     nenhum request real é feito (o fetch global do processo é trocado por um que falha o teste).
   - Pixels/gtag nunca carregam: os <script> só entram no DOM falso, e o teste confere a fila
     (dataLayer / fbq.queue) para ver se a conversão foi preparada.
   - Dados de formulário são fictícios. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const LEAD_JS = fs.readFileSync(path.join(ROOT, "lead.js"), "utf8");
const LEAD_CFG = fs.readFileSync(path.join(ROOT, "lead-config.js"), "utf8");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const FORMSUBMIT = "https://formsubmit.co/ajax/mori@nexvita.com";
const SUBJECT = "Lead nexvita.ai – sistema sob medida";

/* Qualquer tentativa de rede real neste processo derruba o teste. */
const realNetworkCalls = [];
globalThis.fetch = function(url){ realNetworkCalls.push(String(url)); throw new Error("rede real proibida nos testes: " + url); };

/* ---------------- DOM mínimo ---------------- */
function parseSimple(sel){
  const m = /^([a-z]+)?(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/.exec(sel);
  if (!m) throw new Error("seletor não suportado no DOM falso: " + sel);
  return { tag: m[1], id: m[2], cls: m[3], attr: m[4], attrVal: m[5] };
}
class El {
  constructor(tag, o = {}){
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parentNode = null; this.attrs = {}; this.listeners = {};
    this.className = o.className || ""; this.id = o.id || ""; this.name = o.name;
    this.value = o.value || ""; this.textContent = o.text || ""; this.hidden = false; this.disabled = false;
    this.focused = false; this.src = ""; this.async = false; this.ownerDoc = null;
    if (o.type) this.attrs.type = o.type;
  }
  get classList(){
    const self = this, list = () => self.className.split(/\s+/).filter(Boolean);
    return {
      add(c){ const s = new Set(list()); s.add(c); self.className = [...s].join(" "); },
      remove(c){ self.className = list().filter(x => x !== c).join(" "); },
      contains(c){ return list().includes(c); }
    };
  }
  setAttribute(k, v){ this.attrs[k] = String(v); if (k === "id") this.id = String(v); }
  getAttribute(k){ return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k){ delete this.attrs[k]; }
  appendChild(c){ if (c.parentNode) c.remove(); c.parentNode = this; this.children.push(c); this.root()._onInsert && this.root()._onInsert(c); return c; }
  insertBefore(c, ref){ if (c.parentNode) c.remove(); c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? 0 : i, 0, c); this.root()._onInsert && this.root()._onInsert(c); return c; }
  remove(){ if (this.parentNode){ const a = this.parentNode.children; a.splice(a.indexOf(this), 1); this.parentNode = null; } }
  root(){ let n = this; while (n.parentNode) n = n.parentNode; return n; }
  addEventListener(t, fn){ (this.listeners[t] = this.listeners[t] || []).push(fn); }
  focus(){ this.focused = true; }
  descendants(){ const out = []; (function walk(n){ for (const c of n.children){ out.push(c); walk(c); } })(this); return out; }
  matchesOne(s){
    const parts = s.trim().split(/\s+/);
    const test1 = (el, p) => {
      const q = parseSimple(p);
      if (q.tag && el.tagName !== q.tag.toUpperCase()) return false;
      if (q.id && el.id !== q.id) return false;
      if (q.cls && !el.classList.contains(q.cls)) return false;
      if (q.attr){ if (el.getAttribute(q.attr) === null) return false; if (q.attrVal !== undefined && el.getAttribute(q.attr) !== q.attrVal) return false; }
      return true;
    };
    if (!test1(this, parts[parts.length - 1])) return false;
    let i = parts.length - 2, n = this.parentNode;
    while (i >= 0 && n){ if (test1(n, parts[i])) i--; n = n.parentNode; }
    return i < 0;
  }
  matches(sel){ return sel.split(",").some(s => this.matchesOne(s)); }
  querySelector(sel){ return this.descendants().find(e => e.matches(sel)) || null; }
  querySelectorAll(sel){ return this.descendants().filter(e => e.matches(sel)); }
  getElementsByTagName(t){ return this.descendants().filter(e => e.tagName === t.toUpperCase()); }
  set innerHTML(h){
    this.children = [];
    const re = /<(button|a|p|div)\b([^>]*)>/g; let m;
    while ((m = re.exec(h))) { const c = /class="([^"]*)"/.exec(m[2]); this.appendChild(new El(m[1], { className: c ? c[1] : "" })); }
  }
}

function buildPage(){
  const html = new El("html");
  const head = html.appendChild(new El("head"));
  head.appendChild(new El("script")); // já existe ao menos um <script> na página real
  const body = html.appendChild(new El("body"));
  const card = body.appendChild(new El("div", { id: "card", className: "card" }));
  const form = card.appendChild(new El("form", { id: "lead" }));
  const field = (tag, id, name) => { const f = form.appendChild(new El("div", { className: "field" })); return f.appendChild(new El(tag, { id, name })); };
  field("input", "f-nome", "nome");
  field("input", "f-wa", "whatsapp");
  field("input", "f-clinica", "clinica");
  field("input", "f-sistema", "sistema_atual");
  field("textarea", "f-dor", "maior_dor");
  const hp = form.appendChild(new El("div", { className: "hp" })); hp.appendChild(new El("input", { id: "f-website", name: "website" }));
  form.appendChild(new El("button", { className: "btn btn-submit", type: "submit", text: "Quero meu diagnóstico" }));
  form.elements = new Proxy({}, { get: (_, k) => form.descendants().find(e => e.name === k) });
  card.appendChild(new El("div", { className: "done" }));
  const ftr = body.appendChild(new El("footer", { className: "ftr" }));
  ftr.appendChild(new El("div", { className: "wrap" })).appendChild(new El("nav"));

  const injected = [];
  html._onInsert = (c) => { if (c.tagName === "SCRIPT" && c.src) injected.push(c.src); };
  const document = {
    head, body, documentElement: html,
    createElement: (t) => new El(t),
    getElementById: (id) => html.descendants().find(e => e.id === id) || null,
    querySelector: (s) => html.querySelector(s),
    querySelectorAll: (s) => html.querySelectorAll(s),
    getElementsByTagName: (t) => html.getElementsByTagName(t)
  };
  return { document, form, card, injected };
}

/* ---------------- Ambiente de execução ---------------- */
function setup({ hostname = "nexvita.ai", search = "", consent = "sim", fetchImpl } = {}){
  const page = buildPage();
  const store = new Map(); if (consent !== null) store.set("nv_consent_ads", consent);
  const fetchCalls = [];
  const timers = [];
  const ctx = {
    document: page.document,
    location: {
      hostname, search, origin: "https://" + hostname, pathname: "/",
      replace(){ throw new Error("location.replace inesperado"); }, reload(){}
    },
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    URLSearchParams, AbortController, console,
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    fetch: function(url, opts){
      fetchCalls.push({ url: String(url), opts });
      return fetchImpl ? fetchImpl(url, opts) : Promise.reject(new Error("sem mock"));
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(LEAD_CFG, ctx, { filename: "lead-config.js" });
  vm.runInContext(LEAD_JS, ctx, { filename: "lead.js" });
  const fill = (vals) => { for (const [k, v] of Object.entries(vals)) page.form.elements[k].value = v; };
  const submit = () => page.form.listeners.submit.forEach(fn => fn({ preventDefault(){} }));
  const msg = () => page.form.querySelector(".form-msg");
  return { ctx, page, fetchCalls, timers, fill, submit, msg,
    isDone: () => page.card.classList.contains("is-done"),
    conversions(){
      const dl = (ctx.dataLayer || []).map(a => Array.from(a));
      const fq = ctx.fbq && ctx.fbq.queue ? ctx.fbq.queue.map(a => Array.from(a)) : [];
      return {
        aw: dl.filter(a => a[0] === "event" && a[1] === "conversion"),
        meta: fq.filter(a => a[0] === "track" && a[1] === "Lead")
      };
    }
  };
}

const SYNTH = { nome: "Pessoa Teste", whatsapp: "(11) 90000-0000", clinica: "Clinica Ficticia", sistema_atual: "Planilha", maior_dor: "Texto sintetico" };
const flush = () => new Promise(r => setImmediate(r));
const jsonResponse = (ok, status, body) => () => Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

/* ---------------- Testes do formulário ---------------- */
test("config de produção aponta para o FormSubmit AJAX", () => {
  const t = setup({ hostname: "localhost" });
  assert.equal(t.ctx.NV_LEAD_CONFIG.endpoint, FORMSUBMIT);
  assert.equal(t.ctx.NV_LEAD_CONFIG.subject, SUBJECT);
  assert.equal(t.ctx.NV_LEAD_CONFIG.stub, false);
  assert.doesNotMatch(LEAD_JS + LEAD_CFG, /script\.google\.com/);
});

test("sucesso {success:'true'} => pós-envio + conversões preparadas (sem carregar pixel real)", async () => {
  const t = setup({ search: "?utm_source=meta&utm_medium=cpc", fetchImpl: jsonResponse(true, 200, { success: "true", message: "ok" }) });
  // pixels já foram "injetados" no DOM falso por causa do consentimento salvo; nada foi baixado
  assert.ok(t.page.injected.some(u => u.includes("googletagmanager.com")));
  assert.ok(t.page.injected.some(u => u.includes("connect.facebook.net")));
  t.fill(SYNTH); t.submit(); await flush(); await flush();

  assert.equal(t.fetchCalls.length, 1);
  const { url, opts } = t.fetchCalls[0];
  assert.equal(url, FORMSUBMIT);
  assert.equal(opts.method, "POST");
  assert.equal(opts.headers["Content-Type"], "application/json");
  assert.equal(opts.headers["Accept"], "application/json");
  const body = JSON.parse(opts.body);
  assert.equal(body._subject, SUBJECT);
  assert.equal(body._template, "table");
  assert.equal(body._captcha, "false");
  assert.equal(body.nome, SYNTH.nome);
  assert.equal(body.whatsapp, "5511900000000");
  assert.equal(body.clinica, SYNTH.clinica);
  assert.equal(body.sistema_atual, SYNTH.sistema_atual);
  assert.equal(body.maior_dor, SYNTH.maior_dor);
  assert.equal(body.utm_source, "meta");
  assert.equal(body.utm_medium, "cpc");
  assert.equal(body.utm_campaign, "sistema_sob_medida"); // padrão quando a URL não traz
  for (const k of ["utm_content", "utm_term", "origem", "pagina", "honeypot", "_honey"]) assert.ok(k in body, k);
  assert.equal(body.pagina, "https://nexvita.ai/");
  assert.equal(body.honeypot, "");

  assert.equal(t.isDone(), true);
  assert.equal(t.msg().hidden, true);
  const c = t.conversions();
  assert.equal(c.aw.length, 1);
  assert.equal(c.aw[0][2].send_to, "AW-18074257274/jZSiCK-4rrEdEPqOvapD");
  assert.equal(c.meta.length, 1);
});

test("utm_campaign da URL é preservado", async () => {
  const t = setup({ search: "?utm_campaign=outra", fetchImpl: jsonResponse(true, 200, { success: true }) });
  t.fill(SYNTH); t.submit(); await flush(); await flush();
  assert.equal(JSON.parse(t.fetchCalls[0].opts.body).utm_campaign, "outra");
  assert.equal(t.isDone(), true); // String(true) === "true"
});

for (const [nome, impl] of [
  ["{success:'false'}", jsonResponse(true, 200, { success: "false", message: "x" })],
  ["sem campo success", jsonResponse(true, 200, { message: "x" })],
  ["HTTP 500 mesmo com success 'true'", jsonResponse(false, 500, { success: "true" })],
  ["HTTP não-ok com corpo não-JSON", () => Promise.resolve({ ok: false, status: 403, json: () => Promise.reject(new SyntaxError("html")) })],
  ["erro de rede / CORS", () => Promise.reject(new TypeError("Failed to fetch"))]
]) {
  test("falha: " + nome + " => aviso de erro, sem conversão", async () => {
    const t = setup({ fetchImpl: impl });
    t.fill(SYNTH); t.submit(); await flush(); await flush();
    assert.equal(t.fetchCalls.length, 1);
    assert.equal(t.isDone(), false);
    assert.equal(t.msg().hidden, false);
    assert.match(t.msg().textContent, /Não conseguimos enviar/);
    const c = t.conversions();
    assert.equal(c.aw.length, 0); assert.equal(c.meta.length, 0);
    const btn = t.page.form.querySelector('button[type="submit"]');
    assert.equal(btn.disabled, false);
  });
}

test("falha: timeout (abort) => aviso de erro, sem conversão", async () => {
  const t = setup({ fetchImpl: (url, opts) => new Promise((_, rej) => opts.signal.addEventListener("abort", () => rej(new Error("AbortError")))) });
  t.fill(SYNTH); t.submit(); await flush();
  assert.equal(t.isDone(), false);
  t.timers.forEach(fn => fn()); // dispara o timeout de 20 s
  await flush(); await flush();
  assert.equal(t.isDone(), false);
  assert.equal(t.msg().hidden, false);
  const c = t.conversions();
  assert.equal(c.aw.length, 0); assert.equal(c.meta.length, 0);
});

test("produção sem consentimento: lead enviado, pós-envio, mas nenhum pixel nem conversão", async () => {
  const t = setup({ consent: "nao", fetchImpl: jsonResponse(true, 200, { success: "true" }) });
  t.fill(SYNTH); t.submit(); await flush(); await flush();
  assert.equal(t.fetchCalls.length, 1);
  assert.equal(t.isDone(), true);
  assert.deepEqual(t.page.injected, []);
  assert.equal(t.ctx.gtag, undefined); assert.equal(t.ctx.fbq, undefined);
});

test("produção sem decisão: banner aparece; nada carrega antes do aceite; aceitar carrega tags (no DOM falso)", () => {
  const t = setup({ consent: null });
  const banner = t.ctx.document.getElementById("nv-cookies");
  assert.ok(banner);
  assert.deepEqual(t.page.injected, []);
  assert.equal(t.ctx.gtag, undefined);
  banner.querySelector(".aceitar").onclick();
  assert.equal(t.ctx.localStorage.getItem("nv_consent_ads"), "sim");
  assert.ok(t.page.injected.some(u => u.includes("googletagmanager.com")));
});

test("produção: recusar cookies não carrega nada", async () => {
  const t = setup({ consent: null, fetchImpl: jsonResponse(true, 200, { success: "true" }) });
  t.ctx.document.getElementById("nv-cookies").querySelector(".recusar").onclick();
  assert.equal(t.ctx.localStorage.getItem("nv_consent_ads"), "nao");
  t.fill(SYNTH); t.submit(); await flush(); await flush();
  assert.equal(t.isDone(), true);
  assert.deepEqual(t.page.injected, []);
  assert.equal(t.ctx.gtag, undefined); assert.equal(t.ctx.fbq, undefined);
});

test("honeypot preenchido: finge sucesso, sem fetch, sem conversão", async () => {
  const t = setup({ fetchImpl: jsonResponse(true, 200, { success: "true" }) });
  t.fill(Object.assign({ website: "spam" }, SYNTH)); t.submit(); await flush();
  assert.equal(t.fetchCalls.length, 0);
  assert.equal(t.isDone(), true);
  const c = t.conversions(); assert.equal(c.aw.length, 0); assert.equal(c.meta.length, 0);
});

test("validação: WhatsApp inválido não envia", async () => {
  const t = setup({ fetchImpl: jsonResponse(true, 200, { success: "true" }) });
  t.fill(Object.assign({}, SYNTH, { whatsapp: "123" })); t.submit(); await flush();
  assert.equal(t.fetchCalls.length, 0);
  assert.equal(t.isDone(), false);
});

for (const host of ["localhost", "127.0.0.1", "mori1982.github.io", "nexvita.ai.example.com", "preview.nexvita.ai"]) {
  test("host fora de produção (" + host + "): sem fetch, sem pixels, pós-envio local", async () => {
    const t = setup({ hostname: host, consent: "sim", fetchImpl: jsonResponse(true, 200, { success: "true" }) });
    t.fill(SYNTH); t.submit(); await flush(); await flush();
    assert.equal(t.fetchCalls.length, 0);
    assert.deepEqual(t.page.injected, []);
    assert.equal(t.ctx.gtag, undefined); assert.equal(t.ctx.fbq, undefined); assert.equal(t.ctx.__nvTags, undefined);
    assert.equal(t.ctx.document.getElementById("nv-cookies"), null);
    assert.equal(t.isDone(), true);
  });
}

test("www.nexvita.ai também é produção", async () => {
  const t = setup({ hostname: "www.nexvita.ai", fetchImpl: jsonResponse(true, 200, { success: "true" }) });
  t.fill(SYNTH); t.submit(); await flush(); await flush();
  assert.equal(t.fetchCalls.length, 1);
  assert.equal(t.fetchCalls[0].url, FORMSUBMIT);
});

/* ---------------- Redirecionamento legado (index.html) ---------------- */
const EXPECTED_SNIPPET = '<script>/* anúncio Meta antigo aponta para a home: leva à página sob medida */(function(){try{var q=new URLSearchParams(location.search);if(q.get("utm_campaign")==="nvai_trafego_sp"){q.set("utm_campaign","nvai_sob_medida");location.replace("/sob-medida/?"+q.toString());}}catch(e){}})();</script>';

test("index.html contém o snippet idêntico ao de main 5d23bda e mantém a meta de verificação", () => {
  assert.ok(INDEX.includes(EXPECTED_SNIPPET));
  assert.equal(INDEX.split("nvai_trafego_sp").length - 1, 1);
  assert.match(INDEX, /<meta name="facebook-domain-verification" content="fhbb19s7lnmn4mzrc2zc6skjj2ckww" \/>/);
});

test("o redirecionamento não existe em /sob-medida/ nem em /advertising/", () => {
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, "sob-medida", "index.html"), "utf8"), /nvai_trafego_sp/);
  const adv = path.join(ROOT, "advertising");
  for (const f of fs.readdirSync(adv)) if (/\.(html?|js)$/.test(f)) assert.doesNotMatch(fs.readFileSync(path.join(adv, f), "utf8"), /nvai_trafego_sp/);
});

function runRedirect(search){
  const code = EXPECTED_SNIPPET.replace(/^<script>/, "").replace(/<\/script>$/, "");
  const calls = [];
  const ctx = { URLSearchParams, location: { search, replace: (u) => calls.push(u) } };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return calls;
}

test("redirect: utm_campaign=nvai_trafego_sp => /sob-medida/ com nvai_sob_medida, demais params mantidos", () => {
  assert.deepEqual(runRedirect("?utm_source=fb&utm_campaign=nvai_trafego_sp&utm_content=ad1&fbclid=abc"),
    ["/sob-medida/?utm_source=fb&utm_campaign=nvai_sob_medida&utm_content=ad1&fbclid=abc"]);
  assert.deepEqual(runRedirect("?utm_campaign=nvai_trafego_sp"), ["/sob-medida/?utm_campaign=nvai_sob_medida"]);
});

test("redirect: no-op para outras campanhas (inclui sistema_sob_medida) e sem query", () => {
  for (const s of ["", "?utm_campaign=sistema_sob_medida", "?utm_campaign=nvai_sob_medida", "?utm_campaign=NVAI_TRAFEGO_SP",
                   "?utm_campaign=nvai_trafego_sp_2", "?utm_source=nvai_trafego_sp", "?x=1"]) {
    assert.deepEqual(runRedirect(s), [], s);
  }
});

test("nenhuma chamada de rede real aconteceu", () => {
  assert.deepEqual(realNetworkCalls, []);
});
