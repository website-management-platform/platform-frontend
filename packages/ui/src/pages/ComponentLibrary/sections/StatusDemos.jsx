import { FiEdit2, FiCheckCircle, FiTrash2, FiBell } from "react-icons/fi";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import AvatarGroup from "@/components/AvatarGroup";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import Skeleton, { SkeletonCard, SkeletonList } from "@/components/Skeleton";
import Divider from "@/components/Divider";
import Progress from "@/components/Progress";
import { Section, SubLabel } from "../parts";
import { TEAM_MEMBERS, BADGE_VARIANTS } from "../demoData";

// Rozet, avatar, kart, ayırıcı, ilerleme, yükleniyor ve iskelet örnekleri.
const StatusDemos = ({ cardSelected, setCardSelected, setTags, tags }) => (
  <>
    <Section title="Badge" description="6 semantic variant × boyut × şekil × ikon/sayaç × dolgulu/outline.">
      <SubLabel>Dolgulu</SubLabel>
      <div className="component_library_matrix">
        {BADGE_VARIANTS.map((variant) => (
          <div className="component_library_matrix_row" key={variant}>
            <span className="component_library_matrix_row_label">{variant}</span>
            <Badge variant={variant} size="sm">sm</Badge>
            <Badge variant={variant} size="md">md</Badge>
            <Badge variant={variant} size="md" dot>nokta ile</Badge>
          </div>
        ))}
      </div>
      <SubLabel>Outline</SubLabel>
      <div className="component_library_row">
        {BADGE_VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant} outline>{variant}</Badge>
        ))}
      </div>
      <SubLabel>Şekil</SubLabel>
      <div className="component_library_row">
        <Badge variant="accent" shape="pill">Pill</Badge>
        <Badge variant="accent" shape="rounded">Rounded</Badge>
        <Badge variant="accent" shape="square">Square</Badge>
      </div>
      <SubLabel>İkon ve sayaç</SubLabel>
      <div className="component_library_row">
        <Badge variant="success" icon={FiCheckCircle}>Doğrulandı</Badge>
        <Badge variant="danger" icon={FiBell} iconPosition="right">3 bildirim</Badge>
        <Badge variant="danger" icon={FiBell} shape="pill" />
        <Badge variant="danger">142</Badge>
        <Badge variant="danger" max={99}>142</Badge>
      </div>
      <SubLabel>Solid görünüm</SubLabel>
      <div className="component_library_row">
        {BADGE_VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant} appearance="solid">{variant}</Badge>
        ))}
      </div>
      <SubLabel>Büyük boy ve kapatılabilir etiketler</SubLabel>
      <div className="component_library_row">
        <Badge variant="accent" size="lg" dot>Büyük</Badge>
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="neutral"
            closable
            closeLabel={`${tag} etiketini kaldır`}
            onClose={() => setTags((prev) => prev.filter((item) => item !== tag))}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </Section>

    <Section title="Avatar" description="4 boyut × resim/baş harf × durum noktası × şekil.">
      <SubLabel>Boyut (baş harf)</SubLabel>
      <div className="component_library_row">
        <Avatar size="sm" initials="AY" />
        <Avatar size="md" initials="AY" />
        <Avatar size="lg" initials="AY" />
        <Avatar size="xl" initials="AY" />
      </div>
      <SubLabel>Durum noktası</SubLabel>
      <div className="component_library_row">
        <Avatar size="md" initials="ÇE" status="online" />
        <Avatar size="md" initials="MK" status="away" />
        <Avatar size="md" initials="SD" status="busy" />
        <Avatar size="md" initials="HT" status="offline" />
      </div>
      <SubLabel>Şekil</SubLabel>
      <div className="component_library_row">
        <Avatar size="lg" initials="AY" shape="circle" />
        <Avatar size="lg" initials="AY" shape="square" />
      </div>
      <SubLabel>İsimden otomatik baş harf ve renk</SubLabel>
      <div className="component_library_row">
        <Avatar size="md" name="Ayşe Kaya" />
        <Avatar size="md" name="İlker Öztürk" />
        <Avatar size="md" name="Mehmet Demir" status="online" />
        <Avatar size="md" name="Zeynep Arslan" />
        <Avatar size="md" name="Can Yıldız" />
      </div>
      <SubLabel>Resim yüklenemezse baş harfe döner</SubLabel>
      <div className="component_library_row">
        <Avatar size="lg" name="Selin Aydın" src="/olmayan-resim.png" />
      </div>
      <SubLabel>xs boyut, vurgu halkası ve isimsiz ikon</SubLabel>
      <div className="component_library_row">
        <Avatar size="xs" name="Ayşe Kaya" />
        <Avatar size="md" name="Mehmet Demir" ring />
        <Avatar size="md" />
      </div>
      <SubLabel>AvatarGroup</SubLabel>
      <AvatarGroup max={4} label="Proje ekibi">
        {TEAM_MEMBERS.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </AvatarGroup>
    </Section>

    <Section title="Card" description="Elevation seviyeleri, tıklanabilir kart, header/footer/actions slot kombinasyonları.">
      <SubLabel>Elevation</SubLabel>
      <div className="component_library_grid component_library_grid_wide">
        <Card elevation="flat" title="Flat">
          <p>Border yok, gölge yok — sadece zemin ayrımı.</p>
        </Card>
        <Card elevation="outlined" title="Outlined">
          <p>İnce border, gölge yok.</p>
        </Card>
        <Card elevation="elevated" title="Elevated">
          <p>Border + hafif gölge (varsayılan).</p>
        </Card>
        <Card elevation="elevated" clickable title="Tıklanabilir" onClick={() => {}}>
          <p>Hover'da gölge büyür, tıklanabilir/klavye erişilebilir.</p>
        </Card>
      </div>
      <SubLabel>Slot Kombinasyonları</SubLabel>
      <div className="component_library_grid component_library_grid_wide">
        <Card title="Sadece başlık">
          <p>Header ve içerik, footer/actions yok.</p>
        </Card>
        <Card
          title="Aksiyonlu"
          actions={<Button size="sm" variant="ghost" icon={FiEdit2} ariaLabel="Düzenle" />}
        >
          <p>Header'da aksiyon butonu var, footer yok.</p>
        </Card>
        <Card footer={<Button size="sm" fullWidth>Devam Et</Button>}>
          <p>Header yok, sadece içerik ve footer.</p>
        </Card>
        <Card
          title="Tam donanımlı"
          actions={<Badge variant="success">Aktif</Badge>}
          footer={<Button size="sm" fullWidth>Detayları Gör</Button>}
        >
          <p>Header + actions + footer birlikte.</p>
        </Card>
        <Card title="Padding'siz" padding={false}>
          <div className="component_library_no_padding_demo">İçerik kenarlara tam yaslanır</div>
        </Card>
      </div>
      <SubLabel>Soft, ghost, hover, seçilebilir ve köşe</SubLabel>
      <div className="component_library_grid component_library_grid_wide">
        <Card elevation="soft" title="Soft">Hafif dolgulu yüzey.</Card>
        <Card elevation="ghost" title="Ghost">Kenarlıksız, saydam yüzey.</Card>
        <Card hoverable title="Hover">Üzerine gelince hafifçe yükselir.</Card>
        <Card clickable selected={cardSelected} onClick={() => setCardSelected((prev) => !prev)} title="Seçilebilir">
          Tıklayınca seçili duruma geçer.
        </Card>
        <Card radius="xl" title="xl köşe">Daha yuvarlak köşeler.</Card>
      </div>
      <SubLabel>İkon ve açıklama</SubLabel>
      <div className="component_library_grid component_library_grid_wide">
        <Card icon={FiBell} title="Bildirimler" description="Son 24 saatte 3 yeni bildirim">
          <p>İkon + başlık + alt açıklama satırı.</p>
        </Card>
        <Card
          icon={FiTrash2}
          iconTone="danger"
          title="Depolama"
          description="%90 doldu"
          actions={<Button size="sm" variant="outline" color="danger">Yönet</Button>}
        >
          <p>Renkli ikon tonu (accent/success/warning/danger/neutral) + aksiyon birlikte.</p>
        </Card>
      </div>
    </Section>

    <Section title="Divider" description="Yatay/dikey ayraç, etiketli ve kesikli varyasyonlar.">
      <div className="component_library_column">
        <Divider />
        <Divider dashed />
        <Divider label="VEYA" />
      </div>
      <div className="component_library_row component_library_vertical_divider_demo">
        <span>Sol</span>
        <Divider orientation="vertical" />
        <span>Sağ</span>
      </div>
    </Section>

    <Section title="Progress" description="Linear/circular, durum renkleri, belirsiz (indeterminate) durum.">
      <SubLabel>Linear</SubLabel>
      <div className="component_library_column">
        <Progress value={35} label="Yükleniyor" showLabel />
        <Progress value={70} status="success" showLabel ariaLabel="Tamamlanan görevler" />
        <Progress value={50} status="warning" showLabel ariaLabel="Kota kullanımı" />
        <Progress value={20} status="danger" showLabel ariaLabel="Disk kullanımı" />
        <Progress indeterminate ariaLabel="Yükleniyor" />
      </div>
      <SubLabel>Circular</SubLabel>
      <div className="component_library_row">
        <Progress variant="circular" value={65} showLabel ariaLabel="Profil tamamlanma" />
        <Progress variant="circular" value={40} status="success" size="lg" showLabel ariaLabel="Yükleme ilerlemesi" />
        <Progress variant="circular" indeterminate ariaLabel="Yükleniyor" />
      </div>
      <SubLabel>Çizgili, animasyonlu ve segmentli</SubLabel>
      <div className="component_library_column">
        <Progress value={60} striped ariaLabel="Yedekleme" />
        <Progress value={45} striped animated status="success" ariaLabel="Senkronizasyon" />
        <Progress value={3} max={5} segments={5} label="Profil adımları" showLabel />
        <Progress value={80} segments={10} status="warning" ariaLabel="Depolama kullanımı" />
      </div>
    </Section>

    <Section title="Spinner & Skeleton" description="Yükleniyor göstergeleri ve içerik iskeletleri.">
      <SubLabel>Spinner boyutları</SubLabel>
      <div className="component_library_row">
        {["xs", "sm", "md", "lg", "xl"].map((size) => (
          <Spinner key={size} size={size} />
        ))}
        <Spinner size="md" label="Yükleniyor..." />
      </div>
      <SubLabel>Skeleton</SubLabel>
      <div className="component_library_row component_library_row_spaced">
        <Skeleton variant="circle" />
        <div className="component_library_skeleton_lines">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="90%" />
        </div>
      </div>
      <Skeleton variant="rectangle" height={100} />
      <SubLabel>Spinner görünümleri</SubLabel>
      <div className="component_library_row component_library_row_spaced">
        <Spinner variant="ring" tone="accent" size="lg" />
        <Spinner variant="dots" tone="accent" size="lg" />
        <Spinner variant="bars" tone="accent" size="lg" />
      </div>
      <SubLabel>Overlay</SubLabel>
      <div className="component_library_overlay_demo">
        <p>Kart içeriği yüklenirken üzerine yarı saydam katman gelir.</p>
        <Spinner overlay tone="accent" label="Yükleniyor" />
      </div>
      <SubLabel>Skeleton animasyonları ve şablonlar</SubLabel>
      <div className="component_library_grid">
        <Skeleton animation="pulse" lines={3} />
        <Skeleton animation="wave" lines={3} />
        <SkeletonCard />
        <SkeletonList items={2} />
      </div>
    </Section>
  </>
);

export default StatusDemos;
