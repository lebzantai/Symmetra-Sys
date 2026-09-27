const { isQuietHours, nextOpenTime } = require("./utils");

function buildCadenceSchedule(createdAt, cadence) {
  return cadence.map((step) => {
    if (step.type === "delay_hours") {
      return new Date(createdAt.getTime() + step.value * 60 * 60 * 1000);
    }
    if (step.type === "next_day_time") {
      const next = new Date(createdAt);
      next.setDate(next.getDate() + step.offsetDays);
      next.setHours(step.hour, step.minute, 0, 0);
      return next;
    }
    return new Date(createdAt);
  });
}

function getNextActionAt(createdAt, cadence, hoursConfig) {
  const schedule = buildCadenceSchedule(createdAt, cadence);
  const now = new Date();
  const pending = schedule.find((time) => time > now) || schedule[schedule.length - 1];
  if (isQuietHours(now, hoursConfig)) {
    return nextOpenTime(now, hoursConfig);
  }
  return pending;
}

// Applies the same lead updates a keyword-matched tag would produce. Shared
// by the regex path below and by the TypeSafe fallback classifier in
// intent.js, so an AI-derived tag lands on the exact same lead state changes
// as a keyword-derived one.
function resolveUpdatesForTag(tag, lead) {
  if (tag === "booking_request") {
    return { updates: { status: "BOOKED", stage: "HOT" }, tag };
  }

  if (tag === "generic_reply" && lead.status === "NEW") {
    return { updates: { status: "CONTACTED", stage: "WARM" }, tag };
  }

  return { updates: {}, tag };
}

function applyInboundRules(messageText, lead, config) {
  const text = messageText.toLowerCase();

  if (/(stop|unsubscribe)/.test(text)) {
    return {
      updates: {
        do_not_contact: "YES",
        status: "CLOSED",
        outcome: "NOT_INTERESTED"
      },
      tag: "optout"
    };
  }

  if (/price|cost|pricing|fee/.test(text)) {
    return resolveUpdatesForTag("price_request", lead);
  }

  if (/address|location|where/.test(text)) {
    return resolveUpdatesForTag("location_request", lead);
  }

  if (/book|visit|tour|come|today|tomorrow/.test(text)) {
    return resolveUpdatesForTag("booking_request", lead);
  }

  return resolveUpdatesForTag("generic_reply", lead);
}

module.exports = {
  buildCadenceSchedule,
  getNextActionAt,
  applyInboundRules,
  resolveUpdatesForTag
};
