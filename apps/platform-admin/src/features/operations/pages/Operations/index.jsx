import { Link } from "react-router";
import { FiActivity, FiRotateCcw } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Select from "@/components/Select";
import Skeleton from "@/components/Skeleton";
import Table from "@/components/Table";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamsState } from "@/hooks/useSearchParamsState";
import { formatDateTime } from "@/utils/format";
import { useHealthSummary, useJobs, useRetryJob } from "../../api";
import "./operations.scss";

const STATUS = {
  queued: { label: "Kuyrukta", variant: "info" },
  running: { label: "Çalışıyor", variant: "info" },
  succeeded: { label: "Tamamlandı", variant: "success" },
  failed: { label: "Başarısız", variant: "danger" },
  cancelled: { label: "İptal", variant: "neutral" },
  done: { label: "Tamamlandı", variant: "success" },
};

const KIND_TEXT = {
  export: "Dışa aktarma",
  "entry.publish": "Planlı yayın",
  "entry.unpublish": "Planlı yayından kaldırma",
};

const SOURCE_OPTIONS = [
  { value: "transfer", label: "Aktarma işleri" },
  { value: "scheduler", label: "Planlı yayınlar" },
  { value: "webhook", label: "Webhook teslimleri" },
];
const STATUS_OPTIONS = ["queued", "succeeded", "failed", "cancelled"].map((value) => ({ value, label: STATUS[value].label }));
const FILTER_DEFAULTS = { kaynak: "", durum: "" };

/** Operasyon görünümü (şartname §15 jobs/health-summary, §18): bütün kiracıların arka plan işleri; kişisel veri ve dosya içeriği yoktur. */
const Operations = () => {
  usePageTitle("İşler ve sağlık");
  const can = usePlatformCan();
  const [filters, setFilters] = useSearchParamsState(FILTER_DEFAULTS);
  const health = useHealthSummary();
  const jobs = useJobs({ source: filters.kaynak || undefined, status: filters.durum || undefined });
  const retry = useRetryJob();
  const items = jobs.data?.items ?? [];

  return (
    <div className="operations">
      <PageHeader title="İşler ve sağlık" description="Arka plan işleri, planlı yayınlar ve webhook teslimleri. Başarısız aktarma işleri buradan yeniden denenir." />
      {health.isPending && <Skeleton variant="rectangle" height={120} radius="lg" />}
      {health.isError && <QueryErrorAlert error={health.error} onRetry={() => health.refetch()} />}
      {health.data && (
        <div className="operations_health">
          <Card title="Durum" icon={FiActivity} actions={<Badge variant={health.data.status === "ok" ? "success" : "warning"} dot>{health.data.status === "ok" ? "Sorun yok" : "Dikkat gerekiyor"}</Badge>}>
            <ul className="operations_checks">
              {health.data.checks.map((check) => (
                <li key={check.key}><span>{check.label}</span><Badge size="sm" variant={check.status === "ok" ? "success" : "warning"}>{check.status === "ok" ? "Normal" : "Gecikme / hata"}</Badge></li>
              ))}
            </ul>
          </Card>
          <Card title="Kuyruklar">
            <dl className="operations_numbers">
              <div><dt>Aktarma kuyruğu</dt><dd>{health.data.queues.transferQueued}</dd></div>
              <div><dt>Bekleyen planlar</dt><dd>{health.data.queues.schedulePending}</dd></div>
              <div><dt>Webhook kuyruğu</dt><dd>{health.data.queues.webhookPending}</dd></div>
              <div><dt>Ölü webhook</dt><dd>{health.data.queues.webhookDead}</dd></div>
              <div><dt>Son 24 saatte hata</dt><dd>{health.data.failedLast24h}</dd></div>
            </dl>
          </Card>
          {health.data.storageWarnings.length > 0 && (
            <Card title="Depolama uyarıları">
              <ul className="operations_checks">
                {health.data.storageWarnings.map((item) => <li key={item.siteId}><Link to={`/siteler/${item.siteId}`}>{item.displayName}</Link><span>%{Math.round(item.ratio * 100)}</span></li>)}
              </ul>
            </Card>
          )}
        </div>
      )}

      <div className="operations_filters">
        <Select size="sm" aria-label="Kaynağa göre süz" isClearable placeholder="Bütün işler" options={SOURCE_OPTIONS}
          value={SOURCE_OPTIONS.find((option) => option.value === filters.kaynak) ?? null} onChange={(option) => setFilters({ kaynak: option?.value ?? "" })} />
        <Select size="sm" aria-label="Duruma göre süz" isClearable placeholder="Bütün durumlar" options={STATUS_OPTIONS}
          value={STATUS_OPTIONS.find((option) => option.value === filters.durum) ?? null} onChange={(option) => setFilters({ durum: option?.value ?? "" })} />
      </div>
      {retry.error && <Alert variant="danger" size="compact">{getErrorMessage(retry.error)}</Alert>}
      {jobs.isPending && <Skeleton variant="rectangle" height={240} radius="lg" />}
      {jobs.isError && <QueryErrorAlert error={jobs.error} onRetry={() => jobs.refetch()} />}
      {jobs.isSuccess && items.length === 0 && <EmptyState variant="bordered" icon={FiActivity} title="Bu süzgeçte iş yok" />}
      {items.length > 0 && (
        <Table variant="bordered" caption="Arka plan işleri" hideCaption>
          <thead>
            <tr>
              <th scope="col">İş</th>
              <th scope="col">Site</th>
              <th scope="col">Durum</th>
              <th scope="col">Zaman</th>
              <th scope="col"><span className="operations_sr">İşlem</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((job) => (
              <tr key={`${job.source}-${job.id}`}>
                <td>
                  <span className="operations_kind">{KIND_TEXT[job.kind] ?? job.kind}</span>
                  {job.failure && <span className="operations_failure">{job.failure.message ?? job.failure.code}</span>}
                </td>
                <td>{job.site ? <Link to={`/siteler/${job.site.id}`}>{job.site.displayName}</Link> : "—"}</td>
                <td><Badge size="sm" variant={STATUS[job.status]?.variant ?? "neutral"} dot>{STATUS[job.status]?.label ?? job.status}</Badge>{job.attempts > 1 && <span className="operations_meta"> {job.attempts} deneme</span>}</td>
                <td>{formatDateTime(job.finishedAt ?? job.executeAt ?? job.createdAt)}</td>
                <td>
                  {job.retryable && can("platform.site.manage") && (
                    <Button size="sm" variant="outline" icon={FiRotateCcw} loading={retry.isPending && retry.variables === job.id}
                      onClick={() => retry.mutate(job.id, { onSuccess: () => toast.success("İş yeniden kuyruğa alındı") })}>Yeniden dene</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default Operations;
