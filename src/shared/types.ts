import { SvgIconTypeMap } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";

export type IconType = OverridableComponent<SvgIconTypeMap<{}, "svg">>;
export type FCWithChildren<P = {}> = React.FC<React.PropsWithChildren<P>>;
