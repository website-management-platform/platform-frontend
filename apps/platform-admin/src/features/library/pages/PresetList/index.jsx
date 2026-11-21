import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { FiPackage, FiPlus } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import { toast } from "@/components/Toast/toast";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlListFilters } from "@/hooks/useUrlListFilters";
import ListState from "../../../lifecycle/components/ListState";
import PresetFormModal from "../../components/PresetFormModal";
import { usePresets } from "../../api";
import { LIBRARY_STATUS_OPTIONS } from "../../options";
import "../TemplateList/template_list.scss";

const FILTER_DEFAULTS = { durum: "ACTIVE", sayfa: 1 };

/** Site presetleri (şartname §4, §25.1): site türüne göre önerilen modül setleri. */
const PresetList = () => {
  usePageTitle("Site şablonları");
  const can = usePlatformCan();
  const navigate = useNavigate();
  const { filters, setFilter, clear, filtered } = useUrlListFilters(FILTER_DEFAULTS);
  const [createOpen, setCreateOpen] = useState(false);
  const presetsQuery = usePresets({ status: filters.durum || undefined });
  const canManage = can("platform.library.manage");

  return (
    <div className="template_list">
      <PageHeader
        title="Site şablonları"
        description="Site oluştururken önerilen bölüm setleri. Site şablonu siteyi bir türe kilitlemez; site oluşturulurken seçilen sürüm kaydedilir."
        actions={canManage && <Button icon={FiPlus} onClick={() => setCreateOpen(true)}>Yeni site şablonu</Button>}
      />
      <div className="template_list_toolbar">
        <SegmentedControl size="sm" ariaLabel="Duruma göre süz" options={LIBRARY_STATUS_OPTIONS} value={filters.durum} onChange={(value) => setFilter("durum", value)} />
      </div>
      <ListState
        query={presetsQuery}
        filtered={filtered}
        onClearFilters={clear}
        empty={{ icon: FiPackage, title: "Henüz site şablonu yok", description: "Sık kurulan site türleri için bölüm setleri tanımlayın.", action: canManage && <Button icon={FiPlus} onClick={() => setCreateOpen(true)}>Yeni site şablonu</Button> }}
      >
        <ul className="template_list_grid">
          {presetsQuery.data?.items.map((preset) => (
            <li key={preset.id} className="template_list_card">
              <Link to={`/presetler/${preset.id}`} className="template_list_link">{labelOf(preset.label)}</Link>
              <p className="template_list_description">{preset.description || "Açıklama yok."}</p>
              <div className="template_list_badges">
                <Badge size="sm" variant="neutral">{preset.family}</Badge>
                <Badge size="sm" variant="accent">v{preset.latestVersion}</Badge>
                {preset.status === "ARCHIVED" && <Badge size="sm" variant="neutral">Arşivde</Badge>}
              </div>
              <p className="template_list_meta">{preset.moduleCount} modül · {preset.usageCount} sitede kullanıldı</p>
            </li>
          ))}
        </ul>
      </ListState>
      {createOpen && (
        <PresetFormModal
          onClose={() => setCreateOpen(false)}
          onSaved={(preset) => {
            toast.success(`${labelOf(preset.label)} oluşturuldu`);
            navigate(`/presetler/${preset.id}`);
          }}
        />
      )}
    </div>
  );
};

export default PresetList;
