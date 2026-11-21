import { FiPlus, FiTrash2 } from "react-icons/fi";
import { createField, newUuid } from "@wmp/schema";
import Button from "@/components/Button";
import Input from "@/components/Input";
import "./blocks_editor.scss";

/** Esnek blok alanının blok türleri: ad, anahtar ve en çok kaç kez eklenebileceği. Alt alanlar tuvalde düzenlenir. */
const BlocksEditor = ({ blocks = [], onChange, publishedKeys = new Set() }) => {
  const update = (index, patch) => onChange(blocks.map((block, position) => (position === index ? { ...block, ...patch } : block)));
  const add = () => {
    let number = blocks.length + 1;
    while (blocks.some((block) => block.key === `blok${number}`)) number += 1;
    onChange([...blocks, { id: newUuid(), key: `blok${number}`, label: { tr: `Blok ${number}` }, maxItems: null, fields: [createField("text", { key: "baslik", label: "Başlık" })] }]);
  };

  return (
    <fieldset className="blocks_editor">
      <legend className="blocks_editor_legend">Blok türleri</legend>
      <ol className="blocks_editor_list">
        {blocks.map((block, index) => {
          const published = publishedKeys.has(block.key);
          return (
            <li key={block.id ?? index} className="blocks_editor_row">
              <Input label="Ad" size="sm" value={block.label?.tr ?? ""} onChange={(event) => update(index, { label: { ...block.label, tr: event.target.value } })} />
              <Input label="Anahtar" size="sm" value={block.key} readOnly={published} onChange={(event) => update(index, { key: event.target.value })} className="blocks_editor_mono" />
              <Input
                label="En çok"
                size="sm"
                type="number"
                min={1}
                max={200}
                optionalText="Sınırsız"
                value={block.maxItems ?? ""}
                onChange={(event) => update(index, { maxItems: event.target.value === "" ? null : Number.parseInt(event.target.value, 10) })}
              />
              <Button variant="ghost" size="sm" color="danger" icon={FiTrash2} ariaLabel={`${block.label?.tr ?? block.key} blok türünü sil`} disabled={published || blocks.length === 1} onClick={() => onChange(blocks.filter((_, position) => position !== index))} className="blocks_editor_remove" />
            </li>
          );
        })}
      </ol>
      <Button variant="outline" size="sm" icon={FiPlus} onClick={add}>Blok türü ekle</Button>
    </fieldset>
  );
};

export default BlocksEditor;
