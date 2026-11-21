import Alert from "@/components/Alert";
import ChoiceCard from "@/components/ChoiceCard";
import FieldGroup from "@/components/FieldGroup";
import Input from "@/components/Input";
import Switch from "@/components/Switch";
import { KIND_OPTIONS } from "../../labels";
import "./behavior_settings.scss";

/** İçerik türü ve davranış: yayın akışı, kopyalama, sıralama, çöp kutusu, kayıt sınırı. */
const BehaviorSettings = ({ schema, onChange, publishedKind = null, errors = {} }) => {
  const behavior = schema.behavior;
  const set = (patch) => onChange({ ...schema, behavior: { ...behavior, ...patch } });
  const setKind = (kind) => {
    const list = schema.ui.list;
    const view = kind === "tree" ? "tree" : list.view === "tree" ? "table" : list.view;
    onChange({
      ...schema,
      kind,
      ui: { ...schema.ui, list: { ...list, view } },
      behavior: kind === "singleton" ? { ...behavior, maxEntries: 1, allowDuplicate: false, allowReorder: false } : { ...behavior, maxEntries: behavior.maxEntries === 1 ? null : behavior.maxEntries },
    });
  };
  return (
    <div className="behavior_settings">
      <FieldGroup legend="İçerik türü" layout="grid" columns={3}>
        {KIND_OPTIONS.map((option) => (
          <ChoiceCard key={option.value} name="schema-kind" value={option.value} label={option.label} description={option.description} checked={schema.kind === option.value} onChange={() => setKind(option.value)} />
        ))}
      </FieldGroup>
      {publishedKind && publishedKind !== schema.kind && <Alert variant="warning" size="compact">İçerik türü değişiyor. Yayın öncesi kayıt denetimi kayıt sayısını ve ilişkileri denetler.</Alert>}
      {errors.kind && <Alert variant="danger" size="compact">{errors.kind}</Alert>}
      {schema.kind !== "singleton" && (
        <div className="behavior_settings_switches">
          <Switch label="Kayıt kopyalanabilir" size="sm" checked={behavior.allowDuplicate} onChange={(event) => set({ allowDuplicate: event.target.checked })} />
          <Switch label="Elle sıralanabilir" size="sm" checked={behavior.allowReorder} onChange={(event) => set({ allowReorder: event.target.checked })} />
          <Switch label="Silinen kayıt çöp kutusuna gider" description="Kapalıysa silme yine kalıcı değildir; arşiv olarak saklanır." size="sm" checked={behavior.softDelete} onChange={(event) => set({ softDelete: event.target.checked })} />
          <Input
            label="En çok kayıt"
            size="sm"
            type="number"
            min={1}
            max={100000}
            optionalText="Sınırsız"
            value={behavior.maxEntries ?? ""}
            onChange={(event) => set({ maxEntries: event.target.value === "" ? null : Number.parseInt(event.target.value, 10) })}
            error={errors["behavior.maxEntries"]}
            className="behavior_settings_limit"
          />
        </div>
      )}
    </div>
  );
};

export default BehaviorSettings;
