import { createElement } from "react";
import { fieldTypeIcon } from "../../labels";

/** Alan tipinin simgesi (dekoratif). */
const FieldTypeIcon = ({ type }) => createElement(fieldTypeIcon(type), { "aria-hidden": true, focusable: false });

export default FieldTypeIcon;
