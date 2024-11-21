import { closeDrizzleStudioPanel } from "../panel";
import { stopStudio } from "../server";

export const StopStudioCommand = "drizzle.studio:stop";

export function StopStudio() {
  stopStudio();
  closeDrizzleStudioPanel();
}
