// Timezone utilities centralized for IST-first handling
// All formatting pinned to Asia/Kolkata to avoid server/local drift

const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 330; // UTC+5:30

function formatIST(date) {
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIMEZONE
  }).replace(/^0?([0-9]{1,2}):([0-9]{2})\s(AM|PM)$/i, (_, h, m, period) => `${parseInt(h, 10)}:${m} ${period}`);
}

function formatIST24(date) {
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST_TIMEZONE
  });
}

function getServerOffsetMinutes() {
  // getTimezoneOffset is minutes *behind* UTC; invert for offset ahead of UTC
  return -new Date().getTimezoneOffset();
}

function getISTOffsetMinutes() {
  return IST_OFFSET_MINUTES;
}

module.exports = {
  IST_TIMEZONE,
  IST_OFFSET_MINUTES,
  formatIST,
  formatIST24,
  getServerOffsetMinutes,
  getISTOffsetMinutes
};
