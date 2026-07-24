/** Kleine gedeelde applicatiecontext: één open databaseverbinding. */
let dbInstance = null;

export function setDb(db) {
  dbInstance = db;
}

export function getDb() {
  if (!dbInstance) throw new Error("Database is nog niet geopend.");
  return dbInstance;
}
