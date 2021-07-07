import { IconButton, makeStyles, Typography } from "@material-ui/core";
import { AddTwoTone, Notifications as NotificationsIcon } from "@material-ui/icons";
import { NAVBAR_LOGO_HEIGHT } from "../shell/navbar";

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
