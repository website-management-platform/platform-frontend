import { Fragment } from "react";
import { cx } from "@/utils/cx";
import "./kbd.scss";

const Kbd = ({ keys, size = "md", className = "", children, ...rest }) => {
  const classes = cx("kbd", `kbd_${size}`, className);

  if (keys?.length) {
    return (
      <kbd className={classes} {...rest}>
        {/* Tuşlar arasındaki boşluk metinde kalır ("Ctrl K"); esnek kutuda görünmez, aralığı CSS verir. */}
        {keys.map((key, index) => (
          <Fragment key={`${key}-${index}`}>
            {index > 0 && " "}
            <kbd className="kbd_key">{key}</kbd>
          </Fragment>
        ))}
      </kbd>
    );
  }

  return <kbd className={classes} {...rest}>{children}</kbd>;
};

export default Kbd;
