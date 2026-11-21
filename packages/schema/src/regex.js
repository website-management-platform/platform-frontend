// Doğrulama desenleri için güvenli alt küme (şartname §6: ReDoS koruması). Felaket geri izleme üreten yapılar reddedilir:
// geri başvuru, lookaround, iç içe tekrar ((a+)+, (a*)*), tekrar edilen alternatifler ((a|ab)+) ve büyük sayaçlar.
const MAX_PATTERN_LENGTH = 200;

export const checkSafePattern = (pattern) => {
  if (typeof pattern !== "string" || pattern.length === 0) return "Desen boş olamaz.";
  if (pattern.length > MAX_PATTERN_LENGTH) return `Desen en çok ${MAX_PATTERN_LENGTH} karakter olabilir.`;
  if (/\\[1-9]|\\k</.test(pattern)) return "Geri başvuru kullanılamaz.";
  if (/\(\?[=!<]/.test(pattern)) return "Lookahead/lookbehind kullanılamaz.";
  if (/\{\s*\d{4,}/.test(pattern)) return "Tekrar sayısı en çok 999 olabilir.";
  if (/\)[*+?]?[*+]|\)\{\d+,?\d*\}[*+]/.test(pattern)) return "İç içe tekrar kullanılamaz.";
  // Grubun içinde tekrar varken grubun kendisi de tekrar ediliyorsa felaket geri izleme riski vardır.
  const stack = [];
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "\\") {
      index += 1;
    } else if (char === "[") {
      const end = pattern.indexOf("]", index + 1);
      if (end === -1) return "Desen geçerli değil.";
      index = end;
    } else if (char === "(") {
      stack.push({ quantified: false, alternation: false });
    } else if (char === ")") {
      const group = stack.pop();
      if (!group) return "Desen geçerli değil.";
      const next = pattern[index + 1];
      const repeated = next === "*" || next === "+" || next === "{";
      if (repeated && (group.quantified || group.alternation)) return "Tekrar eden grupta tekrar veya alternatif kullanılamaz.";
      if (stack.length > 0 && (group.quantified || repeated)) stack[stack.length - 1].quantified = true;
    } else if ((char === "*" || char === "+" || char === "{") && stack.length > 0) {
      stack[stack.length - 1].quantified = true;
    } else if (char === "|" && stack.length > 0) {
      stack[stack.length - 1].alternation = true;
    }
  }
  if (stack.length > 0) return "Desen geçerli değil.";
  try {
    RegExp(pattern, "u");
  } catch {
    return "Desen geçerli değil.";
  }
  return null;
};
