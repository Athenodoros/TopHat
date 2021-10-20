import Dexie, { DexieOptions } from "dexie";
import "dexie-observable";
import {
    Account,
    Category,
    Currency,
    Institution,
    Notification,
    Rule,
    Statement,
    Transaction,
    User,
} from "../data/types";
import { ID } from "../shared/values";

// This class is so Typescript understands the shape of the DB connection
export class TopHatDexie extends Dexie {
    user: Dexie.Table<User, ID>;
    account: Dexie.Table<Account, ID>;
    category: Dexie.Table<Category, ID>;
    currency: Dexie.Table<Currency, ID>;
    institution: Dexie.Table<Institution, ID>;
    rule: Dexie.Table<Rule, ID>;
    transaction_: Dexie.Table<Transaction, ID>; // "transaction" conflicts with Dexie-internal property
    statement: Dexie.Table<Statement, ID>;
    notification: Dexie.Table<Notification, ID>;

    constructor(options?: DexieOptions) {
        super("TopHatDatabase", options);
        this.version(1).stores({
            user: "id",
            account: "id",
            category: "id",
            currency: "id",
            institution: "id",
            rule: "id",
            transaction_: "id, statement, [currency+account], date",
            statement: "id",
            notification: "id",
        });

        // This is for compatibility with babel-preset-typescript
        this.user = this.table("user");
        this.account = this.table("account");
        this.category = this.table("category");
        this.currency = this.table("currency");
        this.institution = this.table("institution");
        this.rule = this.table("rule");
        this.transaction_ = this.table("transaction_");
        this.statement = this.table("statement");
        this.notification = this.table("notification");

        // This would enable functions on objects - it would require classes rather than interfaces
        // this.user.mapToClass(UserState);
    }
}

// const DBUpdateTypes = ["DEMO"] as const;
// export type DBUpdateType = typeof DBUpdateTypes[number];

// export const attachIDBChangeHandler = (
//     db: TopHatDexie,
//     callback: (changes: IDatabaseChange[]) => void
//     // exclusions?: DBUpdateType[]
// ) => {
//     let running: IDatabaseChange[] = [];
//     db.on("changes", (changes, partial) => {
//         // Dexie breaks up large changes - this combines them again so we don't operate on inconsistent states
//         if (partial) {
//             running = running.concat(changes);
//             return;
//         } else {
//             changes = running.concat(changes);
//             running = [];
//         }

//         // if (exclusions) changes = changes.filter((change) => !(exclusions as string[]).includes(change.source!));
//         if (changes.length !== 0) callback(changes);
//     });
// };
