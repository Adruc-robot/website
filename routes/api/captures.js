const express = require("express");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const { 
  deleteUploadedFile,
  isValidJson 
} = require("../../helpers/fileValidation");


const router = express.Router();

const incomingDir = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "incoming"
);

fs.mkdirSync(incomingDir, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, incomingDir);
  },

  filename: function (req, file, callback) {
    callback(null, path.basename(file.originalname));
  },
});

const upload = multer({
  storage,

  fileFilter: function (req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === "image") {
      if (
        ext !== ".png" &&
        ext !== ".jpg" &&
        ext !== ".jpeg"
      ) {
        return callback(
          new Error("Only PNG and JPEG images are allowed")
        );
      }

      return callback(null, true);
    }

    if (file.fieldname === "metadata") {
      if (ext !== ".json") {
        return callback(
          new Error("Metadata must be a JSON file")
        );
      }

      return callback(null, true);
    }

    return callback(
      new Error(`Unexpected upload field: ${file.fieldname}`)
    );
  },
});


function requireApiKey(req, res, next) {
  const providedKey = req.get("X-API-Key");
  const expectedKey = process.env.CAPTURE_UPLOAD_KEY;

  if (!expectedKey) {
    console.error(
      "CAPTURE_UPLOAD_KEY is not configured"
    );

    return res.status(500).json({
      error: "Upload API is not configured",
    });
  }

  if (providedKey !== expectedKey) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  next();
}

router.post(
  "/",
  requireApiKey,

  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "metadata",
      maxCount: 1,
    },
  ]),

  async (req, res) => {
    try {
      const image =
        req.files?.image?.[0];

      const metadata =
        req.files?.metadata?.[0] ?? null;

      if (!image) {
        return res.status(400).json({
          error: "An image file is required",
        });
      }

      if (metadata) {
        const imageBaseName =
            path.parse(image.originalname).name;

        const metadataBaseName =
            path.parse(metadata.originalname).name;

        if (imageBaseName !== metadataBaseName) {
            await deleteUploadedFile(image);
            await deleteUploadedFile(metadata);

            return res.status(400).json({
            error: "Image and metadata filenames do not match",
            });
        }
  
        const validJson = await isValidJson(metadata.path);

        if (!validJson) {
          await deleteUploadedFile(image);
          await deleteUploadedFile(metadata);

          return res.status(400).json({
            error: "Metadata file contains invalid JSON",
          });
        }
      }

      return res.status(201).json({
        message: "Capture uploaded",
        image: image.filename,
        metadata:
          metadata?.filename ?? null,
      });
    } catch (error) {
      console.error(
        "Capture upload failed:",
        error
      );

      return res.status(500).json({
        error: "Capture upload failed",
      });
    }
  }
);

module.exports = router;