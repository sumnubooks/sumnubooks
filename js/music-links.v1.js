(() => {
  // STREAM buttons: one per album block
  function wireStreamButtons() {
    document.querySelectorAll("[data-album]").forEach(album => {
      const streamUrl = (album.getAttribute("data-stream") || "").trim();
      const btn = album.querySelector("[data-stream-btn]");
      if (!btn) return;

      if (!streamUrl) {
        btn.style.display = "none";
        btn.setAttribute("href", "#");
      } else {
        btn.style.display = "inline-flex";
        btn.setAttribute("href", streamUrl);
      }
    });
  }

  // VIDEO buttons: one per track-row when data-video exists
  function wireVideoButtons() {
    document.querySelectorAll("[data-track]").forEach(track => {
      const videoUrl = (track.getAttribute("data-video") || "").trim();

      // If the HTML already includes a video button placeholder, use it.
      // If not, we’ll create one and append it.
      let btn = track.querySelector("[data-video-btn]");
      if (!btn) {
        // create button if missing
        btn = document.createElement("a");
        btn.textContent = "VIDEO";
        btn.className = "btn-video";
        btn.setAttribute("data-video-btn", "");
        btn.setAttribute("target", "_blank");
        btn.setAttribute("rel", "noopener");

        // Try to place it at end; fall back to append.
        const slot = track.querySelector(".track-video-slot");
        if (slot) slot.appendChild(btn);
        else track.appendChild(btn);
      }

      if (!videoUrl) {
        btn.style.display = "none";
        btn.setAttribute("href", "#");
      } else {
        btn.style.display = "inline-flex";
        btn.setAttribute("href", videoUrl);
      }
    });
  }

  // Run on load
  wireStreamButtons();
  wireVideoButtons();

  // If your page dynamically changes tracklists later, you can re-run these:
  // window.refreshMusicLinks = () => { wireStreamButtons(); wireVideoButtons(); };
})();