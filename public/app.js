const GRID_GAP = 12;
const DESKTOP_MIN_CARD_WIDTH = 160;
const MOBILE_MIN_CARD_WIDTH = 130;
const IMAGE_ASPECT_RATIO = 1.15;
const OVERSCAN_ROWS = 1;
const GRID_PREVIEW_WIDTH = 280;
const CARD_PREVIEW_WIDTH = 280;
const THUMB_QUALITY = 70;
const THEME_STORAGE_KEY = "photo-share-gallery-theme";
const LAYOUT_STORAGE_KEY = "photo-share-gallery-layout";
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const MAX_PREVIEW_HEIGHT_RATIO = 4;
const PREVIEW_SLOTS = 4;
const VIEWER_ANIM_MS = 180;

const state = {
  albums: [],
  selectedAlbum: null,
  selectedSubfolder: null,
  folderFocusMode: false,
  mobilePane: "folders",
  viewer: {
    items: [],
    currentIndex: -1
  },
  viewerCloseTimer: null,
  virtualizer: {
    resizeObserver: null,
    scrollTarget: null,
    scrollHandler: null,
    rafId: 0,
    pool: [],
    poolSize: 0,
    layoutKey: ""
  }
};

const elements = {
  stats: document.getElementById("stats"),
  albumCount: document.getElementById("albumCount"),
  albumList: document.getElementById("albumList"),
  albumDetail: document.getElementById("albumDetail"),
  searchInput: document.getElementById("searchInput"),
  refreshButton: document.getElementById("refreshButton"),
  focusFoldersButton: document.getElementById("focusFoldersButton"),
  themeButtons: Array.from(document.querySelectorAll("[data-theme-option]")),
  viewer: document.getElementById("viewer"),
  viewerImage: document.getElementById("viewerImage"),
  viewerVideo: document.getElementById("viewerVideo"),
  viewerCaption: document.getElementById("viewerCaption"),
  closeViewer: document.getElementById("closeViewer"),
  viewerPrev: document.getElementById("viewerPrev"),
  viewerNext: document.getElementById("viewerNext")
};

elements.viewerStage = elements.viewer.querySelector(".viewer-stage");
elements.viewerToolbar = elements.viewer.querySelector(".viewer-toolbar");
elements.viewerBackdrop = elements.viewer.querySelector(".viewer-backdrop");
elements.viewerPanel = elements.viewer.querySelector(".viewer-panel");

function setViewerVisibility(isOpen) {
  if (state.viewerCloseTimer) {
    clearTimeout(state.viewerCloseTimer);
    state.viewerCloseTimer = null;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (isOpen) {
    elements.viewer.hidden = false;
    elements.viewer.classList.remove("is-closing");
    elements.viewer.classList.add("is-open");
    document.body.style.overflow = "hidden";
    return;
  }

  if (reduceMotion) {
    elements.viewer.classList.remove("is-open", "is-closing");
    elements.viewer.hidden = true;
    document.body.style.overflow = "";
    return;
  }

  elements.viewer.classList.remove("is-open");
  elements.viewer.classList.add("is-closing");
  state.viewerCloseTimer = setTimeout(() => {
    elements.viewer.classList.remove("is-closing");
    elements.viewer.hidden = true;
    document.body.style.overflow = "";
    state.viewerCloseTimer = null;
  }, VIEWER_ANIM_MS);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function createMediaUrl(relativePath) {
  return `/media/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function createPreviewUrl(relativePath, width = GRID_PREVIEW_WIDTH, quality = THUMB_QUALITY) {
  const encodedPath = relativePath.split("/").map(encodeURIComponent).join("/");
  return `/thumb/${encodedPath}`;
}

function isVideoPath(relativePath) {
  const extension = relativePath.slice(relativePath.lastIndexOf(".")).toLowerCase();
  return VIDEO_EXTENSIONS.has(extension);
}

function attachPreviewFallback(img, originalPath) {
  img.addEventListener(
    "error",
    () => {
      const fallbackSrc = createMediaUrl(originalPath);
      if (img.src !== fallbackSrc) {
        img.src = fallbackSrc;
      }
    },
    { once: true }
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyTheme(themeName) {
  const theme = themeName || "warm";
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  elements.themeButtons.forEach((button) => {
    button.dataset.active = button.getAttribute("data-theme-option") === theme ? "true" : "false";
  });
}

function applyFolderFocusMode(isFocused) {
  state.folderFocusMode = !!isFocused;
  document.body.dataset.folderFocus = state.folderFocusMode ? "true" : "false";
  localStorage.setItem(LAYOUT_STORAGE_KEY, state.folderFocusMode ? "focus" : "default");
  elements.focusFoldersButton.setAttribute(
    "aria-label",
    state.folderFocusMode ? "Show details" : "Focus folders"
  );
  elements.focusFoldersButton.setAttribute(
    "title",
    state.folderFocusMode ? "Show details" : "Focus folders"
  );
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "warm";
  applyTheme(savedTheme);
}

function initializeLayoutMode() {
  applyFolderFocusMode(true);
}

function renderStats(payload) {
  elements.stats.innerHTML = `
    <article class="stat-card">
      <span class="stat-label">Folders</span>
      <strong class="stat-value">${formatNumber(payload.totals.albums)}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">Images</span>
      <strong class="stat-value">${Number.isFinite(payload.totals.images) ? formatNumber(payload.totals.images) : "On demand"}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">Videos</span>
      <strong class="stat-value">${Number.isFinite(payload.totals.videos) ? formatNumber(payload.totals.videos) : "On demand"}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">Archives</span>
      <strong class="stat-value">${Number.isFinite(payload.totals.archives) ? formatNumber(payload.totals.archives) : "On demand"}</strong>
    </article>
  `;
}

function renderAlbums(albums) {
  elements.albumCount.textContent = `${formatNumber(albums.length)} visible`;

  if (albums.length === 0) {
    elements.albumList.innerHTML = `<div class="empty-state">No folders matched your search.</div>`;
    return;
  }

  elements.albumList.innerHTML = albums
    .map(
      (album) => `
        <article class="album-card">
          <div class="album-preview">
            ${
              album.previewImages && album.previewImages.length
                ? buildPreviewSlots(album.previewImages, album.name)
                : `<div class="placeholder"></div><div class="placeholder"></div><div class="placeholder"></div><div class="placeholder"></div>`
            }
          </div>
          <div class="album-card-content">
            <h3>${escapeHtml(album.name)}</h3>
            <div class="album-meta">
                ${
                  Number.isFinite(album.imageCount)
                    ? `<span>${formatNumber(album.imageCount)} images</span>`
                    : `<span>Scan on open</span>`
                }
                ${
                  Number.isFinite(album.videoCount)
                    ? `<span>${formatNumber(album.videoCount)} videos</span>`
                    : ``
                }
                ${
                  Number.isFinite(album.subfolderCount)
                  ? `<span>${formatNumber(album.subfolderCount)} categories</span>`
                  : ``
              }
              ${
                Number.isFinite(album.archiveCount)
                  ? `<span>${formatNumber(album.archiveCount)} archives</span>`
                  : ``
              }
              ${
                Number.isFinite(album.folderCount)
                  ? `<span>${formatNumber(album.folderCount)} folders</span>`
                  : ``
              }
            </div>
            <button type="button" data-album-name="${escapeHtml(album.name)}">Open folder</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.albumList.querySelectorAll("[data-album-name]").forEach((button) => {
    button.addEventListener("click", () => {
      loadAlbum(button.getAttribute("data-album-name"));
    });
  });

  elements.albumList.querySelectorAll(".album-preview").forEach((container) => {
    hydratePreviewGridImages(container);
  });

  elements.albumList.querySelectorAll(".album-card").forEach((card, index) => {
    card.classList.add("reveal-item");
    card.style.setProperty("--stagger-index", String(index % 12));
  });
}

function cleanupVirtualizer() {
  const { resizeObserver, scrollTarget, scrollHandler, rafId } = state.virtualizer;

  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  if (scrollTarget && scrollHandler) {
    scrollTarget.removeEventListener("scroll", scrollHandler);
  }

  if (scrollHandler) {
    window.removeEventListener("resize", scrollHandler);
  }

  if (rafId) {
    cancelAnimationFrame(rafId);
  }

  state.virtualizer = {
    resizeObserver: null,
    scrollTarget: null,
    scrollHandler: null,
    rafId: 0,
    pool: [],
    poolSize: 0,
    layoutKey: ""
  };
}

function isWindowScrollMode() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function setMobilePane(mode) {
  state.mobilePane = mode;
  document.body.dataset.mobilePane = mode;

  const folderPanel = document.querySelector(".folder-panel");
  const detailPanel = document.querySelector(".detail-panel");
  if (!folderPanel || !detailPanel) {
    return;
  }

  if (isWindowScrollMode()) {
    folderPanel.style.display = mode === "detail" ? "none" : "";
    detailPanel.style.display = mode === "folders" ? "none" : "";
    const activePanel = mode === "detail" ? detailPanel : folderPanel;
    triggerPaneReveal(activePanel);
  } else {
    folderPanel.style.display = "";
    detailPanel.style.display = "";
  }
}

function triggerPaneReveal(panelElement) {
  if (!panelElement || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  panelElement.classList.remove("pane-reveal");
  panelElement.offsetHeight;
  panelElement.classList.add("pane-reveal");
  setTimeout(() => {
    panelElement.classList.remove("pane-reveal");
  }, 320);
}

function getScrollTarget() {
  return isWindowScrollMode() ? window : elements.albumDetail.closest(".detail-panel");
}

function getViewportMetrics(grid) {
  const scrollTarget = getScrollTarget();
  const gridRect = grid.getBoundingClientRect();

  if (scrollTarget === window) {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    return {
      scrollTop,
      viewportHeight: window.innerHeight,
      gridTop: gridRect.top + scrollTop
    };
  }

  const panelRect = scrollTarget.getBoundingClientRect();
  return {
    scrollTop: scrollTarget.scrollTop,
    viewportHeight: scrollTarget.clientHeight,
    gridTop: gridRect.top - panelRect.top + scrollTarget.scrollTop
  };
}

function getGridLayout(totalImages) {
  const grid = elements.albumDetail.querySelector("[data-image-grid]");
  if (!grid) {
    return null;
  }

  const minCardWidth = window.matchMedia("(max-width: 640px)").matches
    ? MOBILE_MIN_CARD_WIDTH
    : DESKTOP_MIN_CARD_WIDTH;
  const gridWidth = Math.max(grid.clientWidth, minCardWidth);
  const columns = Math.max(1, Math.floor((gridWidth + GRID_GAP) / (minCardWidth + GRID_GAP)));
  const itemWidth = Math.floor((gridWidth - GRID_GAP * (columns - 1)) / columns);
  const rowHeight = Math.ceil(itemWidth * IMAGE_ASPECT_RATIO);
  const rowStride = rowHeight + GRID_GAP;
  const totalRows = Math.ceil(totalImages / columns);

  return {
    grid,
    columns,
    itemWidth,
    rowHeight,
    rowStride,
    totalRows,
    totalHeight: Math.max(0, totalRows * rowHeight + Math.max(0, totalRows - 1) * GRID_GAP)
  };
}

function getActiveImageCollection() {
  return state.selectedSubfolder && state.selectedSubfolder.images ? state.selectedSubfolder.images : [];
}

function getActiveVideoCollection() {
  return state.selectedSubfolder && state.selectedSubfolder.videos ? state.selectedSubfolder.videos : [];
}

function getActiveViewerCollection() {
  if (!state.selectedSubfolder) {
    return [];
  }

  return [...getActiveImageCollection(), ...getActiveVideoCollection()].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, "en")
  );
}

function isAcceptablePreviewImage(img) {
  return !!img.naturalWidth && !!img.naturalHeight && img.naturalHeight / img.naturalWidth <= MAX_PREVIEW_HEIGHT_RATIO;
}

function buildPreviewSlots(previewImages, altText) {
  const candidates = escapeHtml((previewImages || []).join("|"));
  return Array.from({ length: PREVIEW_SLOTS }, (_, index) => {
    const primary = previewImages[index] || "";
    return `<img loading="lazy" src="${primary ? createPreviewUrl(primary, CARD_PREVIEW_WIDTH, THUMB_QUALITY) : ""}" data-preview-slot="${index}" data-preview-candidates="${candidates}" data-preview-path="${escapeHtml(primary)}" alt="${escapeHtml(altText)}" ${primary ? "" : "hidden"} />`;
  }).join("");
}

function hydratePreviewGridImages(container) {
  const slotImages = Array.from(container.querySelectorAll("[data-preview-slot]"));
  if (!slotImages.length) {
    return;
  }

  const candidates = (slotImages[0].dataset.previewCandidates || "").split("|").filter(Boolean);
  const used = new Set();
  let nextCandidateIndex = 0;

  const assignNextCandidate = (img) => {
    while (nextCandidateIndex < candidates.length && used.has(candidates[nextCandidateIndex])) {
      nextCandidateIndex += 1;
    }

    if (nextCandidateIndex >= candidates.length) {
      img.hidden = true;
      img.removeAttribute("src");
      return false;
    }

    const candidate = candidates[nextCandidateIndex];
    nextCandidateIndex += 1;
    used.add(candidate);
    img.hidden = false;
    img.dataset.previewPath = candidate;
    img.src = createPreviewUrl(candidate, CARD_PREVIEW_WIDTH, THUMB_QUALITY);
    return true;
  };

  slotImages.forEach((img) => {
    const originalPath = img.dataset.previewPath;
    if (originalPath) {
      used.add(originalPath);
    } else {
      assignNextCandidate(img);
    }

    img.addEventListener("load", () => {
      if (isAcceptablePreviewImage(img)) {
        attachPreviewFallback(img, img.dataset.previewPath);
        return;
      }

      while (assignNextCandidate(img)) {
        return;
      }
    });

    img.addEventListener("error", () => {
      assignNextCandidate(img);
    });
  });
}

function normalizeAlbumDetail(album) {
  let normalizedSubfolders = Array.isArray(album.subfolders) ? album.subfolders : [];

  if (!normalizedSubfolders.length && Array.isArray(album.images) && album.images.length) {
    const subfolderMap = new Map();
    const looseImages = [];

    album.images.forEach((image) => {
      const directory = image.directory || ".";
      const firstSegment = directory === "." ? "." : directory.split("/")[0];

      if (firstSegment === ".") {
        looseImages.push(image);
        return;
      }

      if (!subfolderMap.has(firstSegment)) {
        subfolderMap.set(firstSegment, {
          name: firstSegment,
          path: firstSegment,
          imageCount: 0,
          previewImages: [],
          images: []
        });
      }

      const subfolder = subfolderMap.get(firstSegment);
      subfolder.imageCount += 1;
      subfolder.images.push(image);
      if (subfolder.previewImages.length < 4) {
        subfolder.previewImages.push(image.relativePath);
      }
    });

    normalizedSubfolders = Array.from(subfolderMap.values()).sort((a, b) => a.name.localeCompare(b.name, "en"));

    if (looseImages.length) {
      normalizedSubfolders.unshift({
        name: ".",
        path: ".",
        imageCount: looseImages.length,
        previewImages: looseImages.slice(0, 4).map((image) => image.relativePath),
        images: looseImages
      });
    }
  }

  return {
    ...album,
    subfolders: normalizedSubfolders,
    archives: Array.isArray(album.archives) ? album.archives : [],
    archiveCount: Number.isFinite(album.archiveCount)
      ? album.archiveCount
      : Array.isArray(album.archives)
        ? album.archives.length
        : 0,
    folderCount: Number.isFinite(album.folderCount) ? album.folderCount : normalizedSubfolders.length,
    imageCount: Number.isFinite(album.imageCount)
      ? album.imageCount
      : Array.isArray(album.images)
        ? album.images.length
        : 0,
    videoCount: Number.isFinite(album.videoCount)
      ? album.videoCount
      : Array.isArray(album.videos)
        ? album.videos.length
        : 0,
    subfolder: album.subfolder || ".",
    images: Array.isArray(album.images) ? album.images : [],
    videos: Array.isArray(album.videos) ? album.videos : []
  };
}

function createVirtualCard() {
  const article = document.createElement("article");
  article.className = "image-card image-card-virtual";

  const button = document.createElement("button");
  button.type = "button";

  const thumb = document.createElement("div");
  thumb.className = "image-thumb image-thumb-fill";

  const img = document.createElement("img");
  img.loading = "lazy";
  thumb.appendChild(img);

  const caption = document.createElement("div");
  caption.className = "image-caption image-caption-hover";

  button.appendChild(thumb);
  button.appendChild(caption);
  article.appendChild(button);

  return { article, button, img, caption };
}

function ensurePool(grid, neededCount) {
  while (state.virtualizer.pool.length < neededCount) {
    const card = createVirtualCard();
    state.virtualizer.pool.push(card);
    grid.appendChild(card.article);
  }

  state.virtualizer.pool.forEach((card, index) => {
    card.article.style.display = index < neededCount ? "block" : "none";
  });

  state.virtualizer.poolSize = neededCount;
}

function updatePoolCard(card, image, index, layout) {
  const column = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  const x = column * (layout.itemWidth + GRID_GAP);
  const y = row * layout.rowStride;
  const previewSrc = createPreviewUrl(image.relativePath, GRID_PREVIEW_WIDTH, THUMB_QUALITY);

  card.article.style.width = `${layout.itemWidth}px`;
  card.article.style.height = `${layout.rowHeight}px`;
  card.article.style.transform = `translate(${x}px, ${y}px)`;

  if (card.article.dataset.index !== String(index)) {
    card.article.dataset.index = String(index);
    card.img.src = previewSrc;
    card.img.alt = image.name;
    card.img.onerror = () => {
      const fallbackSrc = createMediaUrl(image.relativePath);
      if (card.img.src !== fallbackSrc) {
        card.img.src = fallbackSrc;
      }
    };
    card.caption.textContent = image.directory === "." ? image.name : image.relativePath;
    card.button.onclick = () => {
      openViewer(image.relativePath);
    };
  }
}

function renderVirtualizedGrid(force = false) {
  const images = getActiveImageCollection();
  const grid = elements.albumDetail.querySelector("[data-image-grid]");
  const progress = elements.albumDetail.querySelector("[data-image-progress]");

  if (!grid || !progress) {
    return;
  }

  const layout = getGridLayout(images.length);
  if (!layout) {
    return;
  }

  const layoutKey = `${layout.columns}:${layout.itemWidth}:${layout.rowHeight}`;
  if (force && state.virtualizer.layoutKey !== layoutKey) {
    state.virtualizer.pool.forEach((card) => {
      card.article.dataset.index = "";
    });
    state.virtualizer.layoutKey = layoutKey;
  }

  grid.style.height = `${layout.totalHeight}px`;

  const metrics = getViewportMetrics(grid);
  const visibleTop = Math.max(0, metrics.scrollTop - metrics.gridTop);
  const visibleBottom = visibleTop + metrics.viewportHeight;
  const startRow = Math.max(0, Math.floor(visibleTop / layout.rowStride) - OVERSCAN_ROWS);
  const endRow = Math.min(
    layout.totalRows - 1,
    Math.ceil(visibleBottom / layout.rowStride) + OVERSCAN_ROWS
  );

  const startIndex = startRow * layout.columns;
  const endIndex = Math.min(images.length, (endRow + 1) * layout.columns);
  const visibleCount = Math.max(0, endIndex - startIndex);

  progress.textContent = `Showing ${formatNumber(visibleCount)} visible cards of ${formatNumber(images.length)} images`;

  ensurePool(grid, visibleCount);

  for (let poolIndex = 0; poolIndex < visibleCount; poolIndex += 1) {
    updatePoolCard(state.virtualizer.pool[poolIndex], images[startIndex + poolIndex], startIndex + poolIndex, layout);
  }
}

function requestVirtualizedGridRender(force = false) {
  if (state.virtualizer.rafId) {
    cancelAnimationFrame(state.virtualizer.rafId);
  }

  state.virtualizer.rafId = requestAnimationFrame(() => {
    state.virtualizer.rafId = 0;
    renderVirtualizedGrid(force);
  });
}

function setupVirtualizedGrid() {
  cleanupVirtualizer();

  const grid = elements.albumDetail.querySelector("[data-image-grid]");
  if (!grid || !getActiveImageCollection().length) {
    return;
  }

  const scrollTarget = getScrollTarget();
  const scrollHandler = () => requestVirtualizedGridRender(false);

  scrollTarget.addEventListener("scroll", scrollHandler, { passive: true });
  window.addEventListener("resize", scrollHandler);

  const resizeObserver = new ResizeObserver(() => {
    requestVirtualizedGridRender(true);
  });
  resizeObserver.observe(grid);

  state.virtualizer = {
    resizeObserver,
    scrollTarget,
    scrollHandler,
    rafId: 0,
    pool: [],
    poolSize: 0,
    layoutKey: ""
  };

  requestVirtualizedGridRender(true);
}

function renderAlbumDetail(album) {
  const currentNode = state.selectedSubfolder || album;
  const shouldShowImageGrid = !!(state.selectedSubfolder && currentNode.images.length > 0);
  const shouldShowVideoGrid = !!(state.selectedSubfolder && currentNode.videos.length > 0);
  const subfolderCards = album.subfolders
    .map(
      (subfolder) => `
        <article class="subfolder-card">
          <button type="button" class="subfolder-button" data-subfolder-path="${escapeHtml(subfolder.path || subfolder.name)}">
              <div class="subfolder-preview">
              ${
                subfolder.previewImages && subfolder.previewImages.length
                  ? buildPreviewSlots(subfolder.previewImages, subfolder.name)
                  : `<div class="placeholder"></div><div class="placeholder"></div><div class="placeholder"></div><div class="placeholder"></div>`
              }
            </div>
            <div class="subfolder-content">
              <h3>${escapeHtml(subfolder.name)}</h3>
              <div class="album-meta">
                ${
                  Number.isFinite(subfolder.imageCount)
                    ? `<span>${formatNumber(subfolder.imageCount)} images</span>`
                    : `<span>Open to scan</span>`
                }
                ${
                  Number.isFinite(subfolder.videoCount)
                    ? `<span>${formatNumber(subfolder.videoCount)} videos</span>`
                    : ``
                }
              </div>
            </div>
          </button>
        </article>
      `
    )
    .join("");

  const archivesMarkup = currentNode.archives.length
    ? `
      <section class="archive-list">
        <h3>Archives still in this folder</h3>
        <p>${formatNumber(currentNode.archiveCount)} archive files detected.</p>
        <ul>
          ${currentNode.archives
            .slice(0, 20)
            .map((archive) => `<li>${escapeHtml(archive.name)} (${formatSize(archive.sizeBytes)})</li>`)
            .join("")}
        </ul>
        ${currentNode.archives.length > 20 ? `<p>Showing the first 20 archives.</p>` : ""}
      </section>
    `
    : "";

  elements.albumDetail.classList.remove("empty-state");
  if (state.selectedSubfolder) {
    elements.albumDetail.innerHTML = `
      <div class="detail-header">
        <div>
          <p class="eyebrow">Subfolder</p>
          <h2>${escapeHtml(currentNode.name)}</h2>
        </div>
        <button type="button" class="subfolder-back-button" data-clear-subfolder>Back to folders</button>
      </div>
      ${archivesMarkup}
      <section class="subfolder-images" data-subfolder-images ${shouldShowImageGrid ? "" : "hidden"}>
        <div class="subfolder-section-header subfolder-active-header">
          <div>
            <p class="eyebrow">Images In This Folder</p>
            <h3 data-active-subfolder-title>${escapeHtml(currentNode.name)}</h3>
          </div>
        </div>
        <div class="image-progress-row">
          <p class="image-progress" data-image-progress></p>
        </div>
        <section class="image-grid image-grid-virtual" data-image-grid></section>
      </section>
      <section class="subfolder-videos" data-subfolder-videos ${shouldShowVideoGrid ? "" : "hidden"}>
        <div class="subfolder-section-header subfolder-active-header">
          <div>
            <p class="eyebrow">Videos In This Folder</p>
            <h3>${escapeHtml(currentNode.name)}</h3>
          </div>
        </div>
        <div class="video-grid">
          ${currentNode.videos
            .map(
              (video) => `
                <article class="media-card video-card">
                  <button type="button" class="video-button" data-video-path="${escapeHtml(video.relativePath)}">
                    <div class="video-thumb">
                      <video muted preload="metadata" playsinline src="${createMediaUrl(video.relativePath)}"></video>
                      <span class="video-badge">Video</span>
                    </div>
                    <div class="image-caption">${escapeHtml(video.directory === "." ? video.name : video.relativePath)}</div>
                  </button>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  } else {
    elements.albumDetail.innerHTML = `
      <div class="detail-header">
        <div>
          <p class="eyebrow">Folder</p>
          <h2>${escapeHtml(album.name)}</h2>
        </div>
        <div class="detail-header-actions">
          <button type="button" class="mobile-folder-back-button" data-mobile-show-folders>Folder List</button>
          <div class="album-meta">
            <span>${formatNumber(album.subfolders.length)} subfolders</span>
            <span>${formatNumber(album.videoCount || 0)} videos</span>
            <span>${formatNumber(album.archiveCount || 0)} archives</span>
          </div>
        </div>
      </div>
      ${archivesMarkup}
      <section class="subfolder-section">
        <div class="subfolder-section-header">
          <div>
            <h3>Folders</h3>
            <p>Select one subfolder to open its images.</p>
          </div>
        </div>
        <div class="subfolder-grid">${subfolderCards}</div>
      </section>
    `;
  }

  elements.albumDetail.querySelectorAll(".subfolder-preview").forEach((container) => {
    hydratePreviewGridImages(container);
  });

  elements.albumDetail.querySelectorAll(".subfolder-card, .video-card").forEach((card, index) => {
    card.classList.add("reveal-item");
    card.style.setProperty("--stagger-index", String(index % 12));
  });

  elements.albumDetail.querySelectorAll("[data-video-path]").forEach((button) => {
    button.addEventListener("click", () => {
      openViewer(button.getAttribute("data-video-path"));
    });
  });

  if (shouldShowImageGrid) {
    setupVirtualizedGrid();
  } else {
    closeSubfolder();
  }
}

async function fetchJson(url) {
  console.log("[gallery-ui] fetch start", url);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed." }));
    console.error("[gallery-ui] fetch error", url, payload.error || "Request failed.");
    throw new Error(payload.error || "Request failed.");
  }
  const data = await response.json();
  console.log("[gallery-ui] fetch done", url, data);
  return data;
}

async function loadAlbums(search = "") {
  console.log("[gallery-ui] loadAlbums", search);
  elements.albumList.innerHTML = `<div class="empty-state">Scanning folders...</div>`;

  const payload = await fetchJson(`/api/albums?search=${encodeURIComponent(search)}`);
  state.albums = payload.albums;
  renderStats(payload);
  renderAlbums(payload.albums);
}

async function loadAlbum(name) {
  console.log("[gallery-ui] loadAlbum", name);
  cleanupVirtualizer();
  elements.albumDetail.classList.remove("empty-state");
  elements.albumDetail.innerHTML = `<div class="empty-state">Loading folder...</div>`;

  const album = await fetchJson(`/api/album?name=${encodeURIComponent(name)}`);
  state.selectedAlbum = normalizeAlbumDetail(album);
  state.selectedSubfolder = null;
  applyFolderFocusMode(false);
  renderAlbumDetail(state.selectedAlbum);
  if (isWindowScrollMode()) {
    setMobilePane("detail");
  }
}

async function openSubfolder(subfolderPath) {
  console.log("[gallery-ui] openSubfolder", subfolderPath);
  if (!state.selectedAlbum) {
    return;
  }

  const detail = await fetchJson(
    `/api/subfolder?album=${encodeURIComponent(state.selectedAlbum.name)}&name=${encodeURIComponent(subfolderPath)}`
  );
  const normalized = normalizeAlbumDetail(detail);
  state.selectedSubfolder = normalized;
  renderAlbumDetail(state.selectedAlbum);
  if (isWindowScrollMode()) {
    setMobilePane("detail");
  }
}

function closeSubfolder() {
  state.selectedSubfolder = null;
  cleanupVirtualizer();

  const section = elements.albumDetail.querySelector("[data-subfolder-images]");
  const grid = elements.albumDetail.querySelector("[data-image-grid]");
  const progress = elements.albumDetail.querySelector("[data-image-progress]");
  if (section) {
    section.hidden = true;
  }
  if (grid) {
    grid.innerHTML = "";
    grid.style.height = "0px";
  }
  if (progress) {
    progress.textContent = "";
  }
}

function openViewer(relativePath, caption) {
  const items = getActiveViewerCollection();
  const itemIndex = items.findIndex((item) => item.relativePath === relativePath);
  state.viewer.items = items;
  state.viewer.currentIndex = itemIndex;
  renderViewerItem(relativePath, caption || relativePath);
  setViewerVisibility(true);
}

function renderViewerItem(relativePath, caption) {
  const mediaUrl = createMediaUrl(relativePath);

  if (isVideoPath(relativePath)) {
    elements.viewerImage.hidden = true;
    elements.viewerImage.src = "";
    elements.viewerVideo.hidden = false;
    elements.viewerVideo.src = mediaUrl;
    elements.viewerVideo.currentTime = 0;
  } else {
    elements.viewerVideo.pause();
    elements.viewerVideo.hidden = true;
    elements.viewerVideo.removeAttribute("src");
    elements.viewerVideo.load();
    elements.viewerImage.hidden = false;
    elements.viewerImage.src = mediaUrl;
  }

  elements.viewerCaption.textContent = caption;
  updateViewerControls();
}

function updateViewerControls() {
  const { currentIndex, items } = state.viewer;
  const hasItems = Array.isArray(items) && items.length > 0 && currentIndex >= 0;

  elements.viewerPrev.disabled = !hasItems || currentIndex <= 0;
  elements.viewerNext.disabled = !hasItems || currentIndex >= items.length - 1;
}

function stepViewer(direction) {
  const { items, currentIndex } = state.viewer;
  if (!Array.isArray(items) || items.length === 0 || currentIndex < 0) {
    return;
  }

  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    updateViewerControls();
    return;
  }

  state.viewer.currentIndex = nextIndex;
  const nextItem = items[nextIndex];
  renderViewerItem(nextItem.relativePath, nextItem.relativePath);
}

function closeViewer() {
  setViewerVisibility(false);
  elements.viewerVideo.pause();
  elements.viewerVideo.hidden = true;
  elements.viewerVideo.removeAttribute("src");
  elements.viewerVideo.load();
  elements.viewerImage.hidden = false;
  elements.viewerImage.src = "";
  elements.viewerCaption.textContent = "";
  state.viewer.items = [];
  state.viewer.currentIndex = -1;
  updateViewerControls();
}

elements.searchInput.addEventListener("input", () => {
  loadAlbums(elements.searchInput.value).catch(showError);
});

elements.refreshButton.addEventListener("click", () => {
  loadAlbums(elements.searchInput.value).catch(showError);
});

elements.focusFoldersButton.addEventListener("click", () => {
  applyFolderFocusMode(!state.folderFocusMode);
});

elements.themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTheme(button.getAttribute("data-theme-option"));
  });
});

elements.albumDetail.addEventListener("click", (event) => {
  const subfolderButton = event.target.closest("[data-subfolder-path]");
  if (subfolderButton) {
    openSubfolder(subfolderButton.getAttribute("data-subfolder-path")).catch(showError);
    return;
  }

  const backButton = event.target.closest("[data-clear-subfolder]");
  if (backButton) {
    closeSubfolder();
    renderAlbumDetail(state.selectedAlbum);
  }

  const mobileListButton = event.target.closest("[data-mobile-show-folders]");
  if (mobileListButton) {
    setMobilePane("folders");
  }
});

window.addEventListener("resize", () => {
  if (!isWindowScrollMode()) {
    setMobilePane("folders");
  } else if (state.selectedAlbum) {
    setMobilePane("detail");
  }
});

elements.closeViewer.addEventListener("click", closeViewer);
elements.viewerPrev.addEventListener("click", () => {
  stepViewer(-1);
});
elements.viewerNext.addEventListener("click", () => {
  stepViewer(1);
});
elements.viewerBackdrop.addEventListener("click", closeViewer);

["click", "pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
  [elements.viewerPanel, elements.viewerStage, elements.viewerToolbar, elements.viewerImage, elements.viewerVideo].forEach(
    (element) => {
      if (!element) {
        return;
      }

      element.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    }
  );
});

document.addEventListener("keydown", (event) => {
  if (elements.viewer.hidden) {
    return;
  }

  if (event.key === "ArrowLeft") {
    stepViewer(-1);
  } else if (event.key === "ArrowRight") {
    stepViewer(1);
  } else if (event.key === "Escape") {
    closeViewer();
  }
});

function showError(error) {
  console.error("[gallery-ui] showError", error);
  elements.albumList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
}

initializeTheme();
initializeLayoutMode();
setMobilePane("folders");
setViewerVisibility(false);
loadAlbums().catch(showError);
