import { safeText, setQs } from "./utils.js";
import { saveState, incrementView, getViews } from "./storage.js";
import { CONFIG } from "./config.js";

export function createPlayer({
  videoEl,
  titleEl,
  descEl,
  tagEl,
  yearEl,
  mapEl,
  statusEl
}) {
  let countedView = false;
  let currentVideoId = null;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = safeText(msg);
  }

  function getLocalVote(id) {
    return localStorage.getItem(`vote:${id}`);
  }

  function setLocalVote(id, vote) {
    localStorage.setItem(`vote:${id}`, vote);
  }

  function loadVideo(video) {
    countedView = false;
    currentVideoId = video.id;

    titleEl.textContent = `${safeText(video.title)} | loading…`;

    // ---- LOAD GLOBAL STATS ----
    fetch(`${CONFIG.workerUrl}/video/${video.id}`)
      .then(r => r.json())
      .then(data => {
        titleEl.textContent =
          `${safeText(video.title)} | ${data.views} views`;
        document.getElementById("voteCount").textContent =
          `👍 ${data.likes} | 👎 ${data.dislikes}`;

        if (getLocalVote(video.id)) {
          document.getElementById("thumbUp").disabled = true;
          document.getElementById("thumbDown").disabled = true;
        }
      })
      .catch(() => {
        const local = getViews(video.id);
        titleEl.textContent =
          `${safeText(video.title)} | ${local} views`;
      });

    descEl.textContent = safeText(video.description);

    setQs("v", safeText(video.id));
    videoEl.src = safeText(video.src);
    videoEl.load();
    saveState({ lastId: video.id });

    bindVoting(video.id);
  }

  function bindVoting(id) {
    const up = document.getElementById("thumbUp");
    const down = document.getElementById("thumbDown");

    if (!up || !down) return;

    up.onclick = () => vote(id, "up");
    down.onclick = () => vote(id, "down");
  }

  function vote(id, type) {
    if (getLocalVote(id)) return;

    fetch(`${CONFIG.workerUrl}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, vote: type })
    })
      .then(r => r.json())
      .then(data => {
        setLocalVote(id, type);
        document.getElementById("voteCount").textContent =
          `👍 ${data.likes} | 👎 ${data.dislikes}`;
        document.getElementById("thumbUp").disabled = true;
        document.getElementById("thumbDown").disabled = true;
      });
  }

  function bindProgressPersistence() {
    videoEl.addEventListener("timeupdate", () => {
      if (!countedView && currentVideoId && videoEl.currentTime >= 5) {
        countedView = true;

        // local fallback
        incrementView(currentVideoId);

        // global view
        fetch(`${CONFIG.workerUrl}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentVideoId })
        }).catch(() => {});
      }

      if (Math.floor(videoEl.currentTime) % 5 === 0) {
        saveState({ t: Math.floor(videoEl.currentTime) });
      }
    });
  }

  return { loadVideo, setStatus, bindProgressPersistence };
}
