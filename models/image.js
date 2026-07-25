const db = require("../services/db");

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
// Delete
//
async function remove(id) {
  await db.query(`
    DELETE
    FROM images
    WHERE id = ?
  `, [id]);
}


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
          web_path,
          thumbnail_path,
          processing_status
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        image.location_id,
        image.captured_at,
        image.original_path,
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

module.exports = {
  all,
  find,
  remove,
  createWithTelemetry,
};