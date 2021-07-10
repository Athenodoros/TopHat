import { Button, ButtonBase, makeStyles, Tooltip, Typography } from "@material-ui/core";
import { Add, Description, Edit, PostAdd, Update } from "@material-ui/icons";
import { Dictionary } from "@reduxjs/toolkit";
import chroma from "chroma-js";
import { range, sumBy, toPairs } from "lodash";
import numeral from "numeral";
import React from "react";
import { VictoryArea, VictoryAxis, VictoryChart, VictoryScatter } from "victory";
import { useCurrencyMap, useDefaultCurrency } from "../../../state/data/hooks";
import { Account, AccountTypeMap, Currency } from "../../../state/data/types";
import { BalanceHistory, parseDate } from "../../../state/utilities/values";
import { Greys, Intents, WHITE } from "../../../styles/colours";
import { formatEmpty } from "../../../utilities/data";
import { suppressEvent } from "../../../utilities/events";

export const ACCOUNT_TABLE_LEFT_PADDING = 19;

const useStyles = makeStyles({
    container: {
        height: 64,
        borderRadius: 10,
        textTransform: "inherit",
        paddingLeft: ACCOUNT_TABLE_LEFT_PADDING,
        marginBottom: 10,

        "&:hover": {
            backgroundColor: Greys[200],
        },
        "&:last-child": {
            marginBottom: 0,
        },
    },
    accountNameContainer: {
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: 200,
        marginRight: 30,

        "& > p:nth-child(2)": {
            color: Greys[600],
        },
    },
    chartContainer: {
        height: 50,
        width: 230,
    },
    accountValueContainer: {
        marginLeft: 30,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",

        "& > p:nth-child(2)": {
            color: Greys[600],
        },
    },
    accountValueSummary: {
        display: "flex",
    },
    accountIcon: {
        color: Greys[700],
        backgroundColor: Greys[300],
        height: 40,
        width: 40,
        padding: 10,
        borderRadius: "50%",
    },
    accountUpdateContainer: {
        width: 160,
        marginLeft: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",

        "& > *:first-child": {
            marginLeft: 6,
        },
    },
    accountUpdateAge: {},
    accountUpdateActions: {
        display: "flex",

        // To prevent accidental clicks of the outer button
        margin: -2,
        padding: 2,

        "& > button": {
            minWidth: 26,
            width: 26,
            height: 26,
            marginRight: 5,

            "&:hover": {
                backgroundColor: Greys[400],
            },

            "& .MuiButton-startIcon": {
                margin: 0,
            },
        },
    },
});

export const AccountTableEntry: React.FC<{ account: Account }> = ({ account }) => {
    const classes = useStyles();

    const currencies = useCurrencyMap();
    const defaultCurrency = useDefaultCurrency();

    const { value, summary, charts } = getAccountSummaries(account, currencies, defaultCurrency);

    return (
        <ButtonBase key={account.id} className={classes.container} component="div">
            <div className={classes.accountNameContainer}>
                <Typography variant="h6">{account.name}</Typography>
                <Typography variant="body2">{AccountTypeMap[account.category].name}</Typography>
            </div>
            <div className={classes.chartContainer}>
                <VictoryChart
                    height={50}
                    width={230}
                    padding={{ top: 4, right: 2, bottom: 4, left: 0 }}
                    domainPadding={{ y: 5 }}
                    domain={{ x: [-0.5, 11.5] }}
                >
                    <VictoryAxis tickFormat={formatEmpty} style={{ axis: { stroke: Greys[500] } }} />
                    {charts}
                </VictoryChart>
            </div>
            <div className={classes.accountValueContainer}>
                <div className={classes.accountValueSummary}>{summary}</div>
                <Typography variant="body2">{value}</Typography>
            </div>
            {account.usesStatements ? (
                <Description className={classes.accountIcon} />
            ) : (
                <Edit className={classes.accountIcon} />
            )}
            <div className={classes.accountUpdateContainer}>
                {getAccountAgeDescription(account.lastTransactionDate)}
                <div className={classes.accountUpdateActions} onMouseDown={suppressEvent}>
                    <Tooltip title="Mark Up-To-Date">
                        <Button size="small" startIcon={<Update />} />
                    </Tooltip>
                    <Tooltip title="Upload Statement">
                        <Button size="small" startIcon={<PostAdd />} />
                    </Tooltip>
                    <Tooltip title="Create Transaction">
                        <Button size="small" startIcon={<Add />} />
                    </Tooltip>
                </div>
            </div>
        </ButtonBase>
    );
};

const getAccountSummaries = (account: Account, currencies: Dictionary<Currency>, defaultCurrency: Currency) => {
    const balances = toPairs(account.balances);

    const value =
        defaultCurrency.symbol +
        " " +
        numeral(sumBy(balances, ([_, balance]) => balance.localised[0])).format("-0.00a");
    const summary = getAccountSummary(
        balances,
        currencies,
        defaultCurrency,
        (_, balance) => Intents[!balance ? "default" : balance < 0 ? "danger" : "success"].main
    );

    const charts = [
        <VictoryArea
            data={range(12).map((i) => ({
                y: sumBy(balances, ([_, balance]) => balance.localised[i]) || 0,
                x: i === 0 ? 11.1 : 11 - i,
            }))}
            interpolation="monotoneX"
            style={{
                data: {
                    fill: chroma(Intents.primary.main).alpha(0.5).hex(),
                    stroke: Intents.primary.main,
                    strokeWidth: 2,
                },
            }}
            key={0}
        />,
        <VictoryScatter
            data={[{ x: 11, y: sumBy(balances, ([_, balance]) => balance.localised[0]) }]}
            style={{
                data: {
                    fill: WHITE,
                    stroke: Intents.primary.main,
                    strokeWidth: 2,
                },
            }}
            key={1}
        />,
    ];

    return { value, summary, charts };
};

// const getAccountSummariesByCurrency = (
//     account: Account,
//     currencies: Dictionary<Currency>,
//     defaultCurrency: Currency
// ) => {
//     const balances = toPairs(account.balances);

//     const value =
//         defaultCurrency.symbol + " " + numeral(sumBy(balances, ([_, balance]) => balance.localised[0])).format("-0.00a");
//     const summary = getAccountSummary(balances, currencies, defaultCurrency, (id) => currencies[id]!.colour);

//     const charts = [
//         <VictoryStack key={0}>
//             {balances.map(([strID, balance]) => (
//                 <VictoryArea
//                     data={range(12).map((i) => ({ y: balance.localised[i] || 0, x: i === 0 ? 11.1 : 11 - i }))}
//                     interpolation="monotoneX"
//                     style={{
//                         data: {
//                             fill: currencies[Number(strID)]!.colour,
//                             stroke: chroma(currencies[Number(strID)]!.colour).darken(1).hex(),
//                             strokeWidth: 2,
//                         },
//                     }}
//                 />
//             ))}
//         </VictoryStack>,
//         <VictoryScatter
//             data={balances.map(([strID, balance]) => ({
//                 x: 11,
//                 y: balance.localised[0] || 0,
//                 colour: chroma(currencies[Number(strID)]!.colour).darken(1).hex(),
//             }))}
//             style={{
//                 data: {
//                     fill: WHITE,
//                     stroke: ({ datum }) => datum.colour,
//                     strokeWidth: 2,
//                 },
//             }}
//             key={1}
//         />,
//     ];

//     return { value, summary, charts };
// };

const getAccountSummary = (
    balances: [string, BalanceHistory][],
    currencies: Dictionary<Currency>,
    defaultCurrency: Currency,
    getColour: (id: number, balance: number) => string
) => {
    const summary = balances
        .filter(([_, balance]) => range(12).some((i) => balance.localised[i]))
        .map(([idStr, balance]) => (
            <Typography variant="h6" style={{ color: getColour(Number(idStr), balance.original[0]) }} key={idStr}>
                {currencies[Number(idStr)]!.symbol + " " + numeral(balance.original[0]).format("-0.00a")}
            </Typography>
        ))
        .flatMap((element, i, array) =>
            i + 1 === array.length
                ? [element]
                : [
                      element,
                      <Typography key={i} variant="h6">
                          ,{" "}
                      </Typography>,
                  ]
        );
    summary[0] = summary[0] || (
        <Typography variant="h6" style={{ color: Greys[700] }} key={0}>
            {defaultCurrency.symbol + " 0.00"}
        </Typography>
    );
    return summary;
};

const getAccountAgeDescription = (lastTransactionDate: string | undefined) => {
    const date = parseDate(lastTransactionDate);
    const age = date?.diffNow("days").days;

    return (
        <Typography
            variant="subtitle2"
            style={{
                color:
                    age === undefined
                        ? Greys[700]
                        : age > -30
                        ? Intents.success.main
                        : age > -60
                        ? Intents.warning.main
                        : Intents.danger.main,
            }}
        >
            {date ? "Updated " + date.toRelative() : "Never Updated"}
        </Typography>
    );
};
