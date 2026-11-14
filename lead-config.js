/* NexVita AI — landing "Sistema sob medida para clínicas": destino do formulário.
   endpoint: FormSubmit AJAX, o mesmo destino usado em www.nexvita.com (assets/site.js de lá).
     O lead.js envia JSON com Accept: application/json e só conta o lead quando a resposta HTTP é ok
     E String(json.success) === "true".
   subject: assunto do e-mail (_subject).
   O antigo Web App do Apps Script (/apps-script/) foi aposentado e não é mais usado.
   stub: true só em preview — simula o pós-envio sem rede.
   Fora de nexvita.ai / www.nexvita.ai o lead.js nunca faz POST nem carrega pixels (guarda por hostname). */
window.NV_LEAD_CONFIG = {
  endpoint: "https://formsubmit.co/ajax/mori@nexvita.com",
  subject: "Lead nexvita.ai – sistema sob medida",
  stub: false
};
