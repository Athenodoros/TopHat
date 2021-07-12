import { makeStyles } from "@material-ui/core";
import React from "react";
import { Section, SectionProps } from "../layout";

const useStyles = makeStyles({
    section: {
        marginBottom: 100,

        "& > div:first-child": {
            zIndex: 2,
        },
    },
});

type TableContainerProps = Pick<SectionProps, "title" | "headers">;
export const TableContainer: React.FC<TableContainerProps> = (props) => (
    <Section {...props} emptyBody={true} className={useStyles().section} />
);
