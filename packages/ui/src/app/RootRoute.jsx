import { Outlet } from "react-router";
import SessionEventsListener from "./SessionEventsListener";

const RootRoute = () => (
  <>
    <SessionEventsListener />
    <Outlet />
  </>
);

export default RootRoute;
