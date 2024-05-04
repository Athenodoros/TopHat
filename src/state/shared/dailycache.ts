import { SDate, getTodayString } from "./values";

interface DailyCacheRecord<T> {
    date: SDate;
    values: {
        [key: string]: T;
    };
}

export class DailyCache<T> {
    private id: string;

    constructor(id: string) {
        this.id = id;
    }

    public get(key: string): T | undefined {
        return this.getCacheRecord().values[key];
    }

    public set(key: string, value: T): void {
        const record = this.getCacheRecord();
        record.values[key] = value;
        localStorage.setItem(this.id, JSON.stringify(record));
    }

    private getCacheRecord(): DailyCacheRecord<T> {
        const recordString = localStorage.getItem(this.id);
        if (!recordString) {
            const record = { date: getTodayString(), values: {} };
            localStorage.setItem(this.id, JSON.stringify(record));
            return record;
        }

        let record = JSON.parse(recordString) as DailyCacheRecord<T>;
        if (record.date !== getTodayString()) {
            record = { date: getTodayString(), values: {} };
            localStorage.setItem(this.id, JSON.stringify(record));
        }

        return record;
    }
}
