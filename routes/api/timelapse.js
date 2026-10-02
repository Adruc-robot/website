const express = require("express");
const path = require("node:path");
const Image = require("../../models/image");

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

module.exports = router;