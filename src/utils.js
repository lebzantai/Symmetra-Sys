const crypto = require("crypto");

const ZA_COUNTRY_CODE = "+27";

function normalizePhoneE164(input) {
  if (!input) return "";
  const trimmed = input.toString().trim();
  const digits = trimmed.replace(/[^0-9+]/g, "");

  if (digits.startsWith("+")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `${ZA_COUNTRY_CODE}${digits.slice(1)}`;
  }

  if (digits.startsWith("27")) {
    return `+${digits}`;
  }

  return `${ZA_COUNTRY_CODE}${digits}`;
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function isQuietHours(now, hoursConfig) {
  const day = now.getDay();
  const dayConfig = hoursConfig.find((item) => item.day === day);
  if (!dayConfig) {
    return true;
  }
  if (dayConfig.closed) {
    return true;
  }

  const [openHour, openMinute] = dayConfig.open.split(":").map(Number);
  const [closeHour, closeMinute] = dayConfig.close.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  return minutes < openMinutes || minutes > closeMinutes;
}

function nextOpenTime(now, hoursConfig) {
  let cursor = new Date(now);
  for (let i = 0; i < 7; i += 1) {
    const day = cursor.getDay();
    const dayConfig = hoursConfig.find((item) => item.day === day);
    if (dayConfig && !dayConfig.closed) {
      const [openHour, openMinute] = dayConfig.open.split(":").map(Number);
      const candidate = new Date(cursor);
      candidate.setHours(openHour, openMinute, 0, 0);
      if (candidate >= now) {
        return candidate;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return now;
}

module.exports = {
  normalizePhoneE164,
  hashPayload,
  isQuietHours,
  nextOpenTime
};
