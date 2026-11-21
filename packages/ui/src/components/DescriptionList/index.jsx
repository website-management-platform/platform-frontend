import { cx } from "@/utils/cx";
import "./description_list.scss";

const DescriptionList = ({
  items,
  layout = "horizontal",
  columns = 2,
  bordered = false,
  className = "",
}) => (
  <dl
    className={cx(
      "description_list",
      `description_list_${layout}`,
      layout === "grid" && `description_list_columns_${columns}`,
      bordered && "description_list_bordered",
      className,
    )}
  >
    {items.map((item) => (
      <div key={item.id ?? item.label} className="description_list_item">
        <dt className="description_list_term">{item.label}</dt>
        <dd className="description_list_detail">{item.value}</dd>
      </div>
    ))}
  </dl>
);

export default DescriptionList;
