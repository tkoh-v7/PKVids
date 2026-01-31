import { CONFIG } from "./config.js";
import { fetchPlaylist } from "./api.js";
import { createPlayer } from "./player.js";
import { createPlaylist } from "./playlist.js";
import { loadState, saveState } from "./storage.js";
import { qs, copyToClipboard } from "./utils.js";

const els = {
  video: document.getElementById("video"),
  title: document.getElementById("videoTitle"),
  desc: document.getElementById("videoDesc"),
  tag: document.getElementById("videoTag"),
  year: document.getElementById("videoYear"),
  map: document.getElementById("videoMap"),
  status: document.getElementById("statusNote"),

  playlist: document.getElementById("playlist"),
  count: document.getElementById("countLabel"),

  search: document.getElementById("searchInput"),

  prev: document.getElementById("prevBtn"),
  next: document.getElementById("nextBtn"),
  shuffle: document.getElementById("shuffleBtn"),
  copy: document.getElementById("copyBtn"),
};

const state = loadState();

let all = [];
let filtered = [];
let activeId = null;
let activeIndex = 0;

const player = createPlayer({
  videoEl: els.video,
  titleEl: els.title,
  descEl: els.desc,
  tagEl: els.tag,
  yearEl: els.year,
  mapEl: els.map,
  statusEl: els.status,
});

const playlist = createPlaylist({
  containerEl: els.playlist,
  countEl: els.count,
});

function getById(id) {
  return all.find(v => v.id === id) || null;
}

function applySearch() {
  const term = (els.search.value || "").trim().toLowerCase();

  filtered = all.filter(v => {
    const tags = Array.isArray(v.tags) ? v.tags.join(" ") : "";
    const hay = `${v.title || ""} ${v.description || ""} ${v.map || ""} ${tags}`.toLowerCase();
    return term ? hay.includes(term) : true;
  });

  if (!filtered.some(v => v.id === activeId)) {
    activeId = filtered[0]?.id ?? all[0]?.id ?? null;
  }

  activeIndex = Math.max(0, filtered.findIndex(v => v.id === activeId));
  renderUI();
}

function renderUI() {
  playlist.render({
    videos: filtered,
    activeId,
    onPick: id => {
      setActive(id);
      els.video.play().catch(() => {});
    }
  });
}

function setActive(id) {
  const v = getById(id);
  if (!v) return;

  activeId = v.id;
  saveState({ lastId: activeId });

  player.loadVideo(v);

  activeIndex = filtered.findIndex(x => x.id === activeId);
  renderUI();
}

async function boot() {
  all = await fetchPlaylist();
  els.search.addEventListener("input", applySearch);
  els.prev.addEventListener("click", () => {
    if (!filtered.length) return;
    activeIndex = Math.max(0, activeIndex - 1);
    setActive(filtered[activeIndex].id);
  });

  els.next.addEventListener("click", () => {
    if (!filtered.length) return;
    activeIndex = Math.min(filtered.length - 1, activeIndex + 1);
    setActive(filtered[activeIndex].id);
  });

  els.shuffle.addEventListener("click", () => {
    if (!filtered.length) return;
    const idx = Math.floor(Math.random() * filtered.length);
    activeIndex = idx;
    setActive(filtered[idx].id);
  });

  els.copy.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    if (activeId) url.searchParams.set("v", activeId);
    await copyToClipboard(url.toString());
    player.setStatus("Link copied.");
  });

  applySearch();

  const fromUrl = qs("v");
  const initial =
    (fromUrl && getById(fromUrl) ? fromUrl : null) ||
    state.lastId ||
    filtered[0]?.id ||
    all[0]?.id;

  if (initial) setActive(initial);

  player.bindProgressPersistence();
}

boot().catch(err => {
  console.error(err);
  if (els.status) els.status.textContent = "Failed to load. Check console.";
});
