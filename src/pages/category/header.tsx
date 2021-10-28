import styled from "@emotion/styled";
import { Edit, ShoppingBasketTwoTone } from "@mui/icons-material";
import { Breadcrumbs, Button, IconButton, Link, Menu, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { clone, reverse } from "lodash";
import { max, min, unzip, values } from "lodash-es";
import { DateTime } from "luxon";
import React, { useCallback, useMemo } from "react";
import { SingleCategoryMenu } from "../../components/display/CategoryMenu";
import { Section } from "../../components/layout";
import { usePopoverProps } from "../../shared/hooks";
import { TopHatDispatch } from "../../state";
import { AppSlice, DefaultPages } from "../../state/app";
import { useCategoryPageCategory } from "../../state/app/hooks";
import { useCategoryColour, useCategoryIDs, useCategoryMap } from "../../state/data/hooks";
import { ID, parseDate } from "../../state/shared/values";
import { BLACK, Greys } from "../../styles/colours";

export const CategoryPageHeader: React.FC = () => {
    const category = useCategoryPageCategory();
    const colour = useCategoryColour(category);
    const categories = useCategoryMap();
    const categoryIDs = useCategoryIDs();

    const children = useMemo(
        () => categoryIDs.filter((id) => categories[id]!.hierarchy.includes(category.id)),
        [categoryIDs, categories, category.id]
    );
    const openEditView = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category })),
        [category]
    );
    const redirect = (id: ID) => () =>
        TopHatDispatch(AppSlice.actions.setPageState({ ...DefaultPages.category, category: id }));

    const popover = usePopoverProps();
    const close = useCallback(() => popover.setIsOpen(false), [popover]);

    const [start, end] = useMemo(() => {
        const dates = unzip(
            values(categories)
                .filter((option) => option?.id === category.id || option?.hierarchy.includes(category.id))
                .map((option) => [option?.firstTransactionDate, option?.lastTransactionDate])
        );
        return [min(dates[0]), max(dates[1])];
    }, [categories, category.id]);

    return (
        <Section>
            <ContainerBox>
                <ColourBox sx={{ background: colour }} />
                <ShoppingBasketIcon sx={{ background: colour }} htmlColor="white" />
                <ValuesBox>
                    <CategoryBreadcrumbs>
                        {reverse(clone(category.hierarchy)).map((id) => (
                            <Link underline="hover" href="#" onClick={redirect(id)} key={id}>
                                {categories[id]!.name}
                            </Link>
                        ))}
                        <NameTypography variant="h4" noWrap={true}>
                            {category.name}
                        </NameTypography>
                        {children.length ? (
                            <span>
                                <ChildrenButton {...popover.buttonProps}>{children.length} Categories</ChildrenButton>
                                <Menu {...popover.popoverProps} {...MenuPaperProps}>
                                    <SingleCategoryMenu
                                        setSelected={(category) => {
                                            close();
                                            if (category) redirect(category.id)();
                                        }}
                                        anchor={{ id: category.id }}
                                    />
                                </Menu>
                            </span>
                        ) : undefined}
                    </CategoryBreadcrumbs>
                    <DatesTypography variant="subtitle1" noWrap={true}>
                        {start && end
                            ? `${parseDate(start).toLocaleString(DateTime.DATE_FULL)} - ${parseDate(end).toLocaleString(
                                  DateTime.DATE_FULL
                              )}`
                            : "No Current Transactions"}
                    </DatesTypography>
                </ValuesBox>

                <EditIconButton onClick={openEditView} size="large">
                    <Edit />
                </EditIconButton>
            </ContainerBox>
        </Section>
    );
};

const ContainerBox = styled(Box)({
    display: "flex",
    position: "relative",
    alignItems: "center",
    margin: -20,
    overflow: "hidden",
});
const ShoppingBasketIcon = styled(ShoppingBasketTwoTone)({
    width: 56,
    height: 56,
    margin: "25px 80px 25px 40px",
    borderRadius: "5px",
    padding: 10,
});
const ColourBox = styled(Box)({
    position: "absolute",
    opacity: 0.2,
    transform: "rotate(-60deg)",
    top: -70,
    left: -190,
    height: 280,
    width: 310,
    borderRadius: "40px",
});
const ValuesBox = styled(Box)({
    height: 56,
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
});
const CategoryBreadcrumbs = styled(Breadcrumbs)({
    "& li": {
        marginTop: "auto",
    },
});
const NameTypography = styled(Typography)({
    lineHeight: 1,
    color: BLACK,
    overflow: "visible",
});
const ChildrenButton = styled(Button)({ padding: "0 5px", marginBottom: -2 });
const MenuPaperProps = {
    PaperProps: {
        sx: {
            minWidth: 250,

            "& li": {
                paddingTop: 3,
                paddingBottom: 3,
                minHeight: 0,
            },
        },
    },
    anchorOrigin: {
        vertical: "bottom",
        horizontal: "left",
    },
    transformOrigin: {
        vertical: "top",
        horizontal: "left",
    },
} as const;
const DatesTypography = styled(Typography)({ color: Greys[600], lineHeight: 1 });
const EditIconButton = styled(IconButton)({ marginRight: 40 });
