const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile, execFileSync } = require("child_process");
const { URL } = require("url");

const APP_ROOT = __dirname;
const MEDIA_ROOT = path.resolve(APP_ROOT, "..");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const THUMB_CACHE_DIR = path.join(APP_ROOT, ".thumb-cache");
const INDEX_FILE = path.join(APP_ROOT, "gallery-index.json");
const THUMB_SETTINGS_FILE = path.join(APP_ROOT, "thumbnail-settings.json");
const PORT = Number(process.env.PORT || 3080);
const DEFAULT_THUMB_WIDTH = 280;
const DEFAULT_THUMB_QUALITY = 70;
const THUMB_PREVIEW_WIDTH = 280;
const THUMB_CACHE_VERSION = 2;
const PREVIEW_CANDIDATE_LIMIT = 12;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const ARCHIVE_EXTENSIONS = new Set([".zip", ".7z", ".rar"]);
const APP_FOLDER_NAME = path.basename(APP_ROOT);

let cachedAlbumList = null;
let cachedAlbumListAt = 0;
const cachedAlbumDetails = new Map();
const cachedSubfolderDetails = new Map();
const CACHE_TTL_MS = 60 * 1000;
let metadataIndex = null;
let metadataIndexBuildPromise = null;
let metadataIndexStatus = {
  state: "idle",
  startedAt: null,
  finishedAt: null,
  error: null
};
let thumbnailBuildPromise = null;
let thumbnailBuildStatus = {
  state: "idle",
  startedAt: null,
  finishedAt: null,
  error: null,
  processed: 0,
  total: 0
};

function log(message) {
  process.stdout.write(`[gallery] ${new Date().toISOString()} ${message}\n`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isInsideRoot(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function getMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".m4v":
      return "video/x-m4v";
    default:
      return "application/octet-stream";
  }
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function parseRangeHeader(rangeHeader, fileSize) {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return null;
  }

  const [startText, endText] = rangeHeader.slice(6).split("-", 2);
  let start = startText === "" ? null : Number(startText);
  let end = endText === "" ? null : Number(endText);

  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) {
    return "invalid";
  }

  if (start === null && end === null) {
    return "invalid";
  }

  if (start === null) {
    if (end === null || end <= 0) {
      return "invalid";
    }
    start = Math.max(0, fileSize - end);
    end = fileSize - 1;
  } else if (end === null || end >= fileSize) {
    end = fileSize - 1;
  }

  if (start < 0 || start >= fileSize || end < start) {
    return "invalid";
  }

  return { start, end };
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendError(res, 404, "File not found.");
      return;
    }

    const mimeType = getMimeType(filePath);
    const supportsRanges = mimeType.startsWith("video/");
    const range = supportsRanges ? parseRangeHeader(req.headers.range, stats.size) : null;

    if (range === "invalid") {
      res.writeHead(416, {
        "Content-Range": `bytes */${stats.size}`
      });
      res.end();
      return;
    }

    if (range) {
      const contentLength = range.end - range.start + 1;
      res.writeHead(206, {
        "Content-Type": mimeType,
        "Content-Length": contentLength,
        "Content-Range": `bytes ${range.start}-${range.end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=300"
      });

      fs.createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": stats.size,
      "Accept-Ranges": supportsRanges ? "bytes" : "none",
      "Cache-Control": "public, max-age=300"
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function serveWebpFile(res, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendError(res, 404, "File not found.");
      return;
    }

    res.writeHead(200, {
        "Content-Type": "image/webp",
      "Content-Length": stats.size,
      "Cache-Control": "public, max-age=86400"
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function readDirectoryEntries(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true });
}

async function readDirectoryEntriesAsync(directoryPath) {
  return fs.promises.readdir(directoryPath, { withFileTypes: true });
}

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function createSubfolderCacheKey(albumName, subfolderName) {
  return `${albumName}::${subfolderName}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCurrentAlbumNames() {
  return readDirectoryEntries(MEDIA_ROOT)
    .filter((entry) => entry.isDirectory() && entry.name !== APP_FOLDER_NAME)
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

function getThumbnailSettingsSignature() {
  return {
    version: THUMB_CACHE_VERSION,
    defaultWidth: DEFAULT_THUMB_WIDTH,
    previewWidth: THUMB_PREVIEW_WIDTH,
    defaultQuality: DEFAULT_THUMB_QUALITY
  };
}

function clearDirectoryContents(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return;
  }

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } else {
      fs.rmSync(entryPath, { force: true });
    }
  }
}

function ensureThumbnailCacheSettings() {
  const currentSettings = getThumbnailSettingsSignature();
  let previousSettings = null;

  try {
    if (fs.existsSync(THUMB_SETTINGS_FILE)) {
      previousSettings = JSON.parse(fs.readFileSync(THUMB_SETTINGS_FILE, "utf8"));
    }
  } catch (error) {
    log(`Thumbnail settings read failed: ${error.message}`);
  }

  const changed = JSON.stringify(previousSettings) !== JSON.stringify(currentSettings);

  if (changed) {
    log("Thumbnail settings changed, clearing outdated thumbnail cache");
    fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });
    clearDirectoryContents(THUMB_CACHE_DIR);
  }

  try {
    fs.writeFileSync(THUMB_SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), "utf8");
  } catch (error) {
    log(`Thumbnail settings write failed: ${error.message}`);
  }
}

function scanNodeShallow(albumName, subfolderName) {
  const albumPath = path.join(MEDIA_ROOT, albumName);
  const targetPath =
    subfolderName === "."
      ? albumPath
      : path.join(albumPath, ...subfolderName.split("/"));
  const images = [];
  const videos = [];
  const subfolders = [];
  const archives = [];
  let entries = [];

  try {
    entries = readDirectoryEntries(targetPath);
  } catch (error) {
    return {
      albumName,
      subfolder: subfolderName,
      imageCount: 0,
      images: [],
      videoCount: 0,
      videos: [],
      subfolders: [],
      archives: []
    };
  }

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      const childPath = subfolderName === "." ? entry.name : `${subfolderName}/${entry.name}`;
      subfolders.push({
        name: entry.name,
        path: childPath,
        imageCount: null,
        previewImages: []
      });
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    const relativePath = toPosix(path.relative(MEDIA_ROOT, fullPath));

    if (IMAGE_EXTENSIONS.has(extension)) {
      images.push({
        name: entry.name,
        relativePath,
        directory: subfolderName
      });
    } else if (VIDEO_EXTENSIONS.has(extension)) {
      videos.push({
        name: entry.name,
        relativePath,
        directory: subfolderName
      });
    } else if (ARCHIVE_EXTENSIONS.has(extension)) {
      archives.push({
        name: entry.name,
        relativePath,
        sizeBytes: fs.statSync(fullPath).size
      });
    }
  }

  images.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  subfolders.sort((a, b) => a.name.localeCompare(b.name, "en"));
  archives.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));

  return {
    name: subfolderName === "." ? albumName : path.posix.basename(subfolderName),
    albumName,
    subfolder: subfolderName,
    imageCount: images.length,
    images,
    videoCount: videos.length,
    videos,
    subfolders,
    archives,
    archiveCount: archives.length,
    folderCount: subfolders.length
  };
}

function scanAlbumShallow(albumName) {
  const detail = scanNodeShallow(albumName, ".");
  detail.subfolders = detail.subfolders.map((subfolder) => ({
    ...subfolder,
    previewImages: getQuickNodePreviewImages(albumName, subfolder.path, PREVIEW_CANDIDATE_LIMIT)
  }));
  return detail;
}

function scanSubfolderRecursive(albumName, subfolderName) {
  const albumPath = path.join(MEDIA_ROOT, albumName);
  const targetPath =
    subfolderName === "."
      ? albumPath
      : path.join(albumPath, ...subfolderName.split("/"));
  const queue = [targetPath];
  const images = [];
  const videos = [];

  while (queue.length > 0) {
    const currentPath = queue.pop();
    let entries = [];

    try {
      entries = readDirectoryEntries(currentPath);
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      const mediaItem = {
        name: entry.name,
        relativePath: toPosix(path.relative(MEDIA_ROOT, fullPath)),
        directory: toPosix(path.relative(albumPath, path.dirname(fullPath))) || "."
      };

      if (IMAGE_EXTENSIONS.has(extension)) {
        images.push(mediaItem);
        continue;
      }

      if (VIDEO_EXTENSIONS.has(extension)) {
        videos.push(mediaItem);
      }
    }
  }

  images.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));

  return {
    name: subfolderName === "." ? albumName : path.posix.basename(subfolderName),
    albumName,
    subfolder: subfolderName,
    imageCount: images.length,
    images,
    videoCount: videos.length,
    videos,
    subfolders: [],
    archives: [],
    archiveCount: 0,
    folderCount: 0
  };
}

function getQuickAlbumPreviewImages(albumName, limit = PREVIEW_CANDIDATE_LIMIT) {
  const albumPath = path.join(MEDIA_ROOT, albumName);
  const previews = [];
  const queue = [albumPath];

  while (queue.length > 0 && previews.length < limit) {
    const currentPath = queue.shift();
    let entries = [];

    try {
      entries = readDirectoryEntries(currentPath);
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(extension)) {
        previews.push(toPosix(path.relative(MEDIA_ROOT, fullPath)));
        if (previews.length >= limit) {
          break;
        }
      }
    }
  }

  return previews;
}

function getQuickNodePreviewImages(albumName, subfolderName, limit = PREVIEW_CANDIDATE_LIMIT) {
  const albumPath = path.join(MEDIA_ROOT, albumName);
  const targetPath =
    subfolderName === "."
      ? albumPath
      : path.join(albumPath, ...subfolderName.split("/"));
  const previews = [];
  const queue = [targetPath];

  while (queue.length > 0 && previews.length < limit) {
    const currentPath = queue.shift();
    let entries = [];

    try {
      entries = readDirectoryEntries(currentPath);
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(extension)) {
        previews.push(toPosix(path.relative(MEDIA_ROOT, fullPath)));
        if (previews.length >= limit) {
          break;
        }
      }
    }
  }

  return previews;
}

async function scanSubfolderRecursiveAsync(albumName, subfolderName) {
  const albumPath = path.join(MEDIA_ROOT, albumName);
  const targetPath =
    subfolderName === "."
      ? albumPath
      : path.join(albumPath, ...subfolderName.split("/"));
  const queue = [targetPath];
  const images = [];
  const videos = [];
  const archives = [];
  const previewImages = [];
  let processedDirectories = 0;

  while (queue.length > 0) {
    const currentPath = queue.pop();
    let entries = [];

    try {
      entries = await readDirectoryEntriesAsync(currentPath);
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      const relativePath = toPosix(path.relative(MEDIA_ROOT, fullPath));

      if (IMAGE_EXTENSIONS.has(extension)) {
        const image = {
          name: entry.name,
          relativePath,
          directory: toPosix(path.relative(albumPath, path.dirname(fullPath))) || "."
        };
        images.push(image);
        if (previewImages.length < PREVIEW_CANDIDATE_LIMIT) {
          previewImages.push(relativePath);
        }
        continue;
      }

      if (VIDEO_EXTENSIONS.has(extension)) {
        videos.push({
          name: entry.name,
          relativePath,
          directory: toPosix(path.relative(albumPath, path.dirname(fullPath))) || "."
        });
        continue;
      }

      if (ARCHIVE_EXTENSIONS.has(extension)) {
        let sizeBytes = 0;
        try {
          sizeBytes = (await fs.promises.stat(fullPath)).size;
        } catch (error) {
          sizeBytes = 0;
        }

        archives.push({
          name: entry.name,
          relativePath,
          sizeBytes
        });
      }
    }

    processedDirectories += 1;
    if (processedDirectories % 8 === 0) {
      await yieldToEventLoop();
    }
  }

  images.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  archives.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));

  return {
    name: subfolderName === "." ? albumName : path.posix.basename(subfolderName),
    albumName,
    subfolder: subfolderName,
    imageCount: images.length,
    images,
    videoCount: videos.length,
    videos,
    subfolders: [],
    archives,
    archiveCount: archives.length,
    folderCount: 0,
    previewImages
  };
}

async function buildMetadataIndex() {
  log("Metadata index rebuild start");

  const albumNames = (await readDirectoryEntriesAsync(MEDIA_ROOT))
    .filter((entry) => entry.isDirectory() && entry.name !== APP_FOLDER_NAME)
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  const albumSummaries = [];
  const albumDetails = {};
  const subfolderDetails = {};
  let totalImages = 0;
  let totalVideos = 0;
  let totalArchives = 0;

  for (const albumName of albumNames) {
    const albumPath = path.join(MEDIA_ROOT, albumName);
    let entries = [];

    try {
      entries = await readDirectoryEntriesAsync(albumPath);
    } catch (error) {
      continue;
    }

    const rootImages = [];
    const rootVideos = [];
    const rootArchives = [];
    const immediateSubfolders = [];

    for (const entry of entries) {
      const fullPath = path.join(albumPath, entry.name);

      if (entry.isDirectory()) {
        immediateSubfolders.push(entry.name);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      const relativePath = toPosix(path.relative(MEDIA_ROOT, fullPath));

      if (IMAGE_EXTENSIONS.has(extension)) {
        rootImages.push({
          name: entry.name,
          relativePath,
          directory: "."
        });
        continue;
      }

      if (VIDEO_EXTENSIONS.has(extension)) {
        rootVideos.push({
          name: entry.name,
          relativePath,
          directory: "."
        });
        continue;
      }

      if (ARCHIVE_EXTENSIONS.has(extension)) {
        let sizeBytes = 0;
        try {
          sizeBytes = (await fs.promises.stat(fullPath)).size;
        } catch (error) {
          sizeBytes = 0;
        }

        rootArchives.push({
          name: entry.name,
          relativePath,
          sizeBytes
        });
      }
    }

    rootImages.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
    rootVideos.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
    rootArchives.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
    immediateSubfolders.sort((a, b) => a.localeCompare(b, "en"));

    const subfolders = [];
    const albumPreviewImages = rootImages
      .slice(0, PREVIEW_CANDIDATE_LIMIT)
      .map((image) => image.relativePath);
    let albumTotalImages = rootImages.length;
    let albumTotalVideos = rootVideos.length;
    let albumTotalArchives = rootArchives.length;

    for (const subfolderName of immediateSubfolders) {
      const detail = await scanSubfolderRecursiveAsync(albumName, subfolderName);
      const key = createSubfolderCacheKey(albumName, subfolderName);
      subfolderDetails[key] = detail;
      subfolders.push({
        name: subfolderName,
        path: subfolderName,
        imageCount: detail.imageCount,
        videoCount: detail.videoCount,
        previewImages: detail.previewImages.slice(0, PREVIEW_CANDIDATE_LIMIT)
      });

      if (albumPreviewImages.length < PREVIEW_CANDIDATE_LIMIT) {
        for (const previewImage of detail.previewImages) {
          if (albumPreviewImages.length >= PREVIEW_CANDIDATE_LIMIT) {
            break;
          }
          albumPreviewImages.push(previewImage);
        }
      }

      albumTotalImages += detail.imageCount;
      albumTotalVideos += detail.videoCount;
      albumTotalArchives += detail.archiveCount;
      await yieldToEventLoop();
    }

    totalImages += albumTotalImages;
    totalVideos += albumTotalVideos;
    totalArchives += albumTotalArchives;

    albumDetails[albumName] = {
      name: albumName,
      albumName,
      subfolder: ".",
      imageCount: rootImages.length,
      images: rootImages,
      videoCount: rootVideos.length,
      videos: rootVideos,
      subfolders,
      archives: rootArchives,
      archiveCount: rootArchives.length,
      folderCount: subfolders.length,
      previewImages: albumPreviewImages.slice(0, PREVIEW_CANDIDATE_LIMIT)
    };

    albumSummaries.push({
      name: albumName,
      imageCount: albumTotalImages,
      videoCount: albumTotalVideos,
      archiveCount: albumTotalArchives,
      folderCount: subfolders.length,
      previewImages: albumPreviewImages.slice(0, PREVIEW_CANDIDATE_LIMIT),
      subfolderCount: subfolders.length
    });
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    mediaRoot: MEDIA_ROOT,
    totals: {
      albums: albumSummaries.length,
      images: totalImages,
      videos: totalVideos,
      archives: totalArchives
    },
    albums: albumSummaries,
    albumDetails,
    subfolderDetails
  };

  const tempPath = `${INDEX_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(index), "utf8");
  fs.renameSync(tempPath, INDEX_FILE);

  log(
    `Metadata index rebuild done: albums=${index.totals.albums} images=${index.totals.images} archives=${index.totals.archives}`
  );

  return index;
}

function loadMetadataIndexFromDisk() {
  try {
    if (!fs.existsSync(INDEX_FILE)) {
      log("Metadata index not found on disk");
      return;
    }

    const parsed = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
    if (!parsed || !Array.isArray(parsed.albums) || !parsed.albumDetails || !parsed.subfolderDetails) {
      log("Metadata index ignored: invalid format");
      return;
    }

    metadataIndex = parsed;
    log(`Metadata index loaded from disk (${parsed.generatedAt || "unknown time"})`);
  } catch (error) {
    log(`Metadata index load failed: ${error.message}`);
  }
}

function applyMetadataIndex(index) {
  metadataIndex = index;
  cachedAlbumList = {
    generatedAt: index.generatedAt,
    mediaRoot: index.mediaRoot,
    totals: index.totals,
    albums: cloneJson(index.albums)
  };
  cachedAlbumListAt = Date.now();

  cachedAlbumDetails.clear();
  Object.entries(index.albumDetails).forEach(([albumName, detail]) => {
    cachedAlbumDetails.set(albumName, {
      cachedAt: Date.now(),
      data: cloneJson(detail)
    });
  });

  cachedSubfolderDetails.clear();
  Object.entries(index.subfolderDetails).forEach(([key, detail]) => {
    cachedSubfolderDetails.set(key, {
      cachedAt: Date.now(),
      data: cloneJson(detail)
    });
  });
}

function refreshMetadataIndexInBackground() {
  if (metadataIndexBuildPromise) {
    log("Metadata index rebuild already running");
    return metadataIndexBuildPromise;
  }

  metadataIndexStatus = {
    state: "building",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null
  };

  metadataIndexBuildPromise = buildMetadataIndex()
    .then((index) => {
      applyMetadataIndex(index);
      metadataIndexStatus = {
        state: "ready",
        startedAt: metadataIndexStatus.startedAt,
        finishedAt: new Date().toISOString(),
        error: null
      };
      refreshThumbnailCacheInBackground(index);
      return index;
    })
    .catch((error) => {
      metadataIndexStatus = {
        state: "error",
        startedAt: metadataIndexStatus.startedAt,
        finishedAt: new Date().toISOString(),
        error: error.message
      };
      log(`Metadata index rebuild failed: ${error.message}`);
      return null;
    })
    .finally(() => {
      metadataIndexBuildPromise = null;
    });

  return metadataIndexBuildPromise;
}

function collectIndexedImagePaths(index) {
  if (!index || !index.subfolderDetails) {
    return [];
  }

  const uniquePaths = new Set();

  Object.values(index.subfolderDetails).forEach((detail) => {
    if (!detail || !Array.isArray(detail.images)) {
      return;
    }
    detail.images.forEach((image) => {
      if (image && image.relativePath) {
        uniquePaths.add(image.relativePath);
      }
    });
  });

  Object.values(index.albumDetails || {}).forEach((detail) => {
    if (!detail || !Array.isArray(detail.images)) {
      return;
    }
    detail.images.forEach((image) => {
      if (image && image.relativePath) {
        uniquePaths.add(image.relativePath);
      }
    });
  });

  return Array.from(uniquePaths).sort((a, b) => a.localeCompare(b, "en"));
}

function refreshThumbnailCacheInBackground(index = metadataIndex) {
  if (!index) {
    log("Thumbnail prebuild skipped: metadata index not ready");
    return null;
  }

  if (thumbnailBuildPromise) {
    log("Thumbnail prebuild already running");
    return thumbnailBuildPromise;
  }

  const imagePaths = collectIndexedImagePaths(index);
  thumbnailBuildStatus = {
    state: "building",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    processed: 0,
    total: imagePaths.length
  };

  log(`Thumbnail prebuild start: images=${imagePaths.length}`);

  thumbnailBuildPromise = (async () => {
    for (let indexPosition = 0; indexPosition < imagePaths.length; indexPosition += 1) {
      const relativePath = imagePaths[indexPosition];
      const sourcePath = path.resolve(MEDIA_ROOT, relativePath);

      if (!supportsThumbnail(sourcePath)) {
        thumbnailBuildStatus.processed = indexPosition + 1;
        continue;
      }

      try {
          await ensureThumbnailAsync(sourcePath);
      } catch (error) {
        log(`Thumbnail prebuild warning: ${relativePath} ${error.message}`);
      }

      thumbnailBuildStatus.processed = indexPosition + 1;
      if ((indexPosition + 1) % 25 === 0) {
        await yieldToEventLoop();
      }
    }

    thumbnailBuildStatus = {
      state: "ready",
      startedAt: thumbnailBuildStatus.startedAt,
      finishedAt: new Date().toISOString(),
      error: null,
      processed: imagePaths.length,
      total: imagePaths.length
    };

    log(`Thumbnail prebuild done: processed=${imagePaths.length}`);
  })()
    .catch((error) => {
      thumbnailBuildStatus = {
        state: "error",
        startedAt: thumbnailBuildStatus.startedAt,
        finishedAt: new Date().toISOString(),
        error: error.message,
        processed: thumbnailBuildStatus.processed,
        total: thumbnailBuildStatus.total
      };
      log(`Thumbnail prebuild failed: ${error.message}`);
      return null;
    })
    .finally(() => {
      thumbnailBuildPromise = null;
    });

  return thumbnailBuildPromise;
}

function buildAlbumList() {
  if (metadataIndex) {
    const liveAlbumNames = getCurrentAlbumNames();
    const indexedAlbums = new Map(metadataIndex.albums.map((album) => [album.name, album]));
    const albums = liveAlbumNames.map((name) => {
      if (indexedAlbums.has(name)) {
        return cloneJson(indexedAlbums.get(name));
      }

      return {
        name,
        imageCount: null,
        videoCount: null,
        archiveCount: null,
        folderCount: null,
        previewImages: getQuickAlbumPreviewImages(name, 4),
        subfolderCount: null
      };
    });

    const addedAlbumCount = albums.filter((album) => !indexedAlbums.has(album.name)).length;
    if (addedAlbumCount > 0) {
      log(`Album list merged ${addedAlbumCount} new folder(s) from disk before index refresh`);
      refreshMetadataIndexInBackground();
    } else {
      log("Album list served from metadata index");
    }

    return {
      generatedAt: metadataIndex.generatedAt,
      mediaRoot: metadataIndex.mediaRoot,
      totals: {
        ...metadataIndex.totals,
        albums: albums.length
      },
      albums
    };
  }

  log("Building top-level album list");
  const albumNames = getCurrentAlbumNames();

  const albums = albumNames.map((name) => ({
    name,
    imageCount: null,
    videoCount: null,
    archiveCount: null,
    folderCount: null,
    previewImages: getQuickAlbumPreviewImages(name, 4),
    subfolderCount: null
  }));

  return {
    generatedAt: new Date().toISOString(),
    mediaRoot: MEDIA_ROOT,
    totals: {
      albums: albums.length,
      images: null,
      videos: null,
      archives: null
    },
    albums
  };
}

function getAlbumList() {
  const now = Date.now();
  if (!cachedAlbumList || now - cachedAlbumListAt > CACHE_TTL_MS) {
    log("Album list cache miss");
    cachedAlbumList = buildAlbumList();
    cachedAlbumListAt = now;
  } else {
    log("Album list cache hit");
  }
  return cachedAlbumList;
}

function getAlbumDetail(albumName) {
  if (metadataIndex && metadataIndex.albumDetails && metadataIndex.albumDetails[albumName]) {
    log(`Album detail served from metadata index: ${albumName}`);
    return cloneJson(metadataIndex.albumDetails[albumName]);
  }

  const now = Date.now();
  const cached = cachedAlbumDetails.get(albumName);
  if (cached && now - cached.cachedAt <= CACHE_TTL_MS) {
    log(`Album detail cache hit: ${albumName}`);
    return cached.data;
  }

  log(`Album detail scan start: ${albumName}`);
  const detail = scanAlbumShallow(albumName);
  log(
    `Album detail scan done: ${albumName} subfolders=${detail.subfolders.length} archives=${detail.archiveCount}`
  );
  cachedAlbumDetails.set(albumName, {
    cachedAt: now,
    data: detail
  });
  return detail;
}

function getSubfolderDetail(albumName, subfolderName) {
  const key = `${albumName}::${subfolderName}`;
  if (metadataIndex && metadataIndex.subfolderDetails && metadataIndex.subfolderDetails[key]) {
    log(`Subfolder detail served from metadata index: ${albumName} / ${subfolderName}`);
    return cloneJson(metadataIndex.subfolderDetails[key]);
  }

  const now = Date.now();
  const cached = cachedSubfolderDetails.get(key);
  if (cached && now - cached.cachedAt <= CACHE_TTL_MS) {
    log(`Subfolder cache hit: ${albumName} / ${subfolderName}`);
    return cached.data;
  }

  log(`Subfolder scan start: ${albumName} / ${subfolderName}`);
  const detail = scanSubfolderRecursive(albumName, subfolderName);
  log(
    `Subfolder scan done: ${albumName} / ${subfolderName} images=${detail.imageCount}`
  );
  cachedSubfolderDetails.set(key, {
    cachedAt: now,
    data: detail
  });
  return detail;
}

function supportsThumbnail(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".jpg" || extension === ".jpeg" || extension === ".png" || extension === ".gif";
}

function getThumbnailCachePath(filePath) {
  const hash = crypto
    .createHash("sha1")
    .update(`${filePath}|webp|${DEFAULT_THUMB_WIDTH}|${DEFAULT_THUMB_QUALITY}`)
    .digest("hex");

  return path.join(THUMB_CACHE_DIR, `${hash}.webp`);
}

function ensureThumbnail(sourcePath) {
  const cachePath = getThumbnailCachePath(sourcePath);
  fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });

  const sourceStats = fs.statSync(sourcePath);

  if (fs.existsSync(cachePath)) {
    const cacheStats = fs.statSync(cachePath);
    if (cacheStats.mtimeMs >= sourceStats.mtimeMs && cacheStats.size > 0) {
      return cachePath;
    }
  }

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      sourcePath,
      "-vf",
      `scale='min(${DEFAULT_THUMB_WIDTH},iw)':-2:flags=lanczos`,
      "-compression_level",
      "6",
      "-quality",
      String(DEFAULT_THUMB_QUALITY),
      cachePath,
    ],
    {
      stdio: "ignore"
    }
  );

  return cachePath;
}

function ensureThumbnailAsync(sourcePath) {
  return new Promise((resolve, reject) => {
    let cachePath;

    try {
      cachePath = getThumbnailCachePath(sourcePath);
      fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });

      const sourceStats = fs.statSync(sourcePath);
      if (fs.existsSync(cachePath)) {
        const cacheStats = fs.statSync(cachePath);
        if (cacheStats.mtimeMs >= sourceStats.mtimeMs && cacheStats.size > 0) {
          resolve(cachePath);
          return;
        }
      }
    } catch (error) {
      reject(error);
      return;
    }

      execFile(
        "ffmpeg",
        [
          "-y",
          "-loglevel",
          "error",
          "-i",
          sourcePath,
          "-vf",
          `scale='min(${DEFAULT_THUMB_WIDTH},iw)':-2:flags=lanczos`,
          "-compression_level",
          "6",
          "-quality",
          String(DEFAULT_THUMB_QUALITY),
          cachePath,
        ],
      { stdio: "ignore" },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(cachePath);
      }
    );
  });
}

function handleApiRequest(req, res, requestUrl) {
  if (requestUrl.pathname === "/api/albums") {
    log(`API /api/albums search="${requestUrl.searchParams.get("search") || ""}"`);
    const index = getAlbumList();
    const search = (requestUrl.searchParams.get("search") || "").trim().toLowerCase();
    const albums = index.albums
      .filter((album) => !search || album.name.toLowerCase().includes(search))
      .map((album) => album);

    sendJson(res, 200, {
      generatedAt: index.generatedAt,
      mediaRoot: index.mediaRoot,
      indexStatus: metadataIndexStatus,
      thumbnailStatus: thumbnailBuildStatus,
      totals: index.totals,
      albums
    });
    return;
  }

  if (requestUrl.pathname === "/api/album") {
    const name = requestUrl.searchParams.get("name");
    log(`API /api/album name="${name || ""}"`);

    if (!name) {
      sendError(res, 400, "Album name is required.");
      return;
    }

    const summaryIndex = getAlbumList();
    const exists = summaryIndex.albums.some((item) => item.name === name);

    if (!exists) {
      sendError(res, 404, "Album not found.");
      return;
    }

    const album = getAlbumDetail(name);
    sendJson(res, 200, album);
    return;
  }

  if (requestUrl.pathname === "/api/subfolder") {
    const albumName = requestUrl.searchParams.get("album");
    const subfolderName = requestUrl.searchParams.get("name");
    log(`API /api/subfolder album="${albumName || ""}" name="${subfolderName || ""}"`);

    if (!albumName || !subfolderName) {
      sendError(res, 400, "Album and subfolder names are required.");
      return;
    }

    const summaryIndex = getAlbumList();
    const exists = summaryIndex.albums.some((item) => item.name === albumName);
    if (!exists) {
      sendError(res, 404, "Album not found.");
      return;
    }

    const detail = getSubfolderDetail(albumName, subfolderName);
    sendJson(res, 200, detail);
    return;
  }

  sendError(res, 404, "Unknown API endpoint.");
}

function handleMediaRequest(req, res, requestUrl) {
  const relativePath = decodeURIComponent(requestUrl.pathname.replace(/^\/media\//, ""));
  const filePath = path.resolve(MEDIA_ROOT, relativePath);

  if (!isInsideRoot(filePath, MEDIA_ROOT) && filePath !== MEDIA_ROOT) {
    sendError(res, 403, "Forbidden.");
    return;
  }

  serveFile(req, res, filePath);
}

function handleThumbnailRequest(req, res, requestUrl) {
  const relativePath = decodeURIComponent(requestUrl.pathname.replace(/^\/thumb\//, ""));
  const filePath = path.resolve(MEDIA_ROOT, relativePath);

  if (!isInsideRoot(filePath, MEDIA_ROOT) && filePath !== MEDIA_ROOT) {
    sendError(res, 403, "Forbidden.");
    return;
  }

  if (!supportsThumbnail(filePath)) {
    serveFile(req, res, filePath);
    return;
  }

  try {
    const thumbnailPath = ensureThumbnail(filePath);
    serveWebpFile(res, thumbnailPath);
  } catch (error) {
    serveFile(req, res, filePath);
  }
}

function handleStaticRequest(req, res, requestUrl) {
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);

  if (!isInsideRoot(filePath, PUBLIC_DIR) && filePath !== PUBLIC_DIR) {
    sendError(res, 403, "Forbidden.");
    return;
  }

  serveFile(req, res, filePath);
}

function renderStartupMessage() {
  const addresses = [
    `Local:   http://localhost:${PORT}`,
    `Media:   ${MEDIA_ROOT}`,
    `Index:   ${INDEX_FILE}`,
    `Tip:     Open the URL above in a browser on this machine or your LAN.`
  ];

  return `\n${addresses.join("\n")}\n`;
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (requestUrl.pathname.startsWith("/api/")) {
      handleApiRequest(req, res, requestUrl);
      return;
    }

    if (requestUrl.pathname.startsWith("/media/")) {
      handleMediaRequest(req, res, requestUrl);
      return;
    }

    if (requestUrl.pathname.startsWith("/thumb/")) {
      handleThumbnailRequest(req, res, requestUrl);
      return;
    }

    handleStaticRequest(req, res, requestUrl);
  } catch (error) {
    sendError(res, 500, escapeHtml(error.message || "Internal server error."));
  }
});

function startServer(port = PORT, callback) {
  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      process.stderr.write(
        `Port ${port} is already in use. If the gallery is already running, open http://localhost:${port} in your browser.\n`
      );
      return;
    }

    throw error;
  });

  return server.listen(port, () => {
    ensureThumbnailCacheSettings();
    loadMetadataIndexFromDisk();
    if (metadataIndex) {
      applyMetadataIndex(metadataIndex);
      refreshThumbnailCacheInBackground(metadataIndex);
    }
    refreshMetadataIndexInBackground();
    process.stdout.write(renderStartupMessage());
    if (callback) {
      callback();
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  APP_ROOT,
  INDEX_FILE,
  THUMB_CACHE_DIR,
  DEFAULT_THUMB_WIDTH,
  DEFAULT_THUMB_QUALITY,
  MEDIA_ROOT,
  PORT,
  buildMetadataIndex,
  buildAlbumList,
  collectIndexedImagePaths,
  ensureThumbnail,
  ensureThumbnailAsync,
  ensureThumbnailCacheSettings,
  getAlbumList,
  getAlbumDetail,
  getSubfolderDetail,
  supportsThumbnail,
  server,
  startServer
};
