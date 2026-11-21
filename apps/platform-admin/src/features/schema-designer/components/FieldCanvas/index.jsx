import { FiArchive, FiArrowDown, FiArrowUp, FiCopy, FiPlus, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { getFieldType, labelOf } from "@wmp/schema";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import { cx } from "@/utils/cx";
import { containersOf } from "../../schemaOps";
import FieldTypeIcon from "../FieldTypeIcon";
import "./field_canvas.scss";

const FieldBadges = ({ field, groupLabel }) => (
  <span className="field_canvas_badges">
    {field.archived && <Badge size="sm" variant="neutral">Arşivde</Badge>}
    {field.required && <Badge size="sm" variant="accent">Zorunlu</Badge>}
    {field.localized && <Badge size="sm" variant="info">Çok dilli</Badge>}
    {!field.public && <Badge size="sm" variant="warning">Yayında yok</Badge>}
    {field.sensitive && <Badge size="sm" variant="danger">Hassas</Badge>}
    {field.hidden && <Badge size="sm" variant="neutral">Gizli</Badge>}
    {field.condition && <Badge size="sm" variant="neutral">Koşullu</Badge>}
    {field.unique && field.unique !== "none" && <Badge size="sm" variant="neutral">Benzersiz</Badge>}
    {groupLabel && <Badge size="sm" variant="neutral" outline>{groupLabel}</Badge>}
  </span>
);

const FieldRow = ({ field, index, count, depth, ctx }) => {
  const { selectedId, onSelect, onMove, onDuplicate, onToggleArchive, onRemove, onAddChild, publishedIds, errorCounts, groupsById, readOnly } = ctx;
  const fieldType = getFieldType(field.type);
  const published = publishedIds.has(field.id);
  const errorCount = errorCounts.get(field.id) ?? 0;
  const label = labelOf(field.label) || field.key;
  const selected = selectedId === field.id;

  // Klavye: Alt+↑/↓ taşır, Ctrl/Cmd+D çoğaltır, Delete arşivler (yayınlanmamış alanı siler).
  const handleKeyDown = (event) => {
    if (readOnly) return;
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      onMove(field.id, event.key === "ArrowUp" ? -1 : 1);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      onDuplicate(field.id);
    } else if (event.key === "Delete") {
      event.preventDefault();
      if (published) onToggleArchive(field.id);
      else onRemove(field.id);
    }
  };

  return (
    <li className={cx("field_canvas_item", field.archived && "field_canvas_item_archived")} style={{ "--field-depth": depth }}>
      <div className={cx("field_canvas_row", selected && "field_canvas_row_selected", errorCount > 0 && "field_canvas_row_invalid")}>
        <button
          type="button"
          className="field_canvas_select"
          onClick={() => onSelect(field.id)}
          onKeyDown={handleKeyDown}
          aria-pressed={selected}
          data-field-id={field.id}
          aria-label={`${label}, ${fieldType?.label ?? field.type}${errorCount ? `, ${errorCount} hata` : ""}${field.archived ? ", arşivde" : ""}`}
        >
          <span className="field_canvas_icon" aria-hidden="true"><FieldTypeIcon type={field.type} /></span>
          <span className="field_canvas_text">
            <span className="field_canvas_label">{label}{errorCount > 0 && <span className="field_canvas_error_count" aria-hidden="true">{errorCount}</span>}</span>
            <span className="field_canvas_meta"><code>{field.key}</code> · {fieldType?.label ?? `Bilinmeyen tip (${field.type})`}</span>
          </span>
          <FieldBadges field={field} groupLabel={depth === 0 ? groupsById.get(field.ui?.group) : null} />
        </button>
        {!readOnly && (
          <div className="field_canvas_actions">
            <Button variant="ghost" size="sm" icon={FiArrowUp} ariaLabel={`${label} alanını yukarı taşı`} disabled={index === 0} onClick={() => onMove(field.id, -1)} />
            <Button variant="ghost" size="sm" icon={FiArrowDown} ariaLabel={`${label} alanını aşağı taşı`} disabled={index === count - 1} onClick={() => onMove(field.id, 1)} />
            <Button variant="ghost" size="sm" icon={FiCopy} ariaLabel={`${label} alanını çoğalt`} onClick={() => onDuplicate(field.id)} />
            {published
              ? <Button variant="ghost" size="sm" icon={field.archived ? FiRotateCcw : FiArchive} ariaLabel={field.archived ? `${label} alanını arşivden çıkar` : `${label} alanını arşivle`} onClick={() => onToggleArchive(field.id)} />
              : <Button variant="ghost" size="sm" color="danger" icon={FiTrash2} ariaLabel={`${label} alanını sil`} onClick={() => onRemove(field.id)} />}
          </div>
        )}
      </div>
      {fieldType?.container && (
        <div className="field_canvas_children">
          {containersOf(field).map((container) => {
            const block = container.blockKey ? field.blocks.find((item) => item.key === container.blockKey) : null;
            const children = block ? block.fields ?? [] : field.fields ?? [];
            return (
              <div key={container.blockKey ?? "fields"} className="field_canvas_container">
                {block && <p className="field_canvas_block_title">Blok: {labelOf(block.label)} <code>{block.key}</code></p>}
                <FieldList fields={children} depth={depth + 1} ctx={ctx} />
                {!readOnly && !field.archived && (
                  <Button variant="ghost" size="sm" icon={FiPlus} className="field_canvas_add_child" onClick={() => onAddChild(container)}>
                    {block ? `${labelOf(block.label)} bloğuna alan ekle` : `${label} içine alan ekle`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
};

const FieldList = ({ fields, depth, ctx }) => (
  <ul className="field_canvas_list">
    {fields.map((field, index) => <FieldRow key={field.id} field={field} index={index} count={fields.length} depth={depth} ctx={ctx} />)}
  </ul>
);

/** Form tuvali: alanların sırası ve iç içe yapısı. Seçilen alan sağdaki özellik panelinde düzenlenir. */
const FieldCanvas = ({ schema, readOnly = false, emptyAction, ...handlers }) => {
  const groupsById = new Map((schema.ui?.form?.groups ?? []).map((group) => [group.id, labelOf(group.label)]));
  if (schema.fields.length === 0) {
    return (
      <div className="field_canvas">
        <EmptyState variant="bordered" title="Henüz alan yok" description="Soldaki paletten alan tipi seçin veya hazır bir alan grubu ekleyin." action={emptyAction} />
      </div>
    );
  }
  return (
    <div className="field_canvas">
      <p className="field_canvas_hint" id="field-canvas-hint">Alanı seçip düzenleyin. Klavye: Alt+↑/↓ taşır, Ctrl+D çoğaltır, Delete arşivler.</p>
      <FieldList fields={schema.fields} depth={0} ctx={{ ...handlers, groupsById, readOnly }} />
    </div>
  );
};

export default FieldCanvas;
