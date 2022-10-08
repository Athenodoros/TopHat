import styled from "@emotion/styled";
import { Add, Description, Edit, NoteAdd, Update } from "@mui/icons-material";
import { Button, ButtonBase, buttonClasses, Tooltip, Typography } from "@mui/material";
import { Dictionary } from "@reduxjs/toolkit";
import chroma from "chroma-js";
import { cloneDeep, max, min, range, sumBy, toPairs } from "lodash";
import React, { useCallback, useMemo } from "react";
import { VictoryArea, VictoryChart, VictoryScatter } from "victory";
import { fadeSolidColour } from "../../../components/display/ObjectDisplay";
import { getChartPerformanceProps, getHiddenTickZeroAxis } from "../../../components/display/PerformantCharts";
import { getNewTransaction } from "../../../components/table/table/header";
import { NBSP } from "../../../shared/constants";
import { formatNumber } from "../../../shared/data";
import { suppressEvent, withSuppressEvent } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice, DefaultPages } from "../../../state/app";
import { openNewPage } from "../../../state/app/actions";
import { DataSlice } from "../../../state/data";
import { useCurrencyMap, useDefaultCurrency } from "../../../state/data/hooks";
import { Account, AccountTypeMap, Currency } from "../../../state/data/types";
import { BalanceHistory, getToday, getTodayString, parseDate } from "../../../state/shared/values";
import { Greys, Intents, WHITE } from "../../../styles/colours";
import { ACCOUNT_TABLE_LEFT_PADDING } from "./styles";

export const AccountTableEntry: React.FC<{ account: Account }> = ({ account }) => {
    const currencies = useCurrencyMap();
    const defaultCurrency = useDefaultCurrency();
    const onClick = useCallback(
        (event: React.MouseEvent) => openNewPage({ ...DefaultPages.account, account: account.id }, event),
        [account.id]
    );

    const { value, summary, charts, domain } = getAccountSummaries(account, currencies, defaultCurrency);

    const markUpToDate = useMemo(
        () =>
            withSuppressEvent(() =>
                TopHatDispatch(
                    DataSlice.actions.updateAccount({ id: account.id, changes: { lastUpdate: getTodayString() } })
                )
            ),
        [account.id]
    );
    const goToUploadDialog = useMemo(
        () =>
            withSuppressEvent(() =>
                TopHatDispatch(
                    AppSlice.actions.setDialogPartial({
                        id: "import",
                        import: { page: "file", rejections: [], account },
                    })
                )
            ),
        [account]
    );

    const createNewTransaction = useMemo(
        () =>
            withSuppressEvent(() => {
                const newPageState = cloneDeep(DefaultPages.account);
                newPageState.account = account.id;
                newPageState.table.state.edit = getNewTransaction();
                newPageState.table.state.edit.account = account.id;

                TopHatDispatch(AppSlice.actions.setPageState(newPageState));
            }),
        [account.id]
    );

    return (
        <ButtonBase key={account.id} sx={ContainerSx} component="div" onClick={onClick}>
            <AccountNameContainerBox>
                <Typography variant="h6" noWrap={true}>
                    {account.name}
                </Typography>
                <SubValueTypography variant="body2" noWrap={true}>
                    {AccountTypeMap[account.category].name}
                </SubValueTypography>
            </AccountNameContainerBox>
            <ChartContainerBox>
                <VictoryChart
                    height={45}
                    width={230}
                    padding={{ top: 0, right: 2, bottom: 0, left: 0 }}
                    domainPadding={{ y: 3 }}
                    {...getChartPerformanceProps(domain)}
                >
                    {getHiddenTickZeroAxis(Greys[400])}
                    {charts}
                </VictoryChart>
            </ChartContainerBox>
            <AccountValueContainerBox>
                <AccountValueSummaryBox>{summary}</AccountValueSummaryBox>
                <SubValueTypography variant="body2">{value}</SubValueTypography>
            </AccountValueContainerBox>
            {account.lastStatementFormat ? <DescriptionAccountIcon /> : <EditAccountIcon />}
            <AccountUpdateContainerBox>
                {getAccountAgeDescription(account)}
                <AccountUpdateActionsBox onMouseDown={suppressEvent}>
                    <Tooltip title="Mark Up-To-Date">
                        <Button
                            size="small"
                            startIcon={<Update htmlColor={Greys[700]} />}
                            onClick={markUpToDate}
                            color="inherit"
                        />
                    </Tooltip>
                    <Tooltip title="Upload Statement">
                        <Button
                            size="small"
                            startIcon={<NoteAdd htmlColor={Greys[700]} />}
                            onClick={goToUploadDialog}
                            color="inherit"
                        />
                    </Tooltip>
                    <Tooltip title="Create Transaction">
                        <Button
                            size="small"
                            startIcon={<Add htmlColor={Greys[700]} />}
                            color="inherit"
                            onClick={createNewTransaction}
                        />
                    </Tooltip>
                </AccountUpdateActionsBox>
            </AccountUpdateContainerBox>
        </ButtonBase>
    );
};

const getAccountSummaries = (account: Account, currencies: Dictionary<Currency>, defaultCurrency: Currency) => {
    const balances = toPairs(account.balances);

    const value =
        defaultCurrency.symbol +
        " " +
        formatNumber(
            sumBy(balances, ([_, balance]) => balance.localised[0]),
            { end: "k" }
        );
    const summary = getAccountSummary(balances, currencies, defaultCurrency);

    const values = range(12).map((i) => sumBy(balances, ([_, balance]) => balance.localised[i]) || 0);
    const domain = {
        x: [-0.5, 11.5] as [number, number],
        y: [min(values.concat([0])), max(values.concat([0]))] as [number, number],
    };

    const charts = [
        <VictoryArea
            data={range(12).map((i) => ({ y: values[i], x: i === 0 ? 11.1 : 11 - i }))}
            interpolation="monotoneX"
            style={{
                data: {
                    fill: fadeSolidColour(Intents.primary.main),
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

    return { value, summary, charts, domain };
};

const getAccountSummary = (
    balances: [string, BalanceHistory][],
    currencies: Dictionary<Currency>,
    defaultCurrency: Currency
) => {
    const getColour = (balance: number) => Intents[!balance ? "default" : balance < 0 ? "danger" : "success"].main;
    const hasBalance = ([_, balance]: [string, BalanceHistory]) => !!balance.localised[0];
    const hadRecentBalance = ([_, balance]: [string, BalanceHistory]) => range(12).some((i) => balance.localised[i]);

    const summary = balances
        .filter(
            // prettier-ignore
            balances.some(hasBalance) ? hasBalance
          : balances.some(hadRecentBalance) ? hadRecentBalance
          : () => true
        )
        .map(([idStr, balance], _, array) => (
            <Typography variant="h6" style={{ color: getColour(balance.localised[0]) }} key={idStr} noWrap={true}>
                {currencies[Number(idStr)]!.symbol +
                    " " +
                    formatNumber(balance.original[0], { end: "k", decimals: array.length === 1 ? 2 : 0 })}
            </Typography>
        ))
        .flatMap((element, i, array) =>
            i + 1 === array.length
                ? [element]
                : [
                      element,
                      <Typography key={i} variant="h6">
                          ,{NBSP}
                      </Typography>,
                  ]
        );
    summary[0] = summary[0] || (
        <Typography variant="h6" style={{ color: getColour(0) }} key={0} noWrap={true}>
            {defaultCurrency.symbol + " 0.00"}
        </Typography>
    );
    return summary;
};

export const getAccountUpdateAgeLevel = (account: Account) => {
    const update = parseDate(max([account.lastTransactionDate, account.lastUpdate]));

    const updateLength = account.lastTransactionDate
        ? update!.diff(parseDate(account.lastTransactionDate), "days").days
        : 0;
    const updateSince = update && getToday().diff(update, "days").days;

    return {
        level:
            updateSince === undefined
                ? null
                : updateSince <= 30 || updateSince <= updateLength
                ? ("success" as const)
                : updateSince <= 60 || updateSince <= 2 * updateLength
                ? ("warning" as const)
                : ("danger" as const),
        age: updateSince,
        date: update,
    };
};

const getAccountAgeDescription = (account: Account) => {
    const { age, level, date } = getAccountUpdateAgeLevel(account);

    return (
        <Typography
            variant="subtitle2"
            sx={{
                marginLeft: 6,
                color: level === null ? Greys[700] : Intents[level].main,
            }}
        >
            {date
                ? "Updated " + (age! >= 1 ? date.toRelative({ unit: ["years", "months", "weeks", "days"] }) : "today")
                : "Never Updated"}
        </Typography>
    );
};

const ContainerSx = {
    height: 64,
    borderRadius: "10px",
    textTransform: "inherit" as const,
    paddingLeft: ACCOUNT_TABLE_LEFT_PADDING,
    marginBottom: 10,

    "&:hover": {
        backgroundColor: chroma(Greys[500]).alpha(0.1).hex(),
    },
    "&:last-child": {
        marginBottom: 0,
    },
};
const AccountNameContainerBox = styled("div")({
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: 160,
    marginRight: 30,

    "& > *": {
        width: "100%",
    },
});
const SubValueTypography = styled(Typography)({ color: Greys[600] });
const ChartContainerBox = styled("div")({ height: 50, width: 230 });
const AccountValueContainerBox = styled("div")({
    marginLeft: 30,
    width: 140,
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginRight: 10,
    overflow: "hidden",
});
const AccountValueSummaryBox = styled("div")({ display: "flex", width: "100%" });
const AccountIconSx = {
    color: Greys[700],
    backgroundColor: Greys[300],
    height: 40,
    width: 40,
    padding: 10,
    borderRadius: "50%",
};
const DescriptionAccountIcon = styled(Description)(AccountIconSx);
const EditAccountIcon = styled(Edit)(AccountIconSx);
const AccountUpdateContainerBox = styled("div")({
    width: 160,
    marginLeft: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
});
const AccountUpdateActionsBox = styled("div")({
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

        [`& .${buttonClasses.startIcon}`]: {
            margin: 0,
        },
    },
});
