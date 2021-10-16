import { MenuItem, Select } from "@mui/material";
import { Box } from "@mui/system";
import { keys } from "lodash";
import { useState } from "react";
import { FlexWidthChart } from "../../components/display/FlexWidthChart";
import { Section } from "../../components/layout";
import { BalanceSnapshotSummaryNumbers, useAssetsSnapshot, useGetSummaryChart } from "../../components/snapshot";
import { handleSelectChange } from "../../shared/events";
import { useAccountPageAccount } from "../../state/app/hooks";
import { useCurrencyMap } from "../../state/data/hooks";
import { ID } from "../../state/shared/values";

export const AccountPageBalances: React.FC = () => {
    const account = useAccountPageAccount();
    const currencies = useCurrencyMap();

    const [currency, setCurrency] = useState<ID | "all">("all");
    const onChangeCurrency = handleSelectChange((value: ID | "all") =>
        setCurrency(value === "all" ? "all" : Number(value))
    );

    const balanceData = useAssetsSnapshot(account.id, currency === "all" ? undefined : currency);
    const getChart = useGetSummaryChart(balanceData);

    return (
        <Section
            title="Balance History"
            headers={
                <Select value={currency} onChange={onChangeCurrency} size="small" key="aggregation">
                    <MenuItem value="all">All Currencies</MenuItem>
                    {keys(account.balances).map((id) => (
                        <MenuItem value={id} key={id}>
                            ({currencies[id]!.ticker}) {currencies[id]!.name}
                        </MenuItem>
                    ))}
                </Select>
            }
        >
            <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
                <div>
                    <BalanceSnapshotSummaryNumbers data={balanceData} />
                </div>
                <FlexWidthChart style={{ flexGrow: 1 }} getChart={getChart} />
            </Box>
        </Section>
    );
};
