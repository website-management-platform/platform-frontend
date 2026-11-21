import { Link } from "react-router";
import { FiPackage, FiPlus } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useFieldGroups } from "../../api";
import "../TemplateList/template_list.scss";
import "./field_library.scss";

/**
 * Alan grupları (şartname §6, §11): sık kullanılan alan kombinasyonları. Yerleşik alan tipleri ayrı listelenmez;
 * tasarımcının "alan ekle" penceresinde açıklamalarıyla seçilir (ADR-058).
 */
const FieldLibrary = () => {
  usePageTitle("Alan grupları");
  const can = usePlatformCan();
  const query = useFieldGroups();
  const newButton = can("platform.library.manage") && <Button as={Link} to="/alanlar/gruplar/yeni" icon={FiPlus}>Yeni alan grubu</Button>;
  const items = query.data?.items ?? [];
  return (
    <div className="field_library">
      <PageHeader title="Alan grupları" description="Sık kullanılan alan kombinasyonları (ör. ad + soyad, SEO bilgileri). Bölüm tasarlarken tek seferde eklenir." actions={items.length > 0 && newButton} />
      {query.isPending && <Skeleton variant="rectangle" height={240} radius="lg" />}
      {query.isError && <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && items.length === 0 && (
        <EmptyState variant="bordered" icon={FiPackage} title="Alan grubu yok" description="Sık kullanılan alan kombinasyonlarını grup olarak kaydedin." action={newButton} />
      )}
      {items.length > 0 && (
        <ul className="template_list_grid">
          {items.map((group) => (
            <li key={group.id} className="template_list_card">
              <Link to={`/alanlar/gruplar/${group.id}`} className="template_list_link">{labelOf(group.label)}</Link>
              <p className="template_list_description">{group.description || "Açıklama yok."}</p>
              <div className="template_list_badges">
                <Badge size="sm" variant="neutral">{group.fields.length} alan</Badge>
                {group.status === "ARCHIVED" && <Badge size="sm" variant="neutral">Arşivde</Badge>}
              </div>
              <p className="template_list_meta">{group.fields.map((field) => labelOf(field.label)).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FieldLibrary;
