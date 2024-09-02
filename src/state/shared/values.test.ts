import { DateTime } from "luxon";
import { expect, test } from "vitest";
import { formatDate, parseDate } from "./values";

test("Date formatters are reversible", () => {
    const date = DateTime.now().startOf("day");
    expect(parseDate(formatDate(date)).toISO()).toBe(date.toISO());
});
