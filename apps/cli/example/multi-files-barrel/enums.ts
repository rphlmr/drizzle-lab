import { pgEnum } from "drizzle-orm/pg-core";

export const postTypeEnum = pgEnum("post_type", ["mobile_app", "web_app"]);
