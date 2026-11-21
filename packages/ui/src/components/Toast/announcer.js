const CLEAR_DELAY = 7000;
const regions = { polite: null, assertive: null };

const createRegion = (container, politeness) => {
  const region = document.createElement("div");
  region.setAttribute("aria-live", politeness);
  region.setAttribute("aria-relevant", "additions");
  if (politeness === "assertive") region.setAttribute("role", "alert");
  else region.setAttribute("role", "status");
  container.appendChild(region);
  return region;
};

const ensureRegions = () => {
  if (regions.polite?.isConnected && regions.assertive?.isConnected) return regions;
  const container = document.createElement("div");
  container.className = "visually_hidden";
  container.setAttribute("data-inert-exempt", "");
  document.body.appendChild(container);
  regions.polite = createRegion(container, "polite");
  regions.assertive = createRegion(container, "assertive");
  return regions;
};

export const ensureLiveRegions = () => {
  if (typeof document === "undefined") return;
  ensureRegions();
};

export const announce = (text, politeness = "polite") => {
  if (typeof document === "undefined" || !text) return;
  const region = ensureRegions()[politeness] ?? regions.polite;
  const message = document.createElement("div");
  message.textContent = text;
  region.appendChild(message);
  setTimeout(() => message.remove(), CLEAR_DELAY);
};
