import {
  FiUser,
  FiSettings,
  FiEdit2,
  FiLogOut,
  FiCheckCircle,
  FiTrash2,
  FiBell,
  FiFolder,
  FiCopy,
} from "react-icons/fi";
import Button from "@/components/Button";
import Switch from "@/components/Switch";
import Tooltip from "@/components/Tooltip";
import Dropdown, { DropdownItem, DropdownDivider } from "@/components/Dropdown";
import Popover from "@/components/Popover";
import ConfirmPopover from "@/components/ConfirmPopover";
import { toast } from "@/components/Toast/toast";
import { MOD_KEY_LABEL } from "@/utils/platform";
import { Section, SubLabel } from "../parts";
import { TOOLTIP_PLACEMENTS, DROPDOWN_PLACEMENTS } from "../demoData";

// İpucu, açılır menü, açılır pencere ve onay balonu örnekleri.
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const OverlayDemos = () => (
  <>
    <Section title="Tooltip" description="4 yerleşim: üst, alt, sol, sağ.">
      <div className="component_library_row component_library_row_spaced">
        {TOOLTIP_PLACEMENTS.map((placement) => (
          <Tooltip key={placement} content={`${placement} yerleşimi`} placement={placement}>
            <Button variant="outline">{placement}</Button>
          </Tooltip>
        ))}
      </div>
      <SubLabel>Çok satırlı, oksuz ve gecikmesiz</SubLabel>
      <div className="component_library_row component_library_row_spaced">
        <Tooltip
          content="Bu rapor her gün 06:00'da yeniden hesaplanır ve ekibe e-posta ile gönderilir."
          maxWidth={240}
        >
          <Button variant="outline">Çok satırlı</Button>
        </Tooltip>
        <Tooltip content="Ok işaretsiz ipucu" arrow={false}>
          <Button variant="outline">Oksuz</Button>
        </Tooltip>
        <Tooltip content="Anında açılır" delay={0}>
          <Button variant="outline">Gecikmesiz</Button>
        </Tooltip>
      </div>
    </Section>

    <Section title="Dropdown" description="2 yerleşim (bottom-start / bottom-end), ayırıcı ve tehlikeli aksiyon.">
      <div className="component_library_row component_library_row_spaced">
        {DROPDOWN_PLACEMENTS.map((placement) => (
          <Dropdown
            key={placement}
            placement={placement}
            trigger={({ toggle, triggerProps }) => (
              <Button variant="outline" icon={FiUser} onClick={toggle} {...triggerProps}>
                {placement === "bottom_start" ? "Sola hizalı" : "Sağa hizalı"}
              </Button>
            )}
          >
            {({ close }) => (
              <>
                <DropdownItem icon={FiEdit2} onClick={close}>Profili düzenle</DropdownItem>
                <DropdownItem icon={FiSettings} onClick={close}>Ayarlar</DropdownItem>
                <DropdownDivider />
                <DropdownItem icon={FiTrash2} danger onClick={close}>Hesabı sil</DropdownItem>
                <DropdownItem icon={FiLogOut} danger onClick={close}>Çıkış yap</DropdownItem>
              </>
            )}
          </Dropdown>
        ))}
      </div>
      <SubLabel>Kısayol gösterimli</SubLabel>
      <div className="component_library_row">
        <Dropdown
          trigger={({ toggle, triggerProps }) => (
            <Button variant="outline" icon={FiEdit2} onClick={toggle} {...triggerProps}>Düzenle</Button>
          )}
        >
          {({ close }) => (
            <>
              <DropdownItem icon={FiCopy} shortcut={[MOD_KEY_LABEL, "C"]} onClick={close}>Kopyala</DropdownItem>
              <DropdownItem icon={FiEdit2} shortcut={[MOD_KEY_LABEL, "E"]} onClick={close}>Yeniden adlandır</DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={FiTrash2} danger shortcut={["Del"]} onClick={close}>Sil</DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </Section>

    <Section title="Popover" description="Serbest içerikli floating panel, 4 yerleşim, ok işaretli/işaretsiz.">
      <div className="component_library_row component_library_row_spaced">
        {["bottom", "top", "left", "right"].map((placement) => (
          <Popover
            key={placement}
            placement={placement}
            trigger={({ toggle, triggerProps }) => (
              <Button variant="outline" icon={FiBell} onClick={toggle} {...triggerProps}>{placement}</Button>
            )}
          >
            {({ close }) => (
              <>
                <p className="component_library_popover_text">Bu, Popover'ın serbest içerik alanı.</p>
                <Button size="sm" onClick={close}>Kapat</Button>
              </>
            )}
          </Popover>
        ))}
      </div>
      <SubLabel>Başlık, kapatma butonu ve boyut</SubLabel>
      <div className="component_library_row">
        <Popover
          title="Paylaşım ayarları"
          closeButton
          size="lg"
          trigger={({ toggle, triggerProps }) => (
            <Button variant="outline" icon={FiSettings} onClick={toggle} {...triggerProps}>Başlıklı popover</Button>
          )}
        >
          <p className="component_library_popover_text">Bu bağlantıya sahip herkes raporu görüntüleyebilir.</p>
          <Switch label="Bağlantı ile paylaşım" defaultChecked />
        </Popover>
      </div>
    </Section>

    <Section title="ConfirmPopover" description="Tetikleyicinin yanında açılan hafif onay; 5 ton, ikonlu/sade yerleşim, async onay, hata gösterimi.">
      <SubLabel>Tonlar ve senaryolar</SubLabel>
      <div className="component_library_row">
        <ConfirmPopover
          variant="destructive"
          title="Kayıt silinsin mi?"
          description="Bu kayıt kalıcı olarak silinir."
          confirmLabel="Sil"
          onConfirm={async () => {
            await wait(900);
            toast.success("Kayıt silindi");
          }}
          trigger={({ toggle, triggerProps }) => (
            <Button variant="soft" color="danger" icon={FiTrash2} onClick={toggle} {...triggerProps}>Sil</Button>
          )}
        />
        <ConfirmPopover
          variant="warning"
          title="Proje arşivlensin mi?"
          description="Bu örnek sunucu hatasını gösterir."
          confirmLabel="Arşivle"
          onConfirm={async () => {
            await wait(900);
            throw new Error("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
          }}
          trigger={({ toggle, triggerProps }) => (
            <Button variant="outline" icon={FiFolder} onClick={toggle} {...triggerProps}>Arşivle (hata)</Button>
          )}
        />
        <ConfirmPopover
          variant="success"
          title="Sipariş onaylansın mı?"
          confirmLabel="Onayla"
          onConfirm={() => toast.success("Sipariş onaylandı")}
          trigger={({ toggle, triggerProps }) => (
            <Button variant="outline" icon={FiCheckCircle} onClick={toggle} {...triggerProps}>Onayla</Button>
          )}
        />
        <ConfirmPopover
          variant="info"
          title="Değişiklikler yayınlansın mı?"
          description="Tüm kullanıcılar yeni sürümü görecek."
          confirmLabel="Yayınla"
          onConfirm={() => toast.info("Yayınlandı")}
          trigger={({ toggle, triggerProps }) => (
            <Button variant="outline" icon={FiBell} onClick={toggle} {...triggerProps}>Yayınla</Button>
          )}
        />
      </div>
      <SubLabel>Sade yerleşim, ikon butonu ve devre dışı</SubLabel>
      <div className="component_library_row">
        <ConfirmPopover
          layout="compact"
          title="Oturum kapatılsın mı?"
          confirmLabel="Çıkış yap"
          onConfirm={() => toast.neutral("Oturum kapatıldı")}
          trigger={({ toggle, triggerProps }) => (
            <Button variant="ghost" icon={FiLogOut} onClick={toggle} {...triggerProps}>Çıkış</Button>
          )}
        />
        <ConfirmPopover
          variant="destructive"
          placement="left"
          title="Satır silinsin mi?"
          confirmLabel="Sil"
          onConfirm={() => toast.success("Satır silindi")}
          trigger={({ toggle, triggerProps }) => (
            <Button variant="ghost" color="danger" size="sm" icon={FiTrash2} ariaLabel="Satırı sil" onClick={toggle} {...triggerProps} />
          )}
        />
        <ConfirmPopover
          disabled
          title="Devre dışı"
          trigger={({ toggle, triggerProps }) => (
            <Button variant="outline" disabled onClick={toggle} {...triggerProps}>Devre dışı</Button>
          )}
        />
      </div>
    </Section>
  </>
);

export default OverlayDemos;
