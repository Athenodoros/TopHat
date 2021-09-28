import { IconButton, Typography } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import { Edit, ShoppingBasketTwoTone } from "@mui/icons-material";
import { DateTime } from "luxon";
import React, { useCallback } from "react";
import { Section } from "../../components/layout";
import { TopHatDispatch } from "../../state";
import { AppSlice } from "../../state/app";
import { useCategoryPageCategory } from "../../state/app/hooks";
import { useCategoryColour } from "../../state/data/hooks";
import { parseDate } from "../../state/utilities/values";
import { Greys } from "../../styles/colours";

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
    title: {
        height: 56,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",

        "& > *:last-child": {
            color: Greys[600],
        },
        "& > *": {
            lineHeight: 1,
        },
    },
    edit: {
        marginRight: 40,
    },
});

export const CategoryPageHeader: React.FC = () => {
    const classes = useStyles();
    const category = useCategoryPageCategory();
    const colour = useCategoryColour(category);

    const openEditView = useCallback(
        () => TopHatDispatch(AppSlice.actions.setDialogPartial({ id: "category", category })),
        [category]
    );

    return (
        <Section>
            <div className={classes.container}>
                <div className={classes.colour} style={{ background: colour }} />
                <ShoppingBasketTwoTone className={classes.icon} style={{ background: colour }} htmlColor="white" />
                <div className={classes.title}>
                    <Typography variant="h4" noWrap={true}>
                        {category.name}
                    </Typography>
                    <Typography variant="subtitle1" noWrap={true}>
                        {category.firstTransactionDate && category.lastTransactionDate
                            ? `${parseDate(category.firstTransactionDate).toLocaleString(
                                  DateTime.DATE_FULL
                              )} - ${parseDate(category.lastTransactionDate).toLocaleString(DateTime.DATE_FULL)}`
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
