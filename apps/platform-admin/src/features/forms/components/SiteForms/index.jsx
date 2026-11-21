import { useState } from "react";
import { FiFileText, FiPlus } from "react-icons/fi";
import Alert from "@/components/Alert";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import { getErrorMessage } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { useSearchParamsState } from "@/hooks/useSearchParamsState";
import { useCreateForm, useSiteForms } from "../../api";
import FormEditor from "../FormEditor";
import "./site_forms.scss";

const slugify = (value) => value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const CreateFormModal = ({ site, onClose, onCreated }) => {
  const create = useCreateForm(site.id);
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const errorFor = (path) => create.error?.fieldErrors?.find((item) => item.path === path)?.message;
  const submit = (event) => {
    event.preventDefault();
    create.mutate({ values: { key, title: { [site.defaultLocale]: title.trim() } }, idempotencyKey }, { onSuccess: onCreated });
  };
  return (
    <Modal open onClose={onClose} icon={FiFileText} title="Yeni form" description="Form ad, e-posta, mesaj ve onay metniyle başlar; alanları sonra düzenlersiniz." busy={create.isPending}
      footer={<><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button type="submit" form="form-create" loading={create.isPending} disabled={title.trim().length < 2 || key.length < 2}>Oluştur</Button></>}>
      <form id="form-create" className="site_forms_create" noValidate onSubmit={submit}>
        <Input label="Form adı" required maxLength={120} placeholder="ör. İletişim formu" value={title} error={errorFor("title")}
          onChange={(event) => { setTitle(event.target.value); if (!keyTouched) setKey(slugify(event.target.value)); }} />
        <Input label="Anahtar" required maxLength={40} hint="Web sitesi formu bu adla okur (ör. iletisim). Sonradan değiştirilemez." value={key} error={errorFor("key")}
          onChange={(event) => { setKeyTouched(true); setKey(event.target.value.toLowerCase()); }} />
        {create.error && !create.error.fieldErrors?.length && <Alert variant="danger" size="compact">{getErrorMessage(create.error)}</Alert>}
      </form>
    </Modal>
  );
};

/** Site formları (şartname §17): platform tanımlar ve sürümler; müşteri yalnız başvuruları görür. */
const SiteForms = ({ site, canManage }) => {
  const query = useSiteForms(site.id);
  const [params, setParams] = useSearchParamsState({ form: "" });
  const [creating, setCreating] = useState(false);
  const items = query.data?.items ?? [];
  return (
    <Card title="Formlar" description="Web sitesindeki iletişim, başvuru ve talep formları. Web sitesi yayındaki sürümü okur; başvurular müşteri panelindeki gelen kutusuna düşer."
      actions={canManage && site.status !== "ARCHIVED" && <Button size="sm" variant="outline" icon={FiPlus} onClick={() => setCreating(true)}>Form ekle</Button>}>
      {query.isPending && <Skeleton variant="rectangle" height={120} radius="md" />}
      {query.isError && <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />}
      {query.data && items.length === 0 && <EmptyState size="sm" icon={FiFileText} title="Form yok" description="İletişim veya başvuru formu ekleyin; web sitesi SDK ile formu çizer ve gönderir." />}
      {items.length > 0 && (
        <ul className="site_forms_list">
          {items.map((form) => (
            <li key={form.id} className="site_forms_item">
              <div className="site_forms_item_main">
                <button type="button" className="site_forms_item_title" onClick={() => setParams({ form: form.id })}>{form.title?.[site.defaultLocale] ?? form.key}</button>
                <span className="site_forms_item_meta">
                  <code>{form.key}</code> · {form.currentVersion ? `Sürüm ${form.currentVersion}` : "Yayınlanmadı"} · {form.counts.total} başvuru · {form.settings.retentionDays} gün saklama{form.settings.allowFiles ? " · dosya eki açık" : ""}
                </span>
              </div>
              <span className="site_forms_item_badges">
                {form.status === "disabled" && <Badge size="sm" variant="neutral" dot>Kapalı</Badge>}
                {!form.currentVersion && <Badge size="sm" variant="warning" dot>Taslak</Badge>}
                {form.currentVersion && form.hasUnpublishedChanges && <Badge size="sm" variant="warning" dot>Yayınlanmamış değişiklik</Badge>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {creating && <CreateFormModal site={site} onClose={() => setCreating(false)} onCreated={(form) => { setCreating(false); setParams({ form: form.id }); }} />}
      {params.form && <FormEditor site={site} formId={params.form} canManage={canManage && site.status !== "ARCHIVED"} onClose={() => setParams({ form: "" })} />}
    </Card>
  );
};

export default SiteForms;
