import { MenuItem, Select } from "@mui/material";
import { keys } from "lodash";
import { useState } from "react";
import { Section } from "../../components/layout";
import { SnapshotSectionContents, useAssetsSnapshot } from "../../components/snapshot";
import { useAccountPageAccount } from "../../state/app/hooks";
import { useCurrencyMap } from "../../state/data/hooks";
import { ID } from "../../state/utilities/values";
import { handleSelectChange } from "../../utilities/events";

export const AccountPageBalances: React.FC = () => {
    const account = useAccountPageAccount();
    const currencies = useCurrencyMap();

    const [currency, setCurrency] = useState<ID | "all">("all");
    const onChangeCurrency = handleSelectChange((value: ID | "all") =>
        setCurrency(value === "all" ? "all" : Number(value))
    );

    const balanceData = useAssetsSnapshot(account.id, currency === "all" ? undefined : currency);

    return (
        <Section
            title="Balance History"
            headers={[
                <Select value={currency} onChange={onChangeCurrency} size="small" key="aggregation">
                    <MenuItem value="all">All Currencies</MenuItem>
                    {keys(account.balances).map((id) => (
                        <MenuItem value={id} key={id}>
                            {currencies[id]!.symbol}
                        </MenuItem>
                    ))}
                </Select>,
            ]}
        >
            <SnapshotSectionContents data={balanceData} />
        </Section>
    );
};
