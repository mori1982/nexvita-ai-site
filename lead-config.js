/* NexVita AI — landing "Sistema sob medida para clínicas": destino do formulário.
   endpoint: URL /exec do Web App do Apps Script em /apps-script/ (ver apps-script/README.md).
   Enquanto estiver vazio, o formulário NÃO envia nada e mostra o atalho para o WhatsApp.
   Não use aqui a URL do quiz (diagnostico.nexvita.com): aquele script exige outros campos.
   stub: true só em preview — simula o pós-envio sem rede.
   Fora de nexvita.ai / www.nexvita.ai o lead.js nunca faz POST nem carrega pixels. */
window.NV_LEAD_CONFIG = {
  endpoint: "",
  stub: false
};
