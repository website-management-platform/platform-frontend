import { FiCheck, FiX } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./stepper.scss";

const STATUS_LABELS = {
  complete: "tamamlandı",
  current: "şu anki adım",
  upcoming: "sıradaki adım",
  error: "hatalı",
};

const getStatus = (step, index, current) => {
  if (step.status) return step.status;
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
};

// İlerleme çubuğu görünümü: dar alanlarda (pencere, çekmece) adımlar eşit bölmeli bir çubuk ve altında ad olarak durur.
const ProgressStepper = ({ steps, current, onStepClick, ariaLabel, className }) => (
  <div className={cx("stepper_root", className)}>
    <ol className="stepper_progress" aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const status = getStatus(step, index, current);
        const clickable = Boolean(onStepClick) && status === "complete";
        const content = (
          <>
            <span className="stepper_progress_bar" aria-hidden="true" />
            <span className="stepper_progress_index">
              {status === "complete" && <FiCheck aria-hidden="true" />}
              Adım {index + 1}
            </span>
            <span className="stepper_progress_label">{step.label}</span>
            <span className="visually_hidden">, {STATUS_LABELS[status]}</span>
          </>
        );
        return (
          <li
            key={step.id ?? step.label}
            className={cx("stepper_progress_item", `stepper_progress_item_${status}`)}
            aria-current={status === "current" ? "step" : undefined}
          >
            {clickable ? (
              <button type="button" className="stepper_progress_step stepper_progress_step_clickable" onClick={() => onStepClick(index)}>
                {content}
              </button>
            ) : (
              <span className="stepper_progress_step">{content}</span>
            )}
          </li>
        );
      })}
    </ol>
  </div>
);

const Stepper = ({
  steps,
  current = 0,
  orientation = "horizontal",
  variant = "default",
  size = "md",
  onStepClick,
  ariaLabel = "İlerleme adımları",
  className = "",
}) => (variant === "progress" ? (
  <ProgressStepper steps={steps} current={current} onStepClick={onStepClick} ariaLabel={ariaLabel} className={className} />
) : (
  <div className={cx("stepper_root", className)}>
    <ol className={cx("stepper", `stepper_${orientation}`, `stepper_${size}`)} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const status = getStatus(step, index, current);
        const clickable = Boolean(onStepClick) && status !== "upcoming";
        const content = (
          <>
            <span className="stepper_indicator" aria-hidden="true">
              {status === "complete" && <FiCheck />}
              {status === "error" && <FiX />}
              {status !== "complete" && status !== "error" && index + 1}
            </span>
            <span className="stepper_text">
              <span className="stepper_label">{step.label}</span>
              {step.description && <span className="stepper_description">{step.description}</span>}
              <span className="visually_hidden">, {STATUS_LABELS[status]}</span>
            </span>
          </>
        );

        return (
          <li
            key={step.id ?? step.label}
            className={cx("stepper_item", `stepper_item_${status}`)}
            aria-current={status === "current" ? "step" : undefined}
          >
            {clickable ? (
              <button type="button" className="stepper_step stepper_step_clickable" onClick={() => onStepClick(index)}>
                {content}
              </button>
            ) : (
              <span className="stepper_step">{content}</span>
            )}
            {orientation === "horizontal" && index < steps.length - 1 && (
              <span className="stepper_connector" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  {/* Dar ekranda yatay adımların adları sığmaz: yalnız göstergeler ve altında şu anki adımın adı. */}
  {orientation === "horizontal" && steps[current] && (
    <p className="stepper_mobile_caption" aria-hidden="true">{`Adım ${current + 1}/${steps.length} · ${steps[current].label}`}</p>
  )}
  </div>
));

export default Stepper;
