import React from "react";
import { View } from "./view";
import { Workspace } from "./workspace";
export * from "./layout";

export const App: React.FC = () => (
    <Workspace>
        <View />
    </Workspace>
);
