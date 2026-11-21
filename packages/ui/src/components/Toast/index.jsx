import { useEffect } from "react";
import { Toaster as HotToaster } from "react-hot-toast";
import Portal from "@/components/Portal";
import { ensureLiveRegions } from "./announcer";

export const Toaster = ({ position = "top-right", ...rest }) => {
  useEffect(() => {
    ensureLiveRegions();
  }, []);

  return (
    <Portal>
      <div className="toaster" data-inert-exempt="">
        <HotToaster position={position} gutter={8} containerStyle={{ zIndex: "var(--app-z-toast)" }} {...rest} />
      </div>
    </Portal>
  );
};

export default Toaster;
