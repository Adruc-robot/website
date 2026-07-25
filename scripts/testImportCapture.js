const path = require("path");
const { importCapture } = require("../services/importCapture");

async function runTest() {
  const imagePath = path.join(
    __dirname,
    "test-data",
    "IMG_20260717_204502.jpg"
  );

  const jsonPath = path.join(
    __dirname,
    "test-data",
    "IMG_20260717_204502.json"
  );

  const result = await importCapture(imagePath, jsonPath);

  console.log("Imported image:", result);
}

runTest()
  .then(() => {
    console.log("Import test completed.");
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error("Import test failed:", error);
    process.exitCode = 1;
  });