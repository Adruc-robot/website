const fs = require("fs/promises");
const path = require("path");
const exifr = require("exifr");

//
// Determine capture timestamp
//
async function determineCapturedAt(imagePath, metadata = {}) {
  // 1. Capture JSON
  if (metadata.timestamp) {
    return new Date(metadata.timestamp);
  }

  // 2. EXIF
  try {
    const exif = await exifr.parse(imagePath, [
      "DateTimeOriginal",
      "CreateDate",
      "ModifyDate",
    ]);

    const exifDate =
      exif?.DateTimeOriginal ??
      exif?.CreateDate ??
      exif?.ModifyDate;

    if (exifDate instanceof Date && !Number.isNaN(exifDate.getTime())) {
      return exifDate;
    }
  } catch (error) {
    console.warn(
      `Could not read EXIF timestamp from ${imagePath}: ${error.message}`
    );
  }

  // 3. Filename
  const filenameDate = parseTimestampFromFilename(imagePath);

  if (filenameDate) {
    return filenameDate;
  }

  // 4. File modification time
  const stats = await fs.stat(imagePath);

  return stats.mtime;
}

function parseTimestampFromFilename(imagePath) {
  const filename = path.basename(imagePath);

  const match = filename.match(
    /(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;

  const result = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  return result;
}

module.exports = {
    determineCapturedAt,
    parseTimestampFromFilename,
};