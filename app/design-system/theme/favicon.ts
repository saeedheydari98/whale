/** Self-contained so the theme bootstrap can run this same function before hydration. */
export function applyDocumentFavicon(mode: "light" | "dark", vars: Record<string, string>) {
  if (typeof document === "undefined") return;
  const background = vars[mode === "dark" ? "--primary-bg" : "--primary"];
  const foreground = vars[mode === "dark" ? "--primary-text" : "--primary-base"];
  const source = document.getElementById("app-favicon-template");
  if (!source || !background || !foreground) return;

  const svg = source.cloneNode(true) as SVGElement;
  svg.removeAttribute("id");
  svg.removeAttribute("style");
  svg.removeAttribute("aria-hidden");
  svg.querySelector("[data-favicon-background]")?.setAttribute("fill", background);
  svg.querySelector("[data-favicon-symbol]")?.setAttribute("color", foreground);
  const href = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  let icon = document.getElementById("app-theme-favicon") as HTMLLinkElement | null;
  if (!icon) {
    icon = document.createElement("link");
    icon.id = "app-theme-favicon";
    icon.rel = "icon";
    document.head.appendChild(icon);
  }
  icon.type = "image/svg+xml";
  icon.sizes = "any";
  icon.removeAttribute("media");
  if (icon.getAttribute("href") !== href) icon.href = href;

  // Keep one browser favicon; OS media queries must not override the app mode.
  document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach((element) => {
    if (element !== icon) element.remove();
  });
  let themeColor = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (!themeColor) {
    themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    document.head.appendChild(themeColor);
  }
  themeColor.content = background;
}
