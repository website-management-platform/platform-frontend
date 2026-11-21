import Stack from "@/components/Stack";

const Inline = ({ gap = 3, align = "center", wrap = true, ...rest }) => (
  <Stack direction="horizontal" gap={gap} align={align} wrap={wrap} {...rest} />
);

export default Inline;
