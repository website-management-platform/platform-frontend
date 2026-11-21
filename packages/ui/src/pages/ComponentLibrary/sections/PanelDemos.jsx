import { FiSettings, FiEdit2, FiTrash2 } from "react-icons/fi";
import Button from "@/components/Button";
import Tabs, { TabPanel } from "@/components/Tabs";
import { Accordion, AccordionItem } from "@/components/Accordion";
import SegmentedControl from "@/components/SegmentedControl";
import { Section, SubLabel } from "../parts";
import {
  ALERT_DIALOG_LAYOUTS,
  ALERT_DIALOG_ICON_APPEARANCES,
  ALERT_DIALOG_ACTION_LAYOUTS,
  SIZES,
  RICH_TAB_ITEMS,
  TAB_ITEMS,
} from "../demoData";

// Sekmeler, akordeon, modal, uyarı penceresi ve çekmece örnekleri.
const PanelDemos = ({ activeTab, alertDialogActionsLayout, alertDialogIconAppearance, alertDialogLayout, drawerVariant, handleHookConfirm, setActiveTab, setAlertDialogActionsLayout, setAlertDialogIconAppearance, setAlertDialogLayout, setAlertDialogOpen, setAlertDialogVariant, setDrawerConfig, setDrawerOpen, setDrawerVariant, setFormModalOpen, setModalCentered, setModalLong, setModalOpen, setModalSize, setVariantTab, variantTab }) => (
  <>
    <Section title="Tabs" description="Rozet destekli sekme navigasyonu.">
      <Tabs tabs={TAB_ITEMS} activeTab={activeTab} onChange={setActiveTab} idPrefix="demo-tab" ariaLabel="Örnek sekmeler" />
      <div className="component_library_tabpanel">
        <TabPanel id="overview" activeTab={activeTab} idPrefix="demo-tab">Genel bakış içeriği.</TabPanel>
        <TabPanel id="activity" activeTab={activeTab} idPrefix="demo-tab">4 yeni aktivite var.</TabPanel>
        <TabPanel id="settings" activeTab={activeTab} idPrefix="demo-tab">Ayarlar içeriği.</TabPanel>
      </div>
      <SubLabel>Görünümler: enclosed, pill, soft</SubLabel>
      {["enclosed", "pill", "soft"].map((variant) => (
        <div className="component_library_column" key={variant}>
          <Tabs
            tabs={RICH_TAB_ITEMS}
            activeTab={variantTab}
            onChange={setVariantTab}
            variant={variant}
            idPrefix={`demo-${variant}`}
            ariaLabel={`${variant} sekmeler`}
          />
          <TabPanel id={variantTab} activeTab={variantTab} idPrefix={`demo-${variant}`} className="component_library_tabpanel">
            Seçili sekme: {variantTab}
          </TabPanel>
        </div>
      ))}
      <SubLabel>Küçük boy, tam genişlik</SubLabel>
      <Tabs
        tabs={TAB_ITEMS}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="soft"
        size="sm"
        fullWidth
        idPrefix="demo-full"
        ariaLabel="Tam genişlik sekmeler"
      />
      <SubLabel>Dikey</SubLabel>
      <div className="component_library_vertical_tabs">
        <Tabs
          tabs={RICH_TAB_ITEMS}
          activeTab={variantTab}
          onChange={setVariantTab}
          orientation="vertical"
          idPrefix="demo-vertical"
          ariaLabel="Dikey sekmeler"
        />
        <TabPanel id={variantTab} activeTab={variantTab} idPrefix="demo-vertical" className="component_library_tabpanel">
          Seçili sekme: {variantTab}
        </TabPanel>
      </div>
    </Section>

    <Section title="Accordion" description="Tek/çoklu açılım, ikonlu başlık, devre dışı öğe.">
      <Accordion type="single">
        <AccordionItem value="item1" title="Fatura bilgilerimi nasıl güncellerim?">
          Ayarlar → Faturalama sayfasından kart bilgilerinizi güncelleyebilirsiniz.
        </AccordionItem>
        <AccordionItem value="item2" title="Planımı nasıl yükseltirim?" icon={FiSettings}>
          Sidebar altındaki "Planı Yükselt" butonuna tıklayarak yükseltme yapabilirsiniz.
        </AccordionItem>
        <AccordionItem value="item3" title="Devre dışı öğe" disabled>
          Bu içerik görünmez.
        </AccordionItem>
      </Accordion>
      <SubLabel>Ayrık (separated) ve sade (ghost)</SubLabel>
      <div className="component_library_grid">
        <Accordion variant="separated" defaultValue="s1">
          <AccordionItem value="s1" title="Bildirimler" badge={3}>3 okunmamış bildiriminiz var.</AccordionItem>
          <AccordionItem value="s2" title="Güvenlik" icon={FiSettings}>İki adımlı doğrulama açık.</AccordionItem>
        </Accordion>
        <Accordion variant="ghost">
          <AccordionItem value="g1" title="Teslimat süresi nedir?">Siparişler 2–4 iş günü içinde kargoya verilir.</AccordionItem>
          <AccordionItem value="g2" title="İade koşulları">Teslimattan itibaren 14 gün içinde iade edebilirsiniz.</AccordionItem>
        </Accordion>
      </div>
    </Section>

    <Section title="Modal" description="5 boyut, ikonlu başlık ve açıklama, kaydırmaya duyarlı ayraç, tonlu alt bölüm, kapatma koruması (beforeClose), mobilde alttan açılan sheet.">
      <div className="component_library_row">
        {["sm", "md", "lg", "xl", "full"].map((size) => (
          <Button
            key={size}
            variant="outline"
            onClick={() => { setModalSize(size); setModalCentered(true); setModalLong(false); setModalOpen(true); }}
          >
            Modal Aç ({size})
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => { setModalSize("md"); setModalCentered(false); setModalLong(false); setModalOpen(true); }}
        >
          Üstten hizalı
        </Button>
        <Button
          variant="outline"
          onClick={() => { setModalSize("md"); setModalCentered(true); setModalLong(true); setModalOpen(true); }}
        >
          Uzun içerik
        </Button>
        <Button variant="outline" icon={FiEdit2} onClick={() => setFormModalOpen(true)}>
          Form (değişiklik koruması)
        </Button>
      </div>
    </Section>

    <Section title="AlertDialog" description="5 ton × 3 yerleşim (ortalı / yan ikon / üst bant) × 3 ikon görünümü × 2 buton düzeni; yazarak onaylama ve yükleniyor durumu.">
      <div className="component_library_row component_library_row_spaced">
        <SegmentedControl
          options={ALERT_DIALOG_LAYOUTS}
          value={alertDialogLayout}
          onChange={setAlertDialogLayout}
          size="sm"
          ariaLabel="Yerleşim"
        />
        <SegmentedControl
          options={ALERT_DIALOG_ICON_APPEARANCES}
          value={alertDialogIconAppearance}
          onChange={setAlertDialogIconAppearance}
          size="sm"
          ariaLabel="İkon görünümü"
        />
        <SegmentedControl
          options={ALERT_DIALOG_ACTION_LAYOUTS}
          value={alertDialogActionsLayout}
          onChange={setAlertDialogActionsLayout}
          size="sm"
          ariaLabel="Buton düzeni"
        />
      </div>
      <div className="component_library_row">
        <Button color="danger" onClick={() => { setAlertDialogVariant("destructive"); setAlertDialogOpen(true); }}>
          Hesabı Sil (destructive)
        </Button>
        <Button variant="outline" onClick={() => { setAlertDialogVariant("warning"); setAlertDialogOpen(true); }}>
          Oturumu Kapat (warning)
        </Button>
        <Button variant="outline" onClick={() => { setAlertDialogVariant("success"); setAlertDialogOpen(true); }}>
          Planı Onayla (success)
        </Button>
        <Button variant="soft" color="danger" icon={FiTrash2} onClick={handleHookConfirm}>
          useConfirm() ile sil
        </Button>
        <Button variant="outline" onClick={() => { setAlertDialogVariant("info"); setAlertDialogOpen(true); }}>
          Güncelleme (info)
        </Button>
        <Button variant="outline" onClick={() => { setAlertDialogVariant("default"); setAlertDialogOpen(true); }}>
          Devam Et (default)
        </Button>
      </div>
    </Section>

    <Section title="Drawer" description="4 yön (sol / sağ / üst / alt) × 3 boyut (sm / md / lg) × 2 stil (bitişik / yüzen).">
      <SubLabel>Stil</SubLabel>
      <div className="component_library_row">
        <Button
          variant={drawerVariant === "flush" ? "soft" : "ghost"}
          color="neutral"
          size="sm"
          onClick={() => setDrawerVariant("flush")}
        >
          Bitişik
        </Button>
        <Button
          variant={drawerVariant === "floating" ? "soft" : "ghost"}
          color="neutral"
          size="sm"
          onClick={() => setDrawerVariant("floating")}
        >
          Yüzen
        </Button>
      </div>
      <SubLabel>Yön × Boyut</SubLabel>
      <div className="component_library_matrix">
        {[["left", "sol"], ["right", "sağ"], ["top", "üst"], ["bottom", "alt"]].map(([placement, placementLabel]) => (
          <div className="component_library_matrix_row" key={placement}>
            <span className="component_library_matrix_row_label">{placementLabel}</span>
            {SIZES.map((size) => (
              <Button
                key={size}
                variant="outline"
                size="sm"
                onClick={() => { setDrawerConfig({ placement, size, variant: drawerVariant }); setDrawerOpen(true); }}
              >
                {size}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </Section>
  </>
);

export default PanelDemos;
