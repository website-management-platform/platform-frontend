import { useState } from "react";
import { FiGlobe } from "react-icons/fi";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage } from "@/api/errors";
import { useApplyLocales, useLocaleImpact } from "../../api";
import { LOCALE_OPTIONS, localeLabel } from "../../locales";
import "./locale_change_modal.scss";

/**
 * Site dillerini değiştirme (şartname §7, AT-51): dil ekleme, arşivleme ve varsayılan dil değişimi etki raporu okunmadan
 * uygulanamaz. Rapor, adres, içerik, form ve plan etkilerini sayar; engelleyen sorun varsa uygulama kapalıdır.
 */
const LocaleChangeModal = ({ site, onClose }) => {
  const [locales, setLocales] = useState(site.locales);
  const [defaultLocale, setDefaultLocale] = useState(site.defaultLocale);
  const [acknowledged, setAcknowledged] = useState(false);
  const impact = useLocaleImpact(site.id);
  const applyLocales = useApplyLocales(site.id);
  const report = impact.data;
  const reset = () => {
    impact.reset();
    setAcknowledged(false);
  };
  const setLocaleList = (options) => {
    const next = options.map((option) => option.value);
    setLocales(next);
    if (!next.includes(defaultLocale) && next.length) setDefaultLocale(next[0]);
    reset();
  };
  const check = () => impact.mutate({ locales, defaultLocale });
  const apply = () => applyLocales.mutate({ values: { locales, defaultLocale, impactToken: report.impactToken }, version: site.version }, {
    onSuccess: () => {
      toast.success("Site dilleri güncellendi");
      onClose();
    },
    onError: (error) => {
      if (error.code === "IMPACT_CHANGED") {
        setAcknowledged(false);
        check();
      }
    },
  });
  const defaultOptions = locales.map((code) => ({ value: code, label: localeLabel(code) }));

  return (
    <Modal open onClose={onClose} size="lg" icon={FiGlobe} title="Site dilleri" description="Dil ekleme, kaldırma ve varsayılan dil değişikliği sitenin adreslerini ve arama motoru görünümünü etkiler. Önce etkisini denetleyin."
      busy={applyLocales.isPending}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          {!report && <Button onClick={check} loading={impact.isPending} disabled={locales.length === 0}>Etkiyi denetle</Button>}
          {report && <Button onClick={apply} loading={applyLocales.isPending} disabled={!report.canApply || (report.warnings.length > 0 && !acknowledged)}>Uygula</Button>}
        </>
      )}>
      <div className="locale_change">
        <Select label="Diller" isMulti options={LOCALE_OPTIONS} value={LOCALE_OPTIONS.filter((option) => locales.includes(option.value))} onChange={(options) => setLocaleList(options ?? [])} />
        <Select label="Varsayılan dil" options={defaultOptions} isSearchable={false} value={defaultOptions.find((option) => option.value === defaultLocale) ?? null} onChange={(option) => { setDefaultLocale(option.value); reset(); }} />
        {impact.error && <Alert variant="danger" size="compact">{getErrorMessage(impact.error)}</Alert>}
        {report && (
          <section className="locale_change_report" aria-label="Etki raporu">
            <p className="locale_change_summary">
              {report.added.length > 0 && <>Eklenecek: <strong>{report.added.map(localeLabel).join(", ")}</strong>. </>}
              {report.removed.length > 0 && <>Arşivlenecek: <strong>{report.removed.map(localeLabel).join(", ")}</strong>. </>}
              {report.defaultChange && <>Varsayılan dil: {localeLabel(report.defaultChange.from)} → <strong>{localeLabel(report.defaultChange.to)}</strong>. </>}
              {!report.canApply && report.errors.length === 0 && "Değişiklik yok."}
            </p>
            {report.errors.length > 0 && (
              <Alert variant="danger" size="compact" title="Uygulanamaz">
                <ul>{report.errors.map((item) => <li key={item.code}>{item.message}</li>)}</ul>
              </Alert>
            )}
            {report.warnings.length > 0 && (
              <Alert variant="warning" size="compact" title="Etkiler">
                <ul>{report.warnings.map((item) => <li key={`${item.code}-${item.locale ?? ""}`}>{item.message}</li>)}</ul>
              </Alert>
            )}
            {report.canApply && report.warnings.length > 0 && <Checkbox label="Etkileri okudum; değişikliği uygula" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />}
          </section>
        )}
        {applyLocales.error && <Alert variant="danger" size="compact">{getErrorMessage(applyLocales.error)}{applyLocales.error.code === "IMPACT_CHANGED" ? " Rapor yenilendi; yeniden onaylayın." : ""}</Alert>}
      </div>
    </Modal>
  );
};

export default LocaleChangeModal;
