/**
 * NexVita AI — leads da landing "Sistema sob medida para clínicas" (nexvita.ai).
 * Web App novo, separado do quiz do diagnostico.nexvita.com (aquele exige
 * especialidade, consentimento e q1–q15; este recebe outros campos e outra planilha).
 *
 * Recebe POST com corpo JSON enviado como text/plain ("simple request", sem preflight) e
 * acrescenta uma linha na aba "Leads". Responde {ok:true} ou {ok:false,error}; o site lê a
 * resposta e só mostra o pós-envio e dispara as conversões com ok:true. Ver README.md.
 *
 * Propriedades do script (opcionais, Configurações do projeto > Propriedades do script):
 *   SHEET_ID   id da planilha de destino; vazio = planilha à qual o script está vinculado
 *   SHEET_NAME nome da aba (padrão "Leads")
 */

var HEADERS = [
  'timestamp', 'nome', 'whatsapp', 'clinica', 'sistema_atual', 'maior_dor',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'origem', 'pagina', 'honeypot'
];
var DEFAULT_CAMPAIGN = 'sistema_sob_medida';
var LIMITS = {
  nome: 120, whatsapp: 20, clinica: 160, sistema_atual: 160, maior_dor: 2000,
  utm_source: 200, utm_medium: 200, utm_campaign: 200, utm_content: 200, utm_term: 200,
  origem: 120, pagina: 300, honeypot: 200
};

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'invalid_json' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json_({ ok: false, error: 'invalid_json' });
  }

  // Honeypot preenchido: responde ok e não grava nada.
  if (str_(data.honeypot) || str_(data.website)) {
    return json_({ ok: true });
  }

  var row = {
    nome: str_(data.nome),
    whatsapp: normWhatsapp_(data.whatsapp),
    clinica: str_(data.clinica),
    sistema_atual: str_(data.sistema_atual),
    maior_dor: str_(data.maior_dor),
    utm_source: str_(data.utm_source),
    utm_medium: str_(data.utm_medium),
    utm_campaign: str_(data.utm_campaign) || DEFAULT_CAMPAIGN,
    utm_content: str_(data.utm_content),
    utm_term: str_(data.utm_term),
    origem: str_(data.origem) || 'nexvita.ai — sistema sob medida para clínicas',
    pagina: str_(data.pagina),
    honeypot: ''
  };

  var missing = [];
  if (!row.nome) missing.push('nome');
  if (!str_(data.whatsapp)) missing.push('whatsapp');
  if (!row.clinica) missing.push('clinica');
  if (missing.length) return json_({ ok: false, error: 'missing_fields', fields: missing });
  if (!row.whatsapp) return json_({ ok: false, error: 'invalid_whatsapp' });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }
  try {
    var sheet = sheet_();
    var values = HEADERS.map(function (h) {
      if (h === 'timestamp') return new Date();
      return safe_(String(row[h] || '').slice(0, LIMITS[h] || 500));
    });
    sheet.appendRow(values);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

function doGet() {
  return json_({ ok: true, service: 'nexvita-ai-sistema-sob-medida-leads' });
}

/** Planilha/aba de destino; cria o cabeçalho se a aba estiver vazia. */
function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var name = props.getProperty('SHEET_NAME') || 'Leads';
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Defina SHEET_ID ou vincule o script a uma planilha.');
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Texto limpo: sem caracteres de controle, espaços nas pontas removidos. */
function str_(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

/** Evita fórmula na planilha: valor que começa com = + - @ (ou tab/CR) ganha apóstrofo. */
function safe_(s) {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** WhatsApp brasileiro plausível: DDD + 8 ou 9 dígitos, com ou sem 55. Devolve "55..." ou "". */
function normWhatsapp_(v) {
  var d = str_(v).replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) d = d.slice(2);
  return /^[1-9][1-9](9\d{8}|[2-9]\d{7})$/.test(d) ? '55' + d : '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
