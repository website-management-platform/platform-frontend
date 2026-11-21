import { useState } from "react";
import { FiGlobe, FiLock, FiPlus, FiTrash2 } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ChoiceCard from "@/components/ChoiceCard";
import CopyButton from "@/components/CopyButton";
import Input from "@/components/Input";
import Switch from "@/components/Switch";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { useUpdateIntegration } from "../../api";

const ListEditor = ({ label, hint, values, onChange, placeholder, disabled, errors }) => {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setDraft("");
  };
  return (
    <div className="integration_list_editor">
      <div className="integration_list_editor_add">
        <Input label={label} hint={hint} placeholder={placeholder} disabled={disabled} value={draft} onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }} />
        <Button variant="outline" icon={FiPlus} disabled={disabled || !draft.trim()} onClick={add}>Ekle</Button>
      </div>
      {values.length > 0 && (
        <ul className="integration_chips">
          {values.map((value, index) => (
            <li key={value} className={errors?.[index] ? "integration_chip integration_chip_invalid" : "integration_chip"}>
              <code>{value}</code>
              {errors?.[index] && <span className="integration_chip_error">{errors[index]}</span>}
              {!disabled && <Button variant="ghost" size="sm" icon={FiTrash2} ariaLabel={`${value} kaldır`} onClick={() => onChange(values.filter((item) => item !== value))} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Delivery erişimi: herkese açık veya yalnız anahtarla (sunucudan sunucuya), izinli kökenler (CORS), dış yönlendirme izinli alan
 * adları, dil geri dönüşü ve önbellek. Değişiklik If-Match ile kaydedilir.
 */
const AccessSettings = ({ siteId, access, canManage }) => {
  const update = useUpdateIntegration(siteId);
  const [form, setForm] = useState(() => ({ deliveryAccess: access.deliveryAccess, allowedOrigins: access.allowedOrigins, redirectHosts: access.redirectHosts, localeFallback: access.localeFallback, allowStaleWhileRevalidate: access.allowStaleWhileRevalidate }));
  const dirty = JSON.stringify(form) !== JSON.stringify({ deliveryAccess: access.deliveryAccess, allowedOrigins: access.allowedOrigins, redirectHosts: access.redirectHosts, localeFallback: access.localeFallback, allowStaleWhileRevalidate: access.allowStaleWhileRevalidate });
  const fieldErrors = (prefix) => Object.fromEntries((update.error?.fieldErrors ?? []).filter((item) => item.path.startsWith(`${prefix}.`)).map((item) => [Number(item.path.split(".")[1]), item.message]));
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Card title="Erişim" description="Sitenin içeriği kimler tarafından ve nereden okunabilir.">
      <div className="integration_stack">
        <div className="integration_key">
          <span>Site anahtarı (public)</span>
          <code>{access.publicKey}</code>
          <CopyButton value={access.publicKey} label="Kopyala" />
        </div>
        <fieldset className="integration_choices">
          <legend>Okuma erişimi</legend>
          <ChoiceCard name="delivery-access" label="Herkese açık" icon={FiGlobe} description="Web sitesi tarayıcıdan doğrudan okur. Yalnız yayınlanmış ve herkese açık alanlar döner." checked={form.deliveryAccess === "public"} disabled={!canManage} onChange={() => set("deliveryAccess")("public")} />
          <ChoiceCard name="delivery-access" label="Yalnız anahtarla" icon={FiLock} description="Yalnız delivery:read kapsamlı API anahtarı taşıyan sunucular okur (ör. SSR). Anahtar tarayıcıya konmaz." checked={form.deliveryAccess === "private"} disabled={!canManage} onChange={() => set("deliveryAccess")("private")} />
        </fieldset>
        <ListEditor label="İzinli kökenler (CORS)" hint="Tarayıcıdan okuyan adresler: https://alan-adı[:port]. Doğrulanmış alan adları kendiliğinden izinlidir." placeholder="https://www.ornek.com"
          values={form.allowedOrigins} onChange={set("allowedOrigins")} disabled={!canManage} errors={fieldErrors("allowedOrigins")} />
        <ListEditor label="Dış yönlendirme izinli alan adları" hint="Yönlendirmeler yalnız bu adlara ve doğrulanmış alan adlarına dış bağlantı verebilir (açık yönlendirme koruması)." placeholder="kampanya.ornek.com"
          values={form.redirectHosts} onChange={set("redirectHosts")} disabled={!canManage} errors={fieldErrors("redirectHosts")} />
        <Switch label="Eksik çeviride varsayılan dile düş" description="Kapalıysa bir dilde olmayan alan yanıtta yer almaz." checked={form.localeFallback === "default"} disabled={!canManage} onChange={(event) => set("localeFallback")(event.target.checked ? "default" : "none")} />
        <Switch label="Önbellek süresi dolunca eski yanıtı sunmaya izin ver" description="stale-while-revalidate: yayından sonra en çok 5 dakika eski içerik görülebilir; site daha hızlı açılır." checked={form.allowStaleWhileRevalidate} disabled={!canManage} onChange={(event) => set("allowStaleWhileRevalidate")(event.target.checked)} />
        {update.error && <Alert variant="danger" size="compact">{getErrorMessage(update.error)}</Alert>}
        {canManage && (
          <div className="integration_actions">
            <Button loading={update.isPending} disabled={!dirty} onClick={() => update.mutate({ values: form, version: access.version }, { onSuccess: () => toast.success("Erişim ayarları kaydedildi") })}>Kaydet</Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AccessSettings;
