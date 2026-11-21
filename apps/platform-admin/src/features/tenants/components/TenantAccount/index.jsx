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
 * Müşterinin tek panel girişi (ADR-056): bu hesap müşterinin bütün sitelerinde tam yetkilidir.
 * Rol, davet ve ek kullanıcı yoktur; platform giriş e-postasını ve yetkili kişiyi yönetir, şifre belirleme bağlantısı gönderir.
 * Yetkili kişi boş bırakılmışsa sunucu müşteri adını kullanır; bu durumda "—" gösterilir.
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
    toast.success(emailChanged ? "Panel girişi kaydedildi; şifre belirleme bağlantısı gönderildi" : "Panel girişi kaydedildi");
  };

  return (
    <Card
      title="Panel girişi"
      icon={FiUser}
      description="Müşteri panele bu e-postayla girer ve bütün sitelerini yönetir."
      actions={account && editable && (
        <ButtonGroup attached={false} ariaLabel="Hesap işlemleri">
          <Button variant="outline" size="sm" icon={FiEdit2} onClick={() => setEditing(true)}>Düzenle</Button>
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
            { label: "Giriş e-postası", value: account.email },
            { label: "Yetkili kişi", value: account.displayName !== tenant.displayName ? account.displayName : "—" },
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
          title="Panel girişi yok"
          description={editable ? "Müşterinin panele girebilmesi için bir giriş e-postası tanımlayın; bu adrese şifre belirleme bağlantısı gider." : "Bu müşteriye bağlı panel girişi yok."}
          action={editable && <Button icon={FiUserPlus} onClick={() => setEditing(true)}>Panel girişi oluştur</Button>}
        />
      )}
      {editing && <AccountFormModal tenant={tenant} onClose={() => setEditing(false)} onSaved={saved} />}
    </Card>
  );
};

export default TenantAccount;
