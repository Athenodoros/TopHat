import styled from "@emotion/styled";
import { FileDownload, FileUpload } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { Box, SxProps } from "@mui/system";
import chroma from "chroma-js";
import { sortBy, sumBy } from "lodash";
import numeral from "numeral";
import React from "react";
import { fadeSolidColour } from "../../../components/display/ObjectDisplay";
import { getChartDomainFunctions } from "../../../shared/data";
import { ChartSign } from "../../../state/app/pageTypes";
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";

const BarContainer = styled("div")({
    display: "flex",
    alignItems: "center",
    padding: "10px 20px 0 10px",
    overflow: "hidden",
});
const StackedBar = styled("div")({ padding: "3px 0", borderLeft: "2px solid black", flexGrow: 1 });
const ValueRow = styled("div")({
    height: 10,
    position: "relative",
    marginLeft: -1,
    "& > *": { height: "100%", position: "absolute" },
    "& > *:first-child": { borderLeftColor: "black" },
    "&:not(:last-child)": { marginBottom: 1 },
});

export interface CategoriesBarSummaryPoint {
    id: ID;
    name: string;
    colour: string;
    total: number;
    budget: number;
}
export const CategoriesBarSummary: React.FC<{ points: CategoriesBarSummaryPoint[]; sign: ChartSign }> = ({
    points,
    sign,
}) => {
    let allValues: number[] = [];
    if (sign !== "credits")
        allValues = allValues.concat([
            sumBy(
                points.filter(({ total }) => total < 0),
                ({ total }) => Math.abs(total)
            ),
            sumBy(
                points.filter(({ budget }) => budget < 0),
                ({ budget }) => Math.abs(budget)
            ),
        ]);
    if (sign !== "debits")
        allValues = allValues.concat([
            sumBy(
                points.filter(({ total }) => total > 0),
                ({ total }) => total
            ),
            sumBy(
                points.filter(({ budget }) => budget > 0),
                ({ budget }) => budget
            ),
        ]);
    const functions = getChartDomainFunctions(allValues);

    const getAllNodes = (key: "total" | "budget", type: "credit" | "debit", getSX: (colour: string) => SxProps) =>
        sortBy(
            points.filter((point) => (type === "credit" ? point[key] > 0 : point[key] < 0)),
            ({ total }) => (type === "credit" ? -total : total)
        ).reduce(
            ({ nodes, acc }, point) => {
                const { offset: left, size: width } = functions.getOffsetAndSizeForRange(
                    acc,
                    acc + Math.abs(point[key])
                );
                const node = (
                    <Tooltip
                        key={point.id}
                        title={`${point.name}${key === "budget" ? " (Budget)" : ""}: ${numeral(point[key]).format(
                            "0.00a"
                        )}`}
                        disableInteractive={true}
                    >
                        <Box sx={{ left, width, ...getSX(point.colour) }} />
                    </Tooltip>
                );
                return { nodes: nodes.concat(node), acc: acc + Math.abs(point[key]) };
            },
            { nodes: [] as React.ReactNode[], acc: 0 }
        ).nodes;

    const positiveValueNodes = getAllNodes("total", "credit", (colour) => ({
        background: fadeSolidColour(colour),
        border: "1px solid " + colour,
    }));
    const positiveBudgetNodes = getAllNodes("budget", "credit", (colour) => ({
        background: chroma(colour).alpha(0.2).hex(),
        border: "1px solid " + chroma(colour).alpha(0.3).hex(),
    }));
    const negativeValueNodes = getAllNodes("total", "debit", (colour) => ({
        background: fadeSolidColour(colour),
        border: "1px solid " + colour,
    }));
    const negativeBudgetNodes = getAllNodes("budget", "debit", (colour) => ({
        background: chroma(colour).alpha(0.2).hex(),
        border: "1px solid " + chroma(colour).alpha(0.3).hex(),
    }));

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                background: Greys[100],
                borderRadius: 2,
                paddingBottom: 1,
                marginTop: 1,
                marginBottom: -0.75,
            }}
        >
            {sign !== "debits" ? (
                <BarContainer>
                    {sign === "all" ? (
                        <Tooltip title="Income">
                            <FileDownload fontSize="small" htmlColor={Greys[600]} sx={{ marginRight: 1 }} />
                        </Tooltip>
                    ) : undefined}
                    <StackedBar>
                        <ValueRow>{positiveValueNodes}</ValueRow>
                        <ValueRow>{positiveBudgetNodes}</ValueRow>
                    </StackedBar>
                </BarContainer>
            ) : undefined}
            {sign !== "credits" ? (
                <BarContainer>
                    {sign === "all" ? (
                        <Tooltip title="Expenses">
                            <FileUpload fontSize="small" htmlColor={Greys[600]} sx={{ marginRight: 1 }} />
                        </Tooltip>
                    ) : undefined}
                    <StackedBar>
                        <ValueRow>{negativeValueNodes}</ValueRow>
                        <ValueRow>{negativeBudgetNodes}</ValueRow>
                    </StackedBar>
                </BarContainer>
            ) : undefined}
        </Box>
    );
};
