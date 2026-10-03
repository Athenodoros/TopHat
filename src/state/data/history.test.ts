import { cloneDeep, range } from "lodash";
import { applyPatch } from "rfc6902";
import { describe, expect, test } from "vitest";
import { createHistoryPatch } from "./history";

/** The patch from `input` to `output`, checked to turn one into the other */
const getCheckedPatch = (input: unknown, output: unknown) => {
    const patch = createHistoryPatch(input, output);

    const patched = cloneDeep(input);
    expect(applyPatch(patched, patch).filter((error) => error !== null)).toEqual([]);
    expect(patched).toEqual(output);

    return patch;
};

const ids = (count: number) => range(1, count + 1);

describe("The undo history's patches", () => {
    test("add and remove only what changed in a list", () => {
        expect(getCheckedPatch({ ids: [1, 2, 3] }, { ids: [1, 2, 3, 4] })).toEqual([
            { op: "add", path: "/ids/3", value: 4 },
        ]);
        expect(getCheckedPatch({ ids: [1, 2, 3] }, { ids: [0, 1, 2, 3] })).toEqual([
            { op: "add", path: "/ids/0", value: 0 },
        ]);
        expect(getCheckedPatch({ ids: [1, 2, 3] }, { ids: [1, 3] })).toEqual([{ op: "remove", path: "/ids/1" }]);
        expect(getCheckedPatch({ ids: [1, 2, 3] }, { ids: [] })).toHaveLength(3);
        expect(getCheckedPatch({ ids: [] }, { ids: [1, 2, 3] })).toHaveLength(3);
    });

    test("move an element in two operations, as a sorted list's id moves", () => {
        expect(getCheckedPatch([1, 2, 3, 4, 5], [1, 3, 4, 2, 5])).toEqual([
            { op: "remove", path: "/1" },
            { op: "add", path: "/3", value: 2 },
        ]);
        expect(getCheckedPatch([1, 2, 3, 4, 5], [1, 4, 2, 3, 5])).toEqual([
            { op: "remove", path: "/3" },
            { op: "add", path: "/1", value: 4 },
        ]);
    });

    test("diff elements changed in place, rather than replacing them", () => {
        const rates = [
            { month: "2024-01-01", value: 1 },
            { month: "2024-02-01", value: 2 },
        ];
        const changed = [rates[0], { month: "2024-02-01", value: 3 }];

        expect(getCheckedPatch({ rates }, { rates: changed })).toEqual([
            { op: "replace", path: "/rates/1/value", value: 3 },
        ]);
    });

    test("are empty for lists that are the same, whether or not they are the same object", () => {
        const list = [{ id: 1 }, { id: 2 }];
        expect(createHistoryPatch({ list }, { list })).toEqual([]);
        expect(createHistoryPatch({ list }, { list: cloneDeep(list) })).toEqual([]);
    });

    test("turn one list into another however it was edited", () => {
        // A fixed seed, so that a failure can be reproduced
        let seed = 1;
        const random = (below: number) => {
            seed = (seed * 16807) % 2147483647;
            return seed % below;
        };

        for (let run = 0; run < 500; run++) {
            const input = ids(random(12)).map((id) => ({ id, value: random(3) }));
            const output = cloneDeep(input);

            for (let edit = random(4); edit >= 0; edit--) {
                const index = random(output.length + 1);
                switch (random(4)) {
                    case 0:
                        output.splice(index, 0, { id: 100 + run, value: random(3) });
                        break;
                    case 1:
                        output.splice(index, 1);
                        break;
                    case 2:
                        if (output[index]) output[index].value = random(3);
                        break;
                    case 3:
                        output.splice(random(output.length + 1), 0, ...output.splice(index, 1));
                }
            }

            getCheckedPatch({ list: input }, { list: output });
        }
    });

    test("handle lists far longer than a recursive diff could", () => {
        const input = ids(200000);

        const inserted = [...input.slice(0, 1000), 0, ...input.slice(1000)];
        expect(getCheckedPatch(input, inserted)).toHaveLength(1);

        const moved = [...input.slice(0, 10), ...input.slice(11, 150000), input[10], ...input.slice(150000)];
        expect(getCheckedPatch(input, moved)).toHaveLength(2);

        expect(getCheckedPatch({ ids: input }, { ids: [] })).toHaveLength(input.length);
    });
});
