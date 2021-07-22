import { max, mean } from "lodash";
import { TransactionsPageState } from "../../../state/app/types";
import { PLACEHOLDER_CATEGORY_ID } from "../../../state/data";
import { useAllObjects, useInstitutionMap } from "../../../state/data/hooks";
import { Account } from "../../../state/data/types";
import { takeWithDefault } from "../../../utilities/data";

export const useTransactionsSummaryData = (aggregation: TransactionsPageState["chartAggregation"]) => {
    const objects = useAllObjects(aggregation);
    const institutions = useInstitutionMap();

    const length = Math.min(
        max(objects.flatMap((_) => [_.transactions.credits.length, _.transactions.debits.length])) || 24,
        24
    );

    return objects.map((object) => {
        const credits = takeWithDefault(object.transactions.credits, length, 0);
        const debits = takeWithDefault(object.transactions.debits, length, 0);

        const colour =
            aggregation === "account"
                ? institutions[(object as Account).institution!]!.colour
                : (object as Exclude<typeof objects[number], Account>).colour;

        return {
            id: object.id,
            name: object.name,
            colour,
            trend: { credits, debits },
            value: { credit: mean(credits), debit: mean(debits) },
            placeholder: aggregation === "category" && object.id === PLACEHOLDER_CATEGORY_ID,
        };
    });
};
