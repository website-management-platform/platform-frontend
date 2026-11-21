import { useId, useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { cx } from "@/utils/cx";
import Button from "@/components/Button";
import "./file_dropzone.scss";

// Sürükle-bırak ek kolaylıktır; dosya her zaman klavyeyle erişilen "Dosya seç" düğmesiyle de seçilebilir.
const FileDropzone = ({
  accept,
  multiple = false,
  disabled = false,
  title = "Dosyaları buraya sürükleyin",
  description,
  buttonLabel = "Dosya seç",
  size = "md",
  className = "",
  onFiles,
}) => {
  const inputRef = useRef(null);
  const descriptionId = useId();
  const [dragDepth, setDragDepth] = useState(0);
  const dragging = dragDepth > 0 && !disabled;

  const emit = (fileList) => {
    const files = [...(fileList ?? [])];
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleDragEnter = (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    setDragDepth((depth) => depth + 1);
  };

  const handleDragOver = (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = disabled ? "none" : "copy";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragDepth(0);
    if (!disabled) emit(event.dataTransfer.files);
  };

  return (
    <div
      className={cx("file_dropzone", `file_dropzone_${size}`, dragging && "file_dropzone_active", disabled && "file_dropzone_disabled", className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragDepth((depth) => Math.max(0, depth - 1))}
      onDrop={handleDrop}
    >
      <span className="file_dropzone_icon" aria-hidden="true"><FiUploadCloud /></span>
      <p className="file_dropzone_title">{dragging ? "Bırakın, yükleyelim" : title}</p>
      {description && <p id={descriptionId} className="file_dropzone_description">{description}</p>}
      <Button
        size={size === "sm" ? "sm" : "md"}
        variant="outline"
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="file_dropzone_input"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          emit(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
};

export default FileDropzone;
