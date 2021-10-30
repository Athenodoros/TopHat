import { BrokenImage } from "@mui/icons-material";
import { Link } from "@mui/material";
import { Box } from "@mui/system";
import React from "react";
import { NonIdealState } from "../components/display/NonIdealState";

export class PageErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        // Log error
        console.log(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
                    <NonIdealState
                        intent="app"
                        icon={BrokenImage}
                        title="Something went wrong"
                        subtitle={
                            <Box sx={{ marginTop: 10, maxWidth: 400, textAlign: "center" }}>
                                TopHat has hit an error, and has ended up in a bad state. You could go back to the{" "}
                                <Link underline="hover" href={process.env.PUBLIC_URL}>
                                    home page
                                </Link>
                                , or check the developer tools for more information.
                            </Box>
                        }
                    />
                </Box>
            );
        }

        return this.props.children;
    }
}
