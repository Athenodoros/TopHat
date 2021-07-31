import { alpha, makeStyles } from "@material-ui/core";
import { Intents } from "./colours";

export const useButtonStyles = makeStyles((theme) => {
    // These roughly copied from the material UI source.
    const base = (colour: string) => ({
        color: colour,
        "&:hover": { backgroundColor: alpha(colour, theme.palette.action.hoverOpacity) },
    });
    const outlined = (colour: string) => ({
        color: colour,
        border: `1px solid ${alpha(colour, 0.5)}`,
        "&:hover": {
            border: `1px solid ${colour}`,
            backgroundColor: alpha(colour, theme.palette.action.hoverOpacity),
        },
    });

    return {
        primary: base(Intents.primary.main),
        warning: base(Intents.warning.main),
        danger: base(Intents.danger.main),
        primaryOutlined: outlined(Intents.primary.main),
        warningOutlined: outlined(Intents.warning.main),
        dangerOutlined: outlined(Intents.danger.main),
    };
});
