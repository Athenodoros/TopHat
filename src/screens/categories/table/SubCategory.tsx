import { ButtonBase, makeStyles, Typography } from "@material-ui/core";
import chroma from "chroma-js";
import clsx from "clsx";
import { BasicChartDomainFunctions } from "../../../components/display/BasicBarChart";
import { BasicFillbar } from "../../../components/display/BasicFillbar";
import { useCategoryByID } from "../../../state/data/hooks";
import { ID } from "../../../state/utilities/values";
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
    chartFunctions: BasicChartDomainFunctions;
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

    return (
        <div className={clsx(classes.row, depth === 0 && classes.root)}>
            <div className={tableClasses.title} />
            <ButtonBase className={clsx(tableClasses.main, classes.main)}>
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
                    {format(range[2] - range[1])}
                </Typography>
            </ButtonBase>
        </div>
    );
};
