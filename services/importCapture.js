const fs = require("fs/promises");

const Image = require("../models/image");
const Location = require("../models/location");

const { determineCapturedAt } = require("../helpers/timestamp");
const { calculateFileHash } = require("../helpers/captureUpload");
const fileHash = await calculateFileHash(imagePath);
//
// Read optional JSON metadata
//
async function readMetadata(jsonPath) {
  if (!jsonPath) {
    return {};
  }

  try {
    const contents = await fs.readFile(jsonPath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    if (error instanceof SyntaxError) {
        console.warn(
            `Invalid JSON in ${jsonPath}: ${error.message}`
        );
        return {};
    }

    throw error;
  }
}

//
// Import one capture
//
async function importCapture(imagePath, jsonPath = null) {
  if (!imagePath) {
    throw new Error("An image path is required");
  }

  const metadata = await readMetadata(jsonPath);

  let location = null;

  if (metadata.location) {
    location = await Location.findByName(metadata.location);
  }

  if (!location) {
    location = await Location.findByName("Unknown");
  }

  if (!location) {
    throw new Error("Required fallback location 'Unknown' does not exist");
  }

  //const capturedAt = metadata.timestamp ?? null;
  const capturedAt = await determineCapturedAt(imagePath, metadata);

  if (!capturedAt) {
    throw new Error(
      `No capture timestamp is available for image: ${imagePath}`
    );
  }

  const image = {
    location_id: location.id,
    captured_at: capturedAt,
    original_path: imagePath,
    file_hash: fileHash,
    web_path: null,
    thumbnail_path: null,
    processing_status: "pending",
  };

  const telemetry = {
    scene: metadata.scene ?? null,
    exposure_us: metadata.camera?.current?.exposure ?? null,
    gain: metadata.camera?.current?.gain ?? null,
    effective_exposure:
      metadata.camera?.current?.effective_exposure ?? null,
    brightness_mean: metadata.brightness?.mean ?? null,
    brightness_median: metadata.brightness?.median ?? null,
    clipped_low: metadata.brightness?.clipped_low ?? null,
    clipped_high: metadata.brightness?.clipped_high ?? null,
    sun_altitude: metadata.sky?.sun_altitude ?? null,
    moon_altitude: metadata.sky?.moon_altitude ?? null,
    moon_illumination: metadata.sky?.moon_illumination ?? null,
    metadata_json: metadata,
  };

  const existing = await Image.findByFileHash(fileHash);

  if (existing) {
      await Image.updateWithTelemetry(
      existing.id,
      image,
      telemetry
    );
    
    return existing.id;
  } 
  
  return Image.createWithTelemetry(image, telemetry); 
  
}

//module.exports = importCapture;
module.exports = {
  importCapture,
  readMetadata,
};