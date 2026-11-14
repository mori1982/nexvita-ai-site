# Leads da landing "Sistema sob medida para clínicas"

`Code.gs` é um Web App do Google Apps Script **novo**. Ele recebe o formulário da home de nexvita.ai e grava uma linha por lead na aba `Leads`. As colunas são: `timestamp, nome, whatsapp, clinica, sistema_atual, maior_dor, utm_source, utm_medium, utm_campaign, utm_content, utm_term, origem, pagina, honeypot`.

Não use o endpoint do quiz (`diagnostico.nexvita.com/config.js`). Aquele script exige `especialidade`, `consentimento === true` e as respostas `q1`–`q15`, então este formulário seria rejeitado. Além disso, os dois produtos acabariam misturados na mesma planilha.

## Validação
- `nome`, `whatsapp` e `clinica` são obrigatórios.
- O WhatsApp precisa ser plausível: DDD mais 8 ou 9 dígitos, com ou sem 55. Ele é gravado só com dígitos, como `55DDNNNNNNNNN`.
- Honeypot (`honeypot`/`website`) preenchido: o script responde `ok` e não grava nada.
- Nenhum valor vira fórmula na planilha: o que começa com `= + - @` ganha um apóstrofo. Os tamanhos também são limitados.
- `utm_campaign` vazio é gravado como `sistema_sob_medida`.

## Publicar
1. Crie uma planilha nova, por exemplo "Leads nexvita.ai — sistema sob medida", e abra **Extensões > Apps Script**.
2. Cole o conteúdo de `Code.gs` e salve.
   - Para usar um script fora da planilha, defina a propriedade `SHEET_ID` em **Configurações do projeto > Propriedades do script**. A propriedade `SHEET_NAME` é opcional; o padrão é `Leads`.
3. **Implantar > Nova implantação > Tipo: App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
4. Autorize e copie a URL que termina em `/exec`.
5. No repositório do site, cole a URL em `lead-config.js`, no campo `endpoint: "https://script.google.com/macros/s/.../exec"`. Mantenha `stub: false`, faça commit e abra o PR.
6. Teste sem o navegador (isso grava uma linha de teste; apague depois):
   ```sh
   curl -L -H 'Content-Type: text/plain;charset=utf-8' \
     -d '{"form":"sistema_sob_medida","nome":"Teste","whatsapp":"11999990000","clinica":"Clinica Teste","utm_campaign":"teste"}' \
     'https://script.google.com/macros/s/SEU_ID/exec'
   ```
   A resposta esperada é `{"ok":true}`.

Enquanto `endpoint` estiver vazio, o formulário em produção não envia nada. Ele mostra "Não foi possível enviar agora" com o link para o WhatsApp e não dispara conversão. Fora de `nexvita.ai` e `www.nexvita.ai` (preview, localhost), o `lead.js` nunca faz POST e nunca carrega pixels.

Ao alterar `Code.gs`, use **Implantar > Gerenciar implantações > Editar > Nova versão** para manter a mesma URL `/exec`.
