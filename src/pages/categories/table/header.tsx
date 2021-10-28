import styled from "@emotion/styled";
import {
    AddCircleOutline,
    Exposure,
    IndeterminateCheckBox,
    List,
    PlaylistAdd,
    PlaylistAddCheck,
} from "@mui/icons-material";
import {
    Box,
    IconButton,
    ListItem,
    ListItemText,
    Menu,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import React from "react";
import { FilterIcon, TableHeaderContainer } from "../../../components/table";
import { createNewCategory } from "../../../dialog/objects/categories";
import { usePopoverProps } from "../../../shared/hooks";
import { TopHatDispatch } from "../../../state";
import { AppSlice } from "../../../state/app";
import { CategoriesPageState, ChartSign } from "../../../state/app/pageTypes";
import {
    CategoriesTableActionBox,
    CategoriesTableFillbarSx,
    CategoriesTableIconSx,
    CategoriesTableMainSx,
    CategoriesTableSubtitleSx,
    CategoriesTableTitleBox,
    CategoriesTableTotalSx,
} from "./styles";

const IconPlaceholderBox = styled(Box)(CategoriesTableIconSx);
const TotalBox = styled(Box)(CategoriesTableTotalSx);
const SubtitleBox = styled(Box)(CategoriesTableSubtitleSx);
const ActionBox = styled(CategoriesTableActionBox)({ visibility: "visible !important" as any });
const MainBox = styled(Box)(CategoriesTableMainSx);
const FillbarBox = styled(Box)({ ...CategoriesTableFillbarSx, display: "flex", alignItems: "center" });

export const CategoriesPageTableHeader: React.FC<Pick<CategoriesPageState, "tableSign" | "hideEmpty">> = ({
    tableSign,
    hideEmpty,
}) => {
    const categoryPopover = usePopoverProps();
    const valuePopover = usePopoverProps();

    return (
        <TableHeaderContainer sx={{ padding: "0 10px" }}>
            <CategoriesTableTitleBox>
                <IconPlaceholderBox />
                <Typography variant="h6">Category</Typography>
                <FilterIcon
                    badgeContent={Number(tableSign !== "all")}
                    ButtonProps={categoryPopover.buttonProps}
                    onRightClick={removeTableSign}
                />
                <Menu {...categoryPopover.popoverProps} PaperProps={{ style: { maxHeight: 300, width: 300 } }}>
                    <ListItem>
                        <ListItemText>Category Types</ListItemText>
                        <ToggleButtonGroup size="small" value={tableSign} exclusive={true} onChange={onSetTableSign}>
                            <ToggleButton value="all">
                                <Tooltip title="All Categories">
                                    <Exposure fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                            <ToggleButton value="credits">
                                <Tooltip title="Income Categories">
                                    <AddCircleOutline fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                            <ToggleButton value="debits">
                                <Tooltip title="Expense Categories">
                                    <IndeterminateCheckBox fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </ListItem>
                </Menu>
            </CategoriesTableTitleBox>
            <MainBox>
                <SubtitleBox />
                <FillbarBox>
                    <Typography variant="h6">Values and Budgets</Typography>
                    <FilterIcon
                        badgeContent={Number(hideEmpty !== "none")}
                        ButtonProps={valuePopover.buttonProps}
                        onRightClick={removeHideEmpty}
                    />
                    <Menu {...valuePopover.popoverProps} PaperProps={{ style: { maxHeight: 300, width: 300 } }}>
                        <ListItem>
                            <ListItemText>Hide Empty</ListItemText>
                            <ToggleButtonGroup
                                size="small"
                                value={hideEmpty}
                                exclusive={true}
                                onChange={onSetHideEmpty}
                            >
                                <ToggleButton value="none">
                                    <Tooltip title="Show all categories">
                                        <List fontSize="small" />
                                    </Tooltip>
                                </ToggleButton>
                                <ToggleButton value="subcategories">
                                    <Tooltip title="Hide empty subcategories">
                                        <PlaylistAdd fontSize="small" />
                                    </Tooltip>
                                </ToggleButton>
                                <ToggleButton value="all">
                                    <Tooltip title="Hide all empty categories">
                                        <PlaylistAddCheck fontSize="small" />
                                    </Tooltip>
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </ListItem>
                    </Menu>
                </FillbarBox>
                <TotalBox />
                <ActionBox>
                    <IconButton size="small" onClick={createNewCategory}>
                        <AddCircleOutline />
                    </IconButton>
                </ActionBox>
            </MainBox>
        </TableHeaderContainer>
    );
};

const removeTableSign = () => TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ tableSign: "all" }));
const onSetTableSign = (_: any, tableSign: ChartSign) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ tableSign }));

const removeHideEmpty = () => TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ hideEmpty: "none" }));
const onSetHideEmpty = (_: any, hideEmpty: CategoriesPageState["hideEmpty"]) =>
    TopHatDispatch(AppSlice.actions.setCategoriesPagePartial({ hideEmpty }));
