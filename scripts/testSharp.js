const path = require("node:path");
const sharp = require("sharp");

sharp.block({
  operation: [
    "VipsForeignLoadNsgif",
    "VipsForeignLoadTiff",
    "VipsForeignLoadVips",
  ],
});

async function testSharp() {
  const sourcePath = path.join(
    __dirname,
    "..",
    "storage",
    "incoming",
    "IMG_20260907_060021.jpg"
  );

  const outputPath = path.join(
    __dirname,
    "..",
    "storage",
    "test-output.jpg"
  );

  const metadata = await sharp(sourcePath).metadata();

  console.log("Source metadata:");
  console.log(metadata);

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 85,
      mozjpeg: true,
    })
    .toFile(outputPath);

  console.log(`Created: ${outputPath}`);
}

testSharp().catch(error => {
  console.error(error);
  process.exitCode = 1;
});