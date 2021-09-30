import { Edit, ShoppingBasketTwoTone } from "@mui/icons-material";
import { Breadcrumbs, Button, IconButton, Link, Menu, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
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

const useStyles = makeStyles({
    container: {
        display: "flex",
        position: "relative",
        alignItems: "center",
        margin: -20,
        overflow: "hidden",
    },
    colour: {
        position: "absolute",
        opacity: 0.2,
        transform: "rotate(-60deg)",
        top: -70,
        left: -190,
        height: 280,
        width: 310,
        borderRadius: 40,
    },
    icon: {
        width: 56,
        height: 56,
        margin: "25px 80px 25px 40px",
        borderRadius: 5,
        padding: 10,
    },
    values: {
        height: 56,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },
    breadcrumbs: {
        "& li": {
            marginTop: "auto",
        },
    },
    name: {
        lineHeight: 1,
        color: BLACK,
        overflow: "visible",
    },
    dates: {
        color: Greys[600],
        lineHeight: 1,
    },
    edit: {
        marginRight: 40,
    },
    children: {
        padding: "0 5px",
        marginBottom: -2,
    },
    child: {
        height: 16,
        width: 16,
        marginRight: 16,
    },
    childName: {
        width: 150,
    },
    menu: {
        minWidth: 250,

        "& li": {
            paddingTop: 3,
            paddingBottom: 3,
            minHeight: 0,
        },
    },
});

export const CategoryPageHeader: React.FC = () => {
    const classes = useStyles();
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
            <div className={classes.container}>
                <div className={classes.colour} style={{ background: colour }} />
                <ShoppingBasketTwoTone className={classes.icon} style={{ background: colour }} htmlColor="white" />
                <div className={classes.values}>
                    <Breadcrumbs className={classes.breadcrumbs}>
                        {reverse(clone(category.hierarchy)).map((id) => (
                            <Link underline="hover" href="#" onClick={redirect(id)} key={id}>
                                {categories[id]!.name}
                            </Link>
                        ))}
                        <Typography variant="h4" noWrap={true} className={classes.name}>
                            {category.name}
                        </Typography>
                        {children.length ? (
                            <span>
                                <Button className={classes.children} {...popover.buttonProps}>
                                    {children.length} Categories
                                </Button>
                                <Menu
                                    {...popover.popoverProps}
                                    PaperProps={{ className: classes.menu }}
                                    anchorOrigin={{
                                        vertical: "bottom",
                                        horizontal: "left",
                                    }}
                                    transformOrigin={{
                                        vertical: "top",
                                        horizontal: "left",
                                    }}
                                >
                                    <SingleCategoryMenu
                                        setSelected={(category) => {
                                            close();
                                            if (category) redirect(category.id)();
                                        }}
                                        anchor={category.id}
                                    />
                                </Menu>
                            </span>
                        ) : undefined}
                    </Breadcrumbs>
                    <Typography variant="subtitle1" noWrap={true} className={classes.dates}>
                        {start && end
                            ? `${parseDate(start).toLocaleString(DateTime.DATE_FULL)} - ${parseDate(end).toLocaleString(
                                  DateTime.DATE_FULL
                              )}`
                            : "No Current Transactions"}
                    </Typography>
                </div>

                <IconButton onClick={openEditView} className={classes.edit} size="large">
                    <Edit />
                </IconButton>
            </div>
        </Section>
    );
};
