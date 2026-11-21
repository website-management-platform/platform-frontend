import { useMemo, useState } from "react";
import { FiCopy, FiPackage, FiPlus, FiSearch } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Skeleton from "@/components/Skeleton";
import { normalizeSearch } from "@/utils/search";
import { useTemplates, useTemplateVersion } from "../../../library/api";
import { fieldTypeIcon } from "../../labels";
import "./field_palette.scss";

const PaletteItem = ({ icon: Icon, label, description, disabled, disabledReason, onAdd }) => (
  <li>
    <button type="button" className="field_palette_item" onClick={onAdd} disabled={disabled} aria-describedby={undefined}>
      <span className="field_palette_item_icon" aria-hidden="true"><Icon /></span>
      <span className="field_palette_item_text">
        <span className="field_palette_item_label">{label}</span>
        <span className="field_palette_item_description">{disabled ? disabledReason : description}</span>
      </span>
      {!disabled && <FiPlus className="field_palette_item_add" aria-hidden="true" />}
    </button>
  </li>
);

// Başka bir şablonun son sürümünden alan kopyalama (şartname §25.2: başka şema alanını kopyalayarak alan oluşturma).
const TemplateFieldCopier = ({ onCopy, excludeTemplateId }) => {
  const templatesQuery = useTemplates({ status: "ACTIVE" });
  const [templateId, setTemplateId] = useState(null);
  const options = (templatesQuery.data?.items ?? [])
    .filter((item) => item.latestVersion > 0 && item.id !== excludeTemplateId)
    .map((item) => ({ value: item.id, label: labelOf(item.label), latestVersion: item.latestVersion }));
  const selected = options.find((option) => option.value === templateId) ?? null;
  const versionQuery = useTemplateVersion(selected?.value, selected?.latestVersion);
  const fields = (versionQuery.data?.schema.fields ?? []).filter((field) => !field.archived);

  return (
    <div className="field_palette_copier">
      <Select
        aria-label="Alan kopyalanacak şablon"
        size="sm"
        options={options}
        value={selected}
        onChange={(option) => setTemplateId(option?.value ?? null)}
        placeholder="Şablon seçin"
        isLoading={templatesQuery.isPending}
        noOptionsMessage={() => "Şablon yok"}
      />
      {selected && versionQuery.isPending && <Skeleton variant="rectangle" height={80} />}
      {selected && fields.length > 0 && (
        <ul className="field_palette_list">
          {fields.map((field) => (
            <PaletteItem
              key={field.id}
              icon={fieldTypeIcon(field.type)}
              label={labelOf(field.label)}
              description={`${field.key} · kopyası eklenir`}
              onAdd={() => onCopy([field])}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Alan paleti: yerleşik tipler (aileye göre), hazır alan grupları ve başka şablondan kopyalama.
 * Fareyle veya klavyeyle (Tab + Enter) eklenir; sürükle bırak gerekmez (şartname §11).
 */
const FieldPalette = ({ fieldTypes, families, fieldGroups = [], targetLabel, onAddType, onAddFields, showGroups = true, showCopy = true, excludeTemplateId = null, context = "content" }) => {
  const [search, setSearch] = useState("");
  const query = normalizeSearch(search);

  const byFamily = useMemo(() => families
    .map((family) => ({
      ...family,
      items: fieldTypes.filter((item) => item.family === family.id
        && (!query || normalizeSearch(item.label).includes(query) || normalizeSearch(item.description).includes(query) || item.id.toLowerCase().includes(query))),
    }))
    .filter((family) => family.items.length > 0), [families, fieldTypes, query]);

  const groups = fieldGroups.filter((group) => group.status === "ACTIVE" && (!query || normalizeSearch(labelOf(group.label)).includes(query)));

  return (
    <aside className="field_palette" aria-label="Alan paleti">
      <div className="field_palette_head">
        <Input aria-label="Alan tipi ara" type="search" size="sm" icon={FiSearch} placeholder="Alan tipi ara" value={search} onChange={(event) => setSearch(event.target.value)} />
        <p className="field_palette_target">Eklenecek yer: <strong>{targetLabel}</strong></p>
      </div>
      <div className="field_palette_body">
        {byFamily.map((family) => (
          <section key={family.id} className="field_palette_section" aria-labelledby={`palette-${family.id}`}>
            <h3 id={`palette-${family.id}`} className="field_palette_heading">{family.label}</h3>
            <ul className="field_palette_list">
              {family.items.map((item) => {
                const disabled = item.availability !== "available" || !item.contexts.includes(context);
                return (
                  <PaletteItem
                    key={item.id}
                    icon={fieldTypeIcon(item.id)}
                    label={item.label}
                    description={item.description}
                    disabled={disabled}
                    disabledReason={item.unavailableReason ?? "Bu tip yalnız entegrasyon ayarlarında kullanılır."}
                    onAdd={() => onAddType(item.id)}
                  />
                );
              })}
            </ul>
          </section>
        ))}
        {showGroups && groups.length > 0 && (
          <section className="field_palette_section" aria-labelledby="palette-groups">
            <h3 id="palette-groups" className="field_palette_heading">Hazır alan grupları</h3>
            <ul className="field_palette_list">
              {groups.map((group) => (
                <PaletteItem key={group.id} icon={FiPackage} label={labelOf(group.label)} description={`${group.fields.length} alan · ${group.description || "kopyası eklenir"}`} onAdd={() => onAddFields(group.fields)} />
              ))}
            </ul>
          </section>
        )}
        {showCopy && !query && (
          <section className="field_palette_section" aria-labelledby="palette-copy">
            <h3 id="palette-copy" className="field_palette_heading"><FiCopy aria-hidden="true" /> Başka şablondan kopyala</h3>
            <TemplateFieldCopier onCopy={onAddFields} excludeTemplateId={excludeTemplateId} />
          </section>
        )}
        {byFamily.length === 0 && groups.length === 0 && <p className="field_palette_empty">Aramayla eşleşen alan tipi yok.</p>}
      </div>
    </aside>
  );
};

export default FieldPalette;
