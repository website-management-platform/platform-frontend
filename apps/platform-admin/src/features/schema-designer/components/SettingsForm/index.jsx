import { EXPRESSION_FUNCTIONS, checkSafePattern } from "@wmp/schema";
import CheckboxGroup from "@/components/CheckboxGroup";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Switch from "@/components/Switch";
import Textarea from "@/components/Textarea";
import { SETTING_OPTION_LABELS } from "../../labels";
import "./settings_form.scss";

const toNumber = (text, integer) => {
  if (text === "") return undefined;
  const value = Number(text);
  if (Number.isNaN(value)) return text;
  return integer ? Math.trunc(value) : value;
};

/**
 * Alan tipinin ayar formu; registry'deki ayar tanımlarından üretilir (şartname §6: her tip kendi config formunu üretir).
 * "options" ve "blocks" ayrı düzenleyicilerdedir. errors: ayar anahtarı → mesaj.
 */
const SettingsForm = ({ fieldType, settings, onChange, errors = {}, moduleOptions = null, siblingKeys = [] }) => {
  const set = (key, value) => {
    const next = { ...settings };
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0 && key !== "palette")) delete next[key];
    else next[key] = value;
    onChange(next);
  };
  const descriptors = fieldType.settings.filter((item) => item.kind !== "options");
  if (descriptors.length === 0) return <p className="settings_form_empty">Bu tipin ek ayarı yok.</p>;

  return (
    <div className="settings_form">
      {descriptors.map((descriptor) => {
        const value = settings[descriptor.key];
        const error = errors[descriptor.key];
        switch (descriptor.kind) {
          case "integer":
          case "number":
            return (
              <Input
                key={descriptor.key}
                label={descriptor.label}
                type="number"
                size="sm"
                inputMode={descriptor.kind === "integer" ? "numeric" : "decimal"}
                value={value ?? ""}
                min={descriptor.min}
                max={descriptor.max}
                onChange={(event) => set(descriptor.key, toNumber(event.target.value, descriptor.kind === "integer"))}
                error={error}
                optionalText={descriptor.required ? undefined : "İsteğe bağlı"}
              />
            );
          case "boolean":
            return <Switch key={descriptor.key} label={descriptor.label} size="sm" checked={Boolean(value)} onChange={(event) => set(descriptor.key, event.target.checked)} />;
          case "multiEnum":
            return (
              <CheckboxGroup
                key={descriptor.key}
                label={descriptor.label}
                size="sm"
                columns={2}
                options={descriptor.options.map((option) => ({ value: option, label: SETTING_OPTION_LABELS[option] ?? option }))}
                value={value ?? []}
                onChange={(next) => set(descriptor.key, next)}
                error={error}
              />
            );
          case "stringList":
            return (
              <Textarea
                key={descriptor.key}
                label={descriptor.label}
                size="sm"
                rows={3}
                value={(value ?? []).join("\n")}
                onChange={(event) => set(descriptor.key, event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))}
                hint="Her satıra bir değer."
                error={error}
              />
            );
          case "pattern": {
            const problem = value ? checkSafePattern(value) : null;
            return (
              <Input
                key={descriptor.key}
                label={descriptor.label}
                size="sm"
                value={value ?? ""}
                onChange={(event) => set(descriptor.key, event.target.value)}
                hint={descriptor.help}
                error={error ?? problem ?? undefined}
                optionalText="İsteğe bağlı"
                spellCheck={false}
                className="settings_form_mono"
              />
            );
          }
          case "moduleRef":
            return moduleOptions ? (
              <Select
                key={descriptor.key}
                label={descriptor.label}
                size="sm"
                required
                options={moduleOptions}
                value={moduleOptions.find((option) => option.value === value) ?? null}
                onChange={(option) => set(descriptor.key, option?.value)}
                placeholder="Bölüm seçin"
                error={error}
                hint="İlişki yalnız aynı sitedeki bölümlere kurulur."
              />
            ) : (
              <Input
                key={descriptor.key}
                label={descriptor.label}
                size="sm"
                required
                value={value ?? ""}
                onChange={(event) => set(descriptor.key, event.target.value.trim())}
                hint="Şablonda hedef bölüm anahtarı yazılır; site bölümünde hedef var mı yayın öncesi denetlenir."
                error={error}
                className="settings_form_mono"
              />
            );
          case "expression":
            return (
              <Textarea
                key={descriptor.key}
                label={descriptor.label}
                size="sm"
                rows={3}
                required
                value={value ?? ""}
                onChange={(event) => set(descriptor.key, event.target.value)}
                hint={`Alan anahtarları (${siblingKeys.slice(0, 6).join(", ")}${siblingKeys.length > 6 ? "…" : ""}), sayılar, "metin", + − × ÷ ve ${Object.keys(EXPRESSION_FUNCTIONS).join(", ")} kullanılabilir.`}
                error={error}
                className="settings_form_mono"
                spellCheck={false}
              />
            );
          default:
            return (
              <Input
                key={descriptor.key}
                label={descriptor.label}
                size="sm"
                type={descriptor.kind === "date" ? "date" : "text"}
                value={value ?? ""}
                onChange={(event) => set(descriptor.key, event.target.value)}
                error={error}
                optionalText={descriptor.required ? undefined : "İsteğe bağlı"}
              />
            );
        }
      })}
    </div>
  );
};

export default SettingsForm;
