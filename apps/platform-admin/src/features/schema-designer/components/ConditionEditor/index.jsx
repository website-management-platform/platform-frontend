import { FiPlus, FiTrash2 } from "react-icons/fi";
import { CONDITION_OPERATORS, getFieldType, labelOf } from "@wmp/schema";
import Button from "@/components/Button";
import Input from "@/components/Input";
import SegmentedControl from "@/components/SegmentedControl";
import Select from "@/components/Select";
import Switch from "@/components/Switch";
import { OPERATOR_LABELS } from "../../labels";
import "./condition_editor.scss";

const NUMERIC = new Set(["integer", "decimal", "percentage"]);

const operatorsFor = (target) => {
  const supported = getFieldType(target?.type)?.operators ?? ["exists"];
  return CONDITION_OPERATORS.filter((op) => supported.includes(op) || op === "exists");
};

const ValueInput = ({ target, rule, onChange }) => {
  if (!target || rule.op === "exists") return null;
  if (target.type === "boolean") {
    const options = [{ value: true, label: "Evet" }, { value: false, label: "Hayır" }];
    return <Select aria-label="Değer" size="sm" options={options} value={options.find((option) => option.value === rule.value) ?? null} onChange={(option) => onChange(option?.value)} placeholder="Değer" />;
  }
  if (target.type === "select" || target.type === "multiselect") {
    const options = (target.settings?.options ?? []).map((option) => ({ value: option.id, label: labelOf(option.label) }));
    if (rule.op === "in") {
      return <Select aria-label="Değerler" size="sm" isMulti options={options} value={options.filter((option) => (rule.value ?? []).includes(option.value))} onChange={(selected) => onChange(selected.map((option) => option.value))} placeholder="Değerler" />;
    }
    return <Select aria-label="Değer" size="sm" options={options} value={options.find((option) => option.value === rule.value) ?? null} onChange={(option) => onChange(option?.value)} placeholder="Değer" />;
  }
  const numeric = NUMERIC.has(target.type);
  if (rule.op === "in") {
    return <Input aria-label="Değerler (virgülle)" size="sm" value={(rule.value ?? []).join(", ")} onChange={(event) => onChange(event.target.value.split(",").map((item) => item.trim()).filter(Boolean).map((item) => (numeric ? Number(item) : item)))} placeholder="değer1, değer2" />;
  }
  return (
    <Input
      aria-label="Değer"
      size="sm"
      type={numeric ? "number" : target.type === "date" ? "date" : "text"}
      value={rule.value ?? ""}
      onChange={(event) => onChange(numeric && event.target.value !== "" ? Number(event.target.value) : event.target.value)}
    />
  );
};

/**
 * Koşullu görünürlük (şartname §6): tüm/herhangi biri eşleşmesiyle kural listesi. Kurallar alan kimliğine bağlanır.
 * Kural yalnız aynı düzeydeki (üst düzey) alanlara bakabilir; backend aynı kuralı zorunluluk denetiminde uygular.
 */
const ConditionEditor = ({ condition, onChange, candidates, error }) => {
  const enabled = Boolean(condition);
  const mode = condition?.any ? "any" : "all";
  const rules = condition?.[mode] ?? [];
  const setRules = (next) => onChange(next.length === 0 ? null : { [mode]: next });
  const candidateOptions = candidates.map((field) => ({ value: field.id, label: `${labelOf(field.label)} (${field.key})` }));
  const firstRule = () => ({ field: candidates[0]?.id, op: "exists", value: true });

  return (
    <div className="condition_editor">
      <Switch
        label="Yalnız koşul sağlanınca göster"
        description="Gizlenen alanın zorunluluğu yayını engellemez; değeri korunur."
        size="sm"
        checked={enabled}
        disabled={!enabled && candidates.length === 0}
        onChange={(event) => onChange(event.target.checked ? { all: [firstRule()] } : null)}
      />
      {!enabled && candidates.length === 0 && <p className="condition_editor_note">Koşul kurmak için önce başka bir alan ekleyin.</p>}
      {enabled && (
        <>
          <SegmentedControl
            size="sm"
            ariaLabel="Kural eşleşmesi"
            options={[{ value: "all", label: "Tüm kurallar" }, { value: "any", label: "Herhangi biri" }]}
            value={mode}
            onChange={(next) => onChange({ [next]: rules })}
          />
          <ol className="condition_editor_rules">
            {rules.map((rule, index) => {
              const target = candidates.find((field) => field.id === rule.field);
              const operators = operatorsFor(target).map((op) => ({ value: op, label: OPERATOR_LABELS[op] }));
              const update = (patch) => setRules(rules.map((item, position) => (position === index ? { ...item, ...patch } : item)));
              return (
                <li key={index} className="condition_editor_rule">
                  <Select aria-label="Alan" size="sm" options={candidateOptions} value={candidateOptions.find((option) => option.value === rule.field) ?? null} onChange={(option) => update({ field: option?.value, op: "exists", value: true })} />
                  <Select
                    aria-label="Koşul"
                    size="sm"
                    options={operators}
                    value={operators.find((option) => option.value === rule.op) ?? null}
                    onChange={(option) => update({ op: option?.value, value: option?.value === "exists" ? true : option?.value === "in" ? [] : undefined })}
                  />
                  <ValueInput target={target} rule={rule} onChange={(value) => update({ value })} />
                  <Button variant="ghost" size="sm" color="danger" icon={FiTrash2} ariaLabel={`${index + 1}. kuralı sil`} onClick={() => setRules(rules.filter((_, position) => position !== index))} />
                </li>
              );
            })}
          </ol>
          {error && <p className="condition_editor_error" role="alert">{error}</p>}
          <Button variant="outline" size="sm" icon={FiPlus} onClick={() => setRules([...rules, firstRule()])} disabled={rules.length >= 10}>Kural ekle</Button>
        </>
      )}
    </div>
  );
};

export default ConditionEditor;
