
const MEASUREMENT_TYPES = [
  "volume",
  "weight",
  "count",
  "length",
  "other",
];

const MEASUREMENT_SYSTEMS = [
  "imperial",
  "metric",
  "universal",
];

//
// Validate and normalize unit data
//
function validateUnit(input) {
  const errors = [];

  const unit = {
    name: typeof input.name === "string"
      ? input.name.trim()
      : "",

    abbreviation: typeof input.abbreviation === "string"
      ? input.abbreviation.trim()
      : "",

    measurement_type: input.measurement_type,
    measurement_system: input.measurement_system,

    active: Number(input.active),
    auto_convert: Number(input.auto_convert),

    to_base_factor: null,
    display_priority: Number(input.display_priority),
  };

  //
  // Required name
  //
  if (!unit.name) {
    errors.push("Unit name is required.");
  }

  //
  // Measurement type
  //
  if (!MEASUREMENT_TYPES.includes(unit.measurement_type)) {
    errors.push("Invalid measurement type.");
  }

  //
  // Measurement system
  //
  if (!MEASUREMENT_SYSTEMS.includes(unit.measurement_system)) {
    errors.push("Invalid measurement system.");
  }

  //
  // Boolean fields
  //
  if (![0, 1].includes(unit.active)) {
    errors.push("Active must be 0 or 1.");
  }

  if (![0, 1].includes(unit.auto_convert)) {
    errors.push("Auto Convert must be 0 or 1.");
  }

  //
  // Display priority
  //
  if (!Number.isSafeInteger(unit.display_priority)) {
    errors.push("Display priority must be an integer.");
  }

  //
  // Conversion factor
  //
  const factorInput = input.to_base_factor;

  if (
    factorInput !== null &&
    factorInput !== undefined &&
    String(factorInput).trim() !== ""
  ) {
    const factor = Number(factorInput);

    if (!Number.isFinite(factor) || factor <= 0) {
      errors.push("Conversion factor must be a positive number.");
    } else {
      unit.to_base_factor = factor;
    }
  }

  //
  // Automatic conversion rules
  //
  if (unit.auto_convert === 1) {
    if (!["volume", "weight"].includes(unit.measurement_type)) {
      errors.push(
        "Automatic conversion is currently supported only for volume and weight."
      );
    }

    if (unit.to_base_factor === null) {
      errors.push(
        "Automatic conversion requires a conversion factor."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    unit,
  };
}

module.exports = {
  validateUnit,
};
