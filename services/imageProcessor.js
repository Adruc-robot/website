const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const WEB_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 320;

sharp.block({
  operation: [
    "VipsForeignLoadNsgif",
    "VipsForeignLoadTiff",
    "VipsForeignLoadVips",
  ],
});

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, {
    recursive: true,
  });
}

function getOutputPaths(sourcePath) {
  const baseName = path.parse(sourcePath).name;

  const storageDir = path.join(
    __dirname,
    "..",
    "storage"
  );

  const webDir = path.join(
    storageDir,
    "web"
  );

  const thumbDir = path.join(
    storageDir,
    "thumbs"
  );

  return {
    webDir,
    thumbDir,

    webPath: path.join(
      webDir,
      `${baseName}.jpg`
    ),

    thumbnailPath: path.join(
      thumbDir,
      `${baseName}.jpg`
    ),
  };
}

async function processImage(sourcePath) {
  if (!sourcePath) {
    throw new Error("A source image path is required");
  }

  const extension = path
    .extname(sourcePath)
    .toLowerCase();

  const supportedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  if (!supportedExtensions.includes(extension)) {
    throw new Error(
      `Unsupported image format: ${extension}`
    );
  }

  const {
    webDir,
    thumbDir,
    webPath,
    thumbnailPath,
  } = getOutputPaths(sourcePath);

  await ensureDirectory(webDir);
  await ensureDirectory(thumbDir);

  const metadata = await sharp(sourcePath)
    .metadata();

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: WEB_MAX_EDGE,
      height: WEB_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 85,
      mozjpeg: true,
    })
    .toFile(webPath);

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: THUMB_MAX_EDGE,
      height: THUMB_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 80,
      mozjpeg: true,
    })
    .toFile(thumbnailPath);

  return {
    webPath,
    thumbnailPath,
    originalWidth:
      metadata.width ?? null,
    originalHeight:
      metadata.height ?? null,
  };
}

module.exports = {
  processImage,
};