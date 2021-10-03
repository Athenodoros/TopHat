import makeStyles from "@mui/styles/makeStyles";

export const useCategoriesTableStyles = makeStyles({
    title: {
        display: "flex",
        alignItems: "center",
        // flexGrow: 1,
        width: 200,
    },
    main: {
        flexGrow: 9,
        width: 650,
        display: "flex",
        alignItems: "center",
        paddingLeft: 15,

        "&:hover > :nth-last-child(1), &:hover > :nth-last-child(2)": {
            visibility: "visible",
        },
    },
    subtitle: {
        flexGrow: 1,
        width: 200,
        alignItems: "center",
        textAlign: "left",
    },
    fillbar: {
        flexGrow: 1,
        width: 200,
    },
    total: {
        width: 250,
        flexGrow: 1,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        marginRight: 20,
    },
    icon: {
        height: 20,
        width: 20,
        marginLeft: 30,
        marginRight: 20,
    },
    action: {
        marginLeft: 20,
        width: 40,
        visibility: "hidden",
    },
});
