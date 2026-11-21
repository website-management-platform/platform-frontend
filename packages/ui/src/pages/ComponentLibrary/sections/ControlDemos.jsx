import { FiMail, FiSearch, FiPlus, FiDownload, FiSettings, FiFilter } from "react-icons/fi";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Checkbox from "@/components/Checkbox";
import Radio from "@/components/Radio";
import Switch from "@/components/Switch";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import Link from "@/components/Link";
import { Section, SubLabel } from "../parts";
import {
  SIZES,
  BUTTON_COLORS,
  BUTTON_APPEARANCES,
  SWITCH_COLORS,
  RICH_SELECT_OPTIONS,
  GROUPED_SELECT_OPTIONS,
  SELECT_OPTIONS,
} from "../demoData";

// Düğme, metin alanı, onay kutusu, radyo, anahtar ve seçim kutusu örnekleri.
const ControlDemos = ({ checkboxChecked, multiValue, radioValue, setCheckboxChecked, setMultiValue, setRadioValue, setSingleValue, setSwitchChecked, singleValue, switchChecked }) => (
  <>
    <Section title="Button" description="5 variant × 6 renk, 3 boyut, ikon konumları, loading/disabled/full-width/icon-only.">
      <SubLabel>Variant × Boyut matrisi</SubLabel>
      <div className="component_library_matrix">
        {BUTTON_APPEARANCES.map((variant) => (
          <div className="component_library_matrix_row" key={variant}>
            <span className="component_library_matrix_row_label">{variant}</span>
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>{size}</Button>
            ))}
          </div>
        ))}
      </div>
      <SubLabel>İkon ve durum varyasyonları</SubLabel>
      <div className="component_library_row">
        <Button icon={FiPlus}>Yeni Ekle</Button>
        <Button icon={FiDownload} iconPosition="right">İndir</Button>
        <Button icon={FiSettings} ariaLabel="Ayarlar" size="sm" />
        <Button icon={FiSettings} ariaLabel="Ayarlar" size="md" />
        <Button icon={FiSettings} ariaLabel="Ayarlar" size="lg" />
        <Button loading>Yükleniyor</Button>
        <Button loading variant="outline">Yükleniyor</Button>
        <Button disabled>Devre dışı</Button>
        <Button disabled variant="outline">Devre dışı</Button>
      </div>
      <div className="component_library_row">
        <Button fullWidth variant="outline">Tam genişlik (outline)</Button>
      </div>
      <SubLabel>Renk × görünüm (solid / soft / outline / ghost / link)</SubLabel>
      <div className="component_library_matrix">
        {BUTTON_COLORS.map((color) => (
          <div className="component_library_matrix_row" key={color}>
            <span className="component_library_matrix_row_label">{color}</span>
            {BUTTON_APPEARANCES.map((appearance) => (
              <Button key={appearance} variant={appearance} color={color} size="sm">{appearance}</Button>
            ))}
          </div>
        ))}
      </div>
      <SubLabel>Köşe yuvarlaklığı</SubLabel>
      <div className="component_library_row">
        {["sm", "md", "lg", "pill"].map((radius) => (
          <Button key={radius} radius={radius} variant="soft" color="accent">{radius}</Button>
        ))}
      </div>
    </Section>

    <Section title="Input" description="3 boyut × 3 ikon konumu, hint, hata, zorunlu ve disabled durumları.">
      <SubLabel>Boyut × ikon konumu matrisi</SubLabel>
      <div className="component_library_grid">
        {SIZES.map((size) => (
          <Input key={`${size}-none`} label={`${size} / ikonsuz`} size={size} placeholder="Metin girin" />
        ))}
        {SIZES.map((size) => (
          <Input
            key={`${size}-left`}
            label={`${size} / sol ikon`}
            size={size}
            icon={FiSearch}
            iconPosition="left"
            placeholder="Ara..."
          />
        ))}
        {SIZES.map((size) => (
          <Input
            key={`${size}-right`}
            label={`${size} / sağ ikon`}
            size={size}
            icon={FiMail}
            iconPosition="right"
            placeholder="ornek@sirket.com"
          />
        ))}
      </div>
      <SubLabel>Durum varyasyonları</SubLabel>
      <div className="component_library_grid">
        <Input label="Zorunlu alan" required placeholder="Bu alan zorunlu" />
        <Input label="İpucu ile" hint="En az 8 karakter olmalı" placeholder="Şifre" type="password" />
        <Input label="Başarılı" success="Kullanıcı adı uygun" placeholder="Başarılı giriş" />
        <Input label="Hatalı" error="Bu alan boş bırakılamaz" placeholder="Hatalı giriş" />
        <Input label="Hatalı + ikon" icon={FiMail} error="Geçerli bir e-posta girin" placeholder="E-posta" />
        <Input label="Devre dışı" disabled placeholder="Düzenlenemez" />
        <Input label="Devre dışı + ikon" disabled icon={FiFilter} placeholder="Filtre" />
      </div>
      <SubLabel>Görünüm ve gelişmiş özellikler</SubLabel>
      <div className="component_library_grid">
        <Input label="Dolgulu (filled)" variant="filled" icon={FiSearch} placeholder="Arama terimi" />
        <Input label="Yuvarlak" radius="full" icon={FiSearch} placeholder="Hızlı ara" />
        <Input label="Temizlenebilir" clearable defaultValue="Silinecek metin" />
        <Input
          label="Şifre"
          type="password"
          defaultValue="gizli-sifre"
          labelAction={<Link to="/destek">Şifremi unuttum</Link>}
        />
        <Input label="Yükleniyor" loading placeholder="Kullanıcı adı kontrol ediliyor" />
        <Input label="Karakter sayacı" showCount maxLength={40} defaultValue="Kısa açıklama" />
        <Input label="Önek ve sonek" addonBefore="https://" addonAfter=".com.tr" placeholder="alan-adi" />
        <Input label="Fiyat" addonAfter="₺" placeholder="0,00" />
        <Input label="Telefon" optionalText="İsteğe bağlı" placeholder="0 (5xx) xxx xx xx" />
        <Input label="Salt okunur" readOnly defaultValue="KRM-2024-0042" />
      </div>
    </Section>

    <Section title="Textarea" description="Auto-resize, karakter sayacı, durum varyasyonları.">
      <div className="component_library_grid">
        <Textarea label="Standart" placeholder="Mesajınızı yazın" />
        <Textarea label="Auto-resize" autoResize placeholder="Yazdıkça büyür" />
        <Textarea label="Karakter sayaçlı" maxLength={120} defaultValue="Karakter sınırı olan alan" />
        <Textarea label="Hatalı" error="Bu alan boş bırakılamaz" placeholder="Hatalı giriş" />
        <Textarea label="Başarılı" success="Uygun" placeholder="Başarılı giriş" />
        <Textarea label="Devre dışı" disabled defaultValue="Düzenlenemez" />
      </div>
      <SubLabel>Görünüm seçenekleri</SubLabel>
      <div className="component_library_grid">
        <Textarea label="Dolgulu" variant="filled" placeholder="Notunuzu yazın" />
        <Textarea label="Boyutlandırılamaz" resize="none" placeholder="Sabit yükseklik" />
        <Textarea label="Salt okunur" readOnly defaultValue="Bu metin değiştirilemez." />
      </div>
    </Section>

    <Section title="Checkbox" description="3 boyut × seçili/seçili değil/belirsiz/devre dışı durumları.">
      <div className="component_library_matrix">
        {SIZES.map((size) => (
          <div className="component_library_matrix_row" key={size}>
            <span className="component_library_matrix_row_label">{size}</span>
            <Checkbox
              size={size}
              label="Seçili değil"
              checked={false}
              onChange={() => {}}
            />
            <Checkbox
              size={size}
              label="Seçili"
              checked={checkboxChecked}
              onChange={() => setCheckboxChecked((prev) => !prev)}
            />
            <Checkbox size={size} label="Belirsiz" indeterminate onChange={() => {}} />
            <Checkbox size={size} label="Devre dışı" disabled />
          </div>
        ))}
      </div>
      <SubLabel>Açıklama, hata ve kontrolsüz kullanım</SubLabel>
      <div className="component_library_row component_library_row_spaced">
        <Checkbox
          label="Haftalık özet e-postası"
          description="Her pazartesi bir önceki haftanın raporu gönderilir."
          defaultChecked
        />
        <Checkbox label="Kullanım koşullarını kabul ediyorum" error="Devam etmek için koşulları kabul edin." />
      </div>
    </Section>

    <Section title="Radio" description="3 boyut × grup seçimi × devre dışı durumu.">
      <div className="component_library_matrix">
        {SIZES.map((size) => (
          <div className="component_library_matrix_row" key={size}>
            <span className="component_library_matrix_row_label">{size}</span>
            <Radio
              name={`radio-demo-${size}`}
              size={size}
              label="Seçenek 1"
              checked={radioValue === "option1"}
              onChange={() => setRadioValue("option1")}
            />
            <Radio
              name={`radio-demo-${size}`}
              size={size}
              label="Seçenek 2"
              checked={radioValue === "option2"}
              onChange={() => setRadioValue("option2")}
            />
            <Radio name={`radio-demo-${size}`} size={size} label="Devre dışı" disabled />
          </div>
        ))}
      </div>
    </Section>

    <Section title="Switch" description="3 boyut × açık/kapalı/devre dışı durumları.">
      <div className="component_library_matrix">
        {SIZES.map((size) => (
          <div className="component_library_matrix_row" key={size}>
            <span className="component_library_matrix_row_label">{size}</span>
            <Switch size={size} label="Kapalı" checked={false} onChange={() => {}} />
            <Switch
              size={size}
              label="Açık"
              checked={switchChecked}
              onChange={() => setSwitchChecked((prev) => !prev)}
            />
            <Switch size={size} label="Devre dışı" disabled />
          </div>
        ))}
      </div>
      <SubLabel>Açıklama ve kontrolsüz kullanım</SubLabel>
      <Switch label="İki adımlı doğrulama" description="Girişte telefonunuza ek bir kod gönderilir." defaultChecked />
      <SubLabel>Renk ve yükleniyor durumu</SubLabel>
      <div className="component_library_row component_library_row_spaced">
        {SWITCH_COLORS.map((color) => (
          <Switch key={color} color={color} label={color} defaultChecked />
        ))}
        <Switch label="Kaydediliyor" loading defaultChecked />
      </div>
    </Section>

    <Section title="Select" description="react-select tabanlı: tekli, çoklu, aranabilir, yükleniyor, hata, devre dışı.">
      <div className="component_library_grid">
        <Select label="Zorunlu alan" required options={SELECT_OPTIONS} placeholder="Bir seçenek seçin" />
        <Select label="Tekli seçim" options={SELECT_OPTIONS} value={singleValue} onChange={setSingleValue} />
        <Select
          label="Çoklu seçim"
          isMulti
          options={SELECT_OPTIONS}
          value={multiValue}
          onChange={setMultiValue}
        />
        <Select
          label="Aranabilir + temizlenebilir"
          isClearable
          options={SELECT_OPTIONS}
          placeholder="Kayıt türü seçin..."
        />
        <Select
          label="Arama kapalı"
          isSearchable={false}
          options={SELECT_OPTIONS}
          placeholder="Sadece listeden seçin"
        />
        <Select label="Yükleniyor" isLoading options={[]} placeholder="Veriler getiriliyor..." />
        <Select label="Hatalı" options={SELECT_OPTIONS} error="Bir seçim yapmalısınız" />
        <Select label="Devre dışı" options={SELECT_OPTIONS} isDisabled />
        <Select label="Boş seçenek" options={[]} placeholder="Sonuç bulunamadı" />
      </div>
      <SubLabel>Görünüm, zengin seçenekler ve gruplar</SubLabel>
      <div className="component_library_grid">
        <Select label="Dolgulu" variant="filled" options={SELECT_OPTIONS} placeholder="Bir seçenek seçin" />
        <Select label="Yuvarlak" radius="full" options={SELECT_OPTIONS} placeholder="Bir seçenek seçin" />
        <Select label="İkon ve açıklama" options={RICH_SELECT_OPTIONS} placeholder="Rol seçin" />
        <Select label="Gruplu" options={GROUPED_SELECT_OPTIONS} placeholder="Şehir seçin" />
      </div>
    </Section>
  </>
);

export default ControlDemos;
