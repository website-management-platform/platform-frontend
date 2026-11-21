import { useRef, useState } from "react";
import { FiSearch, FiPlus, FiDownload, FiInbox, FiCheckCircle, FiFolder } from "react-icons/fi";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Avatar from "@/components/Avatar";
import AvatarGroup from "@/components/AvatarGroup";
import Select from "@/components/Select";
import Modal from "@/components/Modal";
import Drawer from "@/components/Drawer";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Tabs, { TabPanel } from "@/components/Tabs";
import EmptyState from "@/components/EmptyState";
import Textarea from "@/components/Textarea";
import AlertDialog from "@/components/AlertDialog";
import { toast } from "@/components/Toast/toast";
import PageHeader from "@/components/PageHeader";
import FieldGroup from "@/components/FieldGroup";
import RadioGroup from "@/components/RadioGroup";
import CheckboxGroup from "@/components/CheckboxGroup";
import Stack from "@/components/Stack";
import { useConfirm } from "@/hooks/useConfirm";
import { Section, SubLabel } from "./parts";
import {
  ALERT_DIALOG_CONFIG,
  PLAN_OPTIONS,
  MODULE_OPTIONS,
  TEAM_MEMBERS,
  FORM_MODAL_TABS,
  SELECT_OPTIONS,
} from "./demoData";
import LayoutDemos from "./sections/LayoutDemos";
import ControlDemos from "./sections/ControlDemos";
import OverlayDemos from "./sections/OverlayDemos";
import DisplayDemos from "./sections/DisplayDemos";
import FeedbackDemos from "./sections/FeedbackDemos";
import PanelDemos from "./sections/PanelDemos";
import "./component_library.scss";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const ComponentLibrary = () => {
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("option2");
  const [switchChecked, setSwitchChecked] = useState(true);
  const [singleValue, setSingleValue] = useState(SELECT_OPTIONS[0]);
  const [multiValue, setMultiValue] = useState([SELECT_OPTIONS[1], SELECT_OPTIONS[2]]);
  const [activeTab, setActiveTab] = useState("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState("md");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerConfig, setDrawerConfig] = useState({ placement: "right", size: "md", variant: "flush" });
  const [drawerVariant, setDrawerVariant] = useState("flush");
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [segmentedValue, setSegmentedValue] = useState("grid");
  const [dismissibleAlertVisible, setDismissibleAlertVisible] = useState(true);
  const [alertDialogVariant, setAlertDialogVariant] = useState("destructive");
  const [modalCentered, setModalCentered] = useState(true);
  const [alertDialogLayout, setAlertDialogLayout] = useState("centered");
  const [alertDialogIconAppearance, setAlertDialogIconAppearance] = useState("soft");
  const [alertDialogActionsLayout, setAlertDialogActionsLayout] = useState("inline");
  const [alertDialogLoading, setAlertDialogLoading] = useState(false);
  const [modalLong, setModalLong] = useState(false);
  const [toastAppearance, setToastAppearance] = useState("default");
  const [stepperCurrent, setStepperCurrent] = useState(1);
  const [paginationPage, setPaginationPage] = useState(6);
  const [textAlign, setTextAlign] = useState("left");
  const confirm = useConfirm();

  const handleHookConfirm = async () => {
    const confirmed = await confirm({
      variant: "destructive",
      title: "3 kayıt silinsin mi?",
      description: "Seçili kayıtlar kalıcı olarak silinir.",
      confirmLabel: "Sil",
      onConfirm: () => wait(1000),
    });
    if (confirmed) toast.success("3 kayıt silindi");
    else toast.neutral("İşlem iptal edildi");
  };
  const [toastIconStyle, setToastIconStyle] = useState("plain");
  const [toastSize, setToastSize] = useState("md");
  const [toastPosition, setToastPosition] = useState("top-right");
  const [toastShowProgress, setToastShowProgress] = useState(true);

  const toastOptions = {
    appearance: toastAppearance,
    iconStyle: toastIconStyle,
    size: toastSize,
    position: toastPosition,
    showProgress: toastShowProgress,
  };

  const showUndoToast = () => {
    const undoToastId = toast.neutral("Proje arşivlendi", {
      ...toastOptions,
      description: "Mobil uygulama projesi arşive taşındı.",
      duration: 8000,
      action: (
        <Button
          size="sm"
          variant="soft"
          color="accent"
          onClick={() => {
            toast.dismiss(undoToastId);
            toast.success("Arşivleme geri alındı", toastOptions);
          }}
        >
          Geri al
        </Button>
      ),
    });
  };
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [formTab, setFormTab] = useState("general");
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const discardResolverRef = useRef(null);

  const confirmDiscard = () => new Promise((resolve) => {
    discardResolverRef.current = resolve;
    setDiscardPromptOpen(true);
  });

  const resolveDiscard = (shouldDiscard) => {
    setDiscardPromptOpen(false);
    discardResolverRef.current?.(shouldDiscard);
    discardResolverRef.current = null;
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setFormDirty(false);
    setFormTab("general");
  };

  const handleFormCancel = async () => {
    if (formDirty && !(await confirmDiscard())) return;
    closeFormModal();
  };
  const [variantTab, setVariantTab] = useState("overview");
  const [cardSelected, setCardSelected] = useState(false);
  const [tags, setTags] = useState(["Pazarlama", "Satış", "Destek"]);
  const [autoAlertKey, setAutoAlertKey] = useState(0);

  return (
    <div className="component_library">
      <PageHeader
        title="Bileşen Kütüphanesi"
        description="Panel iskeletinde kullanılan tüm UI bileşenlerinin olabildiğince geniş varyasyon örnekleri."
        breadcrumb
        badge={<Badge variant="accent" size="sm">v1</Badge>}
        actions={<Button variant="outline" icon={FiDownload}>Dışa aktar</Button>}
        divider
      />

      <LayoutDemos />

      <ControlDemos checkboxChecked={checkboxChecked} multiValue={multiValue} radioValue={radioValue} setCheckboxChecked={setCheckboxChecked} setMultiValue={setMultiValue} setRadioValue={setRadioValue} setSingleValue={setSingleValue} setSwitchChecked={setSwitchChecked} singleValue={singleValue} switchChecked={switchChecked} />

      <OverlayDemos />

      <DisplayDemos cardSelected={cardSelected} paginationPage={paginationPage} setCardSelected={setCardSelected} setPaginationPage={setPaginationPage} setStepperCurrent={setStepperCurrent} setTags={setTags} setTextAlign={setTextAlign} stepperCurrent={stepperCurrent} tags={tags} textAlign={textAlign} />

      <FeedbackDemos autoAlertKey={autoAlertKey} dismissibleAlertVisible={dismissibleAlertVisible} segmentedValue={segmentedValue} setAutoAlertKey={setAutoAlertKey} setDismissibleAlertVisible={setDismissibleAlertVisible} setSegmentedValue={setSegmentedValue} setToastAppearance={setToastAppearance} setToastIconStyle={setToastIconStyle} setToastPosition={setToastPosition} setToastShowProgress={setToastShowProgress} setToastSize={setToastSize} showUndoToast={showUndoToast} toastAppearance={toastAppearance} toastIconStyle={toastIconStyle} toastOptions={toastOptions} toastPosition={toastPosition} toastShowProgress={toastShowProgress} toastSize={toastSize} />

      <PanelDemos activeTab={activeTab} alertDialogActionsLayout={alertDialogActionsLayout} alertDialogIconAppearance={alertDialogIconAppearance} alertDialogLayout={alertDialogLayout} drawerVariant={drawerVariant} handleHookConfirm={handleHookConfirm} setActiveTab={setActiveTab} setAlertDialogActionsLayout={setAlertDialogActionsLayout} setAlertDialogIconAppearance={setAlertDialogIconAppearance} setAlertDialogLayout={setAlertDialogLayout} setAlertDialogOpen={setAlertDialogOpen} setAlertDialogVariant={setAlertDialogVariant} setDrawerConfig={setDrawerConfig} setDrawerOpen={setDrawerOpen} setDrawerVariant={setDrawerVariant} setFormModalOpen={setFormModalOpen} setModalCentered={setModalCentered} setModalLong={setModalLong} setModalOpen={setModalOpen} setModalSize={setModalSize} setVariantTab={setVariantTab} variantTab={variantTab} />

      <Section title="Empty State" description="Boş veri durumları için standart gösterim.">
        <Card padding={false}>
          <EmptyState
            icon={FiInbox}
            title="Henüz kayıt yok"
            description="Bu listeye ait herhangi bir veri bulunamadı."
            action={<Button icon={FiPlus}>Yeni Kayıt Ekle</Button>}
          />
        </Card>
        <SubLabel>Görünüm, ton ve boyut</SubLabel>
        <div className="component_library_grid">
          <EmptyState
            variant="bordered"
            size="sm"
            icon={FiFolder}
            title="Klasör boş"
            description="Dosyaları buraya sürükleyip bırakın."
            action={<Button size="sm" icon={FiPlus}>Dosya yükle</Button>}
          />
          <EmptyState
            variant="card"
            size="sm"
            tone="success"
            icon={FiCheckCircle}
            title="Her şey yolunda"
            description="Bekleyen görev bulunmuyor."
          />
          <EmptyState
            variant="card"
            size="sm"
            tone="accent"
            icon={FiSearch}
            title="Sonuç bulunamadı"
            description="Farklı bir arama terimi deneyin."
            action={<Button size="sm">Yeni arama</Button>}
            secondaryAction={<Button size="sm" variant="ghost">Filtreleri temizle</Button>}
          />
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size={modalSize}
        centered={modalCentered}
        title={`Örnek Modal (${modalSize})`}
        description="Başlık altında kısa bir açıklama satırı."
        icon={FiInbox}
        footerStart={modalLong ? "Kaydırınca başlık ayracı belirir" : undefined}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Vazgeç</Button>
            <Button icon={FiCheckCircle} onClick={() => setModalOpen(false)}>Onayla</Button>
          </>
        )}
      >
        {modalLong ? (
          Array.from({ length: 14 }, (_, index) => (
            <p key={index} className="component_library_modal_paragraph">
              {index + 1}. paragraf: Uzun içerikte gövde kendi içinde kayar; başlık ve alt bölüm sabit kalır.
            </p>
          ))
        ) : (
          <p>Bu, Modal bileşeninin "{modalSize}" boyutundaki görünümüdür.</p>
        )}
      </Modal>

      <Modal
        open={formModalOpen}
        onClose={closeFormModal}
        beforeClose={() => (formDirty ? confirmDiscard() : true)}
        size="lg"
        title="Yeni proje"
        description="Proje bilgilerini girin. Kaydetmeden kapatırsanız onay istenir."
        icon={FiFolder}
        headerActions={<Badge variant={formDirty ? "warning" : "neutral"} dot>{formDirty ? "Kaydedilmedi" : "Taslak"}</Badge>}
        subheader={(
          <Tabs
            tabs={FORM_MODAL_TABS}
            activeTab={formTab}
            onChange={setFormTab}
            idPrefix="project-form"
            ariaLabel="Proje formu bölümleri"
          />
        )}
        footerStart={formDirty ? "Kaydedilmemiş değişiklikler var" : "Henüz değişiklik yok"}
        footer={(
          <>
            <Button variant="ghost" onClick={handleFormCancel}>Vazgeç</Button>
            <Button
              icon={FiCheckCircle}
              onClick={() => {
                closeFormModal();
                toast.success("Proje oluşturuldu");
              }}
            >
              Oluştur
            </Button>
          </>
        )}
      >
        <TabPanel id="general" activeTab={formTab} idPrefix="project-form" keepMounted>
          <Stack gap={5}>
            <FieldGroup legend="Temel bilgiler" layout="grid" columns={2}>
              <Input label="Proje adı" required placeholder="Örn. Mobil uygulama" onChange={() => setFormDirty(true)} />
              <Input label="Proje kodu" placeholder="PRJ-001" onChange={() => setFormDirty(true)} />
              <Select label="Müşteri" options={SELECT_OPTIONS} placeholder="Müşteri seçin" onChange={() => setFormDirty(true)} />
              <Input label="Bütçe" addonAfter="₺" placeholder="0,00" onChange={() => setFormDirty(true)} />
            </FieldGroup>
            <Textarea label="Açıklama" optionalText="İsteğe bağlı" rows={3} onChange={() => setFormDirty(true)} />
          </Stack>
        </TabPanel>
        <TabPanel id="team" activeTab={formTab} idPrefix="project-form" keepMounted>
          <Stack gap={5}>
            <AvatarGroup max={5} label="Mevcut ekip">
              {TEAM_MEMBERS.map((name) => <Avatar key={name} name={name} />)}
            </AvatarGroup>
            <CheckboxGroup
              label="Ekibe eklenecek roller"
              columns={2}
              variant="card"
              options={MODULE_OPTIONS}
              onChange={() => setFormDirty(true)}
            />
          </Stack>
        </TabPanel>
        <TabPanel id="settings" activeTab={formTab} idPrefix="project-form" keepMounted>
          <RadioGroup
            label="Plan"
            variant="card"
            columns={3}
            options={PLAN_OPTIONS}
            defaultValue="pro"
            onChange={() => setFormDirty(true)}
          />
        </TabPanel>
      </Modal>

      <AlertDialog
        open={discardPromptOpen}
        onClose={() => resolveDiscard(false)}
        onConfirm={() => resolveDiscard(true)}
        variant="warning"
        layout="side"
        title="Değişiklikler kaydedilmedi"
        description="Kapatırsanız yaptığınız değişiklikler kaybolur."
        confirmLabel="Değişiklikleri at"
        cancelLabel="Düzenlemeye dön"
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement={drawerConfig.placement}
        size={drawerConfig.size}
        variant={drawerConfig.variant}
        title={`Örnek Drawer (${drawerConfig.placement} / ${drawerConfig.size})`}
        description="Detay panelleri için ikonlu başlık ve açıklama."
        icon={FiInbox}
        headerActions={<Badge variant="success" dot>Aktif</Badge>}
        footerStart="Son güncelleme: bugün"
        footer={<Button fullWidth onClick={() => setDrawerOpen(false)}>Kapat</Button>}
      >
        <p>Bu, Drawer component'inin yan panel görünümünü gösteren örnek içeriktir.</p>
      </Drawer>

      <AlertDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        onConfirm={() => {
          setAlertDialogLoading(true);
          setTimeout(() => {
            setAlertDialogLoading(false);
            setAlertDialogOpen(false);
            toast.success("İşlem tamamlandı");
          }, 1200);
        }}
        variant={alertDialogVariant}
        layout={alertDialogLayout}
        iconAppearance={alertDialogIconAppearance}
        actionsLayout={alertDialogActionsLayout}
        loading={alertDialogLoading}
        {...ALERT_DIALOG_CONFIG[alertDialogVariant]}
      />
    </div>
  );
};

export default ComponentLibrary;
