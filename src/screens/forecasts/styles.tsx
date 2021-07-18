import { makeStyles } from "@material-ui/core";

export const useForecastsPageStyles = makeStyles({
    inputs: {
        flex: "1 0 300px",
    },
    inputTitle: {
        display: "flex",
    },
    inputGroup: {
        marginTop: 15,
    },
    inputValue: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    outputs: {
        flex: "4 1 400px",
    },
});
