import { useState } from "react";
import { Link, useParams } from "react-router";
import { FiBox, FiCopy, FiEdit2, FiFileText, FiGlobe, FiInfo, FiLink } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import Card from "@/components/Card";
import CopyButton from "@/components/CopyButton";
import DescriptionList from "@/components/DescriptionList";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Tabs, { TabPanel } from "@/components/Tabs";
import { toast } from "@/components/Toast/toast";
import { isApiError } from "@/api/errors";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamsState } from "@/hooks/useSearchParamsState";
import NotFound from "@/pages/NotFound";
import { formatDateTime } from "@/utils/format";
import { availableActions, LIFECYCLE_ACTIONS } from "../../../lifecycle/actions";
import LifecycleModal from "../../../lifecycle/components/LifecycleModal";
import StatusBadge from "../../../lifecycle/components/StatusBadge";
import SiteForms from "../../../forms/components/SiteForms";
import SiteIntegration from "../../../integrations/components/SiteIntegration";
import SiteModules from "../../../modules/components/SiteModules";
import CloneSiteModal from "../../components/CloneSiteModal";
import LocaleChangeModal from "../../components/LocaleChangeModal";
import SiteEditModal from "../../components/SiteEditModal";
import { useSite, useSiteAction } from "../../api";
import { localeLabel } from "../../locales";
import "./site_detail.scss";

const IMPACTS = {
  suspend: "Site yayından düşer (public API 503 döner) ve müşteri kullanıcıları bu siteyi panelde göremez. İçerik ve ayarlar korunur.",
  archive: "Site arşivlenir: yayından düşer, müşteri panelinden kalkar ve düzenlenemez. Veriler silinmez; müşterinin site sınırında yer açılır.",
  restore: "Site yeniden aktif olur ve müşteri panelinde görünür. Müşteri askıdaysa site yine yayına çıkmaz.",
};

const TAB_DEFAULTS = { sekme: "genel" };

const SiteDetail = () => {
  const { siteId } = useParams();
  const can = usePlatformCan();
  const siteQuery = useSite(siteId);
  const action = useSiteAction(siteId);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [localesOpen, setLocalesOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [tab, setTab] = useSearchParamsState(TAB_DEFAULTS);
  const site = siteQuery.data;
  usePageTitle(site?.displayName ?? "Site");

  if (siteQuery.isPending) return <Skeleton variant="rectangle" height={320} radius="lg" />;
  if (isApiError(siteQuery.error, "NOT_FOUND")) return <NotFound />;
  if (siteQuery.isError) return <QueryErrorAlert error={siteQuery.error} onRetry={() => siteQuery.refetch()} />;

  const canManage = can("platform.site.manage");
  const tabs = [
    { id: "genel", label: "Genel", icon: FiInfo },
    { id: "moduller", label: "Bölümler", icon: FiBox, badge: site.moduleCount },
    { id: "formlar", label: "Formlar", icon: FiFileText },
    { id: "entegrasyon", label: "Entegrasyon", icon: FiLink },
  ];
  const activeTab = tabs.some((item) => item.id === tab.sekme) ? tab.sekme : TAB_DEFAULTS.sekme;

  return (
    <div className="site_detail">
      <PageHeader
        title={site.displayName}
        description={<>Müşteri: <Link to={`/musteriler/${site.tenantId}`}>{site.tenantName}</Link></>}
        badge={<StatusBadge status={site.status} size="md" />}
        breadcrumb={[{ label: "Web siteleri", path: "/siteler" }, { label: site.displayName }]}
        actions={canManage && (
          <ButtonGroup attached={false} ariaLabel="Site işlemleri">
            {site.status !== "ARCHIVED" && <Button variant="outline" icon={FiEdit2} onClick={() => setEditOpen(true)}>Düzenle</Button>}
            {site.status !== "ARCHIVED" && <Button variant="outline" icon={FiCopy} onClick={() => setCloneOpen(true)}>Kopyala</Button>}
            {availableActions(site.status).map((item) => (
              <Button key={item.key} variant="outline" color={item.color === "primary" ? undefined : item.color} onClick={() => setPendingAction(item.key)}>{item.label}</Button>
            ))}
          </ButtonGroup>
        )}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setTab({ sekme: id }, { replace: true })} idPrefix="site" ariaLabel="Site bölümleri" />

      <TabPanel id="genel" activeTab={activeTab} idPrefix="site">
        <div className="site_detail_panel">
          <Card title="Genel" actions={canManage && site.status !== "ARCHIVED" && <Button size="sm" variant="outline" icon={FiGlobe} onClick={() => setLocalesOpen(true)}>Dilleri değiştir</Button>}>
            <DescriptionList
              layout="grid"
              columns={2}
              items={[
                { label: "Site adı", value: site.displayName },
                { label: "Anahtar", value: <code>{site.key}</code> },
                { label: "Alan adı", value: site.primaryDomain ?? "Tanımlanmadı" },
                { label: "Durum", value: <StatusBadge status={site.status} /> },
                { label: "Diller", value: site.locales.map(localeLabel).join(", ") },
                { label: "Varsayılan dil", value: localeLabel(site.defaultLocale) },
                { label: "Saat dilimi", value: site.timezone },
                { label: "Başlangıç şablonu", value: site.preset ? `${labelOf(site.preset.label)} (v${site.preset.version})` : "Şablonsuz" },
                { label: "Oluşturma", value: formatDateTime(site.createdAt) },
              ]}
            />
          </Card>

          <Card title="Entegrasyon" description="Müşterinin web sitesi yayındaki içeriği bu anahtarla okur. Anahtar gizli değildir; erişim izni yerine geçmez.">
            <div className="site_detail_key">
              <code className="site_detail_key_value">{site.publicKey}</code>
              <CopyButton value={site.publicKey} label="Anahtarı kopyala" />
            </div>
          </Card>
        </div>
      </TabPanel>

      <TabPanel id="moduller" activeTab={activeTab} idPrefix="site">
        <SiteModules site={site} canManage={canManage} />
      </TabPanel>

      <TabPanel id="formlar" activeTab={activeTab} idPrefix="site">
        <SiteForms site={site} canManage={canManage} />
      </TabPanel>

      <TabPanel id="entegrasyon" activeTab={activeTab} idPrefix="site">
        <SiteIntegration site={site} canManage={canManage} />
      </TabPanel>

      {cloneOpen && <CloneSiteModal site={site} onClose={() => setCloneOpen(false)} />}
      {localesOpen && <LocaleChangeModal site={site} onClose={() => setLocalesOpen(false)} />}
      {editOpen && (
        <SiteEditModal
          site={site}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            toast.success("Site bilgileri kaydedildi");
          }}
        />
      )}
      <LifecycleModal
        key={pendingAction ?? "closed"}
        action={pendingAction}
        subject={site.displayName}
        impacts={IMPACTS}
        pending={action.isPending}
        error={action.error}
        onClose={() => {
          setPendingAction(null);
          action.reset();
        }}
        onConfirm={(reason) => action.mutate({ action: pendingAction, reason, version: site.version }, {
          onSuccess: () => {
            toast.success(`${site.displayName} ${LIFECYCLE_ACTIONS[pendingAction].verb}`);
            setPendingAction(null);
          },
        })}
      />
    </div>
  );
};

export default SiteDetail;
