import { useState } from "react";
import { FiKey, FiPlus, FiRefreshCw, FiSlash } from "react-icons/fi";
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
import { useCreateCredential, useCredentialAction, useCredentials } from "../../api";
import SecretReveal from "../SecretReveal";

const SCOPE_TEXT = {
  "delivery:read": { label: "İçerik okuma", description: "Yalnız anahtarla okunan sitelerde sunucunun delivery API'sini okuması." },
  "manifest:write": { label: "Tasarım dosyası kaydı", description: "Sitenin derleme hattının tasarım dosyası sürümü kaydetmesi (etkinleştirme platform yöneticisindedir)." },
};

const CreateCredentialModal = ({ siteId, scopes, onClose, onCreated }) => {
  const create = useCreateCredential(siteId);
  const [values, setValues] = useState({ name: "", scopes: ["delivery:read"], expiresInDays: "" });
  const [idempotencyKey] = useState(createIdempotencyKey);
  const errorFor = (path) => create.error?.fieldErrors?.find((item) => item.path === path)?.message;
  const submit = (event) => {
    event.preventDefault();
    create.mutate({ values: { name: values.name.trim(), scopes: values.scopes, ...(values.expiresInDays ? { expiresInDays: Number(values.expiresInDays) } : {}) }, idempotencyKey }, { onSuccess: onCreated });
  };
  return (
    <Modal open onClose={onClose} icon={FiKey} title="Yeni API anahtarı" description="Anahtar yalnız bir kez gösterilir; sunucu yalnız özetini saklar." busy={create.isPending}
      footer={<><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button type="submit" form="credential-form" loading={create.isPending} disabled={values.name.trim().length < 2 || values.scopes.length === 0}>Oluştur</Button></>}>
      <form id="credential-form" className="integration_stack" onSubmit={submit} noValidate>
        <Input label="Ad" required placeholder="ör. Next.js sunucusu" maxLength={60} value={values.name} error={errorFor("name")} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        <CheckboxGroup label="Kapsam" required value={values.scopes} onChange={(next) => setValues({ ...values, scopes: next })} error={errorFor("scopes")}
          options={scopes.map((scope) => ({ value: scope, label: SCOPE_TEXT[scope]?.label ?? scope, description: SCOPE_TEXT[scope]?.description }))} />
        <Input label="Geçerlilik (gün)" type="number" inputMode="numeric" min={1} max={730} optionalText="Boşsa süresiz" value={values.expiresInDays} error={errorFor("expiresInDays")} onChange={(event) => setValues({ ...values, expiresInDays: event.target.value })} />
        {create.error && !create.error.fieldErrors?.length && <Alert variant="danger" size="compact">{getErrorMessage(create.error)}</Alert>}
      </form>
    </Modal>
  );
};

/** API anahtarları: kapsamlı, isteğe bağlı süreli; yenilemede eski anahtar 24 saat daha geçerlidir (kesintisiz geçiş). */
const CredentialList = ({ siteId, canManage }) => {
  const confirm = useConfirm();
  const query = useCredentials(siteId);
  const action = useCredentialAction(siteId);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState(null);

  const rotate = (credential) => confirm({
    title: `${credential.name} yenilensin mi?`,
    description: "Yeni anahtar üretilir. Eski anahtar 24 saat daha çalışır; bu sürede sunucularınızı yeni anahtara geçirin.",
    confirmLabel: "Yenile",
    onConfirm: () => action.mutateAsync({ credentialId: credential.id, action: "rotate" }).then((result) => setRevealed({ title: "Yeni anahtar", secret: result.secret })),
  });
  const revoke = async (credential) => {
    const ok = await confirm({ variant: "destructive", title: `${credential.name} iptal edilsin mi?`, description: "Anahtar hemen geçersiz olur; bu anahtarı kullanan sunucular içerik okuyamaz.", confirmLabel: "İptal et", onConfirm: () => action.mutateAsync({ credentialId: credential.id, action: "revoke" }) });
    if (ok) toast.success("Anahtar iptal edildi");
  };

  const items = query.data?.items ?? [];
  return (
    <Card title="API anahtarları" description="Sunucudan sunucuya erişim içindir; tarayıcıya veya mobil uygulamaya konmaz." actions={canManage && <Button size="sm" variant="outline" icon={FiPlus} onClick={() => setCreating(true)}>Anahtar oluştur</Button>}>
      {query.isPending && <Skeleton variant="rectangle" height={100} radius="md" />}
      {query.data && items.length === 0 && <EmptyState size="sm" icon={FiKey} title="Anahtar yok" description="Site herkese açık okunuyorsa anahtar gerekmez." />}
      {items.length > 0 && (
        <ul className="integration_rows">
          {items.map((credential) => (
            <li key={credential.id} className="integration_row">
              <div className="integration_row_head">
                <strong className="integration_row_title">{credential.name}</strong>
                <code>{credential.prefix}…</code>
                <Badge size="sm" variant={credential.status === "active" ? "success" : "neutral"} dot>{credential.status === "active" ? "Etkin" : "İptal edildi"}</Badge>
                {canManage && credential.status === "active" && (
                  <span className="integration_row_actions">
                    <Button size="sm" variant="outline" icon={FiRefreshCw} onClick={() => rotate(credential)}>Yenile</Button>
                    <Button size="sm" variant="ghost" color="danger" icon={FiSlash} onClick={() => revoke(credential)}>İptal et</Button>
                  </span>
                )}
              </div>
              <p className="integration_row_meta">
                {credential.scopes.map((scope) => SCOPE_TEXT[scope]?.label ?? scope).join(", ")}
                {" · "}Son kullanım: {credential.lastUsedAt ? formatDateTime(credential.lastUsedAt) : "hiç"}
                {credential.expiresAt && ` · Bitiş: ${formatDateTime(credential.expiresAt)}`}
                {credential.previousValidUntil && ` · Eski anahtar ${formatDateTime(credential.previousValidUntil)} saatine kadar geçerli`}
              </p>
            </li>
          ))}
        </ul>
      )}
      {action.error && <Alert variant="danger" size="compact">{getErrorMessage(action.error)}</Alert>}
      {creating && <CreateCredentialModal siteId={siteId} scopes={query.data?.scopes ?? []} onClose={() => setCreating(false)} onCreated={(result) => { setCreating(false); setRevealed({ title: "API anahtarı oluşturuldu", secret: result.secret }); }} />}
      {revealed && <SecretReveal title={revealed.title} secret={revealed.secret} description="Sunucunuzda Authorization: Bearer <anahtar> başlığıyla kullanın." onClose={() => setRevealed(null)} />}
    </Card>
  );
};

export default CredentialList;
