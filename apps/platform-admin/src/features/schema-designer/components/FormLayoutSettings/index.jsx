import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2 } from "react-icons/fi";
import { newUuid } from "@wmp/schema";
import Button from "@/components/Button";
import Input from "@/components/Input";
import SegmentedControl from "@/components/SegmentedControl";
import "./form_layout_settings.scss";

/** Form düzeni: tek veya iki kolon ve alan grupları. Alanlar gruba özellik panelinden atanır. */
const FormLayoutSettings = ({ form, onChange, fields, onUnassign }) => {
  const groups = form.groups ?? [];
  const setGroups = (next) => onChange({ ...form, groups: next });
  const move = (index, direction) => {
    const next = [...groups];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setGroups(next);
  };
  return (
    <div className="form_layout_settings">
      <SegmentedControl size="sm" ariaLabel="Form düzeni" options={[{ value: "single", label: "Tek kolon" }, { value: "two-column", label: "İki kolon" }]} value={form.layout} onChange={(layout) => onChange({ ...form, layout })} />
      <ol className="form_layout_settings_groups" aria-label="Form grupları">
        {groups.map((group, index) => {
          const count = fields.filter((field) => field.ui?.group === group.id).length;
          return (
            <li key={group.id} className="form_layout_settings_group">
              <Input aria-label={`${index + 1}. grup adı`} size="sm" value={group.label?.tr ?? ""} maxLength={120} onChange={(event) => setGroups(groups.map((item) => (item.id === group.id ? { ...item, label: { ...item.label, tr: event.target.value } } : item)))} />
              <span className="form_layout_settings_count">{count} alan</span>
              <Button variant="ghost" size="sm" icon={FiArrowUp} ariaLabel="Grubu yukarı taşı" disabled={index === 0} onClick={() => move(index, -1)} />
              <Button variant="ghost" size="sm" icon={FiArrowDown} ariaLabel="Grubu aşağı taşı" disabled={index === groups.length - 1} onClick={() => move(index, 1)} />
              <Button variant="ghost" size="sm" color="danger" icon={FiTrash2} ariaLabel={`${group.label?.tr ?? "Grup"} grubunu kaldır`} onClick={() => { onUnassign(group.id); setGroups(groups.filter((item) => item.id !== group.id)); }} />
            </li>
          );
        })}
      </ol>
      <Button variant="outline" size="sm" icon={FiPlus} onClick={() => setGroups([...groups, { id: newUuid(), label: { tr: `Grup ${groups.length + 1}` } }])} disabled={groups.length >= 30}>Grup ekle</Button>
    </div>
  );
};

export default FormLayoutSettings;
