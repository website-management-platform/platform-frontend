import Spinner from "@/components/Spinner";
import "./full_page_state.scss";

const FullPageState = ({ loading = false, label, children }) => (
  <div className="full_page_state">
    {loading ? <Spinner size="lg" label={label} /> : children}
  </div>
);

export default FullPageState;
