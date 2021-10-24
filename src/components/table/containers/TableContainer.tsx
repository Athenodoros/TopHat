import React from "react";
import { Section, SectionProps } from "../../layout";

type TableContainerProps = Pick<SectionProps, "title" | "headers">;
export const TableContainer: React.FC<TableContainerProps> = (props) => <Section {...props} emptyBody={true} />;
