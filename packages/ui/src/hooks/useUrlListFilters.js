import { useEffect } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { useSearchParamsState, useUrlSyncedValue } from "./useSearchParamsState";

/**
 * Sunucu tarafında sayfalanan listelerin URL'deki süzgeçleri. Arama kutusu yazarken beklenir, sonra URL'ye yazılır;
 * arama veya süzgeç değişince ilk sayfaya dönülür. URL parametreleri Türkçedir: ara, sayfa ve listeye özgü süzgeçler.
 */
export const useUrlListFilters = (defaults) => {
  const [filters, setFilters] = useSearchParamsState(defaults);
  const [search, setSearch] = useUrlSyncedValue(filters.ara ?? "");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (debouncedSearch !== (filters.ara ?? "")) setFilters({ ara: debouncedSearch, sayfa: 1 }, { replace: true });
  }, [debouncedSearch, filters.ara, setFilters]);

  const setFilter = (key, value) => setFilters({ [key]: value, sayfa: 1 });
  const clear = () => {
    setSearch("");
    setFilters(Object.fromEntries(Object.keys(defaults).map((key) => [key, defaults[key]])));
  };
  const filtered = Object.keys(defaults).some((key) => key !== "sayfa" && String(filters[key]) !== String(defaults[key]));

  return {
    filters,
    search,
    setSearch,
    setFilter,
    page: Number(filters.sayfa) || 1,
    setPage: (page) => setFilters({ sayfa: page }),
    clear,
    filtered,
  };
};
