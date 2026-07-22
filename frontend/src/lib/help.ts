import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";

export const HELP_CENTER_URL = "https://tour.5051001.xyz";
export const SPONSOR_URL = "https://tour.5051001.xyz/?f=f-1780668076938&file=l-1780668101316";

export function openHelpCenter() {
  BrowserOpenURL(HELP_CENTER_URL);
}

export function openSponsorPage() {
  BrowserOpenURL(SPONSOR_URL);
}
