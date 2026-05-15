// Pure utility functions shared between index.html and the test suite.
// Browser: loaded as a plain <script>, all names land in the global scope.
// Node/Jest: consumed via the module.exports guard at the bottom.

const WMO_CODES = {
  0:  ['Clear sky',              '☀️',  '🌙'],
  1:  ['Mainly clear',           '🌤️', '🌙'],
  2:  ['Partly cloudy',          '⛅',  '🌙'],
  3:  ['Overcast',               '☁️',  '☁️'],
  45: ['Foggy',                  '🌫️', '🌫️'],
  48: ['Icy fog',                '🌫️', '🌫️'],
  51: ['Light drizzle',          '🌦️', '🌧️'],
  53: ['Moderate drizzle',       '🌦️', '🌧️'],
  55: ['Dense drizzle',          '🌧️', '🌧️'],
  61: ['Slight rain',            '🌧️', '🌧️'],
  63: ['Moderate rain',          '🌧️', '🌧️'],
  65: ['Heavy rain',             '🌧️', '🌧️'],
  71: ['Slight snow',            '🌨️', '🌨️'],
  73: ['Moderate snow',          '❄️',  '❄️'],
  75: ['Heavy snow',             '❄️',  '❄️'],
  77: ['Snow grains',            '🌨️', '🌨️'],
  80: ['Slight showers',         '🌦️', '🌧️'],
  81: ['Moderate showers',       '🌧️', '🌧️'],
  82: ['Violent showers',        '⛈️',  '⛈️'],
  85: ['Snow showers',           '🌨️', '🌨️'],
  86: ['Heavy snow showers',     '❄️',  '❄️'],
  95: ['Thunderstorm',           '⛈️',  '⛈️'],
  96: ['Thunderstorm w/ hail',   '⛈️',  '⛈️'],
  99: ['Thunderstorm w/ hail',   '⛈️',  '⛈️'],
};

function getCondition(code, isDay = true) {
  const entry = WMO_CODES[code] ?? ['Unknown', '🌡️', '🌡️'];
  return [entry[0], isDay ? entry[1] : entry[2]];
}

// WHO UV scale → [risk label, CSS class]
function uvRisk(uv) {
  if (uv <= 2)  return ['Low',       'uv-low'];
  if (uv <= 5)  return ['Moderate',  'uv-moderate'];
  if (uv <= 7)  return ['High',      'uv-high'];
  if (uv <= 10) return ['Very High', 'uv-veryhigh'];
  return              ['Extreme',   'uv-extreme'];
}

// Parses "YYYY-MM-DDTHH:MM" (no tz offset) → "H:MM AM/PM"
function parseDailyTime(isoStr) {
  const match = String(isoStr).match(/T(\d{2}):(\d{2})$/);
  if (!match) return '–';
  const h = parseInt(match[1], 10);
  const m = match[2];
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

// ISO-3166-1 alpha-2 → flag emoji
function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐';
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

// Only allows HTTPS URLs from Wikimedia / Wikipedia image servers.
// Anything else (http, data:, javascript:, control characters, unknown host) returns false.
// The control-character pre-check is required because WHATWG URL parsing percent-encodes
// newlines instead of throwing, which would let a "\n"-injected URL bypass the hostname check.
function isSafeImageUrl(url) {
  if (typeof url !== 'string' || /[\r\n\t\0]/.test(url)) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' &&
           (u.hostname.endsWith('.wikimedia.org') ||
            u.hostname.endsWith('.wikipedia.org'));
  } catch {
    return false;
  }
}

const COUNTRY_CURRENCY = {
  'Afghanistan':'AFN','Albania':'ALL','Algeria':'DZD','Argentina':'ARS',
  'Australia':'AUD','Austria':'EUR','Bangladesh':'BDT','Belgium':'EUR',
  'Bolivia':'BOB','Brazil':'BRL','Bulgaria':'BGN','Canada':'CAD',
  'Chile':'CLP','China':'CNY','Colombia':'COP','Croatia':'EUR',
  'Czech Republic':'CZK','Czechia':'CZK','Denmark':'DKK','Ecuador':'USD',
  'Egypt':'EGP','Estonia':'EUR','Ethiopia':'ETB','Finland':'EUR',
  'France':'EUR','Germany':'EUR','Ghana':'GHS','Greece':'EUR',
  'Guatemala':'GTQ','Hong Kong':'HKD','Hungary':'HUF','Iceland':'ISK',
  'India':'INR','Indonesia':'IDR','Iran':'IRR','Iraq':'IQD',
  'Ireland':'EUR','Israel':'ILS','Italy':'EUR','Jamaica':'JMD',
  'Japan':'JPY','Jordan':'JOD','Kazakhstan':'KZT','Kenya':'KES',
  'Kuwait':'KWD','Latvia':'EUR','Lebanon':'LBP','Lithuania':'EUR',
  'Luxembourg':'EUR','Malaysia':'MYR','Mexico':'MXN','Morocco':'MAD',
  'Netherlands':'EUR','New Zealand':'NZD','Nigeria':'NGN','Norway':'NOK',
  'Pakistan':'PKR','Peru':'PEN','Philippines':'PHP','Poland':'PLN',
  'Portugal':'EUR','Qatar':'QAR','Romania':'RON','Russia':'RUB',
  'Saudi Arabia':'SAR','Singapore':'SGD','Slovakia':'EUR','Slovenia':'EUR',
  'South Africa':'ZAR','South Korea':'KRW','Spain':'EUR','Sweden':'SEK',
  'Switzerland':'CHF','Taiwan':'TWD','Thailand':'THB','Turkey':'TRY',
  'Türkiye':'TRY','Ukraine':'UAH','United Arab Emirates':'AED',
  'United Kingdom':'GBP','United States':'USD','United States of America':'USD',
  'Uruguay':'UYU','Venezuela':'VES','Vietnam':'VND',
};

const CURRENCY_NAMES = {
  AED:'UAE Dirham',AUD:'Australian Dollar',BGN:'Bulgarian Lev',
  BRL:'Brazilian Real',CAD:'Canadian Dollar',CHF:'Swiss Franc',
  CNY:'Chinese Yuan',CZK:'Czech Koruna',DKK:'Danish Krone',
  EUR:'Euro',GBP:'British Pound',HKD:'Hong Kong Dollar',
  HUF:'Hungarian Forint',IDR:'Indonesian Rupiah',ILS:'Israeli Shekel',
  INR:'Indian Rupee',ISK:'Icelandic Króna',JPY:'Japanese Yen',
  KRW:'South Korean Won',MXN:'Mexican Peso',MYR:'Malaysian Ringgit',
  NOK:'Norwegian Krone',NZD:'New Zealand Dollar',PHP:'Philippine Peso',
  PLN:'Polish Złoty',RON:'Romanian Leu',SEK:'Swedish Krona',
  SGD:'Singapore Dollar',THB:'Thai Baht',TRY:'Turkish Lira',
  USD:'US Dollar',ZAR:'South African Rand',
};

const CURRENCIES = Object.keys(CURRENCY_NAMES).sort();

if (typeof module !== 'undefined') {
  module.exports = {
    WMO_CODES,
    getCondition,
    uvRisk,
    parseDailyTime,
    countryFlag,
    isSafeImageUrl,
    COUNTRY_CURRENCY,
    CURRENCY_NAMES,
    CURRENCIES,
  };
}
