import {
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiGrid,
  FiList,
  FiBold,
  FiItalic,
  FiUnderline,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
} from "react-icons/fi";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Stepper from "@/components/Stepper";
import DescriptionList from "@/components/DescriptionList";
import Pagination from "@/components/Pagination";
import ButtonGroup from "@/components/ButtonGroup";
import ToggleGroup from "@/components/ToggleGroup";
import CopyButton from "@/components/CopyButton";
import Timeline from "@/components/Timeline";
import { Section, SubLabel } from "../parts";
import { STEPPER_STEPS, ACTIVITY_ITEMS } from "../demoData";
import StatusDemos from "./StatusDemos";

// Adımlar, açıklama listesi, sayfalama, rozet, avatar, kart, ilerleme ve iskelet örnekleri.
const DisplayDemos = ({ cardSelected, paginationPage, setCardSelected, setPaginationPage, setStepperCurrent, setTags, setTextAlign, stepperCurrent, tags, textAlign }) => (
  <>
    <Section title="Stepper" description="Yatay ve dikey; tamamlanan, mevcut, sıradaki ve hatalı adım durumları; tıklanabilir adımlar.">
      <Stepper steps={STEPPER_STEPS} current={stepperCurrent} onStepClick={setStepperCurrent} ariaLabel="Kurulum adımları" />
      <div className="component_library_row">
        <Button size="sm" variant="outline" disabled={stepperCurrent === 0} onClick={() => setStepperCurrent((prev) => prev - 1)}>Geri</Button>
        <Button size="sm" disabled={stepperCurrent === STEPPER_STEPS.length - 1} onClick={() => setStepperCurrent((prev) => prev + 1)}>İleri</Button>
      </div>
      <SubLabel>Dikey, küçük boy ve hata durumu</SubLabel>
      <Stepper
        orientation="vertical"
        size="sm"
        ariaLabel="Sipariş durumu"
        current={2}
        steps={[
          { id: "o1", label: "Sipariş alındı", description: "14 Ekim, 09:12" },
          { id: "o2", label: "Ödeme onaylandı", description: "14 Ekim, 09:13" },
          { id: "o3", label: "Kargoya verilemedi", description: "Adres doğrulanamadı.", status: "error" },
          { id: "o4", label: "Teslim edildi" },
        ]}
      />
    </Section>

    <Section title="DescriptionList" description="Anahtar–değer gösterimi: yatay, alt alta ve ızgara düzen; kenarlıklı varyant.">
      <div className="component_library_grid">
        <DescriptionList
          bordered
          items={[
            { label: "Müşteri", value: "ABC Teknoloji A.Ş." },
            { label: "Durum", value: <Badge variant="success" dot>Aktif</Badge> },
            { label: "Sorumlu", value: "Ayşe Kaya" },
          ]}
        />
        <DescriptionList
          layout="stacked"
          items={[
            { label: "Oluşturulma", value: "12 Ağustos 2026" },
            { label: "Son güncelleme", value: "Bugün, 10:42" },
          ]}
        />
      </div>
      <DescriptionList
        layout="grid"
        columns={4}
        bordered
        items={[
          { label: "Plan", value: "Pro" },
          { label: "Kullanıcı", value: "24 / sınırsız" },
          { label: "Depolama", value: "18,4 GB" },
          { label: "Yenileme", value: "1 Kasım 2026" },
        ]}
      />
    </Section>

    <Section title="Pagination" description="Numaralı (üç nokta ile kısaltılmış) ve sade (sayfa X / Y) görünüm, iki boyut.">
      <Pagination page={paginationPage} pageCount={20} onChange={setPaginationPage} />
      <Pagination page={paginationPage} pageCount={20} onChange={setPaginationPage} size="sm" siblingCount={0} />
      <Pagination page={paginationPage} pageCount={20} onChange={setPaginationPage} variant="simple" />
    </Section>

    <Section title="ButtonGroup & ToggleGroup" description="Bitişik buton grubu; tekli ve çoklu seçimli toggle grupları (outline / soft).">
      <div className="component_library_row component_library_row_spaced">
        <ButtonGroup ariaLabel="Dışa aktarma">
          <Button variant="outline" icon={FiDownload}>CSV</Button>
          <Button variant="outline">Excel</Button>
          <Button variant="outline">PDF</Button>
        </ButtonGroup>
        <ButtonGroup attached={false} ariaLabel="Kayıt işlemleri">
          <Button variant="ghost" icon={FiEdit2}>Düzenle</Button>
          <Button variant="ghost" color="danger" icon={FiTrash2}>Sil</Button>
        </ButtonGroup>
      </div>
      <div className="component_library_row component_library_row_spaced">
        <ToggleGroup
          ariaLabel="Metin hizalama"
          value={textAlign}
          onChange={(nextValue) => setTextAlign(nextValue ?? textAlign)}
          items={[
            { value: "left", icon: FiAlignLeft, ariaLabel: "Sola hizala" },
            { value: "center", icon: FiAlignCenter, ariaLabel: "Ortala" },
            { value: "right", icon: FiAlignRight, ariaLabel: "Sağa hizala" },
          ]}
        />
        <ToggleGroup
          type="multiple"
          variant="soft"
          ariaLabel="Metin biçimi"
          defaultValue={["bold"]}
          items={[
            { value: "bold", icon: FiBold, ariaLabel: "Kalın" },
            { value: "italic", icon: FiItalic, ariaLabel: "İtalik" },
            { value: "underline", icon: FiUnderline, ariaLabel: "Altı çizili" },
          ]}
        />
        <ToggleGroup
          size="sm"
          ariaLabel="Görünüm"
          defaultValue="grid"
          items={[
            { value: "grid", label: "Izgara", icon: FiGrid },
            { value: "list", label: "Liste", icon: FiList },
          ]}
        />
      </div>
    </Section>

    <Section title="CopyButton" description="Panoya kopyalama; kopyalandı geri bildirimi ve ekran okuyucu duyurusu.">
      <div className="component_library_row component_library_row_spaced">
        <CopyButton value="wmp_ornek_anahtar_0000" label="API anahtarını kopyala" />
        <CopyButton value="https://panel.ornek.com/davet/8F3K2" iconOnly label="Davet bağlantısını kopyala" />
        <CopyButton value="PRJ-2024-0042" variant="soft" color="accent" label="Proje kodunu kopyala" />
      </div>
    </Section>

    <Section title="Timeline" description="Aktivite akışı; ikonlu ve noktalı işaretler, 5 ton, kompakt görünüm.">
      <div className="component_library_grid">
        <Timeline items={ACTIVITY_ITEMS} />
        <Timeline items={ACTIVITY_ITEMS} variant="compact" />
      </div>
    </Section>

      <StatusDemos cardSelected={cardSelected} setCardSelected={setCardSelected} setTags={setTags} tags={tags} />
  </>
);

export default DisplayDemos;
