import { Help } from "@mui/icons-material";
import { TextField, Typography } from "@mui/material";
import { sumBy, toPairs } from "lodash";
import React from "react";
import { Section } from "../../components/layout";
import { useNumericInputHandlerState } from "../../shared/hooks";
import { useAllAccounts, useDefaultCurrency } from "../../state/data/hooks";
import { Greys } from "../../styles/colours";
import { useForecastsPageStyles } from "./styles";

export const ForecastPageDebtCalculator: React.FC = () => {
    const classes = useForecastsPageStyles();

    const currency = useDefaultCurrency();
    const { debtDefault } = useDebtSimulationInputs();

    const { onTextChange: debtOnChange } = useNumericInputHandlerState();

    return (
        <Section title="Debt">
            <div className={classes.inputs}>
                <div className={classes.inputTitle}>
                    <Typography variant="h4">Title</Typography>
                    <Typography variant="subtitle1">In 5 years</Typography>
                </div>
                <div className={classes.inputGroup}>
                    <div className={classes.inputValue}>
                        <Typography variant="h6">Debt</Typography>
                        <Help style={{ color: Greys[600] }} />
                    </div>
                    <div className={classes.inputValue}>
                        <Typography variant="body2">Base ({currency.symbol})</Typography>
                        <TextField placeholder={"" + debtDefault} defaultValue="" onChange={debtOnChange} />
                    </div>
                    <div className={classes.inputValue}>
                        <Typography variant="body2">Interest/Growth (% pa.)</Typography>
                        <TextField placeholder="Default Value" />
                    </div>
                </div>
                <div className={classes.inputGroup}>
                    <div className={classes.inputValue}>
                        <Typography variant="h6">Payments</Typography>
                        <Help style={{ color: Greys[600] }} />
                    </div>
                    <div className={classes.inputValue}>
                        <Typography variant="body2">Base (Currency)</Typography>
                        <TextField placeholder="Default Value" />
                    </div>
                    <div className={classes.inputValue}>
                        <Typography variant="body2">Growth (% pa.)</Typography>
                        <TextField placeholder="Default Value" />
                    </div>
                </div>
            </div>
            <div className={classes.outputs}>{/* <FlexWidthChart getChart */}</div>
        </Section>
    );
};

const useDebtSimulationInputs = () => {
    const accounts = useAllAccounts();
    // const transactionIDs = useTransactionIDs();
    // const transactions = useTransactionMap();

    const debtAccounts = accounts
        .flatMap((account) =>
            toPairs(account.balances).map(([currency, balance]) => ({
                account: account.id,
                currency,
                balance: balance.localised[0],
                start: account.firstTransactionDate,
            }))
        )
        .filter(({ balance }) => balance < 0);

    if (debtAccounts.length === 0) return { debtDefault: 0 };

    const debt = sumBy(debtAccounts, ({ balance }) => balance);

    // const start = max(debtAccounts.map(({ start }) => start))!;
    // const historyLength = Math.min(
    //     12,
    //     getToday().startOf("month").diff(parseDate(start).startOf("month"), "months").months
    // );
    // const history = range(historyLength).map((_) => 0);

    return { debt };
};
