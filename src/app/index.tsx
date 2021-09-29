import React from "react";
import { TopHatContextProvider } from "./context";
import { View } from "./view";

export const App: React.FC = () => (
    <TopHatContextProvider>
        <View />
    </TopHatContextProvider>
);
