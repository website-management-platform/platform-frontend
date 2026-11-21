import { Link } from "react-router";
import Table from "@/components/Table";
import { formatDate } from "@/utils/format";
import StatusBadge from "../../../lifecycle/components/StatusBadge";
import "./site_table.scss";

const SiteTable = ({ sites, showTenant = true, caption = "Web siteleri" }) => (
  <Table variant="bordered" hoverable caption={caption} hideCaption className="site_table">
    <thead>
      <tr>
        <th scope="col">Site</th>
        {showTenant && <th scope="col">Müşteri</th>}
        <th scope="col">Alan adı</th>
        <th scope="col">Diller</th>
        <th scope="col">Durum</th>
        <th scope="col" className="site_table_end">Oluşturma</th>
      </tr>
    </thead>
    <tbody>
      {sites.map((site) => (
        <tr key={site.id}>
          <td>
            <Link to={`/siteler/${site.id}`} className="site_table_name">{site.displayName}</Link>
            <span className="site_table_key">{site.key}</span>
          </td>
          {showTenant && <td><Link to={`/musteriler/${site.tenantId}`}>{site.tenantName}</Link></td>}
          <td className="site_table_domain">{site.primaryDomain ?? <span className="site_table_muted">Tanımlanmadı</span>}</td>
          <td>{site.locales.map((locale) => locale.toUpperCase()).join(", ")}</td>
          <td><StatusBadge status={site.status} /></td>
          <td className="site_table_end">{formatDate(site.createdAt)}</td>
        </tr>
      ))}
    </tbody>
  </Table>
);

export default SiteTable;
