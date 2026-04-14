const GRID_GAP = 12;
const DESKTOP_MIN_CARD_WIDTH = 160;
const MOBILE_MIN_CARD_WIDTH = 130;
const IMAGE_ASPECT_RATIO = 1.15;
const OVERSCAN_ROWS = 1;
const GRID_PREVIEW_WIDTH = 280;
const CARD_PREVIEW_WIDTH = 280;
const THUMB_QUALITY = 70;
const THEME_STORAGE_KEY = "photo-share-gallery-theme";
const LANGUAGE_STORAGE_KEY = "photo-share-gallery-lang";
const LAYOUT_STORAGE_KEY = "photo-share-gallery-layout";
const FAVORITES_STORAGE_KEY = "photo-share-gallery-favorites-v1";
const RECENTS_STORAGE_KEY = "photo-share-gallery-recents-v1";
const FILTERS_STORAGE_KEY = "photo-share-gallery-filters-v1";
const SUBFOLDER_CARD_SIZE_STORAGE_KEY = "photo-share-gallery-subfolder-card-size-v1";
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const MIN_PREVIEW_HEIGHT_RATIO = 0.35;
const MAX_PREVIEW_HEIGHT_RATIO = 3.2;
const PREVIEW_SLOTS = 4;
const VIEWER_ANIM_MS = 180;
const PANEL_SWITCH_MS = 240;
const MAX_RECENT_ITEMS = 20;
const HERO_ROTATE_MS = 4200;

function detectLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "zh") {
      return stored;
    }
  } catch (_error) {
    // Ignore local storage access errors.
  }
  const langs = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language || "en"];
  const normalized = langs
    .map((value) => String(value || "").toLowerCase())
    .find((value) => value);
  return normalized && normalized.startsWith("zh") ? "zh" : "en";
}

const UI_LANG = detectLanguage();

const I18N = {
  en: {
    page_title: "Photo Share Gallery",
    brand_kicker: "Atlas Gallery",
    brand_sub: "Professional media showcase workspace",
    hero_eyebrow: "Commercial-ready media platform",
    hero_title: "Atlas Gallery Pro",
    hero_copy:
      "Curate collections, spotlight media, and manage a production-grade library with faster navigation and polished presentation controls.",
    search_placeholder: "Search a collection name",
    search_folders: "Search collections",
    search: "Search",
    display_sort_controls: "Display and sorting controls",
    appearance_sorting: "Appearance & Sorting",
    appearance_presets: "Appearance presets",
    appearance: "Appearance",
    theme_warm: "Warm",
    theme_paper: "Paper",
    theme_studio: "Studio",
    theme_forest: "Forest",
    language: "Language",
    library_controls: "Library controls",
    folder_scope: "Collection Scope",
    all_folders: "All collections",
    favorites_only: "Favorites only",
    recently_opened: "Recently opened",
    folder_sort: "Collection Sort",
    name_asc: "Name A-Z",
    name_desc: "Name Z-A",
    most_media_first: "Most media first",
    subfolder_scope: "Collection Scope",
    all_subfolders: "All collections",
    subfolder_sort: "Collection Sort",
    media_type: "Media Type",
    images_videos: "Images + Videos",
    images_only: "Images only",
    videos_only: "Videos only",
    media_sort: "Media Sort",
    subfolder_card_size: "Collection Card Size",
    recent_folders: "Recent collections",
    folders: "Collections",
    images: "images",
    videos: "videos",
    archives: "archives",
    focus_folders: "Focus collections",
    show_details: "Show details",
    select_folder_prompt: "Select a collection to load its media grid.",
    media_viewer: "Media viewer",
    media_thumbnails: "Media thumbnails",
    thumbnails: "Thumbnails",
    previous_media: "Previous media",
    previous: "Previous",
    close_viewer: "Close viewer",
    close: "Close",
    next_media: "Next media",
    next: "Next",
    on_demand: "On demand",
    loading: "Loading...",
    visible_suffix: "visible",
    no_folders_match: "No collections matched current filters.",
    toggle_favorite_folder: "Toggle favorite collection",
    scan_on_open: "Scan on open",
    categories: "categories",
    open_folder: "Open collection",
    showing_visible_cards_of: "Showing {visible} visible cards of {total} images",
    toggle_favorite_subfolder: "Toggle favorite collection",
    open_to_scan: "Open to scan",
    archives_still_here: "Archives in this collection",
    archive_files_detected: "{count} archive files detected.",
    showing_first_20_archives: "Showing the first 20 archives.",
    subfolder: "Collection",
    folder: "Collection",
    back_to_folders: "Back to collections",
    images_in_folder: "Images In This Collection",
    videos_in_folder: "Videos In This Collection",
    subfolders: "collections",
    back_to_all_folders: "Back to all collections",
    folder_list: "Collection List",
    use_favorites_hint: "Use favorites and recent filters to focus large collections.",
    no_subfolders_match: "No collections matched current filters.",
    no_images_match: "No images match current media filters.",
    request_failed: "Request failed.",
    loading_folder: "Loading collection...",
    no_thumbnails_available: "No thumbnails available for this item.",
    open_media_aria: "Open media {index}"
  },
  zh: {
    page_title: "图片分享画廊",
    brand_kicker: "Atlas 画廊",
    brand_sub: "专业媒体展示工作区",
    hero_eyebrow: "商用级媒体平台",
    hero_title: "Atlas Gallery Pro",
    hero_copy: "集中管理合集、展示媒体内容，以更快的导航和更专业的呈现方式运营高质量素材库。",
    search_placeholder: "搜索合集名称",
    search_folders: "搜索合集",
    search: "搜索",
    display_sort_controls: "显示与排序控制",
    appearance_sorting: "外观与排序",
    appearance_presets: "外观预设",
    appearance: "外观",
    theme_warm: "暖色",
    theme_paper: "纸感",
    theme_studio: "工作室",
    theme_forest: "森林",
    language: "语言",
    library_controls: "资源库控制",
    folder_scope: "合集范围",
    all_folders: "全部合集",
    favorites_only: "仅收藏",
    recently_opened: "最近打开",
    folder_sort: "合集排序",
    name_asc: "名称 A-Z",
    name_desc: "名称 Z-A",
    most_media_first: "媒体数量优先",
    subfolder_scope: "合集范围",
    all_subfolders: "全部合集",
    subfolder_sort: "合集排序",
    media_type: "媒体类型",
    images_videos: "图片 + 视频",
    images_only: "仅图片",
    videos_only: "仅视频",
    media_sort: "媒体排序",
    subfolder_card_size: "合集卡片大小",
    recent_folders: "最近合集",
    folders: "合集",
    images: "张图片",
    videos: "个视频",
    archives: "个压缩包",
    focus_folders: "聚焦合集",
    show_details: "显示详情",
    select_folder_prompt: "选择一个合集以加载媒体网格。",
    media_viewer: "媒体查看器",
    media_thumbnails: "媒体缩略图",
    thumbnails: "缩略图",
    previous_media: "上一项媒体",
    previous: "上一张",
    close_viewer: "关闭查看器",
    close: "关闭",
    next_media: "下一项媒体",
    next: "下一张",
    on_demand: "按需加载",
    loading: "加载中...",
    visible_suffix: "可见",
    no_folders_match: "没有匹配当前筛选条件的合集。",
    toggle_favorite_folder: "切换收藏合集",
    scan_on_open: "打开后扫描",
    categories: "个分类",
    open_folder: "打开合集",
    showing_visible_cards_of: "显示 {visible} / {total} 张可见图片卡片",
    toggle_favorite_subfolder: "切换收藏合集",
    open_to_scan: "打开后扫描",
    archives_still_here: "该合集中的压缩包",
    archive_files_detected: "检测到 {count} 个压缩包文件。",
    showing_first_20_archives: "仅显示前 20 个压缩包。",
    subfolder: "合集",
    folder: "合集",
    back_to_folders: "返回合集",
    images_in_folder: "该合集中的图片",
    videos_in_folder: "该合集中的视频",
    subfolders: "个合集",
    back_to_all_folders: "返回全部合集",
    folder_list: "合集列表",
    use_favorites_hint: "可用收藏和最近筛选快速聚焦大型合集。",
    no_subfolders_match: "没有匹配当前筛选条件的合集。",
    no_images_match: "当前媒体筛选下没有图片。",
    request_failed: "请求失败。",
    loading_folder: "正在加载合集...",
    no_thumbnails_available: "此项目暂无缩略图。",
    open_media_aria: "打开媒体 {index}"
  }
};

function t(key, vars = {}) {
  const langMap = I18N[UI_LANG] || I18N.en;
  const fallback = I18N.en[key] || key;
  const template = langMap[key] || fallback;
  return template.replace(/\{(\w+)\}/g, (_match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return `{${name}}`;
  });
}

function applyStaticTranslations() {
  document.documentElement.lang = UI_LANG === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  syncLanguageButtons();
}

const state = {
  albums: [],
  selectedAlbum: null,
  selectedSubfolder: null,
  folderFocusMode: false,
  mobilePane: "folders",
  favorites: {
    albums: new Set(),
    subfolders: new Set()
  },
  recents: {
    albums: [],
    subfolders: [],
    media: []
  },
  filters: {
    albumScope: "all",
    albumSort: "name-asc",
    subfolderScope: "all",
    subfolderSort: "name-asc",
    mediaType: "all",
    mediaSort: "name-asc"
  },
  subfolderCardSize: 220,
  heroCover: {
    timer: null,
    activeIndex: 0
  },
  panelSwitchTimer: null,
  folderFocusTimer: null,
  viewer: {
    items: [],
    currentIndex: -1
  },
  viewerCloseTimer: null,
  previewHydrationObserver: null,
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
  heroCover: document.getElementById("heroCover"),
  albumCount: document.getElementById("albumCount"),
  albumList: document.getElementById("albumList"),
  albumDetail: document.getElementById("albumDetail"),
  searchInput: document.getElementById("searchInput"),
  refreshButton: document.getElementById("refreshButton"),
  focusFoldersButton: document.getElementById("focusFoldersButton"),
  albumScopeSelect: document.getElementById("albumScopeSelect"),
  albumSortSelect: document.getElementById("albumSortSelect"),
  subfolderScopeSelect: document.getElementById("subfolderScopeSelect"),
  subfolderSortSelect: document.getElementById("subfolderSortSelect"),
  mediaTypeSelect: document.getElementById("mediaTypeSelect"),
  mediaSortSelect: document.getElementById("mediaSortSelect"),
  subfolderCardSizeRange: document.getElementById("subfolderCardSizeRange"),
  subfolderCardSizeValue: document.getElementById("subfolderCardSizeValue"),
  quickAccess: document.getElementById("quickAccess"),
  recentAlbumChips: document.getElementById("recentAlbumChips"),
  themeButtons: Array.from(document.querySelectorAll("[data-theme-option]")),
  languageButtons: Array.from(document.querySelectorAll("[data-lang-option]")),
  viewer: document.getElementById("viewer"),
  viewerImage: document.getElementById("viewerImage"),
  viewerVideo: document.getElementById("viewerVideo"),
  viewerFilmstrip: document.getElementById("viewerFilmstrip"),
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

function syncLanguageButtons() {
  elements.languageButtons.forEach((button) => {
    button.dataset.active = button.getAttribute("data-lang-option") === UI_LANG ? "true" : "false";
  });
}

function applyFolderFocusMode(isFocused) {
  const nextFocused = !!isFocused;
  const changed = state.folderFocusMode !== nextFocused;

  state.folderFocusMode = !!isFocused;
  document.body.dataset.folderFocus = state.folderFocusMode ? "true" : "false";
  localStorage.setItem(LAYOUT_STORAGE_KEY, state.folderFocusMode ? "focus" : "default");
  elements.focusFoldersButton.setAttribute(
    "aria-label",
    state.folderFocusMode ? t("show_details") : t("focus_folders")
  );
  elements.focusFoldersButton.setAttribute(
    "title",
    state.folderFocusMode ? t("show_details") : t("focus_folders")
  );

  if (
    changed &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    if (state.folderFocusTimer) {
      clearTimeout(state.folderFocusTimer);
      state.folderFocusTimer = null;
    }
    document.body.classList.remove("is-switching-to-focus", "is-switching-to-detail");
    document.body.classList.add(state.folderFocusMode ? "is-switching-to-focus" : "is-switching-to-detail");
    state.folderFocusTimer = setTimeout(() => {
      document.body.classList.remove("is-switching-to-focus", "is-switching-to-detail");
      state.folderFocusTimer = null;
    }, PANEL_SWITCH_MS + 40);
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "warm";
  applyTheme(savedTheme);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function persistFavorites() {
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify({
      albums: Array.from(state.favorites.albums),
      subfolders: Array.from(state.favorites.subfolders)
    })
  );
}

function persistRecents() {
  localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(state.recents));
}

function persistFilters() {
  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(state.filters));
}

function initializeOrganizationState() {
  const storedFavorites = readJsonStorage(FAVORITES_STORAGE_KEY, {});
  state.favorites.albums = new Set(toArray(storedFavorites.albums));
  state.favorites.subfolders = new Set(
    toArray(storedFavorites.subfolders).length
      ? toArray(storedFavorites.subfolders)
      : toArray(storedFavorites.collections)
  );

  const storedRecents = readJsonStorage(RECENTS_STORAGE_KEY, {});
  state.recents = {
    albums: toArray(storedRecents.albums).slice(0, MAX_RECENT_ITEMS),
    subfolders: (
      toArray(storedRecents.subfolders).length
        ? toArray(storedRecents.subfolders)
        : toArray(storedRecents.collections)
    ).slice(0, MAX_RECENT_ITEMS),
    media: toArray(storedRecents.media).slice(0, MAX_RECENT_ITEMS)
  };

  const storedFilters = readJsonStorage(FILTERS_STORAGE_KEY, {});
  state.filters = {
    ...state.filters,
    ...storedFilters
  };

  const storedCardSize = Number(localStorage.getItem(SUBFOLDER_CARD_SIZE_STORAGE_KEY));
  if (Number.isFinite(storedCardSize)) {
    state.subfolderCardSize = Math.min(360, Math.max(180, Math.round(storedCardSize / 10) * 10));
  }
}

function applySubfolderCardSize(size) {
  const numeric = Number(size);
  if (!Number.isFinite(numeric)) {
    return;
  }

  const clamped = Math.min(360, Math.max(180, Math.round(numeric / 10) * 10));
  state.subfolderCardSize = clamped;
  document.documentElement.style.setProperty("--subfolder-card-min", `${clamped}px`);

  if (elements.subfolderCardSizeRange) {
    elements.subfolderCardSizeRange.value = String(clamped);
  }
  if (elements.subfolderCardSizeValue) {
    elements.subfolderCardSizeValue.textContent = `${clamped}px`;
  }
}

function getSubfolderKey(albumName, subfolderPath) {
  return `${albumName}::${subfolderPath || "."}`;
}

function addRecentItem(listName, value) {
  if (!value) {
    return;
  }
  const list = toArray(state.recents[listName]).filter((item) => item !== value);
  list.unshift(value);
  state.recents[listName] = list.slice(0, MAX_RECENT_ITEMS);
  persistRecents();
}

function toggleAlbumFavorite(albumName) {
  if (!albumName) {
    return;
  }
  if (state.favorites.albums.has(albumName)) {
    state.favorites.albums.delete(albumName);
  } else {
    state.favorites.albums.add(albumName);
  }
  persistFavorites();
}

function toggleSubfolderFavorite(albumName, subfolderPath) {
  const key = getSubfolderKey(albumName, subfolderPath);
  if (state.favorites.subfolders.has(key)) {
    state.favorites.subfolders.delete(key);
  } else {
    state.favorites.subfolders.add(key);
  }
  persistFavorites();
}

function mediaWeight(item) {
  return Number(item.imageCount || 0) + Number(item.videoCount || 0);
}

function compareByName(order = "asc") {
  return (a, b) =>
    order === "desc"
      ? b.name.localeCompare(a.name, "en")
      : a.name.localeCompare(b.name, "en");
}

function applyAlbumScopeAndSort(albums) {
  const filtered = [...albums].filter((album) => {
    if (state.filters.albumScope === "favorites") {
      return state.favorites.albums.has(album.name);
    }
    if (state.filters.albumScope === "recent") {
      return state.recents.albums.includes(album.name);
    }
    return true;
  });

  if (state.filters.albumScope === "recent") {
    const rank = new Map(state.recents.albums.map((name, index) => [name, index]));
    filtered.sort((a, b) => (rank.get(a.name) ?? 9999) - (rank.get(b.name) ?? 9999));
    return filtered;
  }

  if (state.filters.albumSort === "name-desc") {
    filtered.sort(compareByName("desc"));
  } else if (state.filters.albumSort === "items-desc") {
    filtered.sort((a, b) => mediaWeight(b) - mediaWeight(a) || a.name.localeCompare(b.name, "en"));
  } else {
    filtered.sort(compareByName("asc"));
  }

  return filtered;
}

function applySubfolderScopeAndSort(album) {
  const subfolders = Array.isArray(album.subfolders) ? [...album.subfolders] : [];
  const filtered = subfolders.filter((subfolder) => {
    const key = getSubfolderKey(album.name, subfolder.path || subfolder.name);
    if (state.filters.subfolderScope === "favorites") {
      return state.favorites.subfolders.has(key);
    }
    if (state.filters.subfolderScope === "recent") {
      return state.recents.subfolders.includes(key);
    }
    return true;
  });

  if (state.filters.subfolderScope === "recent") {
    const rank = new Map(state.recents.subfolders.map((name, index) => [name, index]));
    filtered.sort((a, b) => {
      const keyA = getSubfolderKey(album.name, a.path || a.name);
      const keyB = getSubfolderKey(album.name, b.path || b.name);
      return (rank.get(keyA) ?? 9999) - (rank.get(keyB) ?? 9999);
    });
    return filtered;
  }

  if (state.filters.subfolderSort === "name-desc") {
    filtered.sort(compareByName("desc"));
  } else if (state.filters.subfolderSort === "items-desc") {
    filtered.sort((a, b) => mediaWeight(b) - mediaWeight(a) || a.name.localeCompare(b.name, "en"));
  } else {
    filtered.sort(compareByName("asc"));
  }
  return filtered;
}

function applyMediaTypeAndSort(items, type) {
  const filtered = [...items].filter((item) => {
    if (state.filters.mediaType === "all") {
      return true;
    }
    if (state.filters.mediaType === "image") {
      return type === "image";
    }
    if (state.filters.mediaType === "video") {
      return type === "video";
    }
    return true;
  });

  filtered.sort((a, b) => {
    const comparison = a.relativePath.localeCompare(b.relativePath, "en");
    return state.filters.mediaSort === "name-desc" ? -comparison : comparison;
  });

  return filtered;
}

function renderQuickAccess() {
  if (!elements.quickAccess || !elements.recentAlbumChips) {
    return;
  }

  const available = state.recents.albums.filter((albumName) =>
    state.albums.some((album) => album.name === albumName)
  );

  if (!available.length) {
    elements.quickAccess.hidden = true;
    elements.recentAlbumChips.innerHTML = "";
    return;
  }

  elements.quickAccess.hidden = false;
  elements.recentAlbumChips.innerHTML = available
    .slice(0, 10)
    .map(
      (name) =>
        `<button type="button" class="recent-chip" data-recent-album="${escapeHtml(name)}">${escapeHtml(name)}</button>`
    )
    .join("");

  elements.recentAlbumChips.querySelectorAll("[data-recent-album]").forEach((button) => {
    button.addEventListener("click", () => {
      loadAlbum(button.getAttribute("data-recent-album")).catch(showError);
    });
  });
}

function syncFilterControls() {
  if (!elements.albumScopeSelect) {
    return;
  }
  elements.albumScopeSelect.value = state.filters.albumScope;
  elements.albumSortSelect.value = state.filters.albumSort;
  elements.subfolderScopeSelect.value = state.filters.subfolderScope;
  elements.subfolderSortSelect.value = state.filters.subfolderSort;
  elements.mediaTypeSelect.value = state.filters.mediaType;
  elements.mediaSortSelect.value = state.filters.mediaSort;
  applySubfolderCardSize(state.subfolderCardSize);
}

function renderFilteredAlbums() {
  renderAlbums(applyAlbumScopeAndSort(state.albums));
  renderQuickAccess();
}

function initializeLayoutMode() {
  applyFolderFocusMode(true);
}

function renderStats(payload) {
  elements.stats.innerHTML = `
    <article class="stat-card">
      <span class="stat-label">${t("folders")}</span>
      <strong class="stat-value">${formatNumber(payload.totals.albums)}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">${UI_LANG === "zh" ? "图片" : "Images"}</span>
      <strong class="stat-value">${Number.isFinite(payload.totals.images) ? formatNumber(payload.totals.images) : t("on_demand")}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">${UI_LANG === "zh" ? "视频" : "Videos"}</span>
      <strong class="stat-value">${Number.isFinite(payload.totals.videos) ? formatNumber(payload.totals.videos) : t("on_demand")}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">${UI_LANG === "zh" ? "压缩包" : "Archives"}</span>
      <strong class="stat-value">${Number.isFinite(payload.totals.archives) ? formatNumber(payload.totals.archives) : t("on_demand")}</strong>
    </article>
  `;
}

function stopHeroCoverRotation() {
  if (state.heroCover.timer) {
    clearInterval(state.heroCover.timer);
    state.heroCover.timer = null;
  }
}

function renderHeroCover(albums = []) {
  if (!elements.heroCover) {
    return;
  }

  stopHeroCoverRotation();

  const previewPaths = [];
  const seen = new Set();

  albums.forEach((album) => {
    (album.previewImages || []).forEach((relativePath) => {
      if (!relativePath || seen.has(relativePath)) {
        return;
      }
      seen.add(relativePath);
      previewPaths.push(relativePath);
    });
  });

  const coverItems = previewPaths.slice(0, 6);
  if (!coverItems.length) {
    elements.heroCover.innerHTML = `<div class="hero-cover-empty"></div>`;
    return;
  }

  state.heroCover.activeIndex = 0;

  const slideMarkup = coverItems
    .map(
      (relativePath, index) =>
        `<img class="hero-cover-slide ${index === 0 ? "is-active" : ""}" src="${createPreviewUrl(relativePath, 700, THUMB_QUALITY)}" alt="" loading="${index < 2 ? "eager" : "lazy"}">`
    )
    .join("");

  const dotMarkup = coverItems
    .map(
      (_item, index) =>
        `<button type="button" class="hero-cover-dot ${index === 0 ? "is-active" : ""}" data-hero-cover-dot="${index}" aria-label="${UI_LANG === "zh" ? `显示封面图 ${index + 1}` : `Show cover image ${index + 1}`}"></button>`
    )
    .join("");

  elements.heroCover.innerHTML = `
    <div class="hero-cover-slides">${slideMarkup}</div>
    <div class="hero-cover-dots">${dotMarkup}</div>
  `;

  const slides = Array.from(elements.heroCover.querySelectorAll(".hero-cover-slide"));
  const dots = Array.from(elements.heroCover.querySelectorAll("[data-hero-cover-dot]"));

  const activateSlide = (nextIndex) => {
    state.heroCover.activeIndex = nextIndex;
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === nextIndex);
    });
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === nextIndex);
    });
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const nextIndex = Number(dot.getAttribute("data-hero-cover-dot"));
      if (!Number.isFinite(nextIndex) || nextIndex < 0 || nextIndex >= slides.length) {
        return;
      }
      activateSlide(nextIndex);
    });
  });

  if (slides.length > 1) {
    state.heroCover.timer = setInterval(() => {
      const nextIndex = (state.heroCover.activeIndex + 1) % slides.length;
      activateSlide(nextIndex);
    }, HERO_ROTATE_MS);
  }
}

function renderAlbumSkeletons(count = 6) {
  elements.albumCount.textContent = t("loading");
  elements.albumList.innerHTML = Array.from({ length: count }, () => {
    return `
      <article class="album-card album-card-skeleton" aria-hidden="true">
        <div class="album-preview"></div>
        <div class="album-card-content">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-line-short"></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderAlbums(albums) {
  elements.albumCount.textContent = `${formatNumber(albums.length)} ${t("visible_suffix")}`;

  if (albums.length === 0) {
    elements.albumList.innerHTML = `<div class="empty-state">${t("no_folders_match")}</div>`;
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
            <div class="album-card-title-row">
              <h3>${escapeHtml(album.name)}</h3>
              <button
                type="button"
                class="favorite-button ${state.favorites.albums.has(album.name) ? "is-active" : ""}"
                data-favorite-album="${escapeHtml(album.name)}"
                aria-label="${t("toggle_favorite_folder")}"
                title="${t("toggle_favorite_folder")}"
              >&#9733;</button>
            </div>
            <div class="album-meta">
                ${
                  Number.isFinite(album.imageCount)
                    ? `<span>${formatNumber(album.imageCount)} ${t("images")}</span>`
                    : `<span>${t("scan_on_open")}</span>`
                }
                ${
                  Number.isFinite(album.videoCount)
                    ? `<span>${formatNumber(album.videoCount)} ${t("videos")}</span>`
                    : ``
                }
                ${
                  Number.isFinite(album.subfolderCount)
                  ? `<span>${formatNumber(album.subfolderCount)} ${t("categories")}</span>`
                  : ``
              }
              ${
                Number.isFinite(album.archiveCount)
                  ? `<span>${formatNumber(album.archiveCount)} ${t("archives")}</span>`
                  : ``
              }
              ${
                Number.isFinite(album.folderCount)
                  ? `<span>${formatNumber(album.folderCount)} ${UI_LANG === "zh" ? "个合集" : "collections"}</span>`
                  : ``
              }
            </div>
            <button type="button" class="icon-button open-folder-button" data-album-name="${escapeHtml(album.name)}" aria-label="${t("open_folder")}" title="${t("open_folder")}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3.5 8.5h6l2 2h9v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"></path>
                <path d="M3.5 8.5v-2a2 2 0 0 1 2-2h4.6l1.6 2h6.8a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"></path>
              </svg>
              <span class="sr-only">${t("open_folder")}</span>
            </button>
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

  elements.albumList.querySelectorAll("[data-favorite-album]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleAlbumFavorite(button.getAttribute("data-favorite-album"));
      renderFilteredAlbums();
    });
  });

  queuePreviewHydration(elements.albumList.querySelectorAll(".album-preview"));

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

function setMobilePane(mode, options = {}) {
  const animate = options.animate !== false;
  const previousMode = state.mobilePane;
  state.mobilePane = mode;
  document.body.dataset.mobilePane = mode;

  const folderPanel = document.querySelector(".folder-panel");
  const detailPanel = document.querySelector(".detail-panel");
  if (!folderPanel || !detailPanel) {
    return;
  }

  if (!isWindowScrollMode()) {
    folderPanel.style.display = "";
    detailPanel.style.display = "";
    folderPanel.classList.remove("pane-switch-in", "pane-switch-out");
    detailPanel.classList.remove("pane-switch-in", "pane-switch-out");
    return;
  }

  const activePanel = mode === "detail" ? detailPanel : folderPanel;
  const inactivePanel = mode === "detail" ? folderPanel : detailPanel;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!animate || reduceMotion || previousMode === mode) {
    folderPanel.style.display = mode === "detail" ? "none" : "";
    detailPanel.style.display = mode === "folders" ? "none" : "";
    folderPanel.classList.remove("pane-switch-in", "pane-switch-out");
    detailPanel.classList.remove("pane-switch-in", "pane-switch-out");
    triggerPaneReveal(activePanel);
    return;
  }

  if (state.panelSwitchTimer) {
    clearTimeout(state.panelSwitchTimer);
    state.panelSwitchTimer = null;
  }

  folderPanel.style.display = "";
  detailPanel.style.display = "";
  folderPanel.classList.remove("pane-switch-in", "pane-switch-out");
  detailPanel.classList.remove("pane-switch-in", "pane-switch-out");
  activePanel.offsetHeight;
  activePanel.classList.add("pane-switch-in");
  inactivePanel.classList.add("pane-switch-out");

  state.panelSwitchTimer = setTimeout(() => {
    inactivePanel.style.display = "none";
    activePanel.style.display = "";
    folderPanel.classList.remove("pane-switch-in", "pane-switch-out");
    detailPanel.classList.remove("pane-switch-in", "pane-switch-out");
    triggerPaneReveal(activePanel);
    state.panelSwitchTimer = null;
  }, PANEL_SWITCH_MS);
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
  if (!state.selectedSubfolder || !Array.isArray(state.selectedSubfolder.images)) {
    return [];
  }
  return applyMediaTypeAndSort(state.selectedSubfolder.images, "image");
}

function getActiveVideoCollection() {
  if (!state.selectedSubfolder || !Array.isArray(state.selectedSubfolder.videos)) {
    return [];
  }
  return applyMediaTypeAndSort(state.selectedSubfolder.videos, "video");
}

function getActiveViewerCollection() {
  if (!state.selectedSubfolder) {
    return [];
  }

  return [...getActiveImageCollection(), ...getActiveVideoCollection()];
}

function isAcceptablePreviewImage(img) {
  if (!img.naturalWidth || !img.naturalHeight) {
    return false;
  }

  const ratio = img.naturalHeight / img.naturalWidth;
  return ratio >= MIN_PREVIEW_HEIGHT_RATIO && ratio <= MAX_PREVIEW_HEIGHT_RATIO;
}

function buildPreviewSlots(previewImages, altText) {
  const candidates = escapeHtml((previewImages || []).join("|"));
  return Array.from({ length: PREVIEW_SLOTS }, (_, index) => {
    const primary = previewImages[index] || "";
    return `<img loading="lazy" src="${primary ? createPreviewUrl(primary, CARD_PREVIEW_WIDTH, THUMB_QUALITY) : ""}" data-preview-slot="${index}" data-preview-candidates="${candidates}" data-preview-path="${escapeHtml(primary)}" alt="${escapeHtml(altText)}" ${primary ? "" : "hidden"} />`;
  }).join("");
}

function getPreviewHydrationObserver() {
  if (state.previewHydrationObserver) {
    return state.previewHydrationObserver;
  }

  if (!("IntersectionObserver" in window)) {
    return null;
  }

  state.previewHydrationObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        const container = entry.target;
        observer.unobserve(container);
        hydratePreviewGridImages(container);
      });
    },
    {
      root: null,
      rootMargin: "240px 0px",
      threshold: 0.01
    }
  );

  return state.previewHydrationObserver;
}

function queuePreviewHydration(containers) {
  const observer = getPreviewHydrationObserver();
  Array.from(containers).forEach((container) => {
    if (!container || container.dataset.previewHydrated === "true") {
      return;
    }

    if (!observer) {
      const hydrateNow = () => hydratePreviewGridImages(container);
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(hydrateNow, { timeout: 180 });
      } else {
        setTimeout(hydrateNow, 0);
      }
      return;
    }

    observer.observe(container);
  });
}

function hydratePreviewGridImages(container) {
  if (container.dataset.previewHydrated === "true") {
    return;
  }
  container.dataset.previewHydrated = "true";

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

    const validateOrReplace = () => {
      if (isAcceptablePreviewImage(img)) {
        attachPreviewFallback(img, img.dataset.previewPath);
        return;
      }

      while (assignNextCandidate(img)) {
        return;
      }
    };

    img.addEventListener("load", validateOrReplace);

    img.addEventListener("error", () => {
      assignNextCandidate(img);
    });

    // If image came from browser cache and finished before handlers were attached,
    // validate immediately so extreme aspect ratios are still replaced.
    if (img.complete && img.naturalWidth && img.naturalHeight) {
      validateOrReplace();
    }
  });
}

function normalizeAlbumDetail(album) {
  let normalizedCollections = Array.isArray(album.collections) ? album.collections : [];

  if (!normalizedCollections.length && Array.isArray(album.images) && album.images.length) {
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

    normalizedCollections = Array.from(subfolderMap.values()).sort((a, b) => a.name.localeCompare(b.name, "en"));

    if (looseImages.length) {
      normalizedCollections.unshift({
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
    collections: normalizedCollections,
    archives: Array.isArray(album.archives) ? album.archives : [],
    archiveCount: Number.isFinite(album.archiveCount)
      ? album.archiveCount
      : Array.isArray(album.archives)
        ? album.archives.length
        : 0,
    folderCount: Number.isFinite(album.folderCount) ? album.folderCount : normalizedCollections.length,
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

  progress.textContent = t("showing_visible_cards_of", {
    visible: formatNumber(visibleCount),
    total: formatNumber(images.length)
  });

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
  const visibleImages = getActiveImageCollection();
  const visibleVideos = getActiveVideoCollection();
  const shouldShowImageGrid = !!(state.selectedSubfolder && visibleImages.length > 0);
  const shouldShowVideoGrid = !!(state.selectedSubfolder && visibleVideos.length > 0);
  const visibleSubfolders = applySubfolderScopeAndSort(album);
  const subfolderCards = visibleSubfolders
    .map(
      (subfolder) => `
        <article class="subfolder-card">
	          <button
	            type="button"
	            class="favorite-button favorite-button-subfolder ${state.favorites.subfolders.has(getSubfolderKey(album.name, subfolder.path || subfolder.name)) ? "is-active" : ""}"
	            data-favorite-subfolder="${escapeHtml(subfolder.path || subfolder.name)}"
	            aria-label="${t("toggle_favorite_subfolder")}"
	            title="${t("toggle_favorite_subfolder")}"
	          >&#9733;</button>
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
	                    ? `<span>${formatNumber(subfolder.imageCount)} ${t("images")}</span>`
	                    : `<span>${t("open_to_scan")}</span>`
	                }
	                ${
	                  Number.isFinite(subfolder.videoCount)
	                    ? `<span>${formatNumber(subfolder.videoCount)} ${t("videos")}</span>`
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
	        <h3>${t("archives_still_here")}</h3>
	        <p>${t("archive_files_detected", { count: formatNumber(currentNode.archiveCount) })}</p>
	        <ul>
	          ${currentNode.archives
	            .slice(0, 20)
	            .map((archive) => `<li>${escapeHtml(archive.name)} (${formatSize(archive.sizeBytes)})</li>`)
	            .join("")}
	        </ul>
	        ${currentNode.archives.length > 20 ? `<p>${t("showing_first_20_archives")}</p>` : ""}
	      </section>
	    `
	    : "";

  elements.albumDetail.classList.remove("empty-state");
  if (state.selectedSubfolder) {
    elements.albumDetail.innerHTML = `
	      <div class="detail-header">
	        <div>
	          <p class="eyebrow">${t("subfolder")}</p>
	          <h2>${escapeHtml(currentNode.name)}</h2>
	        </div>
	        <button type="button" class="subfolder-back-button icon-button detail-corner-back" data-clear-subfolder aria-label="${t("back_to_folders")}" title="${t("back_to_folders")}">
	          <svg viewBox="0 0 24 24" aria-hidden="true">
	            <path d="M14.8 5.4L8.2 12l6.6 6.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
	          </svg>
	          <span class="sr-only">${t("back_to_folders")}</span>
	        </button>
	      </div>
      ${archivesMarkup}
      <section class="subfolder-images" data-subfolder-images ${shouldShowImageGrid ? "" : "hidden"}>
	        <div class="subfolder-section-header subfolder-active-header">
	          <div>
	            <p class="eyebrow">${t("images_in_folder")}</p>
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
	            <p class="eyebrow">${t("videos_in_folder")}</p>
	            <h3>${escapeHtml(currentNode.name)}</h3>
	          </div>
	        </div>
        <div class="video-grid">
          ${visibleVideos
            .map(
              (video) => `
                <article class="media-card video-card">
                  <button type="button" class="video-button" data-video-path="${escapeHtml(video.relativePath)}">
                    <div class="video-thumb">
	                      <video muted preload="metadata" playsinline src="${createMediaUrl(video.relativePath)}"></video>
	                      <span class="video-badge">${UI_LANG === "zh" ? "视频" : "Video"}</span>
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
	          <p class="eyebrow">${t("folder")}</p>
	          <h2>${escapeHtml(album.name)}</h2>
	        </div>
	        <div class="detail-header-actions">
	          <div class="album-meta detail-header-meta">
	            <span>${formatNumber(visibleSubfolders.length)} ${t("subfolders")}</span>
	            <span>${formatNumber(album.videoCount || 0)} ${t("videos")}</span>
	            <span>${formatNumber(album.archiveCount || 0)} ${t("archives")}</span>
	          </div>
	          <button type="button" class="detail-back-button subfolder-back-button icon-button detail-corner-back" data-show-folder-overview aria-label="${t("back_to_all_folders")}" title="${t("back_to_all_folders")}">
	            <svg viewBox="0 0 24 24" aria-hidden="true">
	              <path d="M14.8 5.4L8.2 12l6.6 6.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
	            </svg>
	            <span class="sr-only">${t("back_to_all_folders")}</span>
	          </button>
	          <button type="button" class="mobile-folder-back-button" data-mobile-show-folders>${t("folder_list")}</button>
	        </div>
	      </div>
	      ${archivesMarkup}
	      <section class="subfolder-section">
	        <div class="subfolder-section-header">
	          <div>
	            <h3>${t("folders")}</h3>
	            <p>${t("use_favorites_hint")}</p>
	          </div>
	        </div>
	        <div class="subfolder-grid">${subfolderCards || `<div class="empty-state">${t("no_subfolders_match")}</div>`}</div>
	      </section>
	    `;
  }

  queuePreviewHydration(elements.albumDetail.querySelectorAll(".subfolder-preview"));

  elements.albumDetail.querySelectorAll(".subfolder-card, .video-card").forEach((card, index) => {
    card.classList.add("reveal-item");
    card.style.setProperty("--stagger-index", String(index % 12));
  });

  elements.albumDetail.querySelectorAll("[data-favorite-subfolder]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleSubfolderFavorite(state.selectedAlbum.name, button.getAttribute("data-favorite-subfolder"));
      renderAlbumDetail(state.selectedAlbum);
    });
  });

  elements.albumDetail.querySelectorAll("[data-video-path]").forEach((button) => {
    button.addEventListener("click", () => {
      openViewer(button.getAttribute("data-video-path"));
    });
  });

  if (shouldShowImageGrid) {
    setupVirtualizedGrid();
  } else {
    cleanupVirtualizer();
    const grid = elements.albumDetail.querySelector("[data-image-grid]");
    const progress = elements.albumDetail.querySelector("[data-image-progress]");
    if (grid) {
      grid.innerHTML = "";
      grid.style.height = "0px";
    }
	    if (progress) {
	      progress.textContent = state.selectedSubfolder
	        ? t("no_images_match")
	        : "";
	    }
	  }
}

async function fetchJson(url) {
  console.log("[gallery-ui] fetch start", url);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: t("request_failed") }));
    console.error("[gallery-ui] fetch error", url, payload.error || t("request_failed"));
    throw new Error(payload.error || t("request_failed"));
  }
  const data = await response.json();
  console.log("[gallery-ui] fetch done", url, data);
  return data;
}

async function loadAlbums(search = "") {
  console.log("[gallery-ui] loadAlbums", search);
  renderAlbumSkeletons();

  const payload = await fetchJson(`/api/albums?search=${encodeURIComponent(search)}`);
  state.albums = payload.albums;
  renderHeroCover(payload.albums);
  renderStats(payload);
  renderFilteredAlbums();
}

async function loadAlbum(name) {
  console.log("[gallery-ui] loadAlbum", name);
  cleanupVirtualizer();
  elements.albumDetail.classList.remove("empty-state");
  elements.albumDetail.innerHTML = `<div class="empty-state">${t("loading_folder")}</div>`;

  const album = await fetchJson(`/api/album?name=${encodeURIComponent(name)}`);
  state.selectedAlbum = normalizeAlbumDetail(album);
  state.selectedSubfolder = null;
  addRecentItem("albums", state.selectedAlbum.name);
  renderQuickAccess();
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
  addRecentItem("subfolders", getSubfolderKey(state.selectedAlbum.name, normalized.path || normalized.subfolder));
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
  const collection = getActiveViewerCollection();
  const items =
    Array.isArray(collection) && collection.length
      ? collection
      : [
          {
            relativePath,
            name: caption || relativePath
          }
        ];
  const itemIndex = items.findIndex((item) => item.relativePath === relativePath);
  state.viewer.items = items;
  state.viewer.currentIndex = itemIndex >= 0 ? itemIndex : 0;
  addRecentItem("media", relativePath);
  renderViewerFilmstrip();
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
  updateActiveViewerThumb();
  prefetchAdjacentViewerMedia();
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

function prefetchMediaPath(relativePath) {
  if (!relativePath) {
    return;
  }
  const mediaUrl = createMediaUrl(relativePath);
  if (isVideoPath(relativePath)) {
    const prefetchVideo = document.createElement("video");
    prefetchVideo.preload = "metadata";
    prefetchVideo.muted = true;
    prefetchVideo.src = mediaUrl;
    prefetchVideo.load();
    return;
  }

  const prefetchImage = new Image();
  prefetchImage.src = mediaUrl;
}

function prefetchAdjacentViewerMedia() {
  const { items, currentIndex } = state.viewer;
  if (!Array.isArray(items) || currentIndex < 0) {
    return;
  }

  const neighbors = [items[currentIndex + 1], items[currentIndex - 1], items[currentIndex + 2], items[currentIndex - 2]]
    .filter(Boolean)
    .map((item) => item.relativePath);

  neighbors.forEach((relativePath) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => prefetchMediaPath(relativePath), { timeout: 180 });
      return;
    }
    setTimeout(() => prefetchMediaPath(relativePath), 0);
  });
}

function renderViewerFilmstrip() {
  const strip = elements.viewerFilmstrip;
  if (!strip) {
    return;
  }

  const { items } = state.viewer;
  if (!Array.isArray(items) || !items.length) {
    strip.innerHTML = `<p class="viewer-filmstrip-empty">${t("no_thumbnails_available")}</p>`;
    return;
  }

  strip.innerHTML = items
    .map((item, index) => {
      const isVideo = isVideoPath(item.relativePath);
      const thumbMarkup = isVideo
        ? `<video muted preload="none" playsinline src="${createMediaUrl(item.relativePath)}"></video>`
        : `<img loading="lazy" src="${createPreviewUrl(item.relativePath, 180, THUMB_QUALITY)}" alt="${escapeHtml(item.name || item.relativePath)}">`;
      return `
        <button
          type="button"
          class="viewer-thumb ${isVideo ? "viewer-thumb-video" : ""}"
          data-viewer-index="${index}"
          aria-label="${t("open_media_aria", { index: index + 1 })}"
        >
          ${thumbMarkup}
        </button>
      `;
    })
    .join("");

  strip.querySelectorAll("[data-viewer-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextIndex = Number(button.getAttribute("data-viewer-index"));
      if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= state.viewer.items.length) {
        return;
      }
      state.viewer.currentIndex = nextIndex;
      const nextItem = state.viewer.items[nextIndex];
      renderViewerItem(nextItem.relativePath, nextItem.relativePath);
    });
  });

  updateActiveViewerThumb();
}

function updateActiveViewerThumb() {
  const strip = elements.viewerFilmstrip;
  if (!strip) {
    return;
  }

  const activeIndex = state.viewer.currentIndex;
  const thumbs = Array.from(strip.querySelectorAll("[data-viewer-index]"));
  thumbs.forEach((thumb) => {
    const thumbIndex = Number(thumb.getAttribute("data-viewer-index"));
    thumb.classList.toggle("is-active", thumbIndex === activeIndex);
  });

  const active = strip.querySelector(`[data-viewer-index="${activeIndex}"]`);
  if (active) {
    active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }
}

function closeViewer() {
  setViewerVisibility(false);
  elements.viewerVideo.pause();
  elements.viewerVideo.hidden = true;
  elements.viewerVideo.removeAttribute("src");
  elements.viewerVideo.load();
  elements.viewerImage.hidden = false;
  elements.viewerImage.src = "";
  if (elements.viewerFilmstrip) {
    elements.viewerFilmstrip.innerHTML = "";
  }
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

[
  elements.albumScopeSelect,
  elements.albumSortSelect,
  elements.subfolderScopeSelect,
  elements.subfolderSortSelect,
  elements.mediaTypeSelect,
  elements.mediaSortSelect
].forEach((control) => {
  if (!control) {
    return;
  }

  control.addEventListener("change", () => {
    state.filters.albumScope = elements.albumScopeSelect.value;
    state.filters.albumSort = elements.albumSortSelect.value;
    state.filters.subfolderScope = elements.subfolderScopeSelect.value;
    state.filters.subfolderSort = elements.subfolderSortSelect.value;
    state.filters.mediaType = elements.mediaTypeSelect.value;
    state.filters.mediaSort = elements.mediaSortSelect.value;
    persistFilters();

    renderFilteredAlbums();
    if (state.selectedAlbum) {
      renderAlbumDetail(state.selectedAlbum);
      if (isWindowScrollMode()) {
        setMobilePane("detail");
      }
    }
  });
});

if (elements.subfolderCardSizeRange) {
  elements.subfolderCardSizeRange.addEventListener("input", () => {
    applySubfolderCardSize(elements.subfolderCardSizeRange.value);
    if (!state.selectedAlbum) {
      return;
    }
    renderAlbumDetail(state.selectedAlbum);
  });

  elements.subfolderCardSizeRange.addEventListener("change", () => {
    localStorage.setItem(SUBFOLDER_CARD_SIZE_STORAGE_KEY, String(state.subfolderCardSize));
  });
}

elements.themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTheme(button.getAttribute("data-theme-option"));
  });
});

elements.languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextLang = button.getAttribute("data-lang-option");
    if (nextLang !== "en" && nextLang !== "zh") {
      return;
    }
    if (nextLang === UI_LANG) {
      return;
    }
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch (_error) {
      // Ignore storage write errors.
    }
    window.location.reload();
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

  const folderOverviewButton = event.target.closest("[data-show-folder-overview]");
  if (folderOverviewButton) {
    if (isWindowScrollMode()) {
      setMobilePane("folders");
    } else {
      applyFolderFocusMode(true);
    }
  }
});

window.addEventListener("resize", () => {
  if (!isWindowScrollMode()) {
    setMobilePane("folders");
  } else if (state.selectedAlbum) {
    setMobilePane("detail");
  }
});

window.addEventListener("beforeunload", () => {
  stopHeroCoverRotation();
  if (state.panelSwitchTimer) {
    clearTimeout(state.panelSwitchTimer);
  }
  if (state.folderFocusTimer) {
    clearTimeout(state.folderFocusTimer);
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
  [
    elements.viewerPanel,
    elements.viewerStage,
    elements.viewerToolbar,
    elements.viewerFilmstrip,
    elements.viewerImage,
    elements.viewerVideo
  ].forEach(
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

applyStaticTranslations();
initializeTheme();
initializeOrganizationState();
syncFilterControls();
initializeLayoutMode();
setMobilePane("folders", { animate: false });
setViewerVisibility(false);
renderHeroCover([]);
loadAlbums().catch(showError);

