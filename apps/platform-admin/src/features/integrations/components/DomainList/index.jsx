import { useState } from "react";
import { FiCheckCircle, FiPlus, FiRefreshCw, FiStar, FiTrash2 } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import CopyButton from "@/components/CopyButton";
import Input from "@/components/Input";
import Skeleton from "@/components/Skeleton";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDateTime } from "@/utils/format";
import { useAddDomain, useDomains, useMakePrimaryDomain, useRemoveDomain, useVerifyDomain } from "../../api";

const STATUS = { verified: { label: "Doğrulandı", variant: "success" }, pending: { label: "Doğrulama bekliyor", variant: "warning" }, failed: { label: "Doğrulanamadı", variant: "danger" } };

/** Alan adları (şartname §25.8): sahiplik DNS TXT kaydıyla doğrulanır; birincil ad yalnız doğrulanmış olabilir. */
const DomainList = ({ siteId, canManage }) => {
  const confirm = useConfirm();
  const query = useDomains(siteId);
  const add = useAddDomain(siteId);
  const verify = useVerifyDomain(siteId);
  const primary = useMakePrimaryDomain(siteId);
  const remove = useRemoveDomain(siteId);
  const [hostname, setHostname] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  const submit = (event) => {
    event.preventDefault();
    add.mutate({ hostname, idempotencyKey }, {
      onSuccess: (domain) => {
        setHostname("");
        setIdempotencyKey(createIdempotencyKey());
        toast.success(`${domain.hostname} eklendi; DNS kaydını ekleyip doğrulayın`);
      },
    });
  };

  const runVerify = (domain) => verify.mutate(domain.id, {
    onSuccess: (result) => (result.status === "verified" ? toast.success(`${result.hostname} doğrulandı`) : toast.error(result.failure?.message ?? "Doğrulanamadı")),
  });

  // Yalnız geliştirme: gerçek DNS yerine mock DNS'e kayıt eklenir.
  const devAddRecord = async (domain) => {
    await fetch("/__dev/dns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "TXT", name: domain.challenge.name, value: domain.challenge.value }) });
    runVerify(domain);
  };

  const removeDomain = async (domain) => {
    const ok = await confirm({ variant: "destructive", title: `${domain.hostname} kaldırılsın mı?`, description: "Bu alan adından gelen tarayıcı istekleri (CORS) ve yönlendirme izinleri kalkar.", confirmLabel: "Kaldır", onConfirm: () => remove.mutateAsync(domain.id) });
    if (ok) toast.success("Alan adı kaldırıldı");
  };

  return (
    <Card title="Alan adları" description="Sahipliği doğrulanan alan adları sitenin adresi, izinli köken ve yönlendirme hedefi olarak kullanılır. TLS sertifikası barındırma tarafında kurulur.">
      <div className="integration_stack">
        {canManage && (
          <form className="integration_inline_form" onSubmit={submit}>
            <Input label="Alan adı" placeholder="www.ornek.com" value={hostname} onChange={(event) => setHostname(event.target.value)} error={add.error?.fieldErrors?.[0]?.message ?? (add.error && !add.error.fieldErrors?.length ? getErrorMessage(add.error) : undefined)} />
            <Button type="submit" variant="outline" icon={FiPlus} loading={add.isPending} disabled={!hostname.trim()}>Ekle</Button>
          </form>
        )}
        {query.isPending && <Skeleton variant="rectangle" height={120} radius="md" />}
        {query.data && (
          <ul className="integration_rows">
            {query.data.items.map((domain) => (
              <li key={domain.id} className="integration_row">
                <div className="integration_row_head">
                  <strong className="integration_row_title">{domain.hostname}</strong>
                  <Badge size="sm" variant={STATUS[domain.status].variant} dot>{STATUS[domain.status].label}</Badge>
                  {domain.isPrimary && <Badge size="sm" variant="accent">Birincil</Badge>}
                  {canManage && (
                    <span className="integration_row_actions">
                      {domain.status !== "verified" && <Button size="sm" variant="outline" icon={FiRefreshCw} loading={verify.isPending && verify.variables === domain.id} onClick={() => runVerify(domain)}>Doğrula</Button>}
                      {domain.status === "verified" && !domain.isPrimary && <Button size="sm" variant="outline" icon={FiStar} onClick={() => primary.mutate(domain.id, { onSuccess: () => toast.success(`${domain.hostname} birincil yapıldı`) })}>Birincil yap</Button>}
                      {!domain.isPrimary && <Button size="sm" variant="ghost" color="danger" icon={FiTrash2} ariaLabel={`${domain.hostname} kaldır`} onClick={() => removeDomain(domain)} />}
                    </span>
                  )}
                </div>
                {domain.challenge && (
                  <div className="integration_challenge">
                    <p>DNS sağlayıcınıza şu TXT kaydını ekleyin, sonra "Doğrula"ya basın:</p>
                    <dl>
                      <div><dt>Ad</dt><dd><code>{domain.challenge.name}</code> <CopyButton value={domain.challenge.name} iconOnly label="Adı kopyala" /></dd></div>
                      <div><dt>Değer</dt><dd><code>{domain.challenge.value}</code> <CopyButton value={domain.challenge.value} iconOnly label="Değeri kopyala" /></dd></div>
                      <div><dt>Son geçerlilik</dt><dd>{formatDateTime(domain.challenge.expiresAt)}</dd></div>
                    </dl>
                    {domain.failure && <Alert variant="warning" size="compact">{domain.failure.message}</Alert>}
                    {import.meta.env.DEV && canManage && <Button size="sm" variant="link" icon={FiCheckCircle} onClick={() => devAddRecord(domain)}>Geliştirme: kaydı ekle ve doğrula</Button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {(primary.error || remove.error) && <Alert variant="danger" size="compact">{getErrorMessage(primary.error ?? remove.error)}</Alert>}
      </div>
    </Card>
  );
};

export default DomainList;
