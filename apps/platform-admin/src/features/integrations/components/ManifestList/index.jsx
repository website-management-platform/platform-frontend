import { useState } from "react";
import { FiCheckCircle, FiCode, FiUpload } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import Textarea from "@/components/Textarea";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { formatDateTime } from "@/utils/format";
import { useActivateManifest, useManifest, useManifests, useRegisterManifest } from "../../api";

const COMPAT = {
  compatible: { label: "Uyumlu", variant: "success" },
  compatibleWithWarnings: { label: "Uyarılarla uyumlu", variant: "warning" },
  incompatible: { label: "Uyumsuz", variant: "danger" },
};

const ManifestDetail = ({ siteId, manifestId, canManage, onClose }) => {
  const query = useManifest(siteId, manifestId);
  const activate = useActivateManifest(siteId);
  const item = query.data;
  const compat = item?.compatibility;
  return (
    <Drawer open onClose={onClose} size="lg" title={item ? `Tasarım dosyası sürüm ${item.version}` : "Tasarım dosyası"} description={item ? `${item.buildId} · ${formatDateTime(item.createdAt)}` : undefined}
      footer={canManage && item && !item.active && <Button icon={FiCheckCircle} loading={activate.isPending} disabled={compat?.status === "incompatible"} onClick={() => activate.mutate(item.id, { onSuccess: () => { toast.success("Tasarım dosyası etkinleştirildi"); onClose(); } })}>Etkinleştir</Button>}>
      {query.isPending && <Skeleton variant="rectangle" height={200} radius="md" />}
      {item && (
        <div className="integration_stack">
          <p><Badge variant={COMPAT[compat.status].variant} dot>{COMPAT[compat.status].label}</Badge> {item.active && <Badge variant="accent">Etkin</Badge>}</p>
          {compat.errors.length > 0 && <Alert variant="danger" title="Etkinleştirmeyi engelleyenler"><ul>{compat.errors.map((error) => <li key={error.message}>{error.message}</li>)}</ul></Alert>}
          {compat.warnings.length > 0 && <Alert variant="warning" title="Uyarılar"><ul>{compat.warnings.map((warning) => <li key={warning.message}>{warning.message}</li>)}</ul></Alert>}
          {activate.error && <Alert variant="danger" size="compact">{getErrorMessage(activate.error)}</Alert>}
          <details className="integration_details" open>
            <summary>İçerik</summary>
            <pre>{JSON.stringify(item.manifest, null, 2)}</pre>
          </details>
        </div>
      )}
    </Drawer>
  );
};

const UploadModal = ({ siteId, onClose, onRegistered }) => {
  const register = useRegisterManifest(siteId);
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState(null);
  const submit = () => {
    let manifest;
    try {
      manifest = JSON.parse(text);
    } catch {
      setParseError("Geçerli JSON değil.");
      return;
    }
    setParseError(null);
    register.mutate(manifest, { onSuccess: onRegistered });
  };
  return (
    <Modal open onClose={onClose} size="lg" icon={FiUpload} title="Tasarım dosyası yükle" description="Sitenin gösterebildiği sayfa bölümleri, okuduğu içerik bölümleri ve yapı sürümleri. Yüklenen sürüm değişmez; etkinleştirme ayrı adımdır." busy={register.isPending}
      footer={<><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button loading={register.isPending} disabled={!text.trim()} onClick={submit}>Yükle ve denetle</Button></>}>
      <Textarea label="Tasarım dosyası (JSON)" rows={14} value={text} onChange={(event) => setText(event.target.value)} error={parseError ?? register.error?.fieldErrors?.map((item) => `${item.path}: ${item.message}`).join(" · ")} />
      {register.error && !register.error.fieldErrors?.length && <Alert variant="danger" size="compact">{getErrorMessage(register.error)}</Alert>}
    </Modal>
  );
};

/** Frontend manifest sürümleri (şartname §16, §25.8): uyumluluk raporu, etkinleştirme; kırıcı şema yayını etkin manifest'e bağlıdır. */
const ManifestList = ({ siteId, canManage }) => {
  const query = useManifests(siteId);
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const items = query.data?.items ?? [];
  return (
    <Card title="Site tasarım dosyası" description="Sitenin tasarımı hangi bölüm ve görünümleri gösterebildiğini bildirir; panel yalnız bunları sunar." actions={canManage && <Button size="sm" variant="outline" icon={FiUpload} onClick={() => setUploading(true)}>Tasarım dosyası yükle</Button>}>
      {query.isPending && <Skeleton variant="rectangle" height={100} radius="md" />}
      {query.data && items.length === 0 && <EmptyState size="sm" icon={FiCode} title="Tasarım dosyası yok" description="Tasarım dosyası yoksa bütün sayfa bölümü türleri sunulur; site gösteremediği bölümü atlar." />}
      {items.length > 0 && (
        <ul className="integration_rows">
          {items.map((item) => (
            <li key={item.id} className="integration_row">
              <div className="integration_row_head">
                <strong className="integration_row_title">Sürüm {item.version}</strong>
                <code>{item.buildId}</code>
                {item.active && <Badge size="sm" variant="accent" dot>Etkin</Badge>}
                <span className="integration_row_actions"><Button size="sm" variant="outline" onClick={() => setOpenId(item.id)}>Ayrıntı</Button></span>
              </div>
              <p className="integration_row_meta">{item.summary.sections} sayfa bölümü türü · {item.summary.modules} içerik bölümü · {item.summary.routes} adres kalıbı · {item.source === "credential" ? "Derleme hattından" : item.createdBy?.displayName} · {formatDateTime(item.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
      {uploading && <UploadModal siteId={siteId} onClose={() => setUploading(false)} onRegistered={(result) => { setUploading(false); setOpenId(result.id); }} />}
      {openId && <ManifestDetail siteId={siteId} manifestId={openId} canManage={canManage} onClose={() => setOpenId(null)} />}
    </Card>
  );
};

export default ManifestList;
