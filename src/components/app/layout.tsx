import { IconButton, makeStyles, Paper, Typography } from "@material-ui/core";
import { AddTwoTone, Notifications as NotificationsIcon } from "@material-ui/icons";
import clsx from "clsx";
import { Greys } from "../../styles/colours";
import { NAVBAR_LOGO_HEIGHT } from "./navbar";

const usePageStyles = makeStyles((theme) => ({
    page: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        flexGrow: 1,
        overflowY: "scroll",
        padding: "0 60px 30px 60px",
    },

    title: {
        height: NAVBAR_LOGO_HEIGHT,
        flexShrink: 0,
        paddingTop: 4,

        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    titleButtons: {
        "& > button": {
            marginLeft: 15,
            borderRadius: "50%",
        },
    },
}));

export const Page: React.FC<{ title: string }> = ({ children, title }) => {
    const classes = usePageStyles();

    return (
        <div className={classes.page}>
            <div className={classes.title}>
                <Typography variant="h3">{title}</Typography>
                <div className={classes.titleButtons}>
                    <IconButton>
                        <NotificationsIcon />
                    </IconButton>
                    <IconButton>
                        <AddTwoTone />
                    </IconButton>
                </div>
            </div>
            {children}
        </div>
    );
};

const useSectionStyles = makeStyles((theme) => ({
    section: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch",
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        height: 32,

        "& > h6": {
            color: Greys[600],
        },

        "& button": {
            color: Greys[600] + " !important",
            transition: theme.transitions.create("color"),
        },

        "& > div:last-child > *": {
            marginLeft: 20,
        },
    },

    sectionBody: {
        marginBottom: 50,
        flexGrow: 1,
        padding: 20,
    },
}));

export interface SectionProps {
    className?: string;
    title: string;
    headers?: React.ReactNode | React.ReactNode[];
    onCardClick?: () => void;
}
export const Section: React.FC<SectionProps> = ({ className, title, headers, onCardClick, children }) => {
    const classes = useSectionStyles();

    return (
        <div className={clsx(className, classes.section)}>
            <div className={classes.sectionHeader}>
                <Typography variant="h6">{title}</Typography>
                <div>{headers}</div>
            </div>
            <Paper className={classes.sectionBody} onClick={onCardClick}>
                {children}
            </Paper>
        </div>
    );
};
