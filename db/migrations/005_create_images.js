module.exports = {
  name: "005_create_images",

  async up(db) {
    await db.query(`
      CREATE TABLE images (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        location_id BIGINT UNSIGNED NOT NULL,
        captured_at DATETIME(6) NOT NULL,

        original_path VARCHAR(500) NOT NULL,
        web_path VARCHAR(500),
        thumbnail_path VARCHAR(500),

        processing_status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_images_location_captured (
          location_id,
          captured_at
        ),
        UNIQUE KEY uq_images_original_path (original_path),

        CONSTRAINT fk_images_location
            FOREIGN KEY (location_id)
            REFERENCES locations(id)
            ON DELETE RESTRICT
      );
    `);
  },
};