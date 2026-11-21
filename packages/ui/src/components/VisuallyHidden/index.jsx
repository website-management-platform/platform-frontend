const VisuallyHidden = ({ as: Component = "span", children, ...rest }) => (
  <Component className="visually_hidden" {...rest}>{children}</Component>
);

export default VisuallyHidden;
