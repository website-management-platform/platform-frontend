const wrapInAppLayer = () => ({
  postcssPlugin: "wrap-in-app-layer",
  Once(root, { AtRule }) {
    const alreadyWrapped = root.nodes.length === 1
      && root.nodes[0].type === "atrule"
      && root.nodes[0].name === "layer"
      && root.nodes[0].params === "app";
    if (alreadyWrapped) return;

    const layerRule = new AtRule({ name: "layer", params: "app" });
    const children = root.nodes.slice();
    root.removeAll();
    layerRule.append(children);
    root.append(layerRule);
  },
});
wrapInAppLayer.postcss = true;

export default {
  plugins: [wrapInAppLayer],
};
