/**
 * The patches the undo history keeps: rfc6902 JSON patches, with its diff of arrays replaced.
 *
 * rfc6902 diffs arrays by edit distance, recursing once per element and memoising every pair of
 * positions it visits. That overflows the stack on a list of tens of thousands of entries - in
 * Chrome on an import of real data - and uses memory in proportion to the product of two lengths.
 * Here, the start and end that two arrays share are skipped, and only what is left between them is
 * diffed, without recursion. Objects, and whatever is in the arrays, are still diffed by rfc6902.
 */

import { isEqual, range } from "lodash";
import { createPatch, Operation, Pointer } from "rfc6902";
import { diffAny } from "rfc6902/diff";

/** The operations that turn `input` into `output` */
export const createHistoryPatch = (input: unknown, output: unknown): Operation[] => createPatch(input, output, diff);

const diff = (input: any, output: any, ptr: Pointer): Operation[] =>
    Array.isArray(input) && Array.isArray(output) && input !== output
        ? diffArrays(input, output, ptr)
        : diffAny(input, output, ptr, diff);

const isSame = (left: unknown, right: unknown) => left === right || isEqual(left, right);

const areRangesSame = (input: unknown[], inputStart: number, output: unknown[], outputStart: number, length: number) =>
    range(length).every((offset) => isSame(input[inputStart + offset], output[outputStart + offset]));

const diffArrays = (input: unknown[], output: unknown[], ptr: Pointer): Operation[] => {
    let start = 0;
    while (start < input.length && start < output.length && isSame(input[start], output[start])) start++;

    let inputEnd = input.length;
    let outputEnd = output.length;
    while (inputEnd > start && outputEnd > start && isSame(input[inputEnd - 1], output[outputEnd - 1])) {
        inputEnd--;
        outputEnd--;
    }

    const path = (index: number) => ptr.add(String(index)).toString();
    const length = inputEnd - start;

    if (length === outputEnd - start) {
        // One element moved, as an id does in a sorted list when what it is sorted by changes
        if (
            length > 1 &&
            isSame(input[start], output[outputEnd - 1]) &&
            areRangesSame(input, start + 1, output, start, length - 1)
        )
            return [
                { op: "remove", path: path(start) },
                { op: "add", path: path(outputEnd - 1), value: output[outputEnd - 1] },
            ];
        if (
            length > 1 &&
            isSame(input[inputEnd - 1], output[start]) &&
            areRangesSame(input, start, output, start + 1, length - 1)
        )
            return [
                { op: "remove", path: path(inputEnd - 1) },
                { op: "add", path: path(start), value: output[start] },
            ];

        // Otherwise elements changed where they are, and each is diffed as rfc6902 would
        return range(start, inputEnd).flatMap((index) => diff(input[index], output[index], ptr.add(String(index))));
    }

    // Elements were added or removed: whatever is between the shared start and end is replaced. The
    // last is removed first, so that applying the patch doesn't move the rest along for each one.
    return [
        ...range(inputEnd - 1, start - 1).map((index): Operation => ({ op: "remove", path: path(index) })),
        ...range(start, outputEnd).map((index): Operation => ({ op: "add", path: path(index), value: output[index] })),
    ];
};
