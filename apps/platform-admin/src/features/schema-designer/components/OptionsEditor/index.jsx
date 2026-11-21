import { FiArchive, FiArrowDown, FiArrowUp, FiPlus, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { cx } from "@/utils/cx";
import "./options_editor.scss";

const slug = (text) => text
  .toLocaleLowerCase("tr-TR")
  .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  .slice(0, 63);

/**
 * Seçenek listesi. Kayıtlarda seçenek kodu saklanır; etiket serbestçe değişir. Yayınlanmış seçenek silinmez,
 * arşivlenir (mevcut kayıtlarda okunur, yeni seçimde görünmez). publishedIds: yayındaki şemada bulunan seçenek kodları.
 */
const OptionsEditor = ({ options = [], onChange, publishedIds = new Set(), error }) => {
  const update = (index, patch) => onChange(options.map((option, position) => (position === index ? { ...option, ...patch } : option)));
  const move = (index, direction) => {
    const next = [...options];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };
  const add = () => {
    let number = options.length + 1;
    while (options.some((option) => option.id === `secenek-${number}`)) number += 1;
    onChange([...options, { id: `secenek-${number}`, label: { tr: `Seçenek ${number}` } }]);
  };

  return (
    <fieldset className="options_editor">
      <legend className="options_editor_legend">Seçenekler</legend>
      {error && <p className="options_editor_error" role="alert">{error}</p>}
      <ol className="options_editor_list">
        {options.map((option, index) => {
          const published = publishedIds.has(option.id);
          return (
            <li key={index} className={cx("options_editor_row", option.archived && "options_editor_row_archived")}>
              <Input
                aria-label={`${index + 1}. seçenek etiketi`}
                size="sm"
                value={option.label?.tr ?? ""}
                onChange={(event) => {
                  const label = event.target.value;
                  const autoId = !published && option.id === slug(option.label?.tr ?? "");
                  update(index, { label: { ...option.label, tr: label }, ...(autoId && slug(label) ? { id: slug(label) } : {}) });
                }}
              />
              <Input
                aria-label={`${index + 1}. seçenek kodu`}
                size="sm"
                value={option.id}
                readOnly={published}
                onChange={(event) => update(index, { id: event.target.value.toLowerCase() })}
                className="options_editor_code"
              />
              <div className="options_editor_actions">
                <Button variant="ghost" size="sm" icon={FiArrowUp} ariaLabel="Yukarı taşı" disabled={index === 0} onClick={() => move(index, -1)} />
                <Button variant="ghost" size="sm" icon={FiArrowDown} ariaLabel="Aşağı taşı" disabled={index === options.length - 1} onClick={() => move(index, 1)} />
                {published
                  ? <Button variant="ghost" size="sm" icon={option.archived ? FiRotateCcw : FiArchive} ariaLabel={option.archived ? "Arşivden çıkar" : "Arşivle"} onClick={() => update(index, { archived: !option.archived || undefined })} />
                  : <Button variant="ghost" size="sm" color="danger" icon={FiTrash2} ariaLabel="Seçeneği sil" onClick={() => onChange(options.filter((_, position) => position !== index))} />}
              </div>
            </li>
          );
        })}
      </ol>
      <Button variant="outline" size="sm" icon={FiPlus} onClick={add}>Seçenek ekle</Button>
      <p className="options_editor_hint">Kod kayıtlarda saklanır ve yayından sonra değiştirilemez; etiket her zaman değişebilir.</p>
    </fieldset>
  );
};

export default OptionsEditor;
