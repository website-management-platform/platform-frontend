import { FiExternalLink, FiInbox } from "react-icons/fi";
import Button from "@/components/Button";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatDateTime } from "@/utils/format";
import { useMailbox } from "../../api";
import "./mailbox.scss";

// E-postadaki bağlantı panel kökenini taşır; aynı sekmede göreli yol olarak açılır.
const toPanelPath = (link) => {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
};

const Mailbox = () => {
  usePageTitle("Posta kutusu");
  const mailboxQuery = useMailbox();
  const items = mailboxQuery.data?.items ?? [];

  return (
    <div className="mailbox">
      <PageHeader
        title="Geliştirme posta kutusu"
        description="Mock sunucusunun bu panele gönderdiği e-postalar. Gerçek e-posta gönderilmez; bu sayfa yalnız geliştirmede vardır."
      />
      {mailboxQuery.isError && <QueryErrorAlert error={mailboxQuery.error} onRetry={() => mailboxQuery.refetch()} />}
      {mailboxQuery.isPending && <Skeleton variant="rectangle" height={120} />}
      {mailboxQuery.isSuccess && items.length === 0 && (
        <EmptyState icon={FiInbox} title="Posta kutusu boş" description="Şifre sıfırlama veya davet gibi bir işlem yapıldığında e-postalar burada görünür." />
      )}
      <ul className="mailbox_list">
        {items.map((mail) => (
          <li key={mail.id}>
            <Card
              title={mail.subject}
              description={`${mail.to} · ${formatDateTime(mail.createdAt)}`}
              actions={mail.link && (
                <Button as="a" href={toPanelPath(mail.link)} size="sm" icon={FiExternalLink}>{mail.linkLabel ?? "Bağlantıyı aç"}</Button>
              )}
            >
              {mail.body && <p className="mailbox_body">{mail.body}</p>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Mailbox;
