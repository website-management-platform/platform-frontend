import { FiRotateCcw } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { formatDateTime } from "@/utils/format";
import { useRetryDelivery, useWebhookDeliveries } from "../../api";

const STATUS = {
  pending: { label: "Kuyrukta", variant: "info" },
  delivered: { label: "Teslim edildi", variant: "success" },
  dead: { label: "Ölü mektup", variant: "danger" },
  cancelled: { label: "İptal", variant: "neutral" },
};

const ERROR_TEXT = { SSRF_BLOCKED: "Adres özel ağa çözülüyor; istek gönderilmedi.", CONNECTION_FAILED: "Bağlantı kurulamadı." };

/** Teslim geçmişi: her deneme, yanıt veya hata; ölü mektup ve başarısız teslimler elle yeniden kuyruğa alınır. */
const WebhookDeliveries = ({ siteId, webhook, canManage, onClose }) => {
  const query = useWebhookDeliveries(siteId, webhook.id);
  const retry = useRetryDelivery(siteId, webhook.id);
  const items = query.data?.items ?? [];
  return (
    <Drawer open onClose={onClose} size="lg" title="Teslim geçmişi" description={webhook.url}>
      {query.isPending && <Skeleton variant="rectangle" height={200} radius="md" />}
      {query.data && items.length === 0 && <EmptyState size="sm" title="Henüz teslim yok" description="Abone olunan olaylar gerçekleşince burada görünür. Bağlantıyı denemek için Test gönderin." />}
      {retry.error && <Alert variant="danger" size="compact">{getErrorMessage(retry.error)}</Alert>}
      <ul className="integration_rows">
        {items.map((delivery) => (
          <li key={delivery.id} className="integration_row">
            <div className="integration_row_head">
              <code>{delivery.type}</code>
              <Badge size="sm" variant={STATUS[delivery.status]?.variant ?? "neutral"} dot>{STATUS[delivery.status]?.label ?? delivery.status}</Badge>
              <span className="integration_row_meta">{formatDateTime(delivery.createdAt)} · {delivery.attempts} deneme</span>
              {canManage && delivery.status === "dead" && (
                <span className="integration_row_actions">
                  <Button size="sm" variant="outline" icon={FiRotateCcw} loading={retry.isPending && retry.variables === delivery.id} onClick={() => retry.mutate(delivery.id, { onSuccess: () => toast.success("Teslim yeniden kuyruğa alındı") })}>Yeniden dene</Button>
                </span>
              )}
            </div>
            {delivery.status === "pending" && delivery.attempts > 0 && <p className="integration_row_meta">Sonraki deneme: {formatDateTime(delivery.nextAttemptAt)}</p>}
            {delivery.responses[0] && !delivery.responses[0].ok && <p className="integration_row_meta">Son hata: {ERROR_TEXT[delivery.responses[0].error] ?? delivery.responses[0].message}</p>}
            <details className="integration_details">
              <summary>Gönderilen veri</summary>
              <pre>{JSON.stringify(delivery.payload, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ul>
    </Drawer>
  );
};

export default WebhookDeliveries;
