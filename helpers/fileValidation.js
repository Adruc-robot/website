const fsPromises = require("node:fs/promises");
const fs = require("node:fs/promises");

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


module.exports = {
    deleteUploadedFile,
    isValidJson
};