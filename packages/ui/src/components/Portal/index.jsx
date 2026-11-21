import { createPortal } from "react-dom";

const Portal = ({ children, container }) => createPortal(children, container ?? document.body);

export default Portal;
