import { useEffect, useMemo, useRef, useState } from "react";
import { FiCode, FiEye, FiLayout, FiList, FiPlus, FiSettings, FiSliders } from "react-icons/fi";
import { fieldIdAtPath, findField, flattenFields, labelOf, validateFields, validateSchema } from "@wmp/schema";
import Button from "@/components/Button";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import Tabs, { TabPanel } from "@/components/Tabs";
import { useConfirm } from "@/hooks/useConfirm";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SECTION_LABELS } from "../../labels";
import { copyFieldsInto, duplicateField, fieldIdsIn, insertFields, locateField, moveField, newFieldOfType, removeField, updateField } from "../../schemaOps";
import BehaviorSettings from "../BehaviorSettings";
import FieldCanvas from "../FieldCanvas";
import FieldInspector from "../FieldInspector";
import FieldPalette from "../FieldPalette";
import FormLayoutSettings from "../FormLayoutSettings";
import ListSettings from "../ListSettings";
import SchemaPreview from "../SchemaPreview";
import ValidationSummary from "../ValidationSummary";
import "./schema_designer.scss";

const MODULE_TABS = [
  { id: "alanlar", label: "Alanlar", icon: FiSliders },
  { id: "form", label: "Form düzeni", icon: FiLayout },
  { id: "liste", label: "Liste", icon: FiList },
  { id: "davranis", label: "Davranış", icon: FiSettings },
  { id: "onizleme", label: "Önizleme", icon: FiEye },
  { id: "api", label: "API", icon: FiCode },
];

const FIELD_TABS = [
  { id: "alanlar", label: "Alanlar", icon: FiSliders },
  { id: "onizleme", label: "Önizleme", icon: FiEye },
];

const TAB_FOR_PATH = [[/^ui\.list/, "liste"], [/^ui\.form/, "form"], [/^(behavior|kind)/, "davranis"]];

// Alan grubu modu yalnız alan listesini düzenler; önizleme için geçici bir şema sarmalayıcısı kullanılır.
const wrapFields = (fields) => ({ kind: "collection", fields, ui: { form: { layout: "single", groups: [] }, list: { view: "table", titleField: null, columns: [], sort: [], pageSize: 20 } }, behavior: { allowDuplicate: true, allowReorder: true, softDelete: true, maxEntries: null } });

/**
 * Modül tasarımcısı (şartname §11, §25.2): alan paleti, form tuvali ve alan özellikleri; form düzeni, liste, davranış,
 * önizleme ve API sekmeleri. Değişiklikler onChange ile yukarı verilir (kayıt ve yayın sayfanın işidir).
 * mode="fields" yalnız alan listesi (hazır alan grupları) içindir.
 */
const SchemaDesigner = ({
  schema: value, onChange, mode = "module", baseSchema = null, locales = ["tr", "en"], defaultLocale = "tr", moduleKeys = null,
  fieldTypes, families, fieldGroups = [], readOnly = false, context = "content", excludeTemplateId = null, toolbar = null,
}) => {
  const confirm = useConfirm();
  const wide = useMediaQuery("(min-width: 1280px)");
  const schema = mode === "fields" ? wrapFields(value) : value;
  const [tab, setTab] = useState("alanlar");
  const [selectedId, setSelectedId] = useState(schema.fields[0]?.id ?? null);
  const [target, setTarget] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const focusRef = useRef(null);

  const emit = (next) => onChange(mode === "fields" ? next.fields : next);
  const errors = useMemo(() => (mode === "fields"
    ? validateFields(schema.fields, { locales, context })
    : validateSchema(schema, { locales, moduleKeys, base: baseSchema, context })), [mode, schema, locales, moduleKeys, baseSchema, context]);
  const errorFieldId = (error) => error.fieldId ?? fieldIdAtPath(schema, error.path);
  const errorCounts = useMemo(() => {
    const counts = new Map();
    errors.forEach((error) => {
      const id = error.fieldId ?? fieldIdAtPath(schema, error.path);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return counts;
  }, [errors, schema]);
  const publishedIds = useMemo(() => (baseSchema ? fieldIdsIn(baseSchema.fields) : new Set()), [baseSchema]);
  const selected = selectedId ? findField(schema.fields, selectedId) : null;
  const selectedLocation = selected ? locateField(schema.fields, selected.id) : null;
  const moduleOptions = moduleKeys ? moduleKeys.map((key) => ({ value: key, label: key })) : null;
  const tabs = mode === "fields" ? FIELD_TABS : MODULE_TABS;
  const sectionErrors = Object.fromEntries(errors.filter((error) => !errorFieldId(error)).map((error) => [error.path, error.message]));

  // Yeni eklenen veya taşınan alana klavye odağı verilir.
  useEffect(() => {
    if (!focusRef.current) return;
    document.querySelector(`[data-field-id="${focusRef.current}"]`)?.focus();
    focusRef.current = null;
  });

  const targetLabel = (() => {
    if (!target) return "Form (üst düzey)";
    const parent = findField(schema.fields, target.fieldId);
    const block = target.blockKey ? parent?.blocks?.find((item) => item.key === target.blockKey) : null;
    return block ? `${labelOf(parent?.label)} › ${labelOf(block.label)}` : labelOf(parent?.label) || "Alan";
  })();

  const select = (id) => {
    setSelectedId(id);
    focusRef.current = id;
  };

  const placement = () => {
    if (target) return { container: target, afterId: null };
    if (selectedLocation && !selectedLocation.container) return { container: null, afterId: selected.id };
    return { container: null, afterId: null };
  };

  const addFields = (fields) => {
    const where = placement();
    emit(insertFields(schema, fields, where));
    select(fields[0].id);
    setPaletteOpen(false);
  };

  const addType = (typeId) => addFields([newFieldOfType(schema, typeId, placement().container)]);
  const addCopies = (fields) => addFields(copyFieldsInto(schema, fields, placement().container));

  const handlers = {
    selectedId,
    onSelect: (id) => {
      setSelectedId(id);
      setTarget(null);
    },
    onMove: (id, direction) => {
      emit(moveField(schema, id, direction));
      focusRef.current = id;
    },
    onDuplicate: (id) => {
      const result = duplicateField(schema, id);
      emit(result.schema);
      if (result.newId) select(result.newId);
    },
    onToggleArchive: (id) => emit(updateField(schema, id, (field) => ({ archived: !field.archived }))),
    onRemove: async (id) => {
      const field = findField(schema.fields, id);
      const ok = await confirm({ variant: "destructive", title: `${labelOf(field?.label) || "Alan"} silinsin mi?`, description: "Alan henüz yayınlanmadığı için tamamen kaldırılır. Alt alanları da silinir.", confirmLabel: "Sil" });
      if (!ok) return;
      emit(removeField(schema, id));
      if (selectedId === id) setSelectedId(null);
    },
    onAddChild: (container) => {
      setTarget(container);
      if (!wide) setPaletteOpen(true);
      else document.querySelector(".schema_designer_palette input[type=search]")?.focus();
    },
    publishedIds,
    errorCounts,
  };

  const selectError = (error) => {
    const id = errorFieldId(error);
    if (id) {
      setTab("alanlar");
      setSelectedId(id);
      focusRef.current = id;
      return;
    }
    const match = TAB_FOR_PATH.find(([pattern]) => pattern.test(error.path));
    if (match && tabs.some((item) => item.id === match[1])) setTab(match[1]);
  };

  const describe = (error) => {
    const id = errorFieldId(error);
    if (id) return labelOf(findField(schema.fields, id)?.label) || "Alan";
    const section = Object.entries({ "ui.list": "liste", "ui.form": "form", behavior: "behavior", kind: "kind" }).find(([prefix]) => error.path.startsWith(prefix));
    return section ? SECTION_LABELS[section[1] === "liste" || section[1] === "form" ? "ui" : section[1]] : "Yapı";
  };

  const palette = (
    <FieldPalette
      fieldTypes={fieldTypes}
      families={families}
      fieldGroups={fieldGroups}
      targetLabel={targetLabel}
      onAddType={addType}
      onAddFields={addCopies}
      showGroups={mode === "module" || mode === "fields"}
      showCopy={mode === "module"}
      excludeTemplateId={excludeTemplateId}
      context={context}
    />
  );

  const inspector = selected ? (
    <FieldInspector
      key={selected.id}
      field={selected}
      schema={schema}
      locales={locales}
      moduleOptions={moduleOptions}
      publishedField={baseSchema ? flattenFields(baseSchema.fields).find((item) => item.field.id === selected.id)?.field ?? null : null}
      topLevel={!selectedLocation?.container}
      errors={errors.filter((error) => errorFieldId(error) === selected.id)}
      fieldTypes={fieldTypes}
      context={context}
      readOnly={readOnly}
      onChange={(patch) => emit(updateField(schema, selected.id, patch))}
    />
  ) : (
    <EmptyState variant="bordered" size="sm" title="Alan seçilmedi" description="Özelliklerini düzenlemek için tuvalden bir alan seçin." />
  );

  return (
    <div className="schema_designer">
      <div className="schema_designer_bar">
        <ValidationSummary errors={errors} onSelectError={selectError} describe={describe} />
        {toolbar}
      </div>
      <Tabs tabs={tabs.map((item) => ({ ...item, badge: item.id === "alanlar" ? schema.fields.filter((field) => !field.archived).length : undefined }))} activeTab={tab} onChange={setTab} idPrefix="designer" ariaLabel="Tasarımcı bölümleri" />

      <TabPanel id="alanlar" activeTab={tab} idPrefix="designer">
        <div className={wide ? "schema_designer_layout schema_designer_layout_wide" : "schema_designer_layout"}>
          {wide && !readOnly && <div className="schema_designer_palette">{palette}</div>}
          <div className="schema_designer_canvas">
            {!wide && !readOnly && (
              <div className="schema_designer_canvas_actions">
                <Button icon={FiPlus} onClick={() => { setTarget(null); setPaletteOpen(true); }}>Alan ekle</Button>
              </div>
            )}
            {target && (
              <p className="schema_designer_target">
                Yeni alanlar <strong>{targetLabel}</strong> içine eklenecek.{" "}
                <Button variant="link" size="sm" onClick={() => setTarget(null)}>Üst düzeye ekle</Button>
              </p>
            )}
            <FieldCanvas
              schema={schema}
              readOnly={readOnly}
              emptyAction={!wide && !readOnly ? <Button icon={FiPlus} onClick={() => setPaletteOpen(true)}>Alan ekle</Button> : null}
              {...handlers}
            />
          </div>
          <div className="schema_designer_inspector">{inspector}</div>
        </div>
      </TabPanel>

      {mode === "module" && (
        <>
          <TabPanel id="form" activeTab={tab} idPrefix="designer">
            <FormLayoutSettings
              form={schema.ui.form}
              fields={schema.fields}
              onChange={(form) => emit({ ...schema, ui: { ...schema.ui, form } })}
              onUnassign={(groupId) => emit({ ...schema, fields: schema.fields.map((field) => (field.ui?.group === groupId ? { ...field, ui: { ...field.ui, group: undefined } } : field)) })}
            />
          </TabPanel>
          <TabPanel id="liste" activeTab={tab} idPrefix="designer">
            <ListSettings schema={schema} errors={sectionErrors} onChange={(list) => emit({ ...schema, ui: { ...schema.ui, list } })} />
          </TabPanel>
          <TabPanel id="davranis" activeTab={tab} idPrefix="designer">
            <BehaviorSettings schema={schema} publishedKind={baseSchema?.kind ?? null} errors={sectionErrors} onChange={emit} />
          </TabPanel>
          <TabPanel id="api" activeTab={tab} idPrefix="designer">
            <SchemaPreview schema={schema} locales={locales} defaultLocale={defaultLocale} mode="api" />
          </TabPanel>
        </>
      )}
      <TabPanel id="onizleme" activeTab={tab} idPrefix="designer">
        <div className="schema_designer_preview">
          <SchemaPreview schema={schema} locales={locales} defaultLocale={defaultLocale} mode="form" />
          {mode === "module" && schema.kind !== "singleton" && (
            <section aria-label="Liste önizlemesi" className="schema_designer_preview_list">
              <h3 className="schema_designer_preview_title">Kayıt listesi</h3>
              <SchemaPreview schema={schema} locales={locales} defaultLocale={defaultLocale} mode="list" />
            </section>
          )}
        </div>
      </TabPanel>

      {!wide && (
        <Drawer open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Alan ekle" description={`Eklenecek yer: ${targetLabel}`} size="md">
          <div className="schema_designer_drawer_palette">{palette}</div>
        </Drawer>
      )}
    </div>
  );
};

export default SchemaDesigner;
