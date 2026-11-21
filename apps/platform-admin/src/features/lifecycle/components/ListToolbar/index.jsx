import { FiSearch } from "react-icons/fi";
import Input from "@/components/Input";
import SegmentedControl from "@/components/SegmentedControl";
import "./list_toolbar.scss";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "SUSPENDED", label: "Askıda" },
  { value: "ARCHIVED", label: "Arşivde" },
];

// Müşteri ve site listelerinin ortak arama + durum süzgeci.
const ListToolbar = ({ search, onSearchChange, searchLabel, status, onStatusChange }) => (
  <div className="list_toolbar">
    <Input
      aria-label={searchLabel}
      type="search"
      icon={FiSearch}
      placeholder={searchLabel}
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
      className="list_toolbar_search"
    />
    <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={onStatusChange} ariaLabel="Duruma göre süz" size="sm" />
  </div>
);

export default ListToolbar;
