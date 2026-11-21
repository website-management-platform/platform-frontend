import Badge from "@/components/Badge";
import { CHANGE_LABELS, IMPACT_META, PROPERTY_LABELS, SECTION_LABELS } from "../../labels";
import "./diff_list.scss";

const describeDetail = (detail) => {
  const label = PROPERTY_LABELS[detail.property] ?? (detail.property.startsWith("settings.") ? `Ayar: ${detail.property.slice(9)}` : detail.property);
  if (detail.property === "key") return `${label}: ${detail.from} → ${detail.to}`;
  if (detail.property === "type") return `${label}: ${detail.from} → ${detail.to}`;
  if (["required", "localized", "public", "sensitive", "nullable"].includes(detail.property)) return `${label}: ${detail.to ? "açıldı" : "kapandı"}`;
  return label;
};

/** Şema farkı: alan değişiklikleri ve bölüm değişiklikleri, etki düzeyiyle (şartname §6.2). */
const DiffList = ({ diff }) => {
  if (!diff.hasChanges) return <p className="diff_list_empty">Yayındaki sürümle fark yok.</p>;
  return (
    <ul className="diff_list">
      {diff.changes.map((change) => {
        const impact = IMPACT_META[change.impact];
        return (
          <li key={`${change.fieldId}-${change.change}`} className="diff_list_item">
            <div className="diff_list_head">
              <span className="diff_list_label">{change.label}</span>
              <code className="diff_list_key">{change.key}</code>
              <Badge size="sm" variant="neutral" outline>{CHANGE_LABELS[change.change]}</Badge>
              <Badge size="sm" variant={impact.variant}>{impact.label}</Badge>
            </div>
            {change.details.length > 0 && (
              <ul className="diff_list_details">
                {change.details.map((detail) => <li key={detail.property}>{describeDetail(detail)}</li>)}
              </ul>
            )}
          </li>
        );
      })}
      {diff.sections.map((section) => (
        <li key={section.section} className="diff_list_item">
          <div className="diff_list_head">
            <span className="diff_list_label">{SECTION_LABELS[section.section]}</span>
            <Badge size="sm" variant="neutral" outline>Değişti</Badge>
            <Badge size="sm" variant={IMPACT_META[section.impact].variant}>{IMPACT_META[section.impact].label}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default DiffList;
