import * as Comlink from "comlink";
import { TopHatDexie } from "./database";

export interface TopHatWorkerService {
    run: (persistent?: boolean) => Promise<void>;
}

let db: TopHatDexie;

export const TopHatWorker: TopHatWorkerService = {
    run: async (idb: boolean = true) => {
        if (idb) {
            db = new TopHatDexie();
        } else {
            db = new TopHatDexie({
                indexedDB: require("fake-indexeddb"),
                IDBKeyRange: require("fake-indexeddb/lib/FDBKeyRange"),
            });
        }

        await db.open();
        // attachIDBChangeHandler(db, handleIDBChanges);
    },
};

// // Copied from Dexie's DatabaseChangeType
// const ChangeType = {
//     CREATE: 1,
//     UPDATE: 2,
//     DELETE: 3,
// } as const;

// const handleIDBChanges = async (changes: IDatabaseChange[]) => {
//     // Wrap whole thing in Transaction - name the transaction so that changes don't trigger other changes accidentally
//     const balances = {
//         currencies: new Set() as Set<ID>,
//         accounts: {} as Record<ID, Set<ID>>, // Account -> Currencies
//     };

//     for (let change of changes) {
//         if (change.type === ChangeType.UPDATE && change.table === "currency" && "rates" in change.mods)
//             balances.currencies.add(change.key);

//         if (change.table === "transaction_") {
//             if (change.type === ChangeType.UPDATE) {
//                 // const old = change.oldObj as Transaction;
//                 // const update = change.obj as Transaction;

//                 if (
//                     ["date", "recordedBalance", "account", "currency"].some(
//                         (key) => key in (change as IUpdateChange).mods
//                     )
//                 ) {
//                     // TODO
//                 }
//             }
//         }
//     }
// };

Comlink.expose(TopHatWorker);
