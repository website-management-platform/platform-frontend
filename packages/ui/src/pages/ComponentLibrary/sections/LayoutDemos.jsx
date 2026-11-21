import { FiMail, FiPlus, FiEdit2, FiHome, FiGrid, FiList } from "react-icons/fi";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import SegmentedControl from "@/components/SegmentedControl";
import Breadcrumb from "@/components/Breadcrumb";
import PageHeader from "@/components/PageHeader";
import FormField from "@/components/FormField";
import FieldGroup from "@/components/FieldGroup";
import RadioGroup from "@/components/RadioGroup";
import CheckboxGroup from "@/components/CheckboxGroup";
import Link from "@/components/Link";
import Kbd from "@/components/Kbd";
import Stack from "@/components/Stack";
import Inline from "@/components/Inline";
import { Section, SubLabel } from "../parts";
import {
  NOTIFICATION_OPTIONS,
  CHANNEL_OPTIONS,
  PLAN_OPTIONS,
  MODULE_OPTIONS,
  BREADCRUMB_DEMO_ITEMS,
} from "../demoData";

// Sayfa başlığı, form alanları, bağlantı, yerleşim yardımcıları ve breadcrumb örnekleri.
const LayoutDemos = () => (
  <>
    <Section title="PageHeader" description="Başlık, açıklama, otomatik breadcrumb, geri bağlantısı, rozet, aksiyonlar; varsayılan ve kompakt boyut.">
      <Card>
        <PageHeader
          title="ABC Teknoloji"
          description="Kurumsal müşteri · 24 aktif proje"
          backTo={{ to: "/musteriler", label: "Müşterilere dön" }}
          badge={<Badge variant="success" dot size="sm">Aktif</Badge>}
          actions={(
            <>
              <Button variant="outline" icon={FiEdit2}>Düzenle</Button>
              <Button icon={FiPlus}>Proje ekle</Button>
            </>
          )}
          size="compact"
          headingLevel={3}
        />
      </Card>
    </Section>

    <Section title="Form alanları" description="FormField ile özel kontrollere etiket/ipucu/hata; FieldGroup ile fieldset tabanlı düzen (dikey, yatay, ızgara).">
      <FormField label="Görünüm" hint="Liste görünümü daha fazla satır gösterir." required>
        {(fieldProps) => (
          <SegmentedControl
            {...fieldProps}
            options={[{ value: "grid", label: "Izgara", icon: FiGrid }, { value: "list", label: "Liste", icon: FiList }]}
            defaultValue="grid"
          />
        )}
      </FormField>
      <FieldGroup legend="Fatura bilgileri" description="Faturalarınızda görünecek bilgiler." layout="grid" columns={2}>
        <Input label="Firma adı" placeholder="ABC Teknoloji A.Ş." />
        <Input label="Vergi numarası" placeholder="1234567890" />
        <Input label="E-posta" icon={FiMail} placeholder="fatura@firma.com" />
        <Input label="Telefon" placeholder="0 (212) 000 00 00" />
      </FieldGroup>
    </Section>

    <Section title="RadioGroup & CheckboxGroup" description="Varsayılan liste ve seçilebilir kart (tile) varyantı; dikey, yatay, ızgara düzen; açıklama ve hata.">
      <SubLabel>Varsayılan</SubLabel>
      <div className="component_library_grid">
        <RadioGroup
          label="Bildirim sıklığı"
          options={NOTIFICATION_OPTIONS}
          defaultValue="daily"
        />
        <CheckboxGroup
          label="Bildirim kanalları"
          description="En az bir kanal seçin."
          options={CHANNEL_OPTIONS}
          defaultValue={["email"]}
        />
        <RadioGroup
          label="Hizalama"
          orientation="horizontal"
          options={[{ value: "left", label: "Sol" }, { value: "center", label: "Orta" }, { value: "right", label: "Sağ" }]}
          defaultValue="left"
          error="Bir hizalama seçin."
        />
      </div>
      <SubLabel>Kart (tile)</SubLabel>
      <RadioGroup
        label="Plan"
        variant="card"
        columns={3}
        options={PLAN_OPTIONS}
        defaultValue="pro"
      />
      <CheckboxGroup
        label="Etkin modüller"
        variant="card"
        columns={2}
        options={MODULE_OPTIONS}
        defaultValue={["reports"]}
      />
    </Section>

    <Section title="Link & Kbd" description="Router uyumlu iç bağlantı, otomatik dış bağlantı göstergesi; klavye kısayolu gösterimi.">
      <Inline gap={6}>
        <Link to="/musteriler">İç bağlantı</Link>
        <Link to="/ayarlar" variant="subtle">Sade bağlantı</Link>
        <Link to="/destek" underline="always">Her zaman altı çizili</Link>
        <Link href="https://react.dev">Dış bağlantı</Link>
        <Link href="mailto:destek@ornek.com">E-posta</Link>
      </Inline>
      <Inline>
        <Kbd keys={["⌘", "K"]} />
        <Kbd keys={["Ctrl", "Shift", "P"]} />
        <Kbd>Esc</Kbd>
        <Kbd size="sm">Enter</Kbd>
      </Inline>
    </Section>

    <Section title="Stack & Inline" description="Token tabanlı boşluklarla dikey ve yatay düzen yardımcıları.">
      <Stack gap={2}>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="40%" />
      </Stack>
      <Inline justify="between">
        <Badge>Sol</Badge>
        <Inline gap={2}>
          <Button size="sm" variant="ghost">Vazgeç</Button>
          <Button size="sm">Kaydet</Button>
        </Inline>
      </Inline>
    </Section>

    <Section title="Breadcrumb" description="Standart ve çok seviyeli (toplanmış/collapsed) kullanım.">
      <SubLabel>Standart</SubLabel>
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", path: "/", icon: FiHome },
          { label: "Müşteriler", path: "/musteriler" },
          { label: "ABC Teknoloji" },
        ]}
      />
      <SubLabel>Toplanmış (5+ öğe)</SubLabel>
      <Breadcrumb
        items={[
          { label: "Ana Sayfa", path: "/", icon: FiHome },
          { label: "Ürünler", path: "/urunler" },
          { label: "Kategoriler", path: "/urunler/kategoriler" },
          { label: "Elektronik", path: "/urunler/kategoriler/elektronik" },
          { label: "Telefonlar", path: "/urunler/kategoriler/elektronik/telefonlar" },
          { label: "iPhone 15" },
        ]}
      />
      <SubLabel>Ayırıcı ve boyut</SubLabel>
      <Breadcrumb items={BREADCRUMB_DEMO_ITEMS} separator="slash" />
      <Breadcrumb items={BREADCRUMB_DEMO_ITEMS} separator="dot" size="sm" />
    </Section>
  </>
);

export default LayoutDemos;
