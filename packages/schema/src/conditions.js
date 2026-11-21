import { isPlainObject } from "./constants.js";

// Koşullu görünürlük (şartname §6, §25.2). Kural ağacı: { all: [...] } | { any: [...] } | { not: kural } |
// { field: <alan kimliği>, op: eq|ne|in|exists|gt|gte|lt|lte, value }. Backend ve paneller aynı fonksiyonu kullanır.
export const CONDITION_OPERATORS = ["eq", "ne", "in", "exists", "gt", "gte", "lt", "lte"];

const compare = (left, right) => {
  const a = typeof left === "string" && /^-?\d+(\.\d+)?$/.test(left) ? Number(left) : left;
  const b = typeof right === "string" && /^-?\d+(\.\d+)?$/.test(right) ? Number(right) : right;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  return null;
};

const isPresent = (value) => !(value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0));

/** Kuralı değerlendirir. values: alan kimliği → değer. Kural yoksa alan görünür. */
export const evaluateCondition = (condition, values) => {
  if (!condition) return true;
  if (Array.isArray(condition.all)) return condition.all.every((rule) => evaluateCondition(rule, values));
  if (Array.isArray(condition.any)) return condition.any.some((rule) => evaluateCondition(rule, values));
  if (condition.not) return !evaluateCondition(condition.not, values);
  const value = values[condition.field];
  switch (condition.op) {
    case "exists": return condition.value === false ? !isPresent(value) : isPresent(value);
    case "eq": return Array.isArray(value) ? value.includes(condition.value) : value === condition.value;
    case "ne": return Array.isArray(value) ? !value.includes(condition.value) : value !== condition.value;
    case "in": return Array.isArray(condition.value) && (Array.isArray(value) ? value.some((item) => condition.value.includes(item)) : condition.value.includes(value));
    case "gt": return (compare(value, condition.value) ?? -Infinity) > 0;
    case "gte": return (compare(value, condition.value) ?? -Infinity) >= 0;
    case "lt": return (compare(value, condition.value) ?? Infinity) < 0;
    case "lte": return (compare(value, condition.value) ?? Infinity) <= 0;
    default: return false;
  }
};

/** Koşulun başvurduğu alan kimlikleri. */
export const conditionReferences = (condition, into = new Set()) => {
  if (!condition) return into;
  if (Array.isArray(condition.all)) condition.all.forEach((rule) => conditionReferences(rule, into));
  else if (Array.isArray(condition.any)) condition.any.forEach((rule) => conditionReferences(rule, into));
  else if (condition.not) conditionReferences(condition.not, into);
  else if (condition.field) into.add(condition.field);
  return into;
};

/** Yapısal denetim; hata mesajı ya da null. Alan varlığı şema doğrulamasında ayrıca denetlenir. */
export const checkConditionShape = (condition, { maxRules = 10, depth = 0 } = {}) => {
  let count = 0;
  const visit = (rule, level) => {
    if (level > 3) return "Koşul en çok 3 düzey iç içe olabilir.";
    if (!isPlainObject(rule)) return "Koşul geçerli değil.";
    const groups = ["all", "any"].filter((key) => key in rule);
    if (groups.length > 0) {
      if (groups.length > 1 || Object.keys(rule).length !== 1 || !Array.isArray(rule[groups[0]]) || rule[groups[0]].length === 0) return "Koşul grubu geçerli değil.";
      for (const child of rule[groups[0]]) {
        const error = visit(child, level + 1);
        if (error) return error;
      }
      return null;
    }
    if ("not" in rule) return Object.keys(rule).length === 1 ? visit(rule.not, level + 1) : "Koşul geçerli değil.";
    count += 1;
    if (count > maxRules) return `Koşulda en çok ${maxRules} kural olabilir.`;
    if (typeof rule.field !== "string" || !CONDITION_OPERATORS.includes(rule.op)) return "Koşul kuralı alan ve geçerli bir işleç içermeli.";
    if (Object.keys(rule).some((key) => !["field", "op", "value"].includes(key))) return "Koşul kuralında tanınmayan anahtar var.";
    if (rule.op === "in" && !Array.isArray(rule.value)) return "\"içinde\" işleci liste değer ister.";
    if (rule.op !== "exists" && rule.op !== "in" && (rule.value === undefined || (typeof rule.value === "object" && rule.value !== null))) return "Koşul değeri metin, sayı veya evet/hayır olmalı.";
    return null;
  };
  return visit(condition, depth);
};
