import { styled, Typography } from "@mui/material";
import { TopHatDispatch } from "../..";
import { Intents } from "../../../styles/colours";
import { DataSlice } from "../../data";
import { User } from "../../data/types";

export const DefaultDismissNotificationThunk = (id: string) => () =>
    TopHatDispatch(DataSlice.actions.deleteNotification(id));

export const GreenNotificationText = styled("strong")({ color: Intents.success.main });
export const OrangeNotificationText = styled("strong")({ color: Intents.warning.main });
export const NotificationContents: React.FC = ({ children }) => (
    <Typography variant="body2" component="span">
        {children}
    </Typography>
);

export const updateNotificationState = (user: Partial<User>, id: string, contents?: string | null) =>
    TopHatDispatch(DataSlice.actions.updateNotificationState({ user, id, contents }));
