import styled from "@emotion/styled";
import { Edit } from "@mui/icons-material";
import { ButtonBase, Card, IconButton, Typography } from "@mui/material";
import { Box } from "@mui/system";
import chroma from "chroma-js";
import { reverse } from "lodash";
import React, { useCallback, useMemo } from "react";
import { BasicFillbar } from "../../../components/display/BasicFillbar";
import { getCategoryIcon } from "../../../components/display/ObjectDisplay";
import { ChartDomainFunctions, formatNumber } from "../../../shared/data";
import { withSuppressEvent } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice, DefaultPages } from "../../../state/app";
import { openNewPage } from "../../../state/app/actions";
import { CategoriesPageState } from "../../../state/app/pageTypes";
import { Category } from "../../../state/data";
import { useCategoryMap, useFormatValue } from "../../../state/data/hooks";
import { ID } from "../../../state/shared/values";
import { Greys, Intents } from "../../../styles/colours";
import {
    CategoriesTableActionBox,
    CategoriesTableFillbarSx,
    CategoriesTableIconSx,
    CategoriesTableMainSx,
    CategoriesTableSubtitleSx,
    CategoriesTableTitleBox,
    CategoriesTableTotalSx,
} from "./styles";
import { SubCategoryTableView } from "./SubCategory";

export interface TopLevelCategoryViewProps {
    category: {
        id: ID;
        name: string;
        colour: string;
        value: number;
        budget?: number;
        success?: boolean | null;
    };
    graph: Record<ID, ID[]>;
    chartFunctions: ChartDomainFunctions;
    getCategoryStatistics: (category: Category) => { value: number; budget?: number; success?: boolean | null };
    hideEmpty: CategoriesPageState["hideEmpty"];
}
export const TopLevelCategoryTableView: React.FC<TopLevelCategoryViewProps> = ({
    category,
    graph,
    chartFunctions,
    getCategoryStatistics,
    hideEmpty,
}) => {
    const format = useFormatValue();

    const categories = useCategoryMap();
    let running: Record<number, number> = { 0: 0 }; // Depth -> Running Total
    const getNestedSubcategoryNodes = (id: ID, depth: number = 0): JSX.Element[] => {
        const statistic = getCategoryStatistics(categories[id]!).value;
        if (hideEmpty !== "none" && !statistic) return [];

        running[depth + 1] = running[depth];
        const children = graph[id].flatMap((child) => getNestedSubcategoryNodes(child, depth + 1));

        const results = [
            <SubCategoryTableView
                key={id}
                id={id}
                depth={depth}
                chartFunctions={chartFunctions}
                success={category.success ?? null}
                format={format}
                range={[running[depth], running[depth + 1], running[depth] + statistic]}
                // range={[running[depth + 1], running[depth + 1], running[depth] + statistic]}
            />,
        ].concat(reverse(children));

        running[depth] += statistic;
        return results;
    };
    const subcategories = reverse(graph[category.id].map((child) => getNestedSubcategoryNodes(child)));

    const onClick = useCallback(
        (event: React.MouseEvent) => openNewPage({ ...DefaultPages.category, category: category.id }, event),
        [category.id]
    );

    const openEditView = useMemo(
        () =>
            withSuppressEvent(() => {
                TopHatDispatch(
                    AppSlice.actions.setDialogPartial({ id: "category", category: categories[category.id]! })
                );
            }),
        [categories, category.id]
    );

    return (
        <ContainerCard>
            <ButtonBase sx={TopLevelSx} onClick={onClick} component="div">
                <CategoriesTableTitleBox>
                    {getCategoryIcon(category, CategoriesTableIconSx)}
                    <Typography variant="h5" noWrap={true}>
                        {category.name}
                    </Typography>
                </CategoriesTableTitleBox>
                <MainBox>
                    <SubtitleBox />
                    <FillbarBox>
                        <BasicFillbar
                            range={[0, 0, category.value]}
                            // range={[0, running[0], category.value]}
                            showEndpoint={true}
                            secondary={category.budget}
                            functions={chartFunctions}
                            success={category.success ?? null}
                        />
                    </FillbarBox>
                    <TotalBox>
                        <Typography
                            variant="h5"
                            sx={
                                category.budget !== undefined
                                    ? category.success
                                        ? GreenTextSx
                                        : RedTextSx
                                    : BlueTextSx
                            }
                        >
                            {format(category.value)}
                        </Typography>
                        {category.budget !== undefined ? (
                            <BudgetTypography variant="caption">/ {formatNumber(category.budget)}</BudgetTypography>
                        ) : undefined}
                    </TotalBox>
                    <CategoriesTableActionBox>
                        <IconButton size="small" onClick={openEditView}>
                            <Edit />
                        </IconButton>
                    </CategoriesTableActionBox>
                </MainBox>
            </ButtonBase>
            <ColourBox sx={{ background: category.colour }} />
            {subcategories}
        </ContainerCard>
    );
};

const ContainerCard = styled(Card)({
    margin: "10px 0",
    padding: "0 10px",
    position: "relative",
    overflow: "hidden",
});
const TopLevelSx = {
    display: "flex",
    height: 50,
    borderRadius: "10px",
    margin: "10px 0",
    width: "100%",
    alignItems: "center",

    "&:hover": {
        background: chroma(Greys[500]).alpha(0.1).hex(),
    },
} as const;
const ColourBox = styled(Box)({
    position: "absolute",
    width: 300,
    height: 280,
    borderRadius: "50px",
    top: -180,
    left: -80,
    transform: "rotate(-20deg)",
    opacity: 0.1,
    pointerEvents: "none",
});
const FillbarBox = styled("div")({ ...CategoriesTableFillbarSx, height: 35 });
const BlueTextSx = { color: Intents.primary.main, lineHeight: 1 };
const GreenTextSx = { color: Intents.success.main, lineHeight: 1 };
const RedTextSx = { color: Intents.danger.main, lineHeight: 1 };
const BudgetTypography = styled(Typography)({ color: Greys[700], marginLeft: 5 });
const SubtitleBox = styled("div")(CategoriesTableSubtitleSx);
const MainBox = styled("div")(CategoriesTableMainSx);
const TotalBox = styled("div")(CategoriesTableTotalSx);
