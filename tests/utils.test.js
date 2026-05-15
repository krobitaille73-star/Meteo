'use strict';

const {
  WMO_CODES,
  getCondition,
  uvRisk,
  parseDailyTime,
  countryFlag,
  isSafeImageUrl,
  COUNTRY_CURRENCY,
  CURRENCY_NAMES,
  CURRENCIES,
} = require('../src/utils.js');

// ─────────────────────────────────────────────────
// getCondition
// ─────────────────────────────────────────────────
describe('getCondition', () => {
  test('returns correct label and daytime icon for known code', () => {
    const [label, icon] = getCondition(0, true);
    expect(label).toBe('Clear sky');
    expect(icon).toBe('☀️');
  });

  test('returns night icon when isDay=false', () => {
    const [label, icon] = getCondition(0, false);
    expect(label).toBe('Clear sky');
    expect(icon).toBe('🌙');
  });

  test('defaults to daytime when isDay is omitted', () => {
    const [, icon] = getCondition(1);
    expect(icon).toBe('🌤️');
  });

  test('returns Unknown fallback for unrecognised code', () => {
    const [label, icon] = getCondition(999, true);
    expect(label).toBe('Unknown');
    expect(icon).toBe('🌡️');
  });

  test('returns Unknown fallback for negative code', () => {
    const [label] = getCondition(-1);
    expect(label).toBe('Unknown');
  });

  test('covers all WMO codes in the table', () => {
    for (const code of Object.keys(WMO_CODES)) {
      const [label, icon] = getCondition(Number(code), true);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
      expect(typeof icon).toBe('string');
    }
  });

  test('rain code returns correct condition', () => {
    const [label] = getCondition(63);
    expect(label).toBe('Moderate rain');
  });

  test('thunderstorm code returns correct condition', () => {
    const [label] = getCondition(95);
    expect(label).toBe('Thunderstorm');
  });
});

// ─────────────────────────────────────────────────
// uvRisk
// ─────────────────────────────────────────────────
describe('uvRisk', () => {
  const cases = [
    [0,  'Low',       'uv-low'],
    [1,  'Low',       'uv-low'],
    [2,  'Low',       'uv-low'],
    [3,  'Moderate',  'uv-moderate'],
    [5,  'Moderate',  'uv-moderate'],
    [6,  'High',      'uv-high'],
    [7,  'High',      'uv-high'],
    [8,  'Very High', 'uv-veryhigh'],
    [10, 'Very High', 'uv-veryhigh'],
    [11, 'Extreme',   'uv-extreme'],
    [20, 'Extreme',   'uv-extreme'],
  ];

  test.each(cases)('UV %i → %s / %s', (uv, expectedLabel, expectedClass) => {
    const [label, cls] = uvRisk(uv);
    expect(label).toBe(expectedLabel);
    expect(cls).toBe(expectedClass);
  });

  test('boundary: UV 2 is Low, UV 3 is Moderate', () => {
    expect(uvRisk(2)[0]).toBe('Low');
    expect(uvRisk(3)[0]).toBe('Moderate');
  });

  test('boundary: UV 5 is Moderate, UV 6 is High', () => {
    expect(uvRisk(5)[0]).toBe('Moderate');
    expect(uvRisk(6)[0]).toBe('High');
  });

  test('boundary: UV 7 is High, UV 8 is Very High', () => {
    expect(uvRisk(7)[0]).toBe('High');
    expect(uvRisk(8)[0]).toBe('Very High');
  });

  test('boundary: UV 10 is Very High, UV 11 is Extreme', () => {
    expect(uvRisk(10)[0]).toBe('Very High');
    expect(uvRisk(11)[0]).toBe('Extreme');
  });

  test('always returns a two-element array', () => {
    for (const uv of [0, 3, 6, 8, 11]) {
      expect(uvRisk(uv)).toHaveLength(2);
    }
  });
});

// ─────────────────────────────────────────────────
// parseDailyTime
// ─────────────────────────────────────────────────
describe('parseDailyTime', () => {
  test('parses midnight as 12:00 AM', () => {
    expect(parseDailyTime('2025-05-11T00:00')).toBe('12:00 AM');
  });

  test('parses noon as 12:00 PM', () => {
    expect(parseDailyTime('2025-05-11T12:00')).toBe('12:00 PM');
  });

  test('parses 1 AM correctly', () => {
    expect(parseDailyTime('2025-05-11T01:30')).toBe('1:30 AM');
  });

  test('parses 1 PM correctly', () => {
    expect(parseDailyTime('2025-05-11T13:45')).toBe('1:45 PM');
  });

  test('parses 11:59 PM correctly', () => {
    expect(parseDailyTime('2025-05-11T23:59')).toBe('11:59 PM');
  });

  test('parses 11:59 AM correctly', () => {
    expect(parseDailyTime('2025-05-11T11:59')).toBe('11:59 AM');
  });

  test('returns em-dash for missing T separator', () => {
    expect(parseDailyTime('2025-05-11')).toBe('–');
  });

  test('returns em-dash for empty string', () => {
    expect(parseDailyTime('')).toBe('–');
  });

  test('returns em-dash for null', () => {
    expect(parseDailyTime(null)).toBe('–');
  });

  test('returns em-dash for undefined', () => {
    expect(parseDailyTime(undefined)).toBe('–');
  });

  test('returns em-dash for arbitrary garbage', () => {
    expect(parseDailyTime('<script>alert(1)</script>')).toBe('–');
  });

  test('out-of-range digits are parsed as-is (function trusts API input)', () => {
    // 99 % 12 = 3 → hour display "3"; 99 >= 12 → PM; minutes passed through verbatim
    expect(parseDailyTime('2025-05-11T99:99')).toBe('3:99 PM');
  });
});

// ─────────────────────────────────────────────────
// countryFlag
// ─────────────────────────────────────────────────
describe('countryFlag', () => {
  test('US produces the US flag emoji', () => {
    expect(countryFlag('US')).toBe('🇺🇸');
  });

  test('FR produces the French flag emoji', () => {
    expect(countryFlag('FR')).toBe('🇫🇷');
  });

  test('JP produces the Japanese flag emoji', () => {
    expect(countryFlag('JP')).toBe('🇯🇵');
  });

  test('lowercase input is normalised', () => {
    expect(countryFlag('ca')).toBe('🇨🇦');
  });

  test('empty string returns globe', () => {
    expect(countryFlag('')).toBe('🌐');
  });

  test('null returns globe', () => {
    expect(countryFlag(null)).toBe('🌐');
  });

  test('undefined returns globe', () => {
    expect(countryFlag(undefined)).toBe('🌐');
  });

  test('single character returns globe (not a valid ISO code)', () => {
    expect(countryFlag('A')).toBe('🌐');
  });

  test('three-character code returns globe', () => {
    expect(countryFlag('GBR')).toBe('🌐');
  });
});

// ─────────────────────────────────────────────────
// isSafeImageUrl  (security-critical)
// ─────────────────────────────────────────────────
describe('isSafeImageUrl', () => {
  // ── Valid URLs ──────────────────────────────────
  test('allows HTTPS Wikimedia upload URL', () => {
    expect(isSafeImageUrl('https://upload.wikimedia.org/wikipedia/commons/a/b.jpg')).toBe(true);
  });

  test('allows HTTPS Wikipedia thumbnail', () => {
    expect(isSafeImageUrl('https://en.wikipedia.org/thumb/a/b.jpg')).toBe(true);
  });

  test('allows any subdomain of wikimedia.org over HTTPS', () => {
    expect(isSafeImageUrl('https://maps.wikimedia.org/img/osm-intl.png')).toBe(true);
  });

  // ── HTTP rejected ───────────────────────────────
  test('rejects plain HTTP Wikimedia URL', () => {
    expect(isSafeImageUrl('http://upload.wikimedia.org/img.jpg')).toBe(false);
  });

  // ── Protocol attacks ────────────────────────────
  test('rejects javascript: URI', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
  });

  test('rejects data: URI', () => {
    expect(isSafeImageUrl('data:image/png;base64,abc')).toBe(false);
  });

  test('rejects blob: URI', () => {
    expect(isSafeImageUrl('blob:https://wikimedia.org/uuid')).toBe(false);
  });

  // ── Host spoofing ───────────────────────────────
  test('rejects attacker.com/wikimedia.org path trick', () => {
    expect(isSafeImageUrl('https://attacker.com/wikimedia.org/img.jpg')).toBe(false);
  });

  test('rejects wikimedia.org.evil.com subdomain trick', () => {
    expect(isSafeImageUrl('https://wikimedia.org.evil.com/img.jpg')).toBe(false);
  });

  test('rejects arbitrary HTTPS URL', () => {
    expect(isSafeImageUrl('https://example.com/img.jpg')).toBe(false);
  });

  // ── Malformed / empty ───────────────────────────
  test('rejects empty string', () => {
    expect(isSafeImageUrl('')).toBe(false);
  });

  test('rejects null', () => {
    expect(isSafeImageUrl(null)).toBe(false);
  });

  test('rejects undefined', () => {
    expect(isSafeImageUrl(undefined)).toBe(false);
  });

  test('rejects plain filename with no protocol', () => {
    expect(isSafeImageUrl('image.jpg')).toBe(false);
  });

  test('rejects URL with embedded newline (header injection attempt)', () => {
    expect(isSafeImageUrl('https://upload.wikimedia.org/img.jpg\nX-Injected: header')).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// COUNTRY_CURRENCY
// ─────────────────────────────────────────────────
describe('COUNTRY_CURRENCY', () => {
  const knownMappings = [
    ['France',        'EUR'],
    ['Germany',       'EUR'],
    ['United States', 'USD'],
    ['Japan',         'JPY'],
    ['United Kingdom','GBP'],
    ['Canada',        'CAD'],
    ['Australia',     'AUD'],
    ['Switzerland',   'CHF'],
    ['China',         'CNY'],
    ['India',         'INR'],
    ['Brazil',        'BRL'],
    ['Mexico',        'MXN'],
    ['Türkiye',       'TRY'],
    ['South Korea',   'KRW'],
  ];

  test.each(knownMappings)('%s → %s', (country, currency) => {
    expect(COUNTRY_CURRENCY[country]).toBe(currency);
  });

  test('no entry maps to undefined or null', () => {
    for (const val of Object.values(COUNTRY_CURRENCY)) {
      expect(val).toBeTruthy();
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('all currency codes are uppercase letters only', () => {
    for (const val of Object.values(COUNTRY_CURRENCY)) {
      expect(val).toMatch(/^[A-Z]{3}$/);
    }
  });

  test('unknown country returns undefined (caller must handle this)', () => {
    expect(COUNTRY_CURRENCY['Narnia']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────
// CURRENCIES + CURRENCY_NAMES consistency
// ─────────────────────────────────────────────────
describe('CURRENCIES / CURRENCY_NAMES', () => {
  test('CURRENCIES is a sorted array of strings', () => {
    expect(Array.isArray(CURRENCIES)).toBe(true);
    const sorted = [...CURRENCIES].sort();
    expect(CURRENCIES).toEqual(sorted);
  });

  test('every entry in CURRENCIES has a name in CURRENCY_NAMES', () => {
    for (const code of CURRENCIES) {
      expect(CURRENCY_NAMES[code]).toBeTruthy();
    }
  });

  test('every CURRENCY_NAMES key is in CURRENCIES', () => {
    for (const code of Object.keys(CURRENCY_NAMES)) {
      expect(CURRENCIES).toContain(code);
    }
  });

  test('CURRENCIES contains the major world currencies', () => {
    const expected = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
    for (const code of expected) {
      expect(CURRENCIES).toContain(code);
    }
  });

  test('all CURRENCY_NAMES values are non-empty strings', () => {
    for (const name of Object.values(CURRENCY_NAMES)) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
