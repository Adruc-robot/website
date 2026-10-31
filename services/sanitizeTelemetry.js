//
// Sanitize telemetry before returning it to the browser.
// Removes filesystem paths recursively without modifying
// the original metadata.
//

function isFilesystemPath(value) {
  if (typeof value !== "string") {
    return false;
  }

  const text = value.trim();

  if (!text) return false;

  // Unix absolute paths, including network-style // paths.
  const unixAbsolute = /^\/\S+/;

  // Windows drive paths: C:\folder or D:/folder
  const windowsAbsolute = /^[a-zA-Z]:[\\/]/;

  // Windows UNC paths: \\server\share
  const windowsUNC = /^\\\\[^\\]+\\[^\\]+/;

  // Relative paths: ./folder or ../folder
  const relativePath = /^\.\.?[\\/]/;

  // Home directory paths: ~/folder
  const homePath = /^~[\\/]/;

  return (
    unixAbsolute.test(text) ||
    windowsAbsolute.test(text) ||
    windowsUNC.test(text) ||
    relativePath.test(text) ||
    homePath.test(text)
  );
}

function sanitizeTelemetry(value) {
  // Remove filesystem path strings.
  if (isFilesystemPath(value)) {
    return undefined;
  }

  // Preserve null and primitive values.
  if (value === null || typeof value !== "object") {
    return value;
  }

  // Recursively sanitize arrays.
  if (Array.isArray(value)) {
    const cleaned = value
      .map(sanitizeTelemetry)
      .filter(item => item !== undefined);

    return cleaned.length > 0 ? cleaned : undefined;
  }

  // Recursively sanitize objects.
  const cleaned = {};

  for (const [key, childValue] of Object.entries(value)) {
    const sanitized = sanitizeTelemetry(childValue);

    if (sanitized !== undefined) {
      cleaned[key] = sanitized;
    }
  }

  // Remove objects that become empty after filtering.
  return Object.keys(cleaned).length > 0
    ? cleaned
    : undefined;
}

module.exports = {
  sanitizeTelemetry,
};