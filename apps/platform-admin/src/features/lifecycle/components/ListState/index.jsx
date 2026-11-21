import { FiSearch } from "react-icons/fi";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";

/**
 * Liste sorgusunun yükleme, hata ve boş durumları. Süzgeç varken boş sonuç "sonuç yok" ve süzgeci temizle,
 * hiç kayıt yokken empty (başlık, açıklama, ilk eylem) gösterilir. Veri varsa children çizilir.
 */
const ListState = ({ query, filtered, onClearFilters, empty, children }) => {
  if (query.isPending) return <Skeleton variant="rectangle" height={240} radius="lg" />;
  if (query.isError) return <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0) {
    return filtered
      ? <EmptyState icon={FiSearch} title="Sonuç bulunamadı" description="Arama veya süzgeçlerle eşleşen kayıt yok." action={<Button variant="outline" onClick={onClearFilters}>Süzgeçleri temizle</Button>} variant="bordered" />
      : <EmptyState variant="bordered" {...empty} />;
  }
  return children;
};

export default ListState;
