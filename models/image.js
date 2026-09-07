const db = require("../services/db");
const crypto = require("node:crypto");
const fsSync = require("node:fs");

//
// List
//
async function all() {
  const [rows] = await db.query(`
    SELECT *
    FROM images i
    LEFT OUTER JOIN image_telemetry it
    ON i.id =  it.image_id
    ORDER BY i.id
  `);

  return rows;
}

//
// Find by ID
//
async function find(id) {
  const [rows] = await db.query(`
    SELECT *
    FROM images i
    LEFT OUTER JOIN image_telemetry it
    ON i.id =  it.image_id
    WHERE i.id = ?
  `, [id]);

  return rows[0] || null;
}
//
// Find by Original Path
//
async function findByOriginalPath(originalPath) {
  const [rows] = await db.query(
    `
      SELECT *
      FROM images
      WHERE original_path = ?
    `,
    [originalPath]
  );

  return rows[0] || null;
}

//
// Delete
//
async function remove(id) {
  await db.query(`
    DELETE
    FROM images
    WHERE id = ?
  `, [id]);
}

//
// Create a new entry
//
async function createWithTelemetry(image, telemetry) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [imageResult] = await connection.query(
      `
        INSERT INTO images (
          location_id,
          captured_at,
          original_path,
          file_hash,
          web_path,
          thumbnail_path,
          processing_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        image.location_id,
        image.captured_at,
        image.original_path,
        image.file_hash,
        image.web_path ?? null,
        image.thumbnail_path ?? null,
        image.processing_status ?? "pending",
      ]
    );

    const imageId = imageResult.insertId;

    await connection.query(
      `
        INSERT INTO image_telemetry (
          image_id,
          scene,
          exposure_us,
          gain,
          effective_exposure,
          brightness_mean,
          brightness_median,
          clipped_low,
          clipped_high,
          sun_altitude,
          moon_altitude,
          moon_illumination,
          metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        imageId,
        telemetry.scene ?? null,
        telemetry.exposure_us ?? null,
        telemetry.gain ?? null,
        telemetry.effective_exposure ?? null,
        telemetry.brightness_mean ?? null,
        telemetry.brightness_median ?? null,
        telemetry.clipped_low ?? null,
        telemetry.clipped_high ?? null,
        telemetry.sun_altitude ?? null,
        telemetry.moon_altitude ?? null,
        telemetry.moon_illumination ?? null,
        JSON.stringify(telemetry.metadata_json ?? {}),
      ]
    );

    await connection.commit();

    return imageId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
//
//Update an existing entry
//
async function updateWithTelemetry(id, image, telemetry) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE images
        SET
          location_id = ?,
          captured_at = ?
        WHERE id = ?
      `,
      [
        image.location_id,
        image.captured_at,
        id,
      ]
    );

    await connection.query(
      `
        UPDATE image_telemetry
        SET
          scene = ?,
          exposure_us = ?,
          gain = ?,
          effective_exposure = ?,
          brightness_mean = ?,
          brightness_median = ?,
          clipped_low = ?,
          clipped_high = ?,
          sun_altitude = ?,
          moon_altitude = ?,
          moon_illumination = ?,
          metadata_json = ?
        WHERE image_id = ?
      `,
      [
        telemetry.scene ?? null,
        telemetry.exposure_us ?? null,
        telemetry.gain ?? null,
        telemetry.effective_exposure ?? null,
        telemetry.brightness_mean ?? null,
        telemetry.brightness_median ?? null,
        telemetry.clipped_low ?? null,
        telemetry.clipped_high ?? null,
        telemetry.sun_altitude ?? null,
        telemetry.moon_altitude ?? null,
        telemetry.moon_illumination ?? null,
        JSON.stringify(telemetry.metadata_json ?? {}),
        id,
      ]
    );

    await connection.commit();

    return id;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
//
//Update after processing
//
async function updateProcessingResult(id, webPath, thumbnailPath, status) {
  await db.query(
    `
      UPDATE images
      SET
        web_path = ?,
        thumbnail_path = ?,
        processing_status = ?
      WHERE id = ?
    `,
    [
      webPath,
      thumbnailPath,
      status,
      id,
    ]
  );

  return id;
}
//
// Update original path after image processing completes
//
async function updateOriginalPath(id, originalPath) {
  await db.query(
    `
      UPDATE images
      SET original_path = ?
      WHERE id = ?
    `,
    [
      originalPath,
      id,
    ]
  );

  return id;
}
//
// get file hash
//
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fsSync.createReadStream(filePath);

    stream.on("data", chunk => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", reject);
  });
}
//
// Find by Hash
//
async function findByFileHash(fileHash) {
  const [rows] = await db.query(
    `
      SELECT *
      FROM images
      WHERE file_hash = ?
    `,
    [fileHash]
  );

  return rows[0] || null;
}

module.exports = {
  all,
  find,
  remove,
  createWithTelemetry,
  findByOriginalPath,
  updateWithTelemetry,
  updateProcessingResult,
  updateOriginalPath,
  findByFileHash,
};