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

function applyInboundRules(messageText, lead, config) {
  const text = messageText.toLowerCase();
  const response = {
    updates: {},
    tag: "generic_reply"
  };

  if (/(stop|unsubscribe)/.test(text)) {
    response.updates = {
      do_not_contact: "YES",
      status: "CLOSED",
      outcome: "NOT_INTERESTED"
    };
    response.tag = "optout";
    return response;
  }

  if (/price|cost|pricing|fee/.test(text)) {
    response.tag = "price_request";
    return response;
  }

  if (/address|location|where/.test(text)) {
    response.tag = "location_request";
    return response;
  }

  if (/book|visit|tour|come|today|tomorrow/.test(text)) {
    response.updates = {
      status: "BOOKED",
      stage: "HOT"
    };
    response.tag = "booking_request";
    return response;
  }

  if (lead.status === "NEW") {
    response.updates = { status: "CONTACTED", stage: "WARM" };
  }

  return response;
}

module.exports = {
  buildCadenceSchedule,
  getNextActionAt,
  applyInboundRules
};
