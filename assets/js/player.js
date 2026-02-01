import { safeText, setQs } from "./utils.js";
import { saveState } from "./storage.js";
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

  // Local storage is ONLY used to prevent repeat voting on the same device.
  // It does not affect displayed counts (which are global from the Worker).
  function getLocalVote(id) {
    return localStorage.getItem(`vote:${id}`);
  }

  function setLocalVote(id, vote) {
    localStorage.setItem(`vote:${id}`, vote);
  }

  function setVoteUIFromStats(stats, videoTitle) {
    // Title: global views only
    if (titleEl && typeof stats?.views === "number") {
      titleEl.textContent = `${safeText(videoTitle)} | ${stats.views} views`;
    }

    // Vote counts: global only
    const voteCountEl = document.getElementById("voteCount");
    if (voteCountEl && typeof stats?.likes === "number" && typeof stats?.dislikes === "number") {
      voteCountEl.textContent = `👍 ${stats.likes} | 👎 ${stats.dislikes}`;
    }

    // Disable vote buttons if already voted on this device
    const upBtn = document.getElementById("thumbUp");
    const downBtn = document.getElementById("thumbDown");
    if (upBtn && downBtn && currentVideoId) {
      const existingVote = getLocalVote(currentVideoId);
      upBtn.disabled = !!existingVote;
      downBtn.disabled = !!existingVote;
    }
  }

  function bindVoting(videoId) {
    const upBtn = document.getElementById("thumbUp");
    const downBtn = document.getElementById("thumbDown");

    // If the UI doesn't have these, do nothing (won't break the player)
    if (!upBtn || !downBtn) return;

    upBtn.onclick = () => sendVote(videoId, "up");
    downBtn.onclick = () => sendVote(videoId, "down");

    // Ensure disabled state is correct when loading a video
    const existingVote = getLocalVote(videoId);
    upBtn.disabled = !!existingVote;
    downBtn.disabled = !!existingVote;
  }

  function sendVote(videoId, vote) {
    if (!CONFIG.workerUrl) return;
    if (getLocalVote(videoId)) return; // one vote per device per video

    fetch(`${CONFIG.workerUrl}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: videoId, vote })
    })
      .then(r => r.json())
      .then(data => {
        // Store local lock (not displayed, just prevents spamming)
        setLocalVote(videoId, vote);

        // Update UI with GLOBAL totals returned by Worker
        setVoteUIFromStats(
          {
            views: undefined, // don't touch views here
            likes: data?.likes,
            dislikes: data?.dislikes
          },
          titleEl?.textContent?.split(" | ")[0] || ""
        );

        // Disable buttons
        const upBtn = document.getElementById("thumbUp");
        const downBtn = document.getElementById("thumbDown");
        if (upBtn) upBtn.disabled = true;
        if (downBtn) downBtn.disabled = true;
      })
      .catch(() => {
        // Fail silently
      });
  }

  function loadVideo(video) {
    countedView = false;
    currentVideoId = video.id;

    // Show loading state for global views
    if (titleEl) titleEl.textContent = `${safeText(video.title)} | loading…`;

    // ✅ Fetch GLOBAL stats (views + likes/dislikes) and display them
    if (CONFIG.workerUrl) {
      fetch(`${CONFIG.workerUrl}/video/${video.id}`)
        .then(r => r.json())
        .then(stats => {
          setVoteUIFromStats(stats, video.title);
        })
        .catch(() => {
          // No local fallback display (per your requirement: global only)
          // Keep "loading…" if Worker fails.
        });
    }

    // --- KEEP YOUR ORIGINAL METADATA UI (tags/year/map/desc) ---
    if (descEl) descEl.textContent = safeText(video.description);

    if (tagEl) {
      tagEl.innerHTML = "";
      if (Array.isArray(video.tags) && video.tags.length) {
        for (const t of video.tags) {
          const pill = document.createElement("span");
          pill.className = "tag";
          pill.textContent = safeText(t);
          tagEl.appendChild(pill);
        }
      }
    }

    if (yearEl) {
      if (video.year) {
        yearEl.textContent = safeText(video.year);
        yearEl.style.display = "";
      } else {
        yearEl.textContent = "";
        yearEl.style.display = "none";
      }
    }

    if (mapEl) {
      if (video.map) {
        mapEl.textContent = safeText(video.map);
        mapEl.style.display = "";
      } else {
        mapEl.textContent = "";
        mapEl.style.display = "none";
      }
    }

    setQs("v", safeText(video.id));

    videoEl.src = safeText(video.src);
    videoEl.load();
    saveState({ lastId: video.id });

    // Bind vote handlers for this video
    bindVoting(video.id);
  }

  function bindProgressPersistence() {
    videoEl.addEventListener("timeupdate", () => {
      // ---- COUNT VIEW AFTER 5 SECONDS (GLOBAL ONLY) ----
      if (!countedView && currentVideoId && videoEl.currentTime >= 5) {
        countedView = true;

        if (CONFIG.workerUrl) {
          fetch(`${CONFIG.workerUrl}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentVideoId })
          })
            .then(r => r.json())
            .then(data => {
              // Update UI with GLOBAL views returned by Worker (if provided)
              if (typeof data?.views === "number" && titleEl) {
                const baseTitle = titleEl.textContent.split(" | ")[0];
                titleEl.textContent = `${safeText(baseTitle)} | ${data.views} views`;
              }
            })
            .catch(() => {
              // Fail silently, do not fall back to local display
            });
        }
      }

      // ---- SAVE PROGRESS ----
      if (Math.floor(videoEl.currentTime) % 5 === 0) {
        saveState({ t: Math.floor(videoEl.currentTime) });
      }
    });
  }

  return { loadVideo, setStatus, bindProgressPersistence };
}
