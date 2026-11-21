import { FiGrid, FiList } from "react-icons/fi";
import Button from "@/components/Button";
import Switch from "@/components/Switch";
import Avatar from "@/components/Avatar";
import Alert from "@/components/Alert";
import SegmentedControl from "@/components/SegmentedControl";
import { toast } from "@/components/Toast/toast";
import { Section, SubLabel } from "../parts";
import { TOAST_APPEARANCES, TOAST_ICON_STYLES, TOAST_SIZES, TOAST_POSITIONS } from "../demoData";

// Uyarı, bildirim (toast) ve segment denetimi örnekleri.
const FeedbackDemos = ({ autoAlertKey, dismissibleAlertVisible, segmentedValue, setAutoAlertKey, setDismissibleAlertVisible, setSegmentedValue, setToastAppearance, setToastIconStyle, setToastPosition, setToastShowProgress, setToastSize, showUndoToast, toastAppearance, toastIconStyle, toastOptions, toastPosition, toastShowProgress, toastSize }) => (
  <>
    <Section title="Alert" description="5 durum × 3 görünüm (soft/outline/solid), kapatılabilir, aksiyonlu.">
      <SubLabel>Soft (varsayılan)</SubLabel>
      <div className="component_library_column">
        <Alert variant="info" title="Bilgilendirme">Bu bir bilgi mesajıdır.</Alert>
        <Alert variant="success" title="Başarılı">İşlem başarıyla tamamlandı.</Alert>
        <Alert variant="warning" title="Uyarı">Bu işlem geri alınamaz.</Alert>
        {dismissibleAlertVisible ? (
          <Alert
            variant="danger"
            title="Hata (kapatılabilir, animasyonlu)"
            dismissible
            onDismiss={() => setDismissibleAlertVisible(false)}
          >
            Bir hata oluştu, lütfen tekrar deneyin.
          </Alert>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setDismissibleAlertVisible(true)}>
            Alert'i geri getir
          </Button>
        )}
        <Alert
          variant="info"
          title="Aksiyonlu"
          action={<Button size="sm" variant="outline">Detaylar</Button>}
        >
          Bu uyarının bir aksiyon butonu var.
        </Alert>
      </div>
      <SubLabel>Outline / Solid</SubLabel>
      <div className="component_library_column">
        <Alert variant="warning" appearance="outline" title="Outline görünüm">Kenarlıklı, düşük doygunluklu.</Alert>
        <Alert variant="danger" appearance="solid" title="Solid görünüm">Yüksek vurgulu, kritik durumlar için.</Alert>
      </div>
      <SubLabel>Kompakt</SubLabel>
      <div className="component_library_column">
        <Alert variant="info" size="compact">Tek satırlık kısa mesaj.</Alert>
        <Alert variant="warning" size="compact" appearance="outline">Kompakt + outline.</Alert>
      </div>
      <SubLabel>Accent şerit, ikonsuz ve otomatik kapanan</SubLabel>
      <div className="component_library_column">
        <Alert variant="info" appearance="accent" title="Bakım planlandı">
          Cumartesi 02:00–04:00 arasında kısa bir kesinti yaşanabilir.
        </Alert>
        <Alert variant="success" appearance="accent" icon={false}>İkonsuz, sade bilgi satırı.</Alert>
        <Alert key={autoAlertKey} variant="warning" autoClose={6000} title="6 saniye sonra kapanır">
          Otomatik kapanan uyarı örneği.
        </Alert>
        <div>
          <Button size="sm" variant="ghost" onClick={() => setAutoAlertKey((prev) => prev + 1)}>Yeniden göster</Button>
        </div>
      </div>
    </Section>

    <Section title="Toast" description="4 görünüm (varsayılan / soft / solid / şerit) × 2 ikon stili × 2 boyut × 4 konum; başlık ve açıklama, aksiyon, avatar, promise.">
      <div className="component_library_row component_library_row_spaced">
        <SegmentedControl options={TOAST_APPEARANCES} value={toastAppearance} onChange={setToastAppearance} size="sm" ariaLabel="Toast görünümü" />
        <SegmentedControl options={TOAST_ICON_STYLES} value={toastIconStyle} onChange={setToastIconStyle} size="sm" ariaLabel="İkon stili" />
        <SegmentedControl options={TOAST_SIZES} value={toastSize} onChange={setToastSize} size="sm" ariaLabel="Toast boyutu" />
        <SegmentedControl options={TOAST_POSITIONS} value={toastPosition} onChange={setToastPosition} size="sm" ariaLabel="Toast konumu" />
        <Switch
          label="Geri sayım çubuğu"
          size="sm"
          checked={toastShowProgress}
          onChange={(event) => setToastShowProgress(event.target.checked)}
        />
      </div>
      <SubLabel>Durumlar</SubLabel>
      <div className="component_library_row">
        <Button variant="outline" onClick={() => toast.success("Değişiklikler kaydedildi", toastOptions)}>Başarılı</Button>
        <Button variant="outline" onClick={() => toast.error("Bir hata oluştu", toastOptions)}>Hata</Button>
        <Button variant="outline" onClick={() => toast.warning("Bu işlem geri alınamaz", toastOptions)}>Uyarı</Button>
        <Button variant="outline" onClick={() => toast.info("Yeni bir güncelleme var", toastOptions)}>Bilgi</Button>
        <Button variant="outline" onClick={() => toast.neutral("Yeni bir sürüm mevcut", toastOptions)}>Nötr</Button>
        <Button
          variant="outline"
          onClick={() => toast.persistent("Elle kapatılana kadar kalır", { ...toastOptions, variant: "warning" })}
        >
          Kalıcı
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.promise(
            new Promise((resolve) => setTimeout(resolve, 2000)),
            { loading: "Kaydediliyor...", success: "Kaydedildi", error: "Kaydedilemedi" },
            toastOptions,
          )}
        >
          Promise (2sn)
        </Button>
      </div>
      <SubLabel>Senaryolar</SubLabel>
      <div className="component_library_row">
        <Button
          variant="outline"
          onClick={() => toast.success("Rapor hazır", {
            ...toastOptions,
            description: "Aylık satış raporu e-posta adresinize gönderildi.",
          })}
        >
          Başlık + açıklama
        </Button>
        <Button variant="outline" onClick={showUndoToast}>Geri al aksiyonlu</Button>
        <Button
          variant="outline"
          onClick={() => toast.info("Ayşe Kaya bir yorum bıraktı", {
            ...toastOptions,
            description: "“Rapor tasarımı harika görünüyor, yarın sunalım.”",
            avatar: <Avatar size="sm" name="Ayşe Kaya" />,
          })}
        >
          Avatarlı bildirim
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.neutral("Bağlantı panoya kopyalandı", { ...toastOptions, showProgress: false, closable: false })}
        >
          Sade (çubuksuz, kapatmasız)
        </Button>
      </div>
    </Section>

    <Section title="SegmentedControl" description="3 boyut, ikonlu/ikonsuz, tam genişlik, devre dışı segment.">
      <div className="component_library_column">
        <SegmentedControl
          options={[
            { value: "grid", label: "Izgara", icon: FiGrid },
            { value: "list", label: "Liste", icon: FiList },
            { value: "disabled", label: "Devre dışı", disabled: true },
          ]}
          ariaLabel="Görünüm"
          value={segmentedValue}
          onChange={setSegmentedValue}
        />
        <SegmentedControl
          options={[{ value: "a", label: "Günlük" }, { value: "b", label: "Haftalık" }, { value: "c", label: "Aylık" }]}
          ariaLabel="Periyot"
          defaultValue="b"
          size="sm"
        />
        <SegmentedControl
          options={[{ value: "a", label: "Tümü" }, { value: "b", label: "Aktif" }, { value: "c", label: "Pasif" }]}
          ariaLabel="Durum"
          defaultValue="a"
          fullWidth
        />
      </div>
    </Section>
  </>
);

export default FeedbackDemos;
