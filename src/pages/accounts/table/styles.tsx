import styled from "@emotion/styled";
import { Box } from "@mui/system";

export const ACCOUNT_TABLE_LEFT_PADDING = 19;

export const AccountsTableIconSx = {
    height: 40,
    flex: "0 0 40px",
    margin: "30px 17px 30px 27px",
    borderRadius: "5px",
};
export const AccountsTableInstitutionBox = styled(Box)({
    flex: "3 0 100px",
    display: "flex",
    flexDirection: "column",
    height: 100,
    justifyContent: "center",
    alignItems: "flex-start",
    minWidth: 0,
});
export const AccountsTableAccountsBox = styled(Box)({
    flex: "1 1 850px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    margin: 16,
});
