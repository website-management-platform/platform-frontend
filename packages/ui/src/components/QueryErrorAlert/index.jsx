import Alert from "@/components/Alert";
import Button from "@/components/Button";
import { getErrorMessage } from "@/api/errors";

const QueryErrorAlert = ({ error, onRetry }) => (
  <Alert
    variant="danger"
    size="compact"
    action={onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Tekrar dene</Button>}
  >
    {getErrorMessage(error)}
  </Alert>
);

export default QueryErrorAlert;
