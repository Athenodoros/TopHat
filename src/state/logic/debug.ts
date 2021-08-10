import axios from "axios";
import chroma from "chroma-js";
import _ from "lodash-es";
import { DateTime } from "luxon";
import numeral from "numeral";
import Papa from "papaparse";
import { TopHatStore } from "..";
import { AppSlice } from "../app";
import { DataSlice } from "../data";
import { DemoStatementFiles } from "../data/demo";
import * as Statement from "./statement";
import { addStatementFilesToDialog } from "./statement";
import * as Parsing from "./statement/parsing";

export const debug = () => {
    (window as any).Papa = Papa;
    (window as any).DateTime = DateTime;
    (window as any).numeral = numeral;
    (window as any)._ = _;
    (window as any).chroma = chroma;
    (window as any).store = TopHatStore;
    (window as any).axios = axios;
    (window as any).AppSlice = AppSlice;
    (window as any).DataSlice = DataSlice;
    (window as any).Statement = { ...Statement, ...Parsing };

    // Current working page
    addStatementFilesToDialog(
        DemoStatementFiles.map((file) => ({ id: file.id + "", contents: file.contents, name: file.name }))
    );

    console.log("Setting up debug variables...");
};
