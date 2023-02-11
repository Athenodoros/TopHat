import { expect, test } from "vitest";
import { formatJSDate, parseJSDate } from "./values";

test("Date formatters are reversible", () => {
    const date = new Date();
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    expect(parseJSDate(formatJSDate(date)).toISOString()).toBe(start.toISOString());
});
