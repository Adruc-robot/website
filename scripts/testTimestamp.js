const path = require("path");

const {
  determineCapturedAt,
  parseTimestampFromFilename,
} = require("../helpers/timestamp");

async function runTests() {
  // Filename parser
  const filenameDate = parseTimestampFromFilename(
    "/photos/IMG_20260717_204502.jpg"
  );

  console.log("Filename timestamp:", filenameDate);

  // JSON metadata should take priority over every other source
  const metadataDate = await determineCapturedAt(
    path.join(__dirname, "test-data", "test-image.jpg"),
    {
      timestamp: "2026-07-24T06:30:00-06:00",
    }
  );

  console.log("Metadata timestamp:", metadataDate);

  // No metadata: test EXIF, filename, or mtime using a real image
  const fallbackDate = await determineCapturedAt(
    path.join(
      __dirname,
      "test-data",
      "IMG_20260717_204502.jpg"
    ),
    {}
  );

  console.log("Fallback timestamp:", fallbackDate);
}

runTests().catch((error) => {
  console.error("Timestamp test failed:", error);
  process.exitCode = 1;
});