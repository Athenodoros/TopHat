import makeStyles from '@mui/styles/makeStyles';

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
        marginRight: 15,
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
});
