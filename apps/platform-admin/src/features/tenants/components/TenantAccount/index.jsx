import { useState } from "react";
import { FiEdit2, FiSend, FiUser, FiUserPlus } from "react-icons/fi";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ButtonGroup from "@/components/ButtonGroup";
import Card from "@/components/Card";
import DescriptionList from "@/components/DescriptionList";
import EmptyState from "@/components/EmptyState";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { formatDateTime } from "@/utils/format";
import { useSendSetupLink } from "../../api";
import AccountFormModal from "../AccountFormModal";

/**
 * Müşterinin tek hesabı (ADR-056): bu hesap müşterinin bütün sitelerinde tam yetkilidir.
 * Rol, davet ve ek kullanıcı yoktur; platform hesabın e-postasını ve adını yönetir, şifre belirleme bağlantısı gönderir.
 */
const TenantAccount = ({ tenant, canManage }) => {
  const [editing, setEditing] = useState(false);
  const sendLink = useSendSetupLink(tenant.id);
  const account = tenant.account;
  const editable = canManage && tenant.status !== "ARCHIVED" && tenant.status !== "PURGED";

  const send = () => sendLink.mutate(undefined, {
    onSuccess: () => toast.success(`Şifre belirleme bağlantısı ${account.email} adresine gönderildi`),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const saved = ({ emailChanged }) => {
    setEditing(false);
    toast.success(emailChanged ? "Hesap kaydedildi; şifre belirleme bağlantısı gönderildi" : "Hesap kaydedildi");
  };

  return (
    <Card
      title="Müşteri hesabı"
      icon={FiUser}
      description="Müşteri panele bu hesapla girer ve bütün sitelerini yönetir."
      actions={account && editable && (
        <ButtonGroup attached={false} ariaLabel="Hesap işlemleri">
          <Button variant="outline" size="sm" icon={FiEdit2} onClick={() => setEditing(true)}>Hesabı düzenle</Button>
          {tenant.status === "ACTIVE" && (
            <Button variant="outline" size="sm" icon={FiSend} loading={sendLink.isPending} onClick={send}>
              {account.passwordSet ? "Sıfırlama bağlantısı gönder" : "Kurulum bağlantısı gönder"}
            </Button>
          )}
        </ButtonGroup>
      )}
    >
      {account ? (
        <DescriptionList
          layout="grid"
          columns={2}
          items={[
            { label: "Ad soyad", value: account.displayName },
            { label: "E-posta", value: account.email },
            {
              label: "Şifre",
              value: account.passwordSet
                ? <Badge variant="success">Belirlendi</Badge>
                : <Badge variant="warning">Bekleniyor</Badge>,
            },
            { label: "Son giriş", value: account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "Henüz giriş yapmadı" },
          ]}
        />
      ) : (
        <EmptyState
          variant="bordered"
          icon={FiUserPlus}
          title="Hesap yok"
          description={editable ? "Müşterinin panele girebilmesi için bir hesap oluşturun. E-posta adresine şifre belirleme bağlantısı gider." : "Bu müşteriye bağlı hesap yok."}
          action={editable && <Button icon={FiUserPlus} onClick={() => setEditing(true)}>Hesap oluştur</Button>}
        />
      )}
      {editing && <AccountFormModal tenant={tenant} onClose={() => setEditing(false)} onSaved={saved} />}
    </Card>
  );
};

export default TenantAccount;
