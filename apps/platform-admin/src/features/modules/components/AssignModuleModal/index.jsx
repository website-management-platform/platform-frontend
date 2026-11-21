import { useState } from "react";
import { labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import Switch from "@/components/Switch";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { useTemplates } from "../../../library/api";
import { suggestLibraryKey } from "../../../library/options";
import { KIND_LABELS } from "../../../schema-designer/labels";
import { useAssignModule } from "../../api";
import "./assign_module_modal.scss";

/**
 * Şablon sürümünden siteye modül ekler (şartname §11 modül atama). Aynı şablon bir sitede birden çok kez eklenebilir;
 * her modül ayrı anahtar, kayıt, yetki ve API adresi alır (AT-03).
 */
const AssignModuleModal = ({ site, existingKeys, onClose, onSaved }) => {
  const templatesQuery = useTemplates({ status: "ACTIVE" });
  const assign = useAssignModule(site.id);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [values, setValues] = useState({ templateId: null, templateVersion: null, label: "", key: "", enabled: true });
  const [keyEdited, setKeyEdited] = useState(false);
  const templates = (templatesQuery.data?.items ?? []).filter((item) => item.latestVersion > 0);
  const options = templates.map((item) => ({ value: item.id, label: labelOf(item.label), template: item }));
  const selected = templates.find((item) => item.id === values.templateId);
  const versions = selected ? Array.from({ length: selected.latestVersion }, (_, index) => ({ value: selected.latestVersion - index, label: `v${selected.latestVersion - index}${index === 0 ? " (son)" : ""}` })) : [];
  const fieldErrors = getFieldErrors(assign.error);
  const generalError = assign.error && Object.keys(fieldErrors).length === 0 ? getErrorMessage(assign.error) : null;
  const keyTaken = existingKeys.includes(values.key);

  const uniqueSuggestion = (base) => {
    let key = base;
    let suffix = 2;
    while (existingKeys.includes(key)) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }
    return key;
  };

  const setLabel = (label) => setValues((current) => ({ ...current, label, ...(!keyEdited ? { key: uniqueSuggestion(suggestLibraryKey(label)) } : {}) }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Bölüm ekle"
      description={`${site.displayName} sitesine şablondan bağımsız bir bölüm eklenir. Şablonun sonraki sürümleri bu bölümü kendiliğinden değiştirmez.`}
      size="lg"
      busy={assign.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={assign.isPending}>Vazgeç</Button>
          <Button type="submit" form="assign-module-form" loading={assign.isPending} disabled={!selected}>Ekle</Button>
        </>
      )}
    >
      <form
        id="assign-module-form"
        className="assign_module_modal"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          assign.mutate({ idempotencyKey, values: { templateId: values.templateId, templateVersion: values.templateVersion, key: values.key, label: { tr: values.label.trim() }, enabled: values.enabled } }, { onSuccess: onSaved });
        }}
      >
        {generalError && <Alert variant="danger" size="compact">{generalError}</Alert>}
        <Select
          label="Şablon"
          required
          options={options}
          value={options.find((option) => option.value === values.templateId) ?? null}
          onChange={(option) => {
            if (!option) return;
            setValues((current) => ({ ...current, templateId: option.value, templateVersion: option.template.latestVersion }));
            if (!values.label || !keyEdited) setLabel(labelOf(option.template.label));
          }}
          formatOptionLabel={(option) => (
            <span className="assign_module_modal_option">
              <span>{option.label}</span>
              <span className="assign_module_modal_option_meta">{option.template.category} · {KIND_LABELS[option.template.kind]} · {option.template.fieldCount} alan</span>
            </span>
          )}
          isLoading={templatesQuery.isPending}
          placeholder="Şablon ara"
          error={fieldErrors.templateId}
          autoFocus
        />
        {selected && (
          <>
            <p className="assign_module_modal_description">{selected.description}</p>
            <div className="assign_module_modal_grid">
              <Select label="Sürüm" options={versions} value={versions.find((option) => option.value === values.templateVersion) ?? null} onChange={(option) => setValues((current) => ({ ...current, templateVersion: option?.value }))} error={fieldErrors.templateVersion} />
              <Input label="Bölüm adı" required maxLength={120} value={values.label} onChange={(event) => setLabel(event.target.value)} error={fieldErrors.label} hint="Müşterinin menüde göreceği ad; sonradan değişebilir." />
              <Input
                label="Bölüm anahtarı"
                required
                maxLength={63}
                value={values.key}
                onChange={(event) => { setKeyEdited(true); setValues((current) => ({ ...current, key: event.target.value.toLowerCase() })); }}
                error={fieldErrors.key ?? (keyTaken ? "Bu anahtar sitede kullanılıyor." : undefined)}
                hint="Web sitesinin içeriği okuduğu adres parçası; sonradan değiştirilemez."
                className="assign_module_modal_mono"
              />
            </div>
            <Switch label="Hemen müşteriye aç" description="Kapalı bırakırsanız bölüm hazırlanır ama müşteri panelinde görünmez." checked={values.enabled} onChange={(event) => setValues((current) => ({ ...current, enabled: event.target.checked }))} />
          </>
        )}
      </form>
    </Modal>
  );
};

export default AssignModuleModal;
