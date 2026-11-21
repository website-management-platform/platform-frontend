import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2 } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { KIND_LABELS } from "../../../schema-designer/labels";
import { useTemplates } from "../../api";
import { suggestLibraryKey } from "../../options";
import "./preset_modules_editor.scss";

/**
 * Presetin modül listesi: her satır bir şablon sürümü, sitede oluşacak modül anahtarı ve adı.
 * Aynı şablon birden çok kez eklenebilir (ör. Ekip ve Yönetim kurulu). errors: "modules.0.key" → mesaj.
 */
const PresetModulesEditor = ({ modules, onChange, errors = {} }) => {
  const templatesQuery = useTemplates({ status: "ACTIVE" });
  const templates = (templatesQuery.data?.items ?? []).filter((item) => item.latestVersion > 0);
  const templateOptions = templates.map((item) => ({ value: item.id, label: `${labelOf(item.label)} · ${KIND_LABELS[item.kind]}`, template: item }));
  const update = (index, patch) => onChange(modules.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  const move = (index, direction) => {
    const next = [...modules];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };
  const add = () => {
    const first = templates[0];
    if (!first) return;
    onChange([...modules, { templateId: first.id, templateVersion: first.latestVersion, key: uniqueKey(first.key), label: { tr: labelOf(first.label) } }]);
  };
  function uniqueKey(base) {
    let key = base;
    let suffix = 2;
    while (modules.some((item) => item.key === key)) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }
    return key;
  }

  return (
    <div className="preset_modules_editor">
      {errors.modules && <p className="preset_modules_editor_error" role="alert">{errors.modules}</p>}
      <ol className="preset_modules_editor_list">
        {modules.map((item, index) => {
          const template = templates.find((candidate) => candidate.id === item.templateId);
          const versions = template ? Array.from({ length: template.latestVersion }, (_, position) => ({ value: template.latestVersion - position, label: `v${template.latestVersion - position}${position === 0 ? " (son)" : ""}` })) : [{ value: item.templateVersion, label: `v${item.templateVersion}` }];
          return (
            <li key={index} className="preset_modules_editor_row">
              <span className="preset_modules_editor_index" aria-hidden="true">{index + 1}</span>
              <div className="preset_modules_editor_fields">
                <Select
                  label="Şablon"
                  size="sm"
                  options={templateOptions}
                  value={templateOptions.find((option) => option.value === item.templateId) ?? (item.templateLabel ? { value: item.templateId, label: item.templateLabel } : null)}
                  onChange={(option) => option && update(index, { templateId: option.value, templateVersion: option.template.latestVersion, label: { tr: labelOf(option.template.label) }, key: uniqueKey(option.template.key) })}
                  isLoading={templatesQuery.isPending}
                  error={errors[`modules.${index}.templateId`]}
                />
                <Select label="Sürüm" size="sm" options={versions} value={versions.find((option) => option.value === item.templateVersion) ?? null} onChange={(option) => update(index, { templateVersion: option?.value })} error={errors[`modules.${index}.templateVersion`]} />
                <Input label="Bölüm adı" size="sm" value={item.label?.tr ?? ""} maxLength={120} onChange={(event) => update(index, { label: { tr: event.target.value } })} error={errors[`modules.${index}.label`]} />
                <Input label="Bölüm anahtarı" size="sm" value={item.key} maxLength={63} onChange={(event) => update(index, { key: suggestLibraryKey(event.target.value) || event.target.value.toLowerCase() })} error={errors[`modules.${index}.key`]} className="preset_modules_editor_mono" />
              </div>
              <div className="preset_modules_editor_actions">
                <Button variant="ghost" size="sm" icon={FiArrowUp} ariaLabel={`${item.label?.tr ?? "Bölüm"} yukarı`} disabled={index === 0} onClick={() => move(index, -1)} />
                <Button variant="ghost" size="sm" icon={FiArrowDown} ariaLabel={`${item.label?.tr ?? "Bölüm"} aşağı`} disabled={index === modules.length - 1} onClick={() => move(index, 1)} />
                <Button variant="ghost" size="sm" color="danger" icon={FiTrash2} ariaLabel={`${item.label?.tr ?? "Bölüm"} kaldır`} onClick={() => onChange(modules.filter((_, position) => position !== index))} />
              </div>
            </li>
          );
        })}
      </ol>
      <Button variant="outline" size="sm" icon={FiPlus} onClick={add} disabled={templates.length === 0 || modules.length >= 40}>Bölüm ekle</Button>
    </div>
  );
};

export default PresetModulesEditor;
