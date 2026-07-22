module.exports = {
  name: "006_create_image_telemetry",

  async up(db) {
    await db.query(`
      CREATE TABLE image_telemetry (
        image_id BIGINT UNSIGNED PRIMARY KEY,

        scene VARCHAR(50),
        exposure_us BIGINT UNSIGNED,
        gain DECIMAL(8,3),
        effective_exposure DECIMAL(20,3),

        brightness_mean DECIMAL(8,3),
        brightness_median DECIMAL(8,3),
        clipped_low DECIMAL(10,8),
        clipped_high DECIMAL(10,8),

        sun_altitude DECIMAL(8,3),
        moon_altitude DECIMAL(8,3),
        moon_illumination DECIMAL(8,3),

        metadata_json JSON NOT NULL,

        CONSTRAINT fk_telemetry_image
            FOREIGN KEY (image_id)
            REFERENCES images(id)
            ON DELETE CASCADE
      );
    `);
  },
};