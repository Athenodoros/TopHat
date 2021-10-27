import styled from "@emotion/styled";
import { Typography } from "@mui/material";
import { Box } from "@mui/system";
import { NBSP } from "../../shared/constants";
import { IconType } from "../../shared/types";
import { AppColours, Greys, Intents, WHITE } from "../../styles/colours";

interface SummaryNumberProps {
    icon: IconType;
    primary: {
        value: string;
        positive: boolean | null;
    };
    secondary?: {
        value: string;
        positive: boolean | null;
    };
    subtext: string;
}
export const SummaryNumber: React.FC<SummaryNumberProps> = ({ icon: Icon, primary, secondary, subtext }) => (
    <SummaryNumberContainerBox>
        <Icon sx={IconSx} fontSize="small" />
        <div>
            <Typography
                variant="h6"
                style={{
                    color:
                        primary.positive === null
                            ? AppColours.summary.main
                            : Intents[primary.positive ? "success" : "danger"].main,
                    lineHeight: 1,
                }}
            >
                {primary.value}
            </Typography>
            <Box display="flex">
                {secondary ? (
                    <Typography
                        variant="caption"
                        style={{
                            color:
                                secondary.positive === null
                                    ? AppColours.summary.main
                                    : Intents[secondary.positive ? "success" : "danger"].main,
                            fontWeight: 500,
                        }}
                    >
                        {secondary.value + NBSP}
                    </Typography>
                ) : undefined}
                <Typography variant="caption" style={{ color: Greys[600] }}>
                    {subtext}
                </Typography>
            </Box>
        </div>
    </SummaryNumberContainerBox>
);

const SummaryNumberContainerBox = styled(Box)({
    display: "flex",
    width: 220,

    padding: "10px 0 20px 0",
    "&:last-child": {
        paddingBottom: 10,
    },
});
const IconSx = {
    backgroundColor: Greys[600],
    width: 38,
    height: 38,
    padding: 9,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: WHITE,
    borderRadius: "50%",
    marginRight: 12,
};
