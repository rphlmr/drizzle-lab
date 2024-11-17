// Do not commit this file, it is replaced by the template db file
// This file is only used to type-check the preset

import * as schema from "./schema";
import { Database } from "../../core/db";

export const db = await Database(schema);
