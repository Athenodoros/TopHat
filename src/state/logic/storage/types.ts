/** What became of the attempt to load saved data on boot */
export type StorageState =
    /** The app hasn't finished booting, and has yet to look for saved data */
    | { type: "loading" }
    /** Data was found in IndexedDB and is now in the store */
    | { type: "loaded" }
    /** IndexedDB works and holds no TopHat data, so this is a new install and can be written to */
    | { type: "empty" }
    /** IndexedDB can't be used at all, as in private browsing - nothing was lost, but nothing can be saved */
    | { type: "unavailable"; error: string }
    /** Data is in the browser but couldn't be read, so it must not be written over */
    | { type: "unreadable"; error: string; rescuedRows: number };
