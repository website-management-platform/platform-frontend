import { useState } from "react";
import { FiActivity, FiList, FiPause, FiPlay, FiPlus, FiRefreshCw, FiSend, FiTrash2 } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import CheckboxGroup from "@/components/CheckboxGroup";
import EmptyState from "@/components/EmptyState";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDateTime } from "@/utils/format";
import { useCreateWebhook, useDeleteWebhook, useUpdateWebhook, useWebhookAction, useWebhooks } from "../../api";
import SecretReveal from "../SecretReveal";
import WebhookDeliveries from "../WebhookDeliveries";

const EVENT_TEXT = {
  "content.published": "İçerik yayınlandı",
  "content.unpublished": "İçerik yayından kaldırıldı",
  "site.config.published": "Sayfa, menü, yönlendirme veya ayar değişti",
  "schema.published": "Bölüm yapısı değişti",
  "asset.ready": "Medya işlendi",
};

const CreateWebhookModal = ({ siteId, events, onClose, onCreated }) => {
  const create = useCreateWebhook(siteId);
  const [values, setValues] = useState({ url: "https://", events: ["content.published", "content.unpublished", "release.published", "site.config.published"], description: "" });
  const [idempotencyKey] = useState(createIdempotencyKey);
  const errorFor = (path) => create.error?.fieldErrors?.find((item) => item.path === path)?.message;
  return (
    <Modal open onClose={onClose} icon={FiActivity} title="Yeni webhook" description="Seçilen olaylar imzalı (HMAC SHA-256) POST isteğiyle bu adrese bildirilir. Teslim hatası yayını geri almaz." busy={create.isPending}
      footer={<><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button type="submit" form="webhook-form" loading={create.isPending}>Oluştur</Button></>}>
      <form id="webhook-form" className="integration_stack" noValidate onSubmit={(event) => { event.preventDefault(); create.mutate({ values, idempotencyKey }, { onSuccess: onCreated }); }}>
        <Input label="Adres" type="url" required value={values.url} hint="https ve 443 portu; IP adresi ve yerel ağ adresleri kabul edilmez." error={errorFor("url")} onChange={(event) => setValues({ ...values, url: event.target.value })} />
        <CheckboxGroup label="Olaylar" required value={values.events} error={errorFor("events")} onChange={(next) => setValues({ ...values, events: next })}
          options={events.map((event) => ({ value: event, label: EVENT_TEXT[event] ?? event, description: event }))} />
        <Input label="Açıklama" optionalText="İsteğe bağlı" maxLength={200} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
        {create.error && !create.error.fieldErrors?.length && <Alert variant="danger" size="compact">{getErrorMessage(create.error)}</Alert>}
      </form>
    </Modal>
  );
};

/** Webhook uç noktaları: olay aboneliği, imza sırrı (yenilemede 24 saat çift imza), test, durdurma ve teslim geçmişi. */
const WebhookList = ({ siteId, canManage }) => {
  const confirm = useConfirm();
  const query = useWebhooks(siteId);
  const action = useWebhookAction(siteId);
  const update = useUpdateWebhook(siteId);
  const remove = useDeleteWebhook(siteId);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState(null);
  const [history, setHistory] = useState(null);
  const items = query.data?.items ?? [];

  const test = (webhook) => action.mutate({ webhookId: webhook.id, action: "test" }, { onSuccess: () => { toast.success("Test olayı kuyruğa alındı"); setHistory(webhook); } });
  const rotate = (webhook) => confirm({
    title: "İmza sırrı yenilensin mi?",
    description: "Yeni sır üretilir. 24 saat boyunca istekler hem eski hem yeni sırla imzalanır; alıcıyı bu sürede güncelleyin.",
    confirmLabel: "Yenile",
    onConfirm: () => action.mutateAsync({ webhookId: webhook.id, action: "rotate" }).then((result) => setRevealed(result.secret)),
  });
  const toggle = (webhook) => update.mutate({ webhookId: webhook.id, values: { status: webhook.status === "active" ? "disabled" : "active" }, version: webhook.version }, {
    onSuccess: (result) => toast.success(result.status === "active" ? "Webhook etkinleştirildi" : "Webhook durduruldu"),
  });
  const removeWebhook = async (webhook) => {
    const ok = await confirm({ variant: "destructive", title: "Webhook silinsin mi?", description: "Kuyruktaki teslimler iptal edilir.", confirmLabel: "Sil", onConfirm: () => remove.mutateAsync(webhook.id) });
    if (ok) toast.success("Webhook silindi");
  };

  return (
    <Card title="Webhook'lar" description="Yayın olaylarını sitenizin önbellek yenileme veya derleme hattına bildirir." actions={canManage && <Button size="sm" variant="outline" icon={FiPlus} onClick={() => setCreating(true)}>Webhook ekle</Button>}>
      {query.isPending && <Skeleton variant="rectangle" height={100} radius="md" />}
      {query.data && items.length === 0 && <EmptyState size="sm" icon={FiActivity} title="Webhook yok" description="Statik veya önbellekli siteler yayından sonra yenilenmek için webhook kullanır." />}
      {items.length > 0 && (
        <ul className="integration_rows">
          {items.map((webhook) => (
            <li key={webhook.id} className="integration_row">
              <div className="integration_row_head">
                <strong className="integration_row_title">{webhook.url}</strong>
                <Badge size="sm" variant={webhook.status === "active" ? "success" : "neutral"} dot>{webhook.status === "active" ? "Etkin" : "Durduruldu"}</Badge>
                {webhook.counts.dead > 0 && <Badge size="sm" variant="danger">{webhook.counts.dead} ölü mektup</Badge>}
                {webhook.counts.pending > 0 && <Badge size="sm" variant="info">{webhook.counts.pending} kuyrukta</Badge>}
              </div>
              <p className="integration_row_meta">
                {webhook.description && `${webhook.description} · `}{webhook.events.map((event) => EVENT_TEXT[event] ?? event).join(", ")}
                {" · "}Son başarılı: {webhook.lastSuccessAt ? formatDateTime(webhook.lastSuccessAt) : "yok"} · İmza sırrı {webhook.secretHint}
              </p>
              <span className="integration_row_actions integration_row_actions_start">
                <Button size="sm" variant="outline" icon={FiList} onClick={() => setHistory(webhook)}>Teslim geçmişi</Button>
                {canManage && (
                  <>
                    <Button size="sm" variant="outline" icon={FiSend} disabled={webhook.status !== "active"} onClick={() => test(webhook)}>Test gönder</Button>
                    <Button size="sm" variant="ghost" icon={FiRefreshCw} onClick={() => rotate(webhook)}>Sırrı yenile</Button>
                    <Button size="sm" variant="ghost" icon={webhook.status === "active" ? FiPause : FiPlay} onClick={() => toggle(webhook)}>{webhook.status === "active" ? "Durdur" : "Etkinleştir"}</Button>
                    <Button size="sm" variant="ghost" color="danger" icon={FiTrash2} onClick={() => removeWebhook(webhook)}>Sil</Button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {(action.error || update.error) && <Alert variant="danger" size="compact">{getErrorMessage(action.error ?? update.error)}</Alert>}
      {creating && <CreateWebhookModal siteId={siteId} events={query.data?.events ?? []} onClose={() => setCreating(false)} onCreated={(result) => { setCreating(false); setRevealed(result.secret); }} />}
      {revealed && <SecretReveal title="İmza sırrı" secret={revealed} description="Alıcı, X-WMP-Signature başlığını zaman damgası + gövde üzerinde HMAC SHA-256 ile doğrular; 5 dakikadan eski istekleri reddeder." onClose={() => setRevealed(null)} />}
      {history && <WebhookDeliveries siteId={siteId} webhook={history} canManage={canManage} onClose={() => setHistory(null)} />}
    </Card>
  );
};

export default WebhookList;
