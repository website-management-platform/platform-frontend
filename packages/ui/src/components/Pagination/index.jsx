import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cx } from "@/utils/cx";
import "./pagination.scss";

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index);

const getPageItems = (page, pageCount, siblingCount) => {
  const totalVisible = siblingCount * 2 + 5;
  if (pageCount <= totalVisible) return range(1, pageCount);

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, pageCount);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < pageCount - 1;

  if (!showLeftEllipsis) return [...range(1, 3 + siblingCount * 2), "end-ellipsis", pageCount];
  if (!showRightEllipsis) return [1, "start-ellipsis", ...range(pageCount - (2 + siblingCount * 2), pageCount)];
  return [1, "start-ellipsis", ...range(leftSibling, rightSibling), "end-ellipsis", pageCount];
};

const Pagination = ({
  page,
  pageCount,
  onChange,
  siblingCount = 1,
  variant = "default",
  size = "md",
  ariaLabel = "Sayfalama",
  className = "",
}) => {
  if (pageCount <= 1) return null;

  const goTo = (nextPage) => {
    if (nextPage < 1 || nextPage > pageCount || nextPage === page) return;
    onChange?.(nextPage);
  };

  const previousButton = (
    <button
      type="button"
      className="pagination_button pagination_nav"
      onClick={() => goTo(page - 1)}
      disabled={page <= 1}
      aria-label="Önceki sayfa"
    >
      <FiChevronLeft aria-hidden="true" />
    </button>
  );

  const nextButton = (
    <button
      type="button"
      className="pagination_button pagination_nav"
      onClick={() => goTo(page + 1)}
      disabled={page >= pageCount}
      aria-label="Sonraki sayfa"
    >
      <FiChevronRight aria-hidden="true" />
    </button>
  );

  return (
    <nav className={cx("pagination", `pagination_${variant}`, `pagination_${size}`, className)} aria-label={ariaLabel}>
      {variant === "simple" ? (
        <div className="pagination_simple">
          {previousButton}
          <span className="pagination_status" aria-live="polite">
            Sayfa <strong>{page}</strong> / {pageCount}
          </span>
          {nextButton}
        </div>
      ) : (
        <ul className="pagination_list">
          <li>{previousButton}</li>
          {getPageItems(page, pageCount, siblingCount).map((item) => (
            <li key={item}>
              {typeof item === "number" ? (
                <button
                  type="button"
                  className={cx("pagination_button", item === page && "pagination_button_active")}
                  onClick={() => goTo(item)}
                  aria-label={`Sayfa ${item}`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </button>
              ) : (
                <span className="pagination_ellipsis" aria-hidden="true">…</span>
              )}
            </li>
          ))}
          <li>{nextButton}</li>
        </ul>
      )}
    </nav>
  );
};

export default Pagination;
