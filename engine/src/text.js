// All matching is local and deliberately shallow. These functions do not infer truth.
export const normalizeText = text => text.normalize('NFKC').toLowerCase()
  .replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}]/gu, '');

// Preserve English word boundaries and lexical hyphens/apostrophes. Removing all
// whitespace would turn “now here” into “nowhere” and silently certify a new quote.
export const normalizeQuoteText = text => text.normalize('NFKC').toLowerCase()
  .replace(/[’‘]/g, "'").replace(/[‐‑]/g, '-')
  .replace(/[^\p{L}\p{N}'-]/gu, ' ').replace(/\s+/g, ' ').trim()
  .replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, '$1');

export function quoteMatches(source, quote) {
  const haystack = normalizeQuoteText(source);
  const fragments = quote.split(/(?:\.{3,}|…+)/).map(normalizeQuoteText).filter(Boolean);
  if (!fragments.length) return false;
  let cursor = 0;
  for (const fragment of fragments) {
    let at = haystack.indexOf(fragment, cursor);
    while (at !== -1) {
      const wordStart = /^[a-z0-9]/i.test(fragment) && /[a-z0-9'-]/i.test(haystack[at - 1] || '');
      const wordEnd = /[a-z0-9]$/i.test(fragment) && /[a-z0-9'-]/i.test(haystack[at + fragment.length] || '');
      if (!wordStart && !wordEnd) break;
      at = haystack.indexOf(fragment, at + 1);
    }
    if (at < 0) return false;
    cursor = at + fragment.length;
  }
  return true;
}

const STOPWORDS = new Set('a an the is are was were be been being we our us you your i my me he his she her they their them it its this that these those and or but so to of in on at for with as by from have has had do does did will would can could should may might not no only if then also very more about there here all any some into than'.split(' '));

export function anchors(text) {
  const words = (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).filter(word => !STOPWORDS.has(word));
  const chinese = text.replace(/但是|不过|然而|如果|除非|只有|可能|我们|他们|这个|那个|就是|因此|所以|不是|不会|不能|没有|只是|并不|仅仅|仍然|需要|因为|的话|时候|其中/g, ' ');
  for (const chunk of chinese.match(/[\p{Script=Han}]+/gu) || []) {
    for (let i = 0; i < chunk.length - 1; i++) words.push(chunk.slice(i, i + 2));
  }
  return new Set(words);
}

export function sharedAnchors(left, right) {
  const a = anchors(left), b = anchors(right);
  return [...a].filter(word => b.has(word));
}

export function qualifierMarkers(text) {
  const markers = [];
  const patterns = [
    ['negation', /\b(?:not|never|no longer|cannot|can't|won't|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|shouldn't|wouldn't|couldn't)\b|并不|不是|不会|不能|并非|没有|未必|不代表|不要/giu],
    ['condition', /\b(?:if|unless|provided(?: that)?|as long as|only when|only if|assuming|depends? on)\b|如果|除非|前提|只有|取决于|假如|假设/giu],
    ['qualification', /\b(?:but|however|except|although|in this (?:test|sample|case)|in our (?:test|sample|pilot)|not necessarily|up to|at most|at least|approximately|roughly|estimated|small sample|preliminary|only)\b|但是|不过|然而|仅限|只适用|样本|初步|大约|最多|至少|不一定|未必|仅仅|仅在|只是/giu],
  ];
  for (const [kind, regex] of patterns) for (const match of text.matchAll(regex)) markers.push({ kind, text: match[0], index: match.index });
  return markers;
}

export const startsWithContrast = text => /^(?:[“"「『\s]*(?:but\b|however\b|except\b|although\b|provided\b|unless\b|only (?:if|when)\b|但是|但(?!愿)|不过|然而|只是|仅限|前提|除非))/i.test(text);
export const startsWithContinuation = text => /^(?:[“"「『\s]*(?:then\b|in that case\b|otherwise\b|so\b|therefore\b|那么|那就|否则|因此|所以))/i.test(text);
export const hasDanglingOpening = text => /^(?:[“"「『\s]*(?:(?:this|that|it)\s+(?:is|was|means|works|will|would|could|can|should|does|has|seems)\b|(?:that's|it's|they|them|these|those)\b|(?:so|then|therefore|because of that|as a result)\b|这意味着|这就是|那就是|这样|因此|所以|他们|她们|它们|它(?:是|会|能|可以)|其原因))/i.test(text);

const MULTIPLIERS = { hundred: 100, thousand: 1000, million: 1e6, billion: 1e9, 百: 100, 千: 1000, 万: 10000, 亿: 1e8, k: 1000, m: 1e6, b: 1e9 };
const UNIT_ALIASES = [
  ['percentage-point', /^(?:percentage[ -]points?|percent[ -]points?|pp\b|个百分点)/i],
  ['percent', /^(?:%|percent(?:age)?\b|per cent\b)/i],
  ['currency:USD', /^(?:USD\b|US dollars?\b|美元)/i],
  ['currency:EUR', /^(?:EUR\b|euros?\b|欧元)/i],
  ['currency:GBP', /^(?:GBP\b|pounds?\b|英镑)/i],
  ['currency:CNY', /^(?:CNY\b|RMB\b|yuan\b|人民币|元)/i],
  ['currency:dollar', /^(?:dollars?\b)/i],
  ['time:year', /^(?:years?\b|yrs?\b|年)/i],
  ['time:month', /^(?:months?\b|个月|月)/i],
  ['time:day', /^(?:days?\b|天|日)/i],
  ['time:hour', /^(?:hours?\b|hrs?\b|小时)/i],
  ['time:minute', /^(?:minutes?\b|mins?\b|分钟)/i],
  ['time:millisecond', /^(?:milliseconds?\b|ms\b|毫秒)/i],
  ['time:second', /^(?:seconds?\b|secs?\b|秒)/i],
  ['multiplier', /^(?:times\b|[x×](?![a-z])|倍)/i],
  ['count:user', /^(?:users?\b|用户)/i],
  ['count:customer', /^(?:customers?\b|客户)/i],
  ['count:subscriber', /^(?:subscribers?\b|订阅者)/i],
  ['count:download', /^(?:downloads?\b|次下载)/i],
  ['count:employee', /^(?:employees?\b|员工)/i],
  ['count:volunteer', /^(?:volunteers?\b|志愿者)/i],
  ['count:participant', /^(?:participants?\b|参与者|参与者人数)/i],
  ['count:person', /^(?:people\b|persons?\b|人)/i],
];

const CHINESE_DIGITS = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function chineseNumber(input) {
  const [whole, fraction] = input.split('点');
  if (!whole) return NaN;
  let total = 0, section = 0, digit = 0;
  if (![...whole].some(char => '十百千万亿'.includes(char))) {
    total = Number([...whole].map(char => CHINESE_DIGITS[char]).join(''));
  } else {
    for (const char of whole) {
      if (Object.hasOwn(CHINESE_DIGITS, char)) digit = CHINESE_DIGITS[char];
      else {
        const scale = { 十: 10, 百: 100, 千: 1000, 万: 10000, 亿: 1e8 }[char];
        if (scale < 10000) { section += (digit || 1) * scale; digit = 0; }
        else { total += (section + digit || 1) * scale; section = 0; digit = 0; }
      }
    }
    total += section + digit;
  }
  if (fraction) {
    if ([...fraction].some(char => !Object.hasOwn(CHINESE_DIGITS, char))) return NaN;
    total += Number(`0.${[...fraction].map(char => CHINESE_DIGITS[char]).join('')}`);
  }
  return total;
}

export function quantityBase(quantity) {
  const secondFactors = { 'time:millisecond': 0.001, 'time:second': 1, 'time:minute': 60, 'time:hour': 3600 };
  if (Object.hasOwn(secondFactors, quantity.unit)) return { value: quantity.value * secondFactors[quantity.unit], unit: 'duration:second' };
  return { value: quantity.value, unit: quantity.unit };
}

/** Limited cardinal numerals and explicit units. Bare numerals abstain. */
export function extractQuantities(text) {
  let normalized = '';
  const offsets = [];
  let offset = 0;
  for (const char of text) {
    const replacement = char.normalize('NFKC');
    for (let i = 0; i < replacement.length; i++) offsets.push(offset);
    normalized += replacement;
    offset += char.length;
  }
  const quantities = [];
  const regex = /(?:\b(?:USD|EUR|GBP|CNY|RMB)\s*|US\s*\$\s*|[$€£¥￥]\s*|百分之\s*)?(?:[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|[零〇一二两三四五六七八九十百千万亿]+(?:点[零〇一二两三四五六七八九]+)?)/g;
  for (const match of normalized.matchAll(regex)) {
    const start = match.index;
    const preceding = normalized.slice(Math.max(0, start - 2), start);
    if (/[\w.]/.test(preceding.slice(-1))) continue; // identifiers, versions, decimal fragments
    const rawNumber = match[0].match(/(?:[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|[零〇一二两三四五六七八九十百千万亿]+(?:点[零〇一二两三四五六七八九]+)?)$/)[0];
    const isChinese = /[\p{Script=Han}]/u.test(rawNumber);
    // A bare magnitude label such as “万元” is a unit, not an asserted 10,000 yuan.
    if (isChinese && /^[百千万亿]+$/.test(rawNumber)) continue;
    let value = isChinese ? chineseNumber(rawNumber) : Number(rawNumber.replaceAll(',', ''));
    let suffix = normalized.slice(start + match[0].length);
    let consumed = match[0].length;
    let unit = 'bare';
    const prefix = match[0].slice(0, -rawNumber.length).trim();
    if (/^(?:USD|US\s*\$)$/i.test(prefix)) unit = 'currency:USD';
    else if (/^(?:EUR|€)$/i.test(prefix)) unit = 'currency:EUR';
    else if (/^(?:GBP|£)$/i.test(prefix)) unit = 'currency:GBP';
    else if (/^(?:CNY|RMB)$/i.test(prefix)) unit = 'currency:CNY';
    else if (prefix === '$') unit = 'currency:dollar';
    else if (prefix === '¥' || prefix === '￥') unit = 'currency:yen-or-yuan';
    else if (prefix === '百分之') unit = 'percent';
    const multiplier = suffix.match(/^\s*(hundred\b|thousand\b|million\b|billion\b|百(?!分)|千|万|亿|[kmb](?![a-z]))/i);
    if (multiplier) {
      value *= MULTIPLIERS[multiplier[1].toLowerCase()];
      consumed += multiplier[0].length;
      suffix = suffix.slice(multiplier[0].length);
    }
    const leadingSpace = suffix.match(/^\s*/)[0].length;
    const trimmedSuffix = suffix.slice(leadingSpace);
    for (const [key, pattern] of UNIT_ALIASES) {
      const unitMatch = trimmedSuffix.match(pattern);
      if (unitMatch) {
        if (unit !== 'bare' && unit !== key) { unit = 'ambiguous'; break; }
        unit = key;
        consumed += leadingSpace + unitMatch[0].length;
        break;
      }
    }
    if (!Number.isFinite(value) || (isChinese && unit === 'bare')) continue;
    const originalStart = offsets[start];
    const originalEnd = start + consumed < offsets.length ? offsets[start + consumed] : text.length;
    quantities.push({ raw: text.slice(originalStart, originalEnd), value, unit, index: originalStart });
  }
  return quantities;
}

export function extractQuotes(text) {
  const result = [];
  for (const pattern of [/"([^"\n]+)"/g, /“([^”\n]+)”/g, /「([^」\n]+)」/g, /『([^』\n]+)』/g, /‘([^’\n]+)’/g]) {
    for (const match of text.matchAll(pattern)) {
      const normalized = normalizeText(match[1]);
      const han = (normalized.match(/\p{Script=Han}/gu) || []).length;
      if (normalized.length >= 8 || han >= 4) result.push({ text: match[1], normalized, index: match.index });
    }
  }
  return result.sort((a, b) => a.index - b.index);
}
