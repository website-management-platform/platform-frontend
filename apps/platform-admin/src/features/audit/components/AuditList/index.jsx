import Badge from "@/components/Badge";
import { formatDateTime } from "@/utils/format";
import "./audit_list.scss";

const REALM_LABELS = { platform: "Platform", customer: "Müşteri paneli" };

const AuditList = ({ events, showRequestId = false }) => (
  <ol className="audit_list">
    {events.map((event) => (
      <li key={event.id} className="audit_list_item">
        <div className="audit_list_main">
          <span className="audit_list_summary">{event.summary}</span>
          <span className="audit_list_meta">
            {event.actor ? `${event.actor.displayName} (${event.actor.email})` : "Sistem / kimliği doğrulanmamış istek"}
            {" · "}
            <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
            {showRequestId && event.requestId && <> · İz kodu <code>{event.requestId}</code></>}
          </span>
        </div>
        <Badge size="sm" variant={event.realm === "platform" ? "accent" : "neutral"}>{REALM_LABELS[event.realm] ?? event.realm}</Badge>
      </li>
    ))}
  </ol>
);

export default AuditList;
