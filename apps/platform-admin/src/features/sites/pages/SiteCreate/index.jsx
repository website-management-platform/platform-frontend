import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { FiArrowLeft, FiArrowRight, FiCheck, FiPackage, FiSquare } from "react-icons/fi";
import { labelOf } from "@wmp/schema";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ChoiceCard from "@/components/ChoiceCard";
import FieldGroup from "@/components/FieldGroup";
import Skeleton from "@/components/Skeleton";
import Input from "@/components/Input";
import PageHeader from "@/components/PageHeader";
import Select from "@/components/Select";
import Stepper from "@/components/Stepper";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage, getFieldErrors } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePageTitle } from "@/hooks/usePageTitle";
import { allowNextNavigation, useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { focusField } from "@/utils/validation";
import { usePresets } from "../../../library/api";
import { useTenant, useTenants } from "../../../tenants/api";
import { useCreateSite } from "../../api";
import { LOCALE_OPTIONS } from "../../locales";
import "./site_create.scss";

// İki adım (ADR-057): site bilgileri ve başlangıç modülleri. Anahtarı sunucu addan üretir; saat dilimi sonradan değiştirilebilir.
const STEPS = [
  { id: "site", label: "Site bilgileri" },
  { id: "preset", label: "Başlangıç bölümleri" },
];

const HOSTNAME_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

// Sunucunun alan yolu → sihirbaz adımı; sunucu hatası gelince ilgili adıma dönülür.
const FIELD_STEPS = { tenantId: 0, displayName: 0, key: 0, primaryDomain: 0, defaultLocale: 0, locales: 0, timezone: 0, preset: 1 };

const validateStep = (step, values) => {
  if (step === 0) {
    return {
      tenantId: values.tenantId ? undefined : "Müşteri seçin.",
      displayName: values.displayName.trim().length >= 2 ? undefined : "Site adını yazın (en az 2 karakter).",
      primaryDomain: !values.primaryDomain.trim() || HOSTNAME_PATTERN.test(values.primaryDomain.trim().toLowerCase())
        ? undefined
        : "Yalnız alan adını yazın (ör. www.ornek.com); https://, port ve yol yazmayın.",
      locales: values.locales.length > 0 ? undefined : "En az bir dil seçin.",
      defaultLocale: values.locales.includes(values.defaultLocale) ? undefined : "Varsayılan dili seçili diller arasından seçin.",
    };
  }
  if (step === 1) return { preset: values.presetId && values.moduleKeys.length === 0 ? "En az bir bölüm seçin veya şablonsuz başlayın." : undefined };
  return {};
};

const SiteCreate = () => {
  usePageTitle("Site oluştur");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const presetTenantId = searchParams.get("musteri");
  const presetTenantQuery = useTenant(presetTenantId ?? "");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    tenantId: presetTenantId ?? "",
    displayName: "",
    primaryDomain: "",
    locales: ["tr"],
    defaultLocale: "tr",
    timezone: "Europe/Istanbul",
    presetId: null,
    moduleKeys: [],
  });
  const presetsQuery = usePresets({ status: "ACTIVE" });
  const presets = presetsQuery.data?.items ?? [];
  const selectedPreset = presets.find((item) => item.id === values.presetId) ?? null;
  const [errors, setErrors] = useState({});
  const [tenantSearch, setTenantSearch] = useState("");
  const debouncedTenantSearch = useDebouncedValue(tenantSearch);
  const tenantsQuery = useTenants({ status: "ACTIVE", q: debouncedTenantSearch || undefined, page: 1, size: 20 });
  const [idempotencyKey] = useState(createIdempotencyKey);
  const formRef = useRef(null);
  const create = useCreateSite();
  const dirty = Boolean(values.displayName || values.primaryDomain) && !create.isSuccess;
  useUnsavedChangesGuard(dirty);

  const tenantOptions = (tenantsQuery.data?.items ?? []).map((tenant) => ({ value: tenant.id, label: tenant.displayName, tenant }));
  const presetTenant = presetTenantQuery.data;
  if (presetTenant && !tenantOptions.some((option) => option.value === presetTenant.id)) {
    tenantOptions.unshift({ value: presetTenant.id, label: presetTenant.displayName, tenant: presetTenant });
  }
  const selectedTenant = tenantOptions.find((option) => option.value === values.tenantId) ?? null;

  const setField = (field, value) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "locales" && !value.includes(prev.defaultLocale)) next.defaultLocale = value[0] ?? "";
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const goNext = () => {
    const stepErrors = validateStep(step, values);
    setErrors(stepErrors);
    const invalid = Object.keys(stepErrors).find((field) => stepErrors[field]);
    if (invalid) {
      focusField(formRef.current, invalid);
      return;
    }
    setStep((current) => current + 1);
  };

  const submit = () => {
    const { tenantId, presetId: _presetId, moduleKeys, ...rest } = values;
    // Seçilen preset sürümü sitenin kaydına yazılır; modüller site ile aynı işlemde oluşur (şartname §11 provisioning).
    const preset = selectedPreset
      ? { presetId: selectedPreset.id, version: selectedPreset.latestVersion, modules: selectedPreset.modules.map((item) => ({ key: item.key, include: moduleKeys.includes(item.key) })) }
      : null;
    create.mutate({
      tenantId,
      idempotencyKey,
      values: { ...rest, displayName: rest.displayName.trim(), primaryDomain: rest.primaryDomain.trim().toLowerCase() || null, preset },
    }, {
      onSuccess: (site) => {
        allowNextNavigation();
        toast.success(`${site.displayName} oluşturuldu`);
        navigate(`/siteler/${site.id}`, { replace: true });
      },
      onError: (error) => {
        const fieldErrors = getFieldErrors(error);
        // "preset.modules.0.key" gibi iç içe yollar üst alanın adımına gider.
        const firstField = Object.keys(fieldErrors)[0]?.split(".")[0];
        if (firstField && FIELD_STEPS[firstField] !== undefined) {
          setErrors({ ...fieldErrors, ...(firstField === "preset" ? { preset: Object.values(fieldErrors)[0] } : {}) });
          setStep(FIELD_STEPS[firstField]);
        }
      },
    });
  };

  const hasFieldErrors = Object.keys(getFieldErrors(create.error)).length > 0;

  return (
    <div className="site_create">
      <PageHeader title="Site oluştur" description="Site bir müşteriye bağlıdır. Başlangıç bölümleri site şablonundan seçilir; her bölüm sonradan yapılandırılabilir." breadcrumb={[{ label: "Web siteleri", path: "/siteler" }, { label: "Site oluştur" }]} />
      <Card padding className="site_create_card">
        <Stepper steps={STEPS} current={step} ariaLabel="Site oluşturma adımları" />
        <form ref={formRef} className="site_create_form" onSubmit={(event) => event.preventDefault()} noValidate>
          {create.isError && !hasFieldErrors && <Alert variant="danger" size="compact">{getErrorMessage(create.error)}</Alert>}

          {step === 0 && (
            <>
              <Select
                label="Müşteri"
                name="tenantId"
                required
                options={tenantOptions}
                value={selectedTenant}
                onChange={(option) => setField("tenantId", option?.value ?? "")}
                onInputChange={(text, { action }) => {
                  if (action === "input-change") setTenantSearch(text);
                }}
                filterOption={null}
                isLoading={tenantsQuery.isFetching}
                placeholder="Müşteri adıyla arayın"
                noOptionsMessage={() => "Aktif müşteri bulunamadı"}
                hint="Yalnız aktif müşterilere site eklenebilir."
                error={errors.tenantId}
              />
              <Input label="Site adı" name="displayName" value={values.displayName} onChange={(event) => setField("displayName", event.target.value)} error={errors.displayName} maxLength={160} hint="Müşterinin panelde gördüğü ad." required />
              <Input label="Alan adı" name="primaryDomain" optionalText="İsteğe bağlı" placeholder="www.ornek.com" inputMode="url" autoComplete="off" value={values.primaryDomain} onChange={(event) => setField("primaryDomain", event.target.value)} error={errors.primaryDomain} hint="Sitenin yayınlanacağı adres. Doğrulaması sitenin Entegrasyon sekmesinden yapılır." />
              <Select
                label="Diller"
                name="locales"
                isMulti
                required
                options={LOCALE_OPTIONS}
                value={LOCALE_OPTIONS.filter((option) => values.locales.includes(option.value))}
                onChange={(options) => setField("locales", options.map((option) => option.value))}
                hint="İçeriğin hangi dillerde girileceği. En fazla 20 dil."
                error={errors.locales}
              />
              {values.locales.length > 1 && (
                <Select
                  label="Varsayılan dil"
                  name="defaultLocale"
                  required
                  options={LOCALE_OPTIONS.filter((option) => values.locales.includes(option.value))}
                  value={LOCALE_OPTIONS.find((option) => option.value === values.defaultLocale) ?? null}
                  onChange={(option) => setField("defaultLocale", option?.value ?? "")}
                  error={errors.defaultLocale}
                />
              )}
              {errors.timezone && <Alert variant="danger" size="compact">{errors.timezone}</Alert>}
            </>
          )}

          {step === 1 && (
            <div className="site_create_preset">
              {presetsQuery.isPending && <Skeleton variant="rectangle" height={160} />}
              <FieldGroup legend="Başlangıç şablonu" description="Site şablonu siteyi bir türe kilitlemez; bölümler sonradan eklenip çıkarılabilir." layout="grid" columns={2} error={errors.preset && !values.presetId ? errors.preset : undefined}>
                <ChoiceCard
                  name="site-preset"
                  value=""
                  icon={FiSquare}
                  label="Şablonsuz başla"
                  description="Site bölümsüz oluşur; bölümler site sayfasından eklenir."
                  checked={!values.presetId}
                  onChange={() => setValues((current) => ({ ...current, presetId: null, moduleKeys: [] }))}
                />
                {presets.map((preset) => (
                  <ChoiceCard
                    key={preset.id}
                    name="site-preset"
                    value={preset.id}
                    icon={FiPackage}
                    label={labelOf(preset.label)}
                    description={preset.description}
                    meta={`${preset.moduleCount} bölüm · v${preset.latestVersion}`}
                    checked={values.presetId === preset.id}
                    onChange={() => {
                      setValues((current) => ({ ...current, presetId: preset.id, moduleKeys: preset.modules.map((item) => item.key) }));
                      setErrors((prev) => ({ ...prev, preset: undefined }));
                    }}
                  />
                ))}
              </FieldGroup>
              {selectedPreset && (
                <FieldGroup legend="Eklenecek bölümler" description="İstemediğiniz bölümün işaretini kaldırın." layout="grid" columns={2} error={errors.preset}>
                  {selectedPreset.modules.map((item) => (
                    <ChoiceCard
                      key={item.key}
                      type="checkbox"
                      name="site-preset-modules"
                      value={item.key}
                      label={labelOf(item.label)}
                      description={item.templateLabel}
                      checked={values.moduleKeys.includes(item.key)}
                      onChange={(event) => {
                        const { checked } = event.target;
                        setValues((current) => ({ ...current, moduleKeys: checked ? [...current.moduleKeys, item.key] : current.moduleKeys.filter((key) => key !== item.key) }));
                        setErrors((prev) => ({ ...prev, preset: undefined }));
                      }}
                    />
                  ))}
                </FieldGroup>
              )}
            </div>
          )}

          <div className="site_create_actions">
            {step > 0 && <Button variant="outline" icon={FiArrowLeft} onClick={() => setStep((current) => current - 1)} disabled={create.isPending}>Geri</Button>}
            {step < STEPS.length - 1
              ? <Button icon={FiArrowRight} iconPosition="right" onClick={goNext}>Devam et</Button>
              : <Button icon={FiCheck} onClick={submit} loading={create.isPending}>Siteyi oluştur</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SiteCreate;
