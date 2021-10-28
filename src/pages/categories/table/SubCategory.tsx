import styled from "@emotion/styled";
import { Edit } from "@mui/icons-material";
import { ButtonBase, IconButton, Typography } from "@mui/material";
import { Box } from "@mui/system";
import chroma from "chroma-js";
import { useCallback, useMemo } from "react";
import { BasicFillbar } from "../../../components/display/BasicFillbar";
import { ChartDomainFunctions } from "../../../shared/data";
import { withSuppressEvent } from "../../../shared/events";
import { TopHatDispatch } from "../../../state";
import { AppSlice, DefaultPages } from "../../../state/app";
import { openNewPage } from "../../../state/app/actions";
import { useCategoryByID } from "../../../state/data/hooks";
import { ID } from "../../../state/shared/values";
import { Greys } from "../../../styles/colours";
import {
    CategoriesTableActionBox,
    CategoriesTableFillbarSx,
    CategoriesTableMainSx,
    CategoriesTableSubtitleSx,
    CategoriesTableTitleBox,
    CategoriesTableTotalSx,
} from "./styles";

interface SubCategoryProps {
    id: ID;
    depth: number;
    chartFunctions: ChartDomainFunctions;
    success: boolean | null;
    range: [number, number, number];
    format: (value: number) => string;
}
export const SubCategoryTableView: React.FC<SubCategoryProps> = ({
    id,
    depth,
    chartFunctions,
    success,
    range,
    format,
}) => {
    const category = useCategoryByID(id);

    const onClick = useCallback(
        (event: React.MouseEvent) => openNewPage({ ...DefaultPages.category, category: id }, event),
        [id]
    );

    const openEditView = useMemo(
        () =>
            withSuppressEvent(() => {
                TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category }));
            }),
        [category]
    );

    return (
        <RowBox sx={depth === 0 ? RootSx : undefined}>
            <CategoriesTableTitleBox />
            <ButtonBase sx={MainButtonSx} onClick={onClick} component="div">
                <SubtitleTypography
                    variant="body2"
                    sx={depth !== 0 ? NestedSubtitleSx : TopSubtitleSx}
                    style={{ paddingLeft: depth * 25 }}
                >
                    {category.name}
                </SubtitleTypography>

                <FillbarBox>
                    <BasicFillbar range={range} functions={chartFunctions} success={success ?? null} minimal={true} />
                </FillbarBox>
                <TotalTypography variant="body2" sx={depth !== 0 ? NestedSubtitleSx : TopSubtitleSx}>
                    {
                        // This is to avoid numerical precision errors - otherwise NaNs show up in the UI
                        format(Math.abs(range[2] - range[1]) < 0.01 ? 0 : range[2] - range[1])
                    }
                </TotalTypography>
                <CategoriesTableActionBox>
                    <IconButton size="small" onClick={openEditView}>
                        <Edit fontSize="small" />
                    </IconButton>
                </CategoriesTableActionBox>
            </ButtonBase>
        </RowBox>
    );
};

const RowBox = styled(Box)({
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",

    "&:last-child": { marginBottom: 20 },
});
const RootSx = { marginTop: 10 };
const MainButtonSx = {
    ...CategoriesTableMainSx,
    borderRadius: "10px",
    height: 30,

    "&:hover": {
        background: chroma(Greys[500]).alpha(0.1).hex(),
    },
};
const SubtitleTypography = styled(Typography)(CategoriesTableSubtitleSx);
const NestedSubtitleSx = { color: Greys[800] };
const TopSubtitleSx = { fontSize: "1.1rem", color: Greys[800] };
const FillbarBox = styled(Box)({ ...CategoriesTableFillbarSx, height: 15 });
const TotalTypography = styled(Typography)(CategoriesTableTotalSx);
