import { useState } from "react";
import { labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { cx } from "@/utils/cx";
import { usePreset, usePresets } from "../../../library/api";
import { useApplyPreset } from "../../api";
import "./apply_preset_modal.scss";

const initialSelection = (preset, existingKeys) => preset.modules.map((item) => ({
  key: item.key,
  include: !existingKeys.includes(item.key),
  targetKey: item.key,
  label: labelOf(item.label),
}));

const PresetModulesPicker = ({ preset, existingKeys, selection, onChange, errors }) => (
  <ul className="apply_preset_modal_list">
    {preset.modules.map((item, index) => {
      const row = selection[index];
      const conflict = existingKeys.includes(row.targetKey);
      const update = (patch) => onChange(selection.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)));
      return (
        <li key={item.key} className={cx("apply_preset_modal_row", !row.include && "apply_preset_modal_row_skipped")}>
          <Checkbox label={labelOf(item.label)} description={`${item.templateLabel} · v${item.templateVersion}`} checked={row.include} onChange={(event) => update({ include: event.target.checked })} />
          {row.include && (
            <div className="apply_preset_modal_inputs">
              <Input aria-label={`${labelOf(item.label)} bölüm adı`} size="sm" value={row.label} maxLength={120} onChange={(event) => update({ label: event.target.value })} error={errors[`modules.${index}.label`]} />
              <Input
                aria-label={`${labelOf(item.label)} bölüm anahtarı`}
                size="sm"
                value={row.targetKey}
                maxLength={63}
                onChange={(event) => update({ targetKey: event.target.value.toLowerCase() })}
                error={errors[`modules.${index}.targetKey`] ?? (conflict ? "Sitede bu anahtar var; yeni anahtar yazın veya atlayın." : undefined)}
                className="apply_preset_modal_mono"
              />
            </div>
          )}
        </li>
      );
    })}
  </ul>
);

/**
 * Mevcut siteye presetten seçmeli modül ekleme (şartname §25.1, AT-41). Mevcut modüller hiçbir koşulda değişmez;
 * anahtarı çakışan modül yeniden adlandırılır veya atlanır.
 */
const ApplyPresetModal = ({ site, existingKeys, onClose, onSaved }) => {
  const presetsQuery = usePresets({ status: "ACTIVE" });
  const [presetId, setPresetId] = useState(null);
  const presetQuery = usePreset(presetId);
  const [selection, setSelection] = useState(null);
  const apply = useApplyPreset(site.id);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const preset = presetQuery.data;
  const rows = selection ?? (preset ? initialSelection(preset, existingKeys) : []);
  const options = (presetsQuery.data?.items ?? []).map((item) => ({ value: item.id, label: `${labelOf(item.label)} · ${item.moduleCount} bölüm` }));
  const fieldErrors = getFieldErrors(apply.error);
  const generalError = apply.error && Object.keys(fieldErrors).filter((key) => key.startsWith("modules.")).length === 0 ? getErrorMessage(apply.error) : null;
  const included = rows.filter((row) => row.include);
  const hasConflict = included.some((row) => existingKeys.includes(row.targetKey));

  return (
    <Modal
      open
      onClose={onClose}
      title="Site şablonundan bölüm ekle"
      description="Seçtiğiniz bölümler yeni bölüm olarak eklenir. Sitedeki bölümler ve kayıtları değişmez."
      size="lg"
      busy={apply.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={apply.isPending}>Vazgeç</Button>
          <Button
            loading={apply.isPending}
            disabled={!preset || included.length === 0 || hasConflict}
            onClick={() => apply.mutate({
              idempotencyKey,
              values: { presetId: preset.id, version: preset.latestVersion, modules: rows.map((row) => ({ key: row.key, include: row.include, targetKey: row.targetKey, label: { tr: row.label.trim() } })) },
            }, { onSuccess: onSaved })}
          >
            {included.length > 0 ? `${included.length} bölümü ekle` : "Bölüm seçin"}
          </Button>
        </>
      )}
    >
      <div className="apply_preset_modal">
        {generalError && <Alert variant="danger" size="compact">{generalError}</Alert>}
        <Select
          label="Site şablonu"
          options={options}
          value={options.find((option) => option.value === presetId) ?? null}
          onChange={(option) => {
            setPresetId(option?.value ?? null);
            setSelection(null);
            setIdempotencyKey(createIdempotencyKey());
            apply.reset();
          }}
          isLoading={presetsQuery.isPending}
          placeholder="Site şablonu seçin"
          autoFocus
        />
        {presetId && presetQuery.isPending && <p className="apply_preset_modal_note">Bölümler yükleniyor…</p>}
        {preset && (
          <>
            <p className="apply_preset_modal_note">v{preset.latestVersion} · Sitede anahtarı zaten olan modüller seçili gelmez.</p>
            <PresetModulesPicker preset={preset} existingKeys={existingKeys} selection={rows} onChange={setSelection} errors={fieldErrors} />
          </>
        )}
      </div>
    </Modal>
  );
};

export default ApplyPresetModal;
