import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { Section, SectionProps } from "../../layout";

const useStyles = makeStyles({
    section: {
        "& > div:first-child": {
            zIndex: 2,
        },
    },
});

type TableContainerProps = Pick<SectionProps, "title" | "headers">;
export const TableContainer: React.FC<TableContainerProps> = (props) => (
    <Section {...props} emptyBody={true} className={useStyles().section} />
);
