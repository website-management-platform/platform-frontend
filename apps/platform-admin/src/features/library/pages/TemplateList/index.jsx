import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { FiLayers, FiPlus, FiSearch } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Input from "@/components/Input";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import Select from "@/components/Select";
import { toast } from "@/components/Toast/toast";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlListFilters } from "@/hooks/useUrlListFilters";
import ListState from "../../../lifecycle/components/ListState";
import { KIND_LABELS } from "../../../schema-designer/labels";
import TemplateFormModal from "../../components/TemplateFormModal";
import { useTemplates } from "../../api";
import { LIBRARY_STATUS_OPTIONS } from "../../options";
import "./template_list.scss";

const FILTER_DEFAULTS = { ara: "", kategori: "", durum: "ACTIVE", sayfa: 1 };

/** Modül kütüphanesi (şartname §5, §11): şablon listesi, kategori ve arama. */
const TemplateList = () => {
  usePageTitle("Bölüm şablonları");
  const can = usePlatformCan();
  const navigate = useNavigate();
  const { filters, search, setSearch, setFilter, clear, filtered } = useUrlListFilters(FILTER_DEFAULTS);
  const [createOpen, setCreateOpen] = useState(false);
  const templatesQuery = useTemplates({ q: filters.ara || undefined, category: filters.kategori || undefined, status: filters.durum || undefined });
  const canManage = can("platform.library.manage");
  const categories = templatesQuery.data?.categories ?? [];
  const categoryOptions = [{ value: "", label: "Bütün kategoriler" }, ...categories.map((item) => ({ value: item, label: item }))];

  return (
    <div className="template_list">
      <PageHeader
        title="Bölüm şablonları"
        description="Sitelere eklenen içerik yapıları. Her şablon sürümlüdür; yeni sürüm kullanan siteleri kendiliğinden değiştirmez."
        actions={canManage && <Button icon={FiPlus} onClick={() => setCreateOpen(true)}>Yeni şablon</Button>}
      />
      <div className="template_list_toolbar">
        <Input aria-label="Şablon ara" type="search" icon={FiSearch} placeholder="Ad, anahtar veya açıklamayla ara" value={search} onChange={(event) => setSearch(event.target.value)} className="template_list_search" />
        <Select aria-label="Kategori" options={categoryOptions} value={categoryOptions.find((item) => item.value === filters.kategori) ?? categoryOptions[0]} onChange={(option) => setFilter("kategori", option?.value ?? "")} className="template_list_category" />
        <SegmentedControl size="sm" ariaLabel="Duruma göre süz" options={LIBRARY_STATUS_OPTIONS} value={filters.durum} onChange={(value) => setFilter("durum", value)} />
      </div>
      <ListState
        query={templatesQuery}
        filtered={filtered}
        onClearFilters={clear}
        empty={{ icon: FiLayers, title: "Henüz şablon yok", description: "İlk şablonu oluşturup alanlarını tasarlayın.", action: canManage && <Button icon={FiPlus} onClick={() => setCreateOpen(true)}>Yeni şablon</Button> }}
      >
        <ul className="template_list_grid">
          {templatesQuery.data?.items.map((template) => (
            <li key={template.id} className="template_list_card">
              <Link to={`/moduller/${template.id}`} className="template_list_link">{labelOf(template.label)}</Link>
              <p className="template_list_description">{template.description || "Açıklama yok."}</p>
              <div className="template_list_badges">
                <Badge size="sm" variant="neutral">{template.category}</Badge>
                <Badge size="sm" variant="neutral" outline>{KIND_LABELS[template.kind]}</Badge>
                {template.latestVersion > 0 ? <Badge size="sm" variant="accent">v{template.latestVersion}</Badge> : <Badge size="sm" variant="warning">Yayınlanmadı</Badge>}
                {template.latestVersion > 0 && template.hasUnpublishedChanges && <Badge size="sm" variant="info">Taslakta değişiklik</Badge>}
                {template.status === "ARCHIVED" && <Badge size="sm" variant="neutral">Arşivde</Badge>}
              </div>
              <p className="template_list_meta"><code>{template.key}</code> · {template.fieldCount} alan · {template.usageCount} sitede</p>
            </li>
          ))}
        </ul>
      </ListState>
      {createOpen && (
        <TemplateFormModal
          categories={categories}
          onClose={() => setCreateOpen(false)}
          onSaved={(template) => {
            toast.success(`${labelOf(template.label)} oluşturuldu`);
            navigate(`/moduller/${template.id}`);
          }}
        />
      )}
    </div>
  );
};

export default TemplateList;
