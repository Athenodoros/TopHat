import { FormControl, MenuItem, Select } from "@material-ui/core";
import { keys } from "lodash";
import { useState } from "react";
import { Section } from "../../components/layout";
import { useAccountPageAccount } from "../../state/app/hooks";
import { useCurrencyMap } from "../../state/data/hooks";
import { ID } from "../../state/utilities/values";
import { onSelectChange } from "../../utilities/events";

export const AccountPageBalances: React.FC = () => {
    const account = useAccountPageAccount();
    const currencies = useCurrencyMap();

    const [currency, setCurrency] = useState<ID | "all">("all");
    const onChangeCurrency = onSelectChange((value: ID | "all") => setCurrency(value));

    return (
        <Section
            title="Balance History"
            headers={[
                <FormControl variant="outlined" size="small" key="aggregation">
                    <Select value={currency} onChange={onChangeCurrency}>
                        <MenuItem value="all">All Currencies</MenuItem>
                        {keys(account.balances).map((id) => (
                            <MenuItem value={id} key={id}>
                                {currencies[id]!.symbol}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>,
            ]}
        >
            Balances!
        </Section>
    );
};
