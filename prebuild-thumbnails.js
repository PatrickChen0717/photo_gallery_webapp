"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  APP_ROOT,
  THUMB_CACHE_DIR,
  DEFAULT_THUMB_WIDTH,
  DEFAULT_THUMB_QUALITY,
  MEDIA_ROOT,
  buildMetadataIndex,
  collectIndexedImagePaths,
  ensureThumbnailAsync,
  ensureThumbnailCacheSettings,
  supportsThumbnail
} = require("./server");

const PROGRESS_BAR_WIDTH = 28;

function log(message) {
  process.stdout.write(`[thumb-prebuild] ${message}\n`);
}

function renderProgress(summary) {
  const total = Math.max(summary.total, 1);
  const ratio = Math.min(1, summary.processed / total);
  const filled = Math.round(ratio * PROGRESS_BAR_WIDTH);
  const bar = `${"#".repeat(filled)}${"-".repeat(PROGRESS_BAR_WIDTH - filled)}`;
  const percent = String(Math.floor(ratio * 100)).padStart(3, " ");
  process.stdout.write(
    `\r[thumb-prebuild] [${bar}] ${percent}% ${summary.processed}/${summary.total} generated=${summary.generated} reused=${summary.reused} skipped=${summary.skippedUnsupported} failed=${summary.failed}`
  );
}

function parseConcurrency(argv) {
  const flag = argv.find((value) => value.startsWith("--concurrency="));
  const cpuCount = Math.max(1, os.cpus().length || 1);
  const defaultConcurrency = Math.max(2, Math.min(8, cpuCount));
  const parsed = flag ? Number(flag.split("=")[1]) : defaultConcurrency;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultConcurrency;
  }
  return Math.min(16, Math.floor(parsed));
}

function getCacheFileNameForSource(sourcePath) {
  return `${crypto
    .createHash("sha1")
    .update(`${sourcePath}|webp|${DEFAULT_THUMB_WIDTH}|${DEFAULT_THUMB_QUALITY}`)
    .digest("hex")}.webp`;
}

function getCachePathForSource(sourcePath) {
  return path.join(THUMB_CACHE_DIR, getCacheFileNameForSource(sourcePath));
}

async function removeStaleCacheFiles(imagePaths) {
  const expectedCacheFiles = new Set(
    imagePaths.map((relativePath) => {
      const sourcePath = path.resolve(MEDIA_ROOT, relativePath);
      return getCacheFileNameForSource(sourcePath);
    })
  );

  let removed = 0;
  let kept = 0;
  let scanned = 0;

  const entries = await fs.promises.readdir(THUMB_CACHE_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.toLowerCase().endsWith(".webp")) {
      continue;
    }

    scanned += 1;
    if (expectedCacheFiles.has(entry.name)) {
      kept += 1;
      continue;
    }

    const targetPath = path.join(THUMB_CACHE_DIR, entry.name);
    try {
      await fs.promises.rm(targetPath, { force: true });
      removed += 1;
    } catch (error) {
      log(`Warning: failed to remove stale cache file ${entry.name}: ${error.message}`);
    }
  }

  return { scanned, removed, kept };
}

async function runWorker(queue, summary) {
  while (queue.length > 0) {
    const relativePath = queue.shift();
    const sourcePath = path.resolve(MEDIA_ROOT, relativePath);

    if (!supportsThumbnail(sourcePath)) {
      summary.skippedUnsupported += 1;
      summary.processed += 1;
      renderProgress(summary);
      continue;
    }

    const cachePath = getCachePathForSource(sourcePath);

    let existedFresh = false;
    try {
      const [sourceStats, cacheStats] = await Promise.all([
        fs.promises.stat(sourcePath),
        fs.promises.stat(cachePath).catch(() => null)
      ]);
      existedFresh = !!cacheStats && cacheStats.size > 0 && cacheStats.mtimeMs >= sourceStats.mtimeMs;
    } catch (error) {
      existedFresh = false;
    }

    try {
      await ensureThumbnailAsync(sourcePath);
      if (existedFresh) {
        summary.reused += 1;
      } else {
        summary.generated += 1;
      }
    } catch (error) {
      summary.failed += 1;
      if (summary.failureExamples.length < 5) {
        summary.failureExamples.push({
          relativePath,
          reason: error.message
        });
      }
    }

    summary.processed += 1;
    renderProgress(summary);
  }
}

async function main() {
  const startedAt = Date.now();
  const concurrency = parseConcurrency(process.argv.slice(2));

  ensureThumbnailCacheSettings();
  fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });

  log(`Building metadata index from ${APP_ROOT}`);
  const index = await buildMetadataIndex();
  const imagePaths = collectIndexedImagePaths(index);
  const cleanup = await removeStaleCacheFiles(imagePaths);
  log(`Stale cache cleanup | scanned=${cleanup.scanned} removed=${cleanup.removed} kept=${cleanup.kept}`);

  const summary = {
    total: imagePaths.length,
    processed: 0,
    generated: 0,
    reused: 0,
    skippedUnsupported: 0,
    failed: 0,
    failureExamples: []
  };

  log(
    `Starting thumbnail prebuild | images=${summary.total} | width=${DEFAULT_THUMB_WIDTH} | quality=${DEFAULT_THUMB_QUALITY} | format=webp | concurrency=${concurrency}`
  );
  renderProgress(summary);

  const queue = [...imagePaths];
  const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, () =>
    runWorker(queue, summary)
  );

  await Promise.all(workers);
  process.stdout.write("\n");

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  log(
    `Done in ${elapsedSeconds}s | generated=${summary.generated} reused=${summary.reused} skipped=${summary.skippedUnsupported} failed=${summary.failed} cache=${THUMB_CACHE_DIR}`
  );

  if (summary.failureExamples.length > 0) {
    log("Sample failures:");
    summary.failureExamples.forEach((failure) => {
      log(`  - ${failure.relativePath} | ${failure.reason}`);
    });
  }
}

main().catch((error) => {
  process.stderr.write(`[thumb-prebuild] Failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
