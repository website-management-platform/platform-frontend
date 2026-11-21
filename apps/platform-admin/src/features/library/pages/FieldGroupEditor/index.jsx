import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FiArchive, FiRotateCcw, FiSave } from "react-icons/fi";
import { labelOf, validateFields } from "@wmp/schema";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import PageHeader from "@/components/PageHeader";
import QueryErrorAlert from "@/components/QueryErrorAlert";
import Skeleton from "@/components/Skeleton";
import Textarea from "@/components/Textarea";
import { toast } from "@/components/Toast/toast";
import { getErrorMessage, getFieldErrors, isApiError } from "@/api/errors";
import { createIdempotencyKey } from "@/api/http";
import { usePlatformCan } from "@/auth/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { allowNextNavigation, useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import NotFound from "@/pages/NotFound";
import SchemaDesigner from "../../../schema-designer/components/SchemaDesigner";
import { useCreateFieldGroup, useFieldGroup, useFieldGroupAction, useFieldTypes, useUpdateFieldGroup } from "../../api";
import { suggestLibraryKey } from "../../options";
import "./field_group_editor.scss";

const Editor = ({ group, canManage }) => {
  const navigate = useNavigate();
  const creating = !group;
  const fieldTypesQuery = useFieldTypes();
  const create = useCreateFieldGroup();
  const update = useUpdateFieldGroup(group?.id);
  const action = useFieldGroupAction(group?.id);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [values, setValues] = useState({ label: labelOf(group?.label) ?? "", key: group?.key ?? "", description: group?.description ?? "", fields: group?.fields ?? [] });
  const [dirty, setDirty] = useState(false);
  const [keyEdited, setKeyEdited] = useState(false);
  const mutation = creating ? create : update;
  const editable = canManage && (creating || group.status === "ACTIVE");
  useUnsavedChangesGuard(editable && dirty);
  const fieldErrors = getFieldErrors(mutation.error);
  const set = (field, value) => {
    setDirty(true);
    setValues((current) => ({ ...current, [field]: value, ...(creating && field === "label" && !keyEdited ? { key: suggestLibraryKey(value) } : {}) }));
  };
  const localErrors = validateFields(values.fields, {});

  const save = () => {
    const payload = { label: { tr: values.label.trim() }, description: values.description.trim(), fields: values.fields };
    if (creating) {
      create.mutate({ idempotencyKey, values: { ...payload, key: values.key } }, {
        onSuccess: (saved) => {
          allowNextNavigation();
          toast.success(`${labelOf(saved.label)} oluşturuldu`);
          navigate(`/alanlar/gruplar/${saved.id}`, { replace: true });
        },
      });
    } else {
      update.mutate({ values: payload, version: group.version }, {
        onSuccess: () => {
          setDirty(false);
          toast.success("Alan grubu kaydedildi");
        },
      });
    }
  };

  if (fieldTypesQuery.isPending) return <Skeleton variant="rectangle" height={400} radius="lg" />;
  if (fieldTypesQuery.isError) return <QueryErrorAlert error={fieldTypesQuery.error} onRetry={() => fieldTypesQuery.refetch()} />;

  return (
    <div className="field_group_editor">
      <PageHeader
        title={creating ? "Yeni alan grubu" : labelOf(group.label)}
        description="Grup bir bölüme eklendiğinde alanlar yeni kimliklerle kopyalanır. Grubu sonradan değiştirmek eklenmiş kopyaları etkilemez."
        breadcrumb={[{ label: "Alan grupları", path: "/alanlar" }, { label: creating ? "Yeni alan grubu" : labelOf(group.label) }]}
        actions={canManage && !creating && (
          <Button
            variant="outline"
            icon={group.status === "ACTIVE" ? FiArchive : FiRotateCcw}
            loading={action.isPending}
            onClick={() => action.mutate({ action: group.status === "ACTIVE" ? "archive" : "restore", version: group.version }, { onSuccess: (next) => toast.success(next.status === "ACTIVE" ? "Grup arşivden çıkarıldı" : "Grup arşivlendi") })}
          >
            {group.status === "ACTIVE" ? "Arşivle" : "Arşivden çıkar"}
          </Button>
        )}
      />
      {mutation.isError && Object.keys(fieldErrors).length === 0 && <Alert variant="danger" size="compact">{getErrorMessage(mutation.error)}</Alert>}
      <Card title="Grup bilgileri">
        <fieldset className="field_group_editor_meta" disabled={!editable}>
          <Input label="Ad" required maxLength={120} value={values.label} onChange={(event) => set("label", event.target.value)} error={fieldErrors.label} />
          {creating && <Input label="Anahtar" required maxLength={63} value={values.key} onChange={(event) => { setKeyEdited(true); set("key", event.target.value.toLowerCase()); }} error={fieldErrors.key} className="field_group_editor_mono" />}
          <Textarea label="Açıklama" optionalText="İsteğe bağlı" rows={2} maxLength={300} value={values.description} onChange={(event) => set("description", event.target.value)} error={fieldErrors.description} />
        </fieldset>
      </Card>
      <SchemaDesigner
        mode="fields"
        schema={values.fields}
        onChange={(fields) => set("fields", fields)}
        fieldTypes={fieldTypesQuery.data.items}
        families={fieldTypesQuery.data.families}
        readOnly={!editable}
        toolbar={editable && (
          <div className="field_group_editor_toolbar">
            <Button icon={FiSave} loading={mutation.isPending} disabled={localErrors.length > 0 || values.fields.length === 0 || (!creating && !dirty)} onClick={save}>{creating ? "Grubu oluştur" : "Kaydet"}</Button>
          </div>
        )}
      />
    </div>
  );
};

/** Hazır alan grubu oluşturma ve düzenleme (şartname §25.2). */
const FieldGroupEditor = () => {
  const { groupId } = useParams();
  const can = usePlatformCan();
  const creating = groupId === undefined;
  const groupQuery = useFieldGroup(creating ? null : groupId);
  usePageTitle(creating ? "Yeni alan grubu" : groupQuery.data ? labelOf(groupQuery.data.label) : "Alan grubu");
  if (creating) return <Editor group={null} canManage={can("platform.library.manage")} />;
  if (groupQuery.isPending) return <Skeleton variant="rectangle" height={320} radius="lg" />;
  if (isApiError(groupQuery.error, "NOT_FOUND")) return <NotFound />;
  if (groupQuery.isError) return <QueryErrorAlert error={groupQuery.error} onRetry={() => groupQuery.refetch()} />;
  return <Editor key={groupQuery.data.version} group={groupQuery.data} canManage={can("platform.library.manage")} />;
};

export default FieldGroupEditor;
