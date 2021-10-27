import styled from "@emotion/styled";
import { Box } from "@mui/system";
import { SECTION_MARGIN } from "../layout";

export * from "./bar";
export * from "./breakdown";
export * from "./data";

export const SummarySection = styled(Box)({
    display: "flex",

    "& > div:first-of-type": {
        flex: "300px 0 0",
        marginRight: SECTION_MARGIN,
    },

    "& > div:last-child": {
        flexGrow: 1,
    },
});
