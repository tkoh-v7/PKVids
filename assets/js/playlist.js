import { safeText } from "./utils.js";

export function createPlaylist({ containerEl, countEl }) {
  function render({ videos, activeId, onPick }) {
    containerEl.innerHTML = "";
    countEl.textContent = `${videos.length} videos`;

    for (const v of videos) {
      const item = document.createElement("div");
      item.className = "item";
      item.setAttribute("role", "listitem");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-current", v.id === activeId ? "true" : "false");

      const img = document.createElement("img");
      img.className = "thumb";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = safeText(v.thumbnail || "");

      const right = document.createElement("div");

      const t = document.createElement("div");
      t.className = "item-title";
      t.textContent = safeText(v.title);

      const m = document.createElement("div");
      m.className = "item-meta";
      const meta = [
        v.year ? `Year ${safeText(v.year)}` : "",
        v.category ? safeText(v.category) : "",
        v.map ? safeText(v.map) : "",
      ].filter(Boolean).join(" • ");
      m.textContent = meta;

      right.appendChild(t);
      right.appendChild(m);

      item.appendChild(img);
      item.appendChild(right);

      const pick = () => onPick(v.id);
      item.addEventListener("click", pick);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") pick();
      });

      containerEl.appendChild(item);
    }
  }

  return { render };
}

