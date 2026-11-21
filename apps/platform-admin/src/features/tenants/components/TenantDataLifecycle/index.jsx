import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Textarea from "@/components/Textarea";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { formatDateTime } from "@/utils/format";
import { useTenantDataAction } from "../../api";
import "./tenant_data_lifecycle.scss";

const PurgeModal = ({ tenant, onClose }) => {
  const action = useTenantDataAction(tenant.id);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const errorFor = (path) => action.error?.fieldErrors?.find((item) => item.path === path)?.message;
  const submit = (event) => {
    event.preventDefault();
    action.mutate({ action: "purge", body: { confirm, reason }, version: tenant.version }, {
      onSuccess: () => {
        toast.success("Müşterinin verisi kalıcı olarak silindi");
        onClose();
      },
    });
  };
  return (
    <Modal open onClose={onClose} icon={FiTrash2} iconTone="danger"
      title="Müşteri verisini kalıcı olarak sil"
      description="Bütün siteler, içerik, revizyonlar, medya, form başvuruları, dışa aktarmalar ve panel girişi silinir. Geri alınamaz. Silme kaydı denetim ve silme defterinde kalır."
      busy={action.isPending}
      footer={<><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button type="submit" form="tenant-data-form" color="danger" loading={action.isPending}>Kalıcı olarak sil</Button></>}>
      <form id="tenant-data-form" className="tenant_data_form" noValidate onSubmit={submit}>
        <Textarea label="Gerekçe" required rows={3} maxLength={500} value={reason} error={errorFor("reason")} onChange={(event) => setReason(event.target.value)} />
        <Input label={`Onay için müşteri adını yazın: ${tenant.displayName}`} required autoComplete="off" value={confirm} error={errorFor("confirm")} onChange={(event) => setConfirm(event.target.value)} />
        {action.error && !action.error.fieldErrors?.length && <Alert variant="danger" size="compact">{getErrorMessage(action.error)}</Alert>}
      </form>
    </Modal>
  );
};

/** Kalıcı silme (şartname §25.8, AT-64): yalnız arşivlenmiş müşteride. Kalıcı silinmiş müşteride silme tarihi görünür. */
const TenantDataLifecycle = ({ tenant, canManage }) => {
  const [open, setOpen] = useState(false);
  if (tenant.purgedAt) {
    return <Alert variant="info" size="compact">Bu müşterinin verisi {formatDateTime(tenant.purgedAt)} tarihinde kalıcı olarak silindi.</Alert>;
  }
  if (!canManage || tenant.status !== "ARCHIVED") return null;
  return (
    <Card title="Kalıcı silme" description="Arşivlenmiş müşterinin bütün verisi kalıcı olarak silinebilir. Müşteri kaydı silindi olarak listede kalır.">
      <div className="tenant_data">
        <div className="tenant_data_row">
          <Button size="sm" variant="outline" color="danger" icon={FiTrash2} onClick={() => setOpen(true)}>Verileri kalıcı olarak sil</Button>
        </div>
      </div>
      {open && <PurgeModal tenant={tenant} onClose={() => setOpen(false)} />}
    </Card>
  );
};

export default TenantDataLifecycle;
