function toCorrectAnswerArray(val) {
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch { /* not JSON */ }
    return val.split('|').map((v) => v.trim()).filter(Boolean);
  }
  return val == null ? [] : [String(val).trim()].filter(Boolean);
}
console.log('inline pipe:', JSON.stringify(toCorrectAnswerArray('2|3|5')));
console.log('inline arr:', JSON.stringify(toCorrectAnswerArray(['2','3','5'])));
