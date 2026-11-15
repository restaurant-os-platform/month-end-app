import { SAVED_THEMES } from "@/lib/themes";

/** Match the inventory theme before native pages and the outer menu paint. */
export function SavedTheme() {
  const code = `(function(){try{var theme=localStorage.getItem("keg_bar_theme_v2");if(${JSON.stringify(SAVED_THEMES)}.includes(theme))document.documentElement.dataset.theme=theme;}catch(_){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
