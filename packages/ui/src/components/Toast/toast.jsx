import hotToast from "react-hot-toast";
import ToastCard from "./ToastCard";
import { announce } from "./announcer";

const DEFAULT_DURATIONS = {
  success: 4000,
  error: Infinity,
  warning: 5000,
  info: 4000,
  neutral: 4000,
  loading: Infinity,
};

const toAnnouncementText = (...parts) => parts
  .filter((part) => typeof part === "string" || typeof part === "number")
  .join(". ");

const show = (variant, message, options = {}) => {
  const {
    action,
    description,
    persistent,
    appearance,
    size,
    iconStyle,
    avatar,
    showProgress,
    closable,
    ...rest
  } = options;
  const defaultDuration = action ? Infinity : (DEFAULT_DURATIONS[variant] ?? 4000);
  const duration = persistent ? Infinity : (rest.duration ?? defaultDuration);

  announce(toAnnouncementText(message, description), variant === "error" ? "assertive" : "polite");

  return hotToast.custom(
    (t) => (
      <ToastCard
        visible={t.visible}
        position={t.position}
        variant={variant}
        appearance={appearance}
        size={size}
        iconStyle={iconStyle}
        avatar={avatar}
        showProgress={showProgress}
        closable={closable}
        message={message}
        description={description}
        action={action}
        duration={duration}
        onDismiss={() => hotToast.dismiss(t.id)}
      />
    ),
    { ...rest, duration },
  );
};

export const toast = {
  success: (message, options) => show("success", message, options),
  error: (message, options) => show("error", message, options),
  warning: (message, options) => show("warning", message, options),
  info: (message, options) => show("info", message, options),
  neutral: (message, options) => show("neutral", message, options),
  loading: (message, options) => show("loading", message, options),
  persistent: (message, options = {}) => show(options.variant || "neutral", message, { ...options, persistent: true }),
  dismiss: (id) => hotToast.dismiss(id),
  promise: (promise, messages, options) => {
    const id = show("loading", messages.loading, options);
    promise.then(
      (result) => {
        hotToast.dismiss(id);
        show("success", typeof messages.success === "function" ? messages.success(result) : messages.success, options);
      },
      (error) => {
        hotToast.dismiss(id);
        show("error", typeof messages.error === "function" ? messages.error(error) : messages.error, options);
      },
    );
    return promise;
  },
};
