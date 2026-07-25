const path = require("path");
const {
  readMetadata,
} = require("../services/importCapture");

async function runTests() {
  try {
    // 1. No path supplied
    const noPath = await readMetadata();
    console.log("No path:", noPath);

    // 2. File does not exist
    const missing = await readMetadata(
      path.join(__dirname, "does-not-exist.json")
    );
    console.log("Missing file:", missing);

    // 3. Valid JSON
    const valid = await readMetadata(
      path.join(__dirname, "test-data", "valid.json")
    );
    console.log("Valid JSON:", valid);

    // 4. Invalid JSON
    const invalid = await readMetadata(
      path.join(__dirname, "test-data", "invalid.json")
    );
    console.log("Invalid JSON:", invalid);

    // 5. diretory test
    const directoryTest = await readMetadata(
        path.join(__dirname, "test-data")
    );

    console.log(directoryTest);
  } catch (error) {
    console.error("Unexpected test failure:", error);
    process.exitCode = 1;
  }
}

runTests();