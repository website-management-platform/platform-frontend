import { useState } from "react";
import { diffSchemas } from "@wmp/schema";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import Textarea from "@/components/Textarea";
import { getErrorMessage } from "@/api/errors";
import DiffList from "../../../schema-designer/components/DiffList";
import { usePublishTemplateVersion, useTemplateVersion } from "../../api";
import "./publish_version_modal.scss";

/**
 * Şablon taslağını yeni değişmez sürüm olarak yayınlar. Sürüm yayını kullanan siteleri değiştirmez;
 * siteler yükseltmeyi ayrıca ve açıkça seçer (şartname §6.2, AT-21, AT-42).
 */
const PublishVersionModal = ({ template, getVersion, draft, onClose, onPublished }) => {
  const [changelog, setChangelog] = useState("");
  const publish = usePublishTemplateVersion(template.id);
  const latestQuery = useTemplateVersion(template.id, template.latestVersion || null);
  const diff = template.latestVersion === 0 ? null : latestQuery.data ? diffSchemas(latestQuery.data.schema, draft) : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${template.latestVersion + 1}. sürümü yayınla`}
      description={template.usageCount > 0 ? `Bu şablonu ${template.usageCount} site bölümü kullanıyor. Yayın onları değiştirmez; her bölüm yeni sürüme ayrıca yükseltilir.` : "Yayınlanan sürüm sitelere eklenebilir hale gelir."}
      size="lg"
      busy={publish.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>Vazgeç</Button>
          <Button loading={publish.isPending} disabled={diff ? !diff.hasChanges : false} onClick={() => publish.mutate({ changelog, version: getVersion() }, { onSuccess: onPublished })}>Yayınla</Button>
        </>
      )}
    >
      <div className="publish_version_modal">
        {publish.isError && <Alert variant="danger" size="compact" title="Yayınlanamadı">{getErrorMessage(publish.error)} {(publish.error.fieldErrors ?? []).slice(0, 3).map((item) => item.message).join(" ")}</Alert>}
        <h3 className="publish_version_modal_title">Son sürüme göre değişiklikler</h3>
        {template.latestVersion === 0 && <p>Bu, şablonun ilk sürümü.</p>}
        {template.latestVersion > 0 && !diff && <Skeleton variant="rectangle" height={120} />}
        {diff && <DiffList diff={diff} />}
        <Textarea label="Değişiklik notu" optionalText="İsteğe bağlı" rows={3} maxLength={500} value={changelog} onChange={(event) => setChangelog(event.target.value)} hint="Sürüm geçmişinde ve site yükseltmesinde gösterilir." />
      </div>
    </Modal>
  );
};

export default PublishVersionModal;
