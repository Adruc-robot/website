module.exports = {
  name: "016_update_units_add_columns",

  async up(db) {
    await db.query(`
      ALTER TABLE units
        ADD COLUMN measurement_type
            ENUM('volume', 'weight', 'count', 'length', 'other')
            NOT NULL DEFAULT 'other',

        ADD COLUMN measurement_system
            ENUM('imperial', 'metric', 'universal')
            NOT NULL DEFAULT 'universal',

        ADD COLUMN to_base_factor
            DECIMAL(20,10) NULL,

        ADD COLUMN auto_convert
            BOOLEAN NOT NULL DEFAULT TRUE,
        
        ADD COLUMN display_priority
            INT NOT NULL DEFAULT 100;
    `);
  },
};