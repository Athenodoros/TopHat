import { Camera } from "@mui/icons-material";
import { Link, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React from "react";
import { AppColours, WHITE } from "../../styles/colours";
import { SettingsDialogPage } from "./shared";

export const DialogAboutContents: React.FC = () => {
    return (
        <SettingsDialogPage title="About TopHat">
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Box
                    sx={{
                        background: AppColours.summary.main,
                        borderRadius: "50%",
                        width: 52,
                        height: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        margin: "60px 0 20px 0",
                    }}
                >
                    <Camera htmlColor={WHITE} sx={{ width: 30, height: 30, strokeWidth: 1 }} />
                </Box>
                <Box sx={{ maxWidth: 500, margin: "0 50px", textAlign: "center" }}>
                    <Typography variant="body2" sx={{ marginBottom: 20 }}>
                        TopHat is a Personal Finance application which runs in the browser.
                    </Typography>
                    <Typography variant="body2">
                        It lets you track balances and expenses across multiple currencies, while preserving your
                        privacy: your data is stored on your computer, and you manage any external connections. Learn
                        more{" "}
                        <Link
                            href="https://github.com/Athenodoros/TopHat/blob/main/README.md"
                            underline="hover"
                            target="_blank"
                        >
                            here
                        </Link>
                        .
                    </Typography>
                </Box>
            </Box>
        </SettingsDialogPage>
    );
};
