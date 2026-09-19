const fsPromises = require("node:fs/promises");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const fsSync = require("node:fs");

async function moveUploadedFile(file, destinationDir, newDestinationFileName = null) {
  if (!file?.path) {
    return null;
  }

  const destinationFilename = newDestinationFileName ?? file.filename;

  const destinationPath = path.join(destinationDir, destinationFilename);

  await fsPromises.rename(file.path, destinationPath);

  return destinationPath;
}

async function deleteUploadedFile(file) {
  if (!file?.path) {
    return;
  }

  try {
    await fsPromises.unlink(file.path);
  } catch (error) {
    console.error(
      `Failed to delete uploaded file: ${file.path}`,
      error
    );
  }
}

async function isValidJson(filePath) {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    JSON.parse(contents);

    return true;
  } catch (error) {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}
//
// get file hash
//
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fsSync.createReadStream(filePath);

    stream.on("data", chunk => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", reject);
  });
}
//
// Find available base name
//
async function findAvailableBaseName(
  destinationDir,
  originalFilename
) {
  const parsed = path.parse(originalFilename);
  const originalBaseName = parsed.name;

  let counter = 1;

  while (true) {
    const newBaseName =
      `${originalBaseName}_${counter}`;

    const imagePath = path.join(
      destinationDir,
      `${newBaseName}${parsed.ext}`
    );

    if (!(await fileExists(imagePath))) {
      return newBaseName;
    }

    counter++;
  }
}

module.exports = {
    deleteUploadedFile,
    isValidJson,
    moveUploadedFile,
    fileExists,
    calculateFileHash,
    findAvailableBaseName
};