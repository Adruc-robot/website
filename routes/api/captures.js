const express = require("express");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const { 
  deleteFile,
  isValidJson,
  moveUploadedFile,
  fileExists,
  calculateFileHash,
  findAvailableBaseName
} = require("../../helpers/captureUpload");

const router = express.Router();

const incomingDir = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "incoming"
);
const tempDir = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "temp"
);

fs.mkdirSync(incomingDir, {
  recursive: true,
});

fs.mkdirSync(tempDir, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, tempDir);
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
    // declare outside of the try so these are available in the catch
    const image = req.files?.image?.[0];
    const metadata = req.files?.metadata?.[0] ?? null;
    let movedImagePath = null;
    let movedMetadataPath = null;
    try {

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
            await deleteFile(image?.path);
            await deleteFile(metadata?.path);

            return res.status(400).json({
            error: "Image and metadata filenames do not match",
            });
        }
  
        const validJson = await isValidJson(metadata.path);

        if (!validJson) {
          await deleteFile(image?.path);
          await deleteFile(metadata?.path);

          return res.status(400).json({
            error: "Metadata file contains invalid JSON",
          });
        }
      }
      // Set these variables up so they are available below if needed.
      let storedImageFilename = image.filename;
      let storedMetadataFilename = metadata?.filename ?? null;

      //file collision
      const incomingImagePath = path.join(incomingDir, image.filename);

      if (await fileExists(incomingImagePath)) {
 
        const uploadedFileHash = await calculateFileHash(image.path);

        const existingFileHash = await calculateFileHash(incomingImagePath);

        if (uploadedFileHash === existingFileHash) {
          // Same exact image - delete this 
          await deleteFile(image?.path);
          await deleteFile(metadata?.path);

          return res.status(200).json({
            message: "Capture already uploaded",
            image: image.filename
          });
        } else {
          // Different images with the same filename
          const newBaseName = await findAvailableBaseName(incomingDir, image.filename);
          const imageExtension = path.extname(image.filename); 
          storedImageFilename = `${newBaseName}${imageExtension}`;
          storedMetadataFilename = metadata? `${newBaseName}.json`: null;
          movedImagePath = await moveUploadedFile(image, incomingDir, storedImageFilename);

          if (metadata) {
            movedMetadataPath = await moveUploadedFile(metadata, incomingDir, storedMetadataFilename);
          }
        }
      } else {
        // just move the file
        movedImagePath = await moveUploadedFile(image, incomingDir)

        //temporary
         throw new Error("TEST: forced failure after image move");

        if (metadata) {
          movedMetadataPath = await moveUploadedFile(metadata, incomingDir)
        }
      }   
      return res.status(201).json({
        message: "Capture uploaded",
        image: storedImageFilename,
        metadata: storedMetadataFilename
      });
    } catch (error) {
      // Clean up anything still in temp
      await deleteFile(image?.path);
      await deleteFile(metadata?.path);

      // Roll back anything this request moved to incoming
      await deleteFile(movedImagePath);
      await deleteFile(movedMetadataPath);

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