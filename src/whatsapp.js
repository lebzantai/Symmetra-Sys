const axios = require("axios");

async function sendWhatsAppMessage({ config, to, templateName, bodyVariables, text }) {
  if (config.DRY_RUN) {
    return { status: "dry_run", to, templateName, bodyVariables, text };
  }

  if (config.WHATSAPP_PROVIDER === "twilio") {
    const payload = {
      From: `whatsapp:${config.TWILIO_FROM}`,
      To: `whatsapp:${to}`,
      Body: text
    };
    return axios.post(`https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}/Messages.json`, payload, {
      auth: {
        username: config.TWILIO_ACCOUNT_SID,
        password: config.TWILIO_AUTH_TOKEN
      }
    });
  }

  if (config.WHATSAPP_PROVIDER === "cloud") {
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: templateName ? "template" : "text",
      ...(templateName
        ? {
            template: {
              name: templateName,
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: bodyVariables.map((value) => ({ type: "text", text: value }))
                }
              ]
            }
          }
        : { text: { body: text } })
    };
    return axios.post(`https://graph.facebook.com/v19.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`
      }
    });
  }

  throw new Error("Unsupported WhatsApp provider");
}

module.exports = {
  sendWhatsAppMessage
};
