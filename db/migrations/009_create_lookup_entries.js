module.exports = {
  name: "009_create_lookup_entries",

  async up(db) {
    await db.query(`
      CREATE TABLE lookup_entries (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        lookup_list_id BIGINT UNSIGNED NOT NULL,

        entry_key VARCHAR(50) NOT NULL,
        display_value VARCHAR(100) NOT NULL,

        sort_order INT NULL,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_lookup_entries_lookup_list
          FOREIGN KEY (lookup_list_id)
          REFERENCES lookup_lists(id)
          ON DELETE CASCADE,

        UNIQUE KEY uq_lookup_entries_list_key (
          lookup_list_id,
          entry_key
        ),

        KEY idx_lookup_entries_list_id (lookup_list_id),
        KEY idx_lookup_entries_sort_order (
          lookup_list_id,
          sort_order
        ),

        KEY idx_lookup_entries_display_value (
          lookup_list_id,
          display_value
        )
      );
    `);
  },
};