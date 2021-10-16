import { Edit } from "@mui/icons-material";
import { ButtonBase, IconButton, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import chroma from "chroma-js";
import clsx from "clsx";
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
import { useCategoriesTableStyles } from "./styles";

const useStyles = makeStyles((theme) => ({
    row: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",

        "&:last-child": { marginBottom: 20 },
    },
    root: {
        marginTop: 10,
    },
    main: {
        borderRadius: 10,
        height: 30,

        "&:hover": {
            background: chroma(Greys[500]).alpha(0.1).hex(),
        },
    },
    fillbar: { height: 15 },
    stub: {
        // fontStyle: "italic",
        // color: Greys[400],
    },
    top: {
        fontSize: "1.1rem",
        color: Greys[800],
    },
    nested: {
        color: Greys[800],
    },
}));

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

    const tableClasses = useCategoriesTableStyles();
    const classes = useStyles();

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
        <div className={clsx(classes.row, depth === 0 && classes.root)}>
            <div className={tableClasses.title} />
            <ButtonBase className={clsx(tableClasses.main, classes.main)} onClick={onClick} component="div">
                <Typography
                    variant="body2"
                    className={clsx(tableClasses.subtitle, depth !== 0 ? classes.nested : classes.top)}
                    style={{ paddingLeft: depth * 25 }}
                >
                    {category.name}
                </Typography>

                <div className={clsx(tableClasses.fillbar, classes.fillbar)}>
                    <BasicFillbar range={range} functions={chartFunctions} success={success ?? null} minimal={true} />
                </div>
                <Typography
                    variant="body2"
                    className={clsx(
                        tableClasses.total,
                        range[2] - range[1] || classes.stub,
                        depth !== 0 ? classes.nested : classes.top
                    )}
                >
                    {
                        // This is to avoid numerical precision errors - otherwise NaNs show up in the UI
                        format(Math.abs(range[2] - range[1]) < 0.01 ? 0 : range[2] - range[1])
                    }
                </Typography>
                <div className={tableClasses.action}>
                    <IconButton size="small" onClick={openEditView}>
                        <Edit fontSize="small" />
                    </IconButton>
                </div>
            </ButtonBase>
        </div>
    );
};
