export const APP_VERSION = "2.5.0";
export const CORE_SCHEMA_VERSION = 1;
export const EXPORT_FORMAT = "personal-tracker-backup";
export const EXPORT_FORMAT_VERSION = 1;
export const DB_NAME = "ketting";

/**
 * IndexedDB structural version: bump by 1 whenever a module adds a new
 * object store. This is independent of each module's logical
 * `schemaVersion`, which tracks the *shape* of the records inside a store.
 */
export const DB_VERSION = 5;
