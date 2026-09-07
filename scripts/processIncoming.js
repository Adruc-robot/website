const fs = require("node:fs/promises");
const path = require("node:path");
const { importCapture } = require("../services/importCapture");
const db = require("../services/db");
const Image = require("../models/image");
const { processImage } = require("../services/imageProcessor");

const incomingDir = path.join(__dirname, "..", "storage", "incoming");
const originalsDir = path.join(__dirname, "..", "storage", "originals");

// 
// Helper function to clean stuff up
//
async function moveFile(sourcePath, destinationDir) {
  await fs.mkdir(destinationDir, { recursive: true });

  const destinationPath = path.join(
    destinationDir,
    path.basename(sourcePath)
  );

  await fs.rename(sourcePath, destinationPath);

  return destinationPath;
}

async function processIncoming() {
  const files = await fs.readdir(incomingDir);

  const images = files.filter(file =>
    file.toLowerCase().endsWith(".jpg")
  );

  for (const image of images) {
    const imagePath = path.join(incomingDir, image);

    const jsonName = path.parse(image).name + ".json";
    const jsonPath = path.join(incomingDir, jsonName);

    const jsonExists = files.includes(jsonName);
    try {
      const imageId = await importCapture(
        imagePath,
        jsonExists ? jsonPath : null
      );

      const processed = await processImage(imagePath);

      await Image.updateProcessingResult( imageId, processed.webPath, processed.thumbnailPath, "complete");

      const newImagePath = await moveFile(imagePath, originalsDir);

      await Image.updateOriginalPath( imageId, newImagePath);

      if (jsonExists) {
        await moveFile(
          jsonPath,
          originalsDir
        );
      }      

      console.log(`Processed: ${image}`);

    } catch (error) {
      console.error(`Failed to process: ${image}`, error);
    }

  }
}

async function main() {
  try {
    await processIncoming();
  } catch (error) {
    console.error(error);
  } finally {
    await db.end();
  }
}

main();