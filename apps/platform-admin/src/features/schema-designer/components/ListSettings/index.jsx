import { FiPlus, FiTrash2 } from "react-icons/fi";
import { getFieldType, labelOf } from "@wmp/schema";
import Button from "@/components/Button";
import Input from "@/components/Input";
import SegmentedControl from "@/components/SegmentedControl";
import Select from "@/components/Select";
import { LIST_VIEW_OPTIONS } from "../../labels";
import "./list_settings.scss";

const SCALAR = new Set(["string", "integer", "decimal", "optionId", "date", "datetime", "computed", "boolean", "money"]);
const IMAGE_TYPES = new Set(["image", "imageGallery", "mediaGallery"]);
const SYSTEM_SORTS = [{ value: "position", label: "Elle sıralama" }, { value: "updatedAt", label: "Son güncelleme" }];

/** Müşteri panelindeki kayıt listesinin görünümü (şartname §5.1): görünüm, başlık/görsel alanı, kolonlar, sıralama. */
const ListSettings = ({ schema, onChange, errors = {} }) => {
  const list = schema.ui.list;
  const set = (patch) => onChange({ ...list, ...patch });
  const active = schema.fields.filter((field) => !field.archived);
  const option = (field) => ({ value: field.id, label: `${labelOf(field.label)} (${field.key})` });
  const scalar = active.filter((field) => SCALAR.has(getFieldType(field.type)?.valueKind)).map(option);
  const images = active.filter((field) => IMAGE_TYPES.has(field.type)).map(option);
  const sortable = [...SYSTEM_SORTS, ...active.filter((field) => field.sortable).map(option)];
  const views = LIST_VIEW_OPTIONS.filter((item) => item.value !== "tree" || schema.kind === "tree");

  if (schema.kind === "singleton") {
    return <p className="list_settings_note">Tek kayıtlı bölümde liste yoktur; müşteri doğrudan düzenleme ekranına gider.</p>;
  }

  return (
    <div className="list_settings">
      <div className="list_settings_row">
        <span className="list_settings_label" id="list-view-label">Görünüm</span>
        <SegmentedControl size="sm" ariaLabel="Liste görünümü" options={views} value={list.view} onChange={(view) => set({ view })} />
        {errors["ui.list.view"] && <p className="list_settings_error">{errors["ui.list.view"]}</p>}
      </div>
      <div className="list_settings_grid">
        <Select label="Başlık alanı" size="sm" required options={scalar} value={scalar.find((item) => item.value === list.titleField) ?? null} onChange={(item) => set({ titleField: item?.value ?? null })} error={errors["ui.list.titleField"]} />
        <Select label="Alt başlık alanı" size="sm" isClearable options={scalar} value={scalar.find((item) => item.value === list.subtitleField) ?? null} onChange={(item) => set({ subtitleField: item?.value ?? null })} placeholder="Yok" error={errors["ui.list.subtitleField"]} />
        <Select label="Görsel alanı" size="sm" isClearable options={images} value={images.find((item) => item.value === list.imageField) ?? null} onChange={(item) => set({ imageField: item?.value ?? null })} placeholder={images.length ? "Yok" : "Görsel alanı yok"} error={errors["ui.list.imageField"]} />
        <Input label="Sayfa başına kayıt" size="sm" type="number" min={5} max={100} value={list.pageSize ?? 20} onChange={(event) => set({ pageSize: Number.parseInt(event.target.value, 10) || 20 })} error={errors["ui.list.pageSize"]} />
      </div>
      <Select label="Tablo kolonları" size="sm" isMulti options={scalar} value={(list.columns ?? []).map((id) => scalar.find((item) => item.value === id)).filter(Boolean)} onChange={(selected) => set({ columns: selected.slice(0, 8).map((item) => item.value) })} hint="En çok 8 kolon; seçim sırası kolon sırasıdır." error={errors["ui.list.columns"]} />
      <fieldset className="list_settings_sort">
        <legend className="list_settings_label">Varsayılan sıralama</legend>
        {(list.sort ?? []).map((item, index) => (
          <div key={index} className="list_settings_sort_row">
            <Select aria-label={`${index + 1}. sıralama alanı`} size="sm" options={sortable} value={sortable.find((entry) => entry.value === item.field) ?? null} onChange={(entry) => set({ sort: list.sort.map((sortItem, position) => (position === index ? { ...sortItem, field: entry?.value } : sortItem)) })} />
            <SegmentedControl size="sm" ariaLabel={`${index + 1}. sıralama yönü`} options={[{ value: "asc", label: "Artan" }, { value: "desc", label: "Azalan" }]} value={item.direction} onChange={(direction) => set({ sort: list.sort.map((sortItem, position) => (position === index ? { ...sortItem, direction } : sortItem)) })} />
            <Button variant="ghost" size="sm" color="danger" icon={FiTrash2} ariaLabel={`${index + 1}. sıralamayı kaldır`} onClick={() => set({ sort: list.sort.filter((_, position) => position !== index) })} />
          </div>
        ))}
        {errors["ui.list.sort"] && <p className="list_settings_error">{errors["ui.list.sort"]}</p>}
        <Button variant="outline" size="sm" icon={FiPlus} disabled={(list.sort ?? []).length >= 3} onClick={() => set({ sort: [...(list.sort ?? []), { field: "position", direction: "asc" }] })}>Sıralama ekle</Button>
      </fieldset>
    </div>
  );
};

export default ListSettings;
