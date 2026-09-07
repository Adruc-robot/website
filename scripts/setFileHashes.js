const db = require("../services/db");
const Image = require("../models/image")

async function getFilePaths() {
  const [rows]  = await db.query(`
    select original_path,id from images
    where file_hash is null;
  `);
  return rows;
}
async function updateFileHash(id, fileHash) {
    await db.query(
        `
        UPDATE images
        SET file_hash = ?
        WHERE id = ?
        `,
        [
        fileHash,
        id,
        ]
    );

    return id;
    }

async function main() {
  try {
    const filePaths = await getFilePaths();
    for (const { original_path,id } of filePaths) {
        const fileHash = await Image.calculateFileHash(original_path);

        await updateFileHash(id, fileHash);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await db.end();
  }
}

main();