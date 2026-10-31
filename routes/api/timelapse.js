const express = require("express");
const path = require("node:path");
const Image = require("../../models/image");
const fs = require("node:fs/promises");
const { sanitizeTelemetry } = require("../../services/sanitizeTelemetry");

const router = express.Router();

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

router.get("/day", async (req, res) => {
  try {
    const locationId = Number(req.query.location);
    const date = req.query.date;

    if (!Number.isInteger(locationId) || locationId < 1) {
      return res.status(400).json({
        error: "A valid location is required",
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "A valid date in YYYY-MM-DD format is required",
      });
    }

    const start = `${date} 00:00:00`;

    const endDate = new Date(`${date}T00:00:00`);
    endDate.setDate(endDate.getDate() + 1);

    const year = endDate.getFullYear();
    const month = String(endDate.getMonth() + 1).padStart(2, "0");
    const day = String(endDate.getDate()).padStart(2, "0");

    const end = `${year}-${month}-${day} 00:00:00`;

    const images = await Image.findCompleteByLocationAndDay(
      locationId,
      start,
      end
    );

    const result = images.map(image => ({
      id: image.id,
      capturedAt: image.captured_at,
      webUrl: `/timelapse/web/${path.basename(image.web_path)}`,
      thumbnailUrl: `/timelapse/thumbs/${path.basename(image.thumbnail_path)}`,
      originalUrl: `/api/timelapse/image/${image.id}/original`,
    }));

    return res.json({
      date,
      locationId,
      count: result.length,
      images: result,
    });
  } catch (error) {
    console.error("Timelapse day query failed:", error);

    return res.status(500).json({
      error: "Unable to retrieve timelapse images",
    });
  }
});

router.get("/calendar", async (req, res) => {
  try {
    const locationId = Number(req.query.location);
    const startDate = req.query.start;
    const endDate = req.query.end;

    if (!Number.isInteger(locationId) || locationId < 1) {
      return res.status(400).json({
        error: "A valid location is required",
      });
    }

    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({
        error: "A valid start date in YYYY-MM-DD format is required",
      });
    }

    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        error: "A valid end date in YYYY-MM-DD format is required",
      });
    }

    const start = `${startDate} 00:00:00`;
    const end = `${endDate} 00:00:00`;

    const images = await Image.findDailyRepresentatives(
      locationId,
      start,
      end
    );

    const days = images.map(image => ({
      date: formatLocalDate(image.captured_at),
      imageId: image.id,
      capturedAt: image.captured_at,
      webUrl: `/timelapse/web/${path.basename(image.web_path)}`,
      thumbnailUrl: `/timelapse/thumbs/${path.basename(image.thumbnail_path)}`,
    }));

    return res.json({
      locationId,
      start: startDate,
      end: endDate,
      count: days.length,
      days,
    });
  } catch (error) {
    console.error("Timelapse calendar query failed:", error);

    return res.status(500).json({
      error: "Unable to retrieve timelapse calendar",
    });
  }
});

//
// Serve a full-resolution original image
//
router.get("/image/:id/original", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: "A valid image ID is required",
      });
    }

    const image = await Image.find(id);

    if (
      !image ||
      image.processing_status !== "complete" ||
      !image.original_path
    ) {
      return res.status(404).json({
        error: "Original image not available",
      });
    }

    const originalsDir = path.resolve(
      __dirname,
      "..",
      "..",
      "storage",
      "originals"
    );

    const originalPath = path.resolve(image.original_path);

    // Ensure the requested file belongs to our originals directory.
    const relativePath = path.relative(originalsDir, originalPath);

    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      return res.status(404).json({
        error: "Original image not available",
      });
    }

    // Check that the file exists and is a regular file.
    const fileStat = await fs.stat(originalPath);

    if (!fileStat.isFile()) {
      return res.status(404).json({
        error: "Original image not available",
      });
    }

    return res.sendFile(originalPath);

  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        error: "Original image not found",
      });
    }

    console.error("Original image request failed:", error);

    return res.status(500).json({
      error: "Unable to retrieve original image",
    });
  }
});

//
// Retrieve telemetry for a capture
//
router.get("/image/:id/telemetry", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: "A valid image ID is required",
      });
    }

    const image = await Image.find(id);

    if (!image || image.processing_status !== "complete") {
      return res.status(404).json({
        error: "Image not found",
      });
    }

    let metadata = image.metadata_json ?? {};

    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = {};
      }
    }

    // Sanitize before sending anything to the browser.
    const safeMetadata = sanitizeTelemetry(metadata) ?? {};

    return res.json({
      id: image.id,
      capturedAt: image.captured_at,
      metadata: safeMetadata,
    });

  } catch (error) {
    console.error("Telemetry request failed:", error);

    return res.status(500).json({
      error: "Unable to retrieve telemetry",
    });
  }
});

module.exports = router;