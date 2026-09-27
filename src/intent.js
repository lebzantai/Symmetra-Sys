const { TypeSafeClient, choice } = require("@typesafe-ai/sdk");

// Keyword rules in rules.js catch the obvious cases cheaply. This only runs on
// messages that fell through to "generic_reply", where free-form phrasing
// (e.g. "how much does it run me a month", "can I swing by tomorrow") defeats
// the regexes. Opt-out is never delegated here: that stays a deterministic
// regex rule in rules.js because it is a compliance requirement, not a
// judgment call.
const MIN_CONFIDENCE = 0.55;

let cachedClient = null;

function getClient(config) {
  const apiKey = config.TYPESAFE_API_KEY || process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!cachedClient || cachedClient.apiKeyUsed !== apiKey) {
    cachedClient = new TypeSafeClient({ apiKey });
    cachedClient.apiKeyUsed = apiKey;
  }
  return cachedClient;
}

/**
 * Classifies an inbound lead reply that keyword rules already tagged
 * "generic_reply". Returns { tag, confidence } for a confident match, or
 * null when the feature is disabled, unconfigured, or the request fails --
 * callers should keep the original "generic_reply" result in that case.
 */
async function classifyFallbackIntent(messageText, config) {
  if (!config.TYPESAFE_ENABLED) {
    return null;
  }

  const client = getClient(config);
  if (!client) {
    return null;
  }

  try {
    const { answers } = await client.systemOne({
      state: { inbound_message: messageText },
      questions: {
        intent: choice(
          "A gym lead replied to a WhatsApp follow-up message with `inbound_message`. What is the lead asking about or telling us?",
          {
            price_request: "Asking about membership cost, pricing, fees, or discounts.",
            location_request: "Asking where the gym is, its address, or directions.",
            booking_request: "Wants to book, schedule, or confirm a visit or tour, including proposing a day or time.",
            generic_reply: "Anything else: acknowledgement, unrelated question, or unclear intent."
          }
        )
      }
    });

    const { choice: tag, confidence } = answers.intent;
    if (confidence < MIN_CONFIDENCE) {
      return null;
    }
    return { tag, confidence };
  } catch (error) {
    return null;
  }
}

module.exports = {
  classifyFallbackIntent
};
