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
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
import { DEFAULT_RADIUS } from "../../../styles/theme";

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
    "& > :first-of-type": { borderLeftColor: "black" },
    "&:not(:last-child)": { marginBottom: 1 },
});

export interface CategoriesBarSummaryPoint {
    id: ID;
    name: string;
    colour: string;
    total: number;
    budget: number;
}
export const CategoriesBarSummary: React.FC<{ points: CategoriesBarSummaryPoint[] }> = ({ points }) => {
    const filtered = (key: "total" | "budget", type: "credit" | "debit") =>
        points.filter((point) => (type === "credit" ? point[key] > 0 : point[key] < 0));

    const functions = getChartDomainFunctions([
        sumBy(filtered("total", "debit"), ({ total }) => Math.abs(total)),
        sumBy(filtered("budget", "debit"), ({ budget }) => Math.abs(budget)),
        sumBy(filtered("total", "credit"), ({ total }) => total),
        sumBy(filtered("budget", "credit"), ({ budget }) => budget),
    ]);

    const getAllNodes = (key: "total" | "budget", type: "credit" | "debit", getSX: (colour: string) => SxProps) =>
        sortBy(filtered(key, type), ({ total }) => (type === "credit" ? -total : total)).reduce(
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

    const getValueStyles = (colour: string) => ({
        background: fadeSolidColour(colour),
        border: "1px solid " + colour,
    });
    const getBudgetStyles = (colour: string) => ({
        background: chroma(colour).alpha(0.2).hex(),
        border: "1px solid " + chroma(colour).alpha(0.3).hex(),
    });
    const positiveValueNodes = getAllNodes("total", "credit", getValueStyles);
    const positiveBudgetNodes = getAllNodes("budget", "credit", getBudgetStyles);
    const negativeValueNodes = getAllNodes("total", "debit", getValueStyles);
    const negativeBudgetNodes = getAllNodes("budget", "debit", getBudgetStyles);

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                background: Greys[100],
                borderRadius: 8 / DEFAULT_RADIUS,
                paddingBottom: 8,
                marginTop: 8,
                marginBottom: -6,
            }}
        >
            <BarContainer>
                <Tooltip title="Income">
                    <FileDownload fontSize="small" htmlColor={Greys[600]} sx={{ marginRight: 8 }} />
                </Tooltip>
                <StackedBar>
                    <ValueRow>{positiveValueNodes}</ValueRow>
                    <ValueRow>{positiveBudgetNodes}</ValueRow>
                </StackedBar>
            </BarContainer>
            <BarContainer>
                <Tooltip title="Expenses">
                    <FileUpload fontSize="small" htmlColor={Greys[600]} sx={{ marginRight: 8 }} />
                </Tooltip>
                <StackedBar>
                    <ValueRow>{negativeValueNodes}</ValueRow>
                    <ValueRow>{negativeBudgetNodes}</ValueRow>
                </StackedBar>
            </BarContainer>
        </Box>
    );
};
