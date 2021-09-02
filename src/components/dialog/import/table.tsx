import { Card, makeStyles, Typography } from "@material-ui/core";
import { Event, Filter1, Translate } from "@material-ui/icons";
import { unzip, upperFirst } from "lodash";
import React from "react";
import { ColumnProperties, StatementMappingColumns } from "../../../state/logic/statement";
import { Greys } from "../../../styles/colours";

export interface FileImportTableViewProps {
    columns: ColumnProperties[];
    assignments?: {
        [column: string]: keyof typeof StatementMappingColumns;
    };
}

const useStyles = makeStyles({
    container: {
        margin: "20px 20px 0 20px",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",

        "& > div": {
            margin: "10px 15px",
            overflow: "scroll",
            minHeight: 0,
        },
    },
    header: {
        background: Greys[200],
        position: "sticky",
        top: 0,
    },
    column: {
        borderBottom: "2px solid " + Greys[400],

        "& > :first-child": {
            display: "flex",
            alignItems: "center",
            padding: "5px 20px 2px 10px",
            "& > svg": {
                fontSize: 16,
                marginRight: 8,
                color: Greys[700],
            },
        },
    },
    body: {
        "& td": {
            padding: "1px 20px 1px 10px",
            borderBottom: "1px solid " + Greys[300],
        },
    },
});
export const FileImportTableView: React.FC<FileImportTableViewProps> = ({ columns, assignments }) => {
    const classes = useStyles();

    return (
        <Card variant="outlined" className={classes.container}>
            <div>
                <table>
                    <thead className={classes.header}>
                        <tr>
                            {columns.map((column) => (
                                <th className={classes.column} key={column.id}>
                                    <div>
                                        {COLUMN_TYPE_ICONS[column.type]}
                                        <Typography variant="subtitle2">{column.name}</Typography>
                                    </div>
                                    {assignments && (
                                        <div>
                                            <Typography variant="caption">
                                                {assignments[column.id] ? upperFirst(assignments[column.id]) : ""}
                                            </Typography>
                                        </div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={classes.body}>
                        {unzip(columns.map((column) => column.values as (string | number | null)[])).map((row, id) => (
                            <tr key={id}>
                                {row.map((value, idx) => (
                                    <td key={idx}>{value}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const COLUMN_TYPE_ICONS = {
    date: <Event />,
    number: <Filter1 />,
    string: <Translate />,
};
