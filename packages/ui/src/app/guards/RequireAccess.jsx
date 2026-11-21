import Forbidden from "@/pages/Forbidden";
import { useRouteAccess } from "../routing";

// Arayüzdeki erişim denetimi yalnız deneyim içindir; asıl yetki her istekte API tarafından denetlenir.
const RequireAccess = ({ item, children }) => {
  const canAccess = useRouteAccess();
  return canAccess(item) ? children : <Forbidden />;
};

export default RequireAccess;
