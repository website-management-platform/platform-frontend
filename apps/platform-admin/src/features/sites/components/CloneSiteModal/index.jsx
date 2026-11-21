import { useState } from "react";
import { useNavigate } from "react-router";
import { FiCopy } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { useCloneSite } from "../../api";
import "./clone_site_modal.scss";

/**
 * Site kopyalama (şartname §15 clone, §18): yeni site aynı modülleri, şema sürümlerini, tasarım manifest'ini, formları ve ana ekran
 * yapılandırmasını alır. İçerik ve medya isteğe bağlıdır ve yeni kimliklerle kopyalanır; kayıtlar taslaktır.
 * Kullanıcılar, alan adları, API anahtarları, webhook'lar ve form başvuruları hiçbir zaman kopyalanmaz.
 */
const CloneSiteModal = ({ site, onClose }) => {
  const navigate = useNavigate();
  const clone = useCloneSite(site.id);
  const [values, setValues] = useState({ key: `${site.key}-kopya`.slice(0, 63), displayName: `${site.displayName} (kopya)`.slice(0, 120), content: false, media: false });
  const [idempotencyKey] = useState(createIdempotencyKey);
  const errorFor = (path) => clone.error?.fieldErrors?.find((item) => item.path === path)?.message;
  const set = (patch) => setValues((current) => ({ ...current, ...patch }));
  const submit = (event) => {
    event.preventDefault();
    clone.mutate({ values: { key: values.key, displayName: values.displayName, include: { content: values.content, media: values.content && values.media } }, idempotencyKey }, {
      onSuccess: (created) => {
        toast.success(`${created.displayName} oluşturuldu: ${created.clone.modules} bölüm, ${created.clone.entries} kayıt, ${created.clone.assets} dosya`);
        navigate(`/siteler/${created.id}`);
      },
    });
  };
  return (
    <Modal open onClose={onClose} icon={FiCopy} title="Siteyi kopyala" description="Yeni site aynı müşteride, aynı dil ve tasarım ayarlarıyla oluşur."
      busy={clone.isPending}
      footer={<><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button type="submit" form="clone-site-form" loading={clone.isPending}>Kopyala</Button></>}>
      <form id="clone-site-form" className="clone_site" noValidate onSubmit={submit}>
        <Input label="Site adı" required maxLength={120} value={values.displayName} error={errorFor("displayName")} onChange={(event) => set({ displayName: event.target.value })} />
        <Input label="Anahtar" required maxLength={63} hint="Küçük harf, rakam ve -; müşteride tekil." value={values.key} error={errorFor("key")} onChange={(event) => set({ key: event.target.value.toLowerCase() })} />
        <fieldset className="clone_site_options">
          <legend>Neler kopyalansın?</legend>
          <p className="clone_site_note">Bölümler, yapı sürümleri, tasarım dosyası ve form tanımları her zaman kopyalanır.</p>
          <Checkbox label="İçerik" description="Bütün kayıtlar yeni kimliklerle ve taslak olarak; birbirine bağlantılar korunur." checked={values.content} onChange={(event) => set({ content: event.target.checked, media: event.target.checked && values.media })} />
          <Checkbox label="Medya dosyaları" description="Görseller ve belgeler yeniden yüklenmeden kopyalanır." checked={values.media} disabled={!values.content} onChange={(event) => set({ media: event.target.checked })} />
        </fieldset>
        <Alert variant="info" size="compact">Kullanıcılar, alan adları, API anahtarları, webhook'lar ve form başvuruları kopyalanmaz.</Alert>
        {clone.error && !clone.error.fieldErrors?.length && <Alert variant="danger" size="compact">{getErrorMessage(clone.error)}</Alert>}
      </form>
    </Modal>
  );
};

export default CloneSiteModal;
