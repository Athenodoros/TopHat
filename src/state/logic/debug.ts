import axios from "axios";
import chroma from "chroma-js";
import _ from "lodash-es";
import { DateTime } from "luxon";
import numeral from "numeral";
import Papa from "papaparse";
import { TopHatStore } from "..";
import { AppSlice } from "../app";
import { DataSlice } from "../data";

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

    console.log("Setting up debug variables...");
};
