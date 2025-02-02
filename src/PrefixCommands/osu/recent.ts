import { Message } from "discord.js";
import { start } from "../../Helpers/plays";
import { Locales, osuModes } from "../../Structure";
import { ExtendedClient } from "../../Structure/index";
import { returnFlags } from "../../utils";

const modeAliases: { [key: string]: { mode: osuModes; passOnly: boolean } } = {
  r: { mode: "osu", passOnly: false },
  rs: { mode: "osu", passOnly: false },
  rt: { mode: "taiko", passOnly: false },
  rm: { mode: "mania", passOnly: false },
  rc: { mode: "fruits", passOnly: false },
  recent: { mode: "osu", passOnly: false },
  recenttaiko: { mode: "taiko", passOnly: false },
  recentmania: { mode: "mania", passOnly: false },
  recentcatch: { mode: "fruits", passOnly: false },
};

export const name = "recent";
export const aliases = Object.keys(modeAliases);
export const cooldown = 3000;
export const description = `Get the recent play of an osu! player.\nMods can be specified through +_, +!_, -!_ syntax`;
export const flags = returnFlags({ index: true });

export async function run({ message, args, commandName, index, client, locale }: { message: Message; args: string[]; commandName: string; index: number; client: ExtendedClient; locale: Locales }) {
  await message.channel.sendTyping();

  const alias = modeAliases[commandName.toLowerCase()];
  const modeOptions = alias.mode || undefined;
  const passOnly = alias.passOnly || false;
  const isTops = false;

  await start({ isTops, interaction: message, passOnly, args, mode: modeOptions, number: index - 1, client, locale });
}
