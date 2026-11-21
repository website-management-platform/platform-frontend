// Hesaplanan alanların ifade dili (şartname §6: izinli aritmetik, concat, coalesce; eval yok).
// Dilbilgisi: ifade := terim (("+"|"-") terim)* ; terim := çarpan (("*"|"/") çarpan)* ;
// çarpan := sayı | "metin" | alanAnahtarı | fonksiyon "(" argümanlar ")" | "(" ifade ")" | "-" çarpan
// "+" iki sayıda toplama yapar; metin birleştirmek için concat kullanılır.

export const EXPRESSION_FUNCTIONS = {
  concat: { min: 1, max: 10 },
  coalesce: { min: 1, max: 10 },
  upper: { min: 1, max: 1 },
  lower: { min: 1, max: 1 },
  trim: { min: 1, max: 1 },
  round: { min: 1, max: 2 },
};

const MAX_EXPRESSION_LENGTH = 500;
const MAX_NODES = 100;

const tokenize = (source) => {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
    } else if (/[0-9]/.test(char)) {
      const match = /^\d+(?:\.\d+)?/.exec(source.slice(index));
      tokens.push({ type: "number", value: Number(match[0]) });
      index += match[0].length;
    } else if (char === "\"") {
      let end = index + 1;
      let text = "";
      while (end < source.length && source[end] !== "\"") {
        if (source[end] === "\\" && end + 1 < source.length) {
          text += source[end + 1];
          end += 2;
        } else {
          text += source[end];
          end += 1;
        }
      }
      if (end >= source.length) throw new Error("Kapanmamış metin.");
      tokens.push({ type: "string", value: text });
      index = end + 1;
    } else if (/[a-zA-Z_]/.test(char)) {
      const match = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(source.slice(index));
      tokens.push({ type: "name", value: match[0] });
      index += match[0].length;
    } else if ("+-*/(),".includes(char)) {
      tokens.push({ type: "punct", value: char });
      index += 1;
    } else {
      throw new Error(`Beklenmeyen karakter: ${char}`);
    }
  }
  return tokens;
};

/** İfadeyi ayrıştırır. Hata varsa { error } döner; yoksa { ast, references } (başvurulan alan anahtarları). */
export const parseExpression = (source) => {
  if (typeof source !== "string" || !source.trim()) return { error: "İfade boş." };
  if (source.length > MAX_EXPRESSION_LENGTH) return { error: `İfade en çok ${MAX_EXPRESSION_LENGTH} karakter olabilir.` };
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (error) {
    return { error: error.message };
  }
  let position = 0;
  let nodes = 0;
  const references = new Set();
  const peek = () => tokens[position];
  const take = (value) => {
    const token = tokens[position];
    if (!token || (value && token.value !== value)) throw new Error(value ? `"${value}" bekleniyordu.` : "İfade eksik.");
    position += 1;
    return token;
  };
  const node = (value) => {
    nodes += 1;
    if (nodes > MAX_NODES) throw new Error("İfade çok karmaşık.");
    return value;
  };

  const parseFactor = () => {
    const token = take();
    if (token.type === "number") return node({ type: "number", value: token.value });
    if (token.type === "string") return node({ type: "string", value: token.value });
    if (token.type === "punct" && token.value === "(") {
      const inner = parseSum();
      take(")");
      return inner;
    }
    if (token.type === "punct" && token.value === "-") return node({ type: "negate", operand: parseFactor() });
    if (token.type === "name") {
      if (peek()?.value === "(") {
        const spec = EXPRESSION_FUNCTIONS[token.value];
        if (!spec) throw new Error(`Bilinmeyen fonksiyon: ${token.value}`);
        take("(");
        const args = [];
        if (peek()?.value !== ")") {
          args.push(parseSum());
          while (peek()?.value === ",") {
            take(",");
            args.push(parseSum());
          }
        }
        take(")");
        if (args.length < spec.min || args.length > spec.max) throw new Error(`${token.value} ${spec.min}–${spec.max} argüman alır.`);
        return node({ type: "call", name: token.value, args });
      }
      references.add(token.value);
      return node({ type: "field", key: token.value });
    }
    throw new Error(`Beklenmeyen "${token.value}".`);
  };
  const parseProduct = () => {
    let left = parseFactor();
    while (peek()?.value === "*" || peek()?.value === "/") {
      const operator = take().value;
      left = node({ type: "binary", operator, left, right: parseFactor() });
    }
    return left;
  };
  function parseSum() {
    let left = parseProduct();
    while (peek()?.value === "+" || peek()?.value === "-") {
      const operator = take().value;
      left = node({ type: "binary", operator, left, right: parseProduct() });
    }
    return left;
  }

  try {
    const ast = parseSum();
    if (position < tokens.length) throw new Error(`Beklenmeyen "${tokens[position].value}".`);
    return { ast, references: [...references] };
  } catch (error) {
    return { error: error.message };
  }
};

const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return null;
};

/** Ayrıştırılmış ifadeyi değerlerle hesaplar (values: alan anahtarı → değer). Hesaplanamazsa null. */
export const evaluateExpression = (ast, values) => {
  switch (ast.type) {
    case "number":
    case "string":
      return ast.value;
    case "field":
      return values[ast.key] ?? null;
    case "negate": {
      const operand = toNumber(evaluateExpression(ast.operand, values));
      return operand === null ? null : -operand;
    }
    case "binary": {
      const left = toNumber(evaluateExpression(ast.left, values));
      const right = toNumber(evaluateExpression(ast.right, values));
      if (left === null || right === null) return null;
      if (ast.operator === "+") return left + right;
      if (ast.operator === "-") return left - right;
      if (ast.operator === "*") return left * right;
      return right === 0 ? null : left / right;
    }
    case "call": {
      const args = ast.args.map((arg) => evaluateExpression(arg, values));
      if (ast.name === "concat") return args.map((arg) => (arg === null || arg === undefined ? "" : String(arg))).join("");
      if (ast.name === "coalesce") return args.find((arg) => arg !== null && arg !== undefined && arg !== "") ?? null;
      if (ast.name === "upper") return typeof args[0] === "string" ? args[0].toLocaleUpperCase("tr-TR") : null;
      if (ast.name === "lower") return typeof args[0] === "string" ? args[0].toLocaleLowerCase("tr-TR") : null;
      if (ast.name === "trim") return typeof args[0] === "string" ? args[0].trim() : null;
      if (ast.name === "round") {
        const value = toNumber(args[0]);
        const digits = Math.min(10, Math.max(0, toNumber(args[1]) ?? 0));
        return value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;
      }
      return null;
    }
    default:
      return null;
  }
};
