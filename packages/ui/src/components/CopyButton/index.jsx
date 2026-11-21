import { useEffect, useRef, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";
import Button from "@/components/Button";

const RESET_DELAY = 2000;

const writeToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand("copy");
  textarea.remove();
  if (!succeeded) throw new Error("copy command failed");
};

const CopyButton = ({
  value,
  label = "Kopyala",
  copiedLabel = "Kopyalandı",
  iconOnly = false,
  variant = "outline",
  color = "neutral",
  size = "sm",
  onCopy,
  onError,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const timers = timerRef;
    return () => clearTimeout(timers.current);
  }, []);

  const handleCopy = async () => {
    try {
      await writeToClipboard(value);
      setCopied(true);
      onCopy?.(value);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), RESET_DELAY);
    } catch (err) {
      setCopied(false);
      onError?.(err);
    }
  };

  const currentLabel = copied ? copiedLabel : label;

  return (
    <>
      <Button
        variant={variant}
        color={copied ? "success" : color}
        size={size}
        icon={copied ? FiCheck : FiCopy}
        ariaLabel={iconOnly ? currentLabel : undefined}
        onClick={handleCopy}
      >
        {iconOnly ? null : currentLabel}
      </Button>
      <span className="visually_hidden" role="status">{copied ? copiedLabel : ""}</span>
    </>
  );
};

export default CopyButton;
