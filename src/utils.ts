import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, InteractionType, Message, TextBasedChannel, User as UserDiscord } from "discord.js";
import { mods } from "osu-api-extended";
import { response as UserResponse } from "osu-api-extended/dist/types/v2_user_details";
// @ts-expect-error
import { DownloadEntry, Downloader, DownloadResult } from "osu-downloader";
import { Beatmap, Calculator } from "rosu-pp";
import { db } from "./Events/ready";
import { noChokePlayDetails, osuModes } from "./Structure";

export const grades: { [key: string]: string } = {
  A: "<:A_:1057763284327080036>",
  B: "<:B_:1057763286097076405>",
  C: "<:C_:1057763287565086790>",
  D: "<:D_:1057763289121173554>",
  F: "<:F_:1057763290484318360>",
  S: "<:S_:1057763291998474283>",
  SH: "<:SH_:1057763293491642568>",
  X: "<:X_:1057763294707974215>",
  XH: "<:XH_:1057763296717045891>",
};

export const osuEmojis: { [key: string]: string } = {
  osu: "<:osu:1075928459014066286>",
  mania: "<:mania:1075928451602718771>",
  taiko: "<:taiko:1075928454651969606>",
  fruits: "<:ctb:1075928456367444018>",
};

export const rulesets: { [key: string]: number } = {
  osu: 0,
  taiko: 1,
  fruits: 2,
  mania: 3,
};

export const buildActionRow = (buttons: ButtonBuilder[], disabledStates: boolean[] = []) => {
  const actionRow = new ActionRowBuilder();
  buttons.forEach((button, index) => {
    const isButtonDisabled = disabledStates[index] === true;
    actionRow.addComponents(isButtonDisabled ? button.setDisabled(true) : button.setDisabled(false));
  });
  return actionRow;
};

export function getRetryCount(retryMap: number[], mapId: number) {
  let retryCounter = 0;
  for (let i = 0; i < retryMap.length; i++) {
    if (retryMap[i] === mapId) {
      retryCounter++;
    }
  }
  return retryCounter;
}

export const returnFlags = ({ page, index, mods }: { page?: boolean; index?: boolean; mods?: boolean }) => `${page ? "- page(p)=number (returns the page corresponding to `number`)\n" : ""}${index ? "- index(i)=number (returns the index corresponding to `number`)" : ""}${mods ? "- +MODS (returns play(s) with provided mod combination)\n" : ""}`;
export const formatNumber = (value: number, decimalPlaces: number) => value.toFixed(decimalPlaces).replace(/\.0+$/, "");
export const errMsg = (message: string) => ({ status: false, message });
export const getUserData = (userId: string) => getUser(userId) || errMsg(`The Discord user <@${userId}> hasn't linked their account to the bot yet!`);
export const buttonBoolsTops = (type: string, options: any) => (type === "previous" ? options.page * 5 === 0 : options.page * 5 + 5 === (options.plays?.length || options.length));
export const buttonBoolsIndex = (type: string, options: any) => (type === "previous" ? options.index === 0 : options.index + 1 === options.plays.length);

const flags = ["i", "index", "rev", "p", "page"];
export const argParser = (str: string, flags: string[]) => [...str.matchAll(/-(\w+)|(\w+)=(\S+)/g)].filter((m) => flags.includes(m[1]) || flags.includes(m[2])).reduce((acc, m) => ((acc[m[1] || m[2]] = m[3] !== undefined ? m[3] : true), acc), {} as Record<string, string | boolean>);
function modsParser(str: string) {
  const modCodes = (str.match(/[\-+!][\-+!]?[A-Za-z]+/g) || []).map((code) => code.toUpperCase());

  const force = modCodes.some((code) => code.includes("!"));
  return modCodes.some((code) => code.includes("-")) && !force
    ? undefined
    : {
      force: force,
      include: modCodes.some((code) => code.includes("+")) ? true : false,
      remove: modCodes.some((code) => code.includes("-")) && force ? true : false,
      codes: modCodes
        .map((code) => code.replace(/[+\-!]/g, ""))
        .join("")
        .match(/.{1,2}/g),
      whole: modCodes.join(""),
    };
}

export const loadingButtons = buildActionRow([new ButtonBuilder().setCustomId("wating").setLabel("Waiting..").setStyle(ButtonStyle.Secondary)], [true]);
export const showMoreButton = buildActionRow([new ButtonBuilder().setCustomId("more").setLabel("Show More").setStyle(ButtonStyle.Success)]);
export const showLessButton = buildActionRow([new ButtonBuilder().setCustomId("less").setLabel("Show Less").setStyle(ButtonStyle.Success)]);

export const firstButton = new ButtonBuilder().setCustomId("first").setEmoji("1177027029154156615").setStyle(ButtonStyle.Secondary);
export const lastButton = new ButtonBuilder().setCustomId("last").setEmoji("1177027026947948584").setStyle(ButtonStyle.Secondary);
export const previousButton = new ButtonBuilder().setCustomId("previous").setEmoji("1177027021646331995").setStyle(ButtonStyle.Secondary);
export const nextButton = new ButtonBuilder().setCustomId("next").setEmoji("1177027023030456420").setStyle(ButtonStyle.Secondary);
export const specifyButton = new ButtonBuilder().setCustomId("indexbtn").setEmoji("1177027025672871936").setStyle(ButtonStyle.Secondary);

export const getWholeDb = (dbName: string) => db.prepare(`SELECT * FROM ${dbName}`).all();

export const getCommand = (id: string | number): any => db.prepare("SELECT * FROM commands WHERE name = ?").get(id);
export const getUser = (id: string | number): any => db.prepare("SELECT * FROM users WHERE id = ?").get(id);
export const getServer = (id: string | number): any => db.prepare("SELECT * FROM servers WHERE id = ?").get(id);
export const getServersInBulk = (ids: string[] | number[]): any => {
  const placeholders = ids.map(() => "?").join(", ");
  const query = `SELECT * FROM servers WHERE id IN (${placeholders})`;
  return db.prepare(query).all(...ids);
};
export const getMap = (id: string | number): any => db.prepare(`SELECT * FROM maps WHERE id = ?`).get(id);
export const getMapsInBulk = (ids: string[] | number[]): any => {
  const placeholders = ids.map(() => "?").join(", ");
  const query = `SELECT * FROM maps WHERE id IN (${placeholders})`;
  return db.prepare(query).all(...ids);
};

export const insertData = ({ table, id, data }: { table: string; id: string | number; data: string | number }): void => db.prepare(`INSERT OR REPLACE INTO ${table} values (?, ?)`).run(id, data);
export const insertDataBulk = ({ table, object }: { table: string; object: { id: number; data: string }[] }): void => {
  const insertStatement = db.prepare(`INSERT OR REPLACE INTO ${table} values (?, ?)`);

  const transaction = db.transaction(() => {
    for (const { id, data } of object) {
      insertStatement.run(id, data);
    }
  });

  transaction();
};

export function calculateMissingPp(start: number, goal: number, pps: number[]): [number, number] {
  let top = start;
  let bot = 0.0;
  const ppArray = pps;

  function calculateRemaining(idx: number, goal: number, top: number, bot: number): [number, number] {
    const factor = Math.pow(0.95, idx);
    const required = (goal - top - bot) / factor;

    return [required, idx];
  }

  for (let i = ppArray.length - 1; i > 0; i--) {
    const factor = Math.pow(0.95, i);
    const term = factor * ppArray[i];
    const botTerm = term * 0.95;

    if (top + bot + botTerm >= goal) {
      return calculateRemaining(i + 1, goal, top, bot);
    }

    bot += botTerm;
    top -= term;
  }

  return calculateRemaining(0, goal, top, bot);
}

export function approxMorePp(pps: number[]): void {
  if (pps.length !== 100) {
    return;
  }

  let diff = (pps[89] - pps[99]) / 10.0;

  let curr = pps[99];

  for (let i = 0; i < 50; i++) {
    let next = curr - diff;

    if (next < 0) break;

    pps.push(next);
    curr = next;
  }
}

export function calculateWeightedScores({ user, plays }: { user: UserResponse; plays: noChokePlayDetails[] }) {
  const oldPlaysPp = plays.map((play, index) => Number(play.playInfo.play.pp) * Math.pow(0.95, index)).reduce((a, b) => a + b);
  const newPlaysPp = plays.map((play, index) => play.fcPerf.pp * Math.pow(0.95, index)).reduce((a, b) => a + b);
  return newPlaysPp + (user.statistics.pp - oldPlaysPp);
}

export function getUsernameFromArgs(user: UserDiscord, args?: string[], userNotNeeded?: boolean) {
  args = args || [];
  let argsJoined = args.join(" ");

  const flagsParsed = argParser(argsJoined, flags);

  const mapRegex = /https:\/\/osu\.ppy\.sh\/(b|beatmaps|beatmapsets)\/\d+(#(osu|mania|fruits|taiko)\/\d+)?/;
  const mapRegexResult = argsJoined.match(mapRegex);
  const beatmapId = mapRegexResult ? mapRegexResult[0].match(/\d+$/)![0] : null;
  argsJoined = argsJoined.replace(new RegExp(mapRegex, "i"), "");
  const mods = modsParser(argsJoined);

  argsJoined = mods ? argsJoined.toLowerCase().replace(mods.whole.toLowerCase(), "") : argsJoined;

  let argumentString = args.length > 0 ? argsJoined.replace(/(?:\s|^)(?=\s|$)|(-\w+|\w+=\S+|https:\/\/osu\.ppy\.sh\/(b|beatmaps|beatmapsets)\/\d+(#(osu|mania|fruits|taiko)\/\d+)?)?(?=\s|$)/g, "") : "";

  if (!argumentString) {
    const userData = getUserData(user.id).data;

    if (userNotNeeded) {
      let _user = undefined;
      try {
        const parsedData = JSON.parse(userData);
        _user = parsedData.banchoId || errMsg(`The Discord user <@${user.id}> hasn't linked their account to the bot yet!`);
      } catch (_) {}

      return { user: _user, flags: flagsParsed, beatmapId, mods };
    }
    return { user: userData ? JSON.parse(userData).banchoId : errMsg(`The Discord user <@${user.id}> hasn't linked their account to the bot yet!`), flags: flagsParsed, beatmapId, mods };
  }

  const discordUserRegex = /\d{17,18}/;
  const discordUserMatch = argumentString.match(discordUserRegex);
  const userId = discordUserMatch ? discordUserMatch[0] : undefined;

  const userData = getUserData(userId!).data;
  if (userId) {
    if (userNotNeeded) {
      let _user = undefined;
      try {
        const parsedData = JSON.parse(userData);
        _user = parsedData.banchoId || errMsg(`The Discord user <@${userId}> hasn't linked their account to the bot yet!`);
      } catch (_) {}

      return { user: _user, flags: flagsParsed, beatmapId, mods };
    }
    return { user: userData ? JSON.parse(userData)?.banchoId : errMsg(`The Discord user <@${userId}> hasn't linked their account to the bot yet!`), flags: flagsParsed, beatmapId, mods };
  }

  const osuUsernameRegex = /"(.*?)"/;
  const osuUsernameMatch = argumentString.match(osuUsernameRegex);
  const osuUsername = osuUsernameMatch ? osuUsernameMatch[1] : argumentString || undefined;

  return osuUsername ? { user: osuUsername, flags: flagsParsed, beatmapId, mods } : undefined;
}

export function getPerformanceDetails({ modsArg, maxCombo, rulesetId, hitValues, mapText, accuracy }: { modsArg: string[]; maxCombo?: number; rulesetId: number; hitValues?: any; mapText: string; accuracy?: number }) {
  let { count_100 = 0, count_300 = 0, count_50 = 0, count_geki = 0, count_katu = 0, count_miss = 0 } = hitValues;
  count_geki = [2, 3].includes(rulesetId) ? count_geki : 0;
  count_katu = [2, 3].includes(rulesetId) ? count_katu : 0;

  let scoreParam = {
    mode: rulesetId,
    mods: modsArg.length > 0 ? mods.id(modsArg.join("")) : 0,
  };
  const map = new Beatmap({ content: mapText });
  const calculator = new Calculator(scoreParam);

  const mapValues = calculator.mapAttributes(map);
  const maxPerf = calculator.performance(map);
  const curPerf = accuracy
    ? undefined
    : calculator
      .n300(count_300)
      .n100(count_100)
      .n50(count_50)
      .nMisses(count_miss)
      .combo(maxCombo ?? maxPerf.difficulty.maxCombo)
      .nGeki(count_geki)
      .nKatu(count_katu)
      .performance(map);
  const fcPerf = accuracy ? calculator.acc(accuracy).performance(map) : calculator.n300(count_300).n100(count_100).n50(count_50).nMisses(0).combo(maxPerf.difficulty.maxCombo).nGeki(count_geki).nKatu(count_katu).performance(map);

  return { mapValues, maxPerf, curPerf, fcPerf, mapId: 0, playInfo: {} as any };
}

export async function downloadMap(beatmapId: number | number[]) {
  // const responseDirect = await fetch(`https://api.osu.direct/osu/${beatmapId}`);
  // if (responseDirect.status !== 404) {
  //   return new TextDecoder().decode(await responseDirect.arrayBuffer());
  // }

  let downloader = new Downloader({
    rootPath: "./cache",
    filesPerSecond: 0,
    synchronous: true,
  });

  const isIdArray = Array.isArray(beatmapId);
  if (isIdArray) {
    downloader.addMultipleEntries(beatmapId.map((id) => new DownloadEntry({ id, save: false })));
  } else {
    downloader.addSingleEntry(
      new DownloadEntry({
        id: beatmapId,
        save: false,
      }),
    );
  }

  const downloaderResponse = isIdArray ? await downloader.downloadAll() : await downloader.downloadSingle();
  if (!isIdArray ? downloaderResponse.status == -3 : downloaderResponse.some((item: any) => item.status == -3)) {
    throw new Error("ERROR CODE 409, ABORTING TASK");
  }
  return !isIdArray ? downloaderResponse.buffer.toString() : downloaderResponse.map((response: any) => ({ id: response.id, contents: response.buffer.toString() }));
}

const findId = (embed: any) => {
  const urlToCheck = embed.url || (embed.author && embed.author.url);
  return urlToCheck && !/\/(user|u)/.test(urlToCheck) ? urlToCheck.match(/\d+/)?.[0] : null;
};

const getEmbedFromReply = async (message: Message, client: Client) => {
  const channel = client.channels.cache.get(message.channelId) as TextBasedChannel;
  if (!channel) {
    return null;
  }
  const referencedMessage = await channel.messages.fetch(message.reference?.messageId!);
  const embed = referencedMessage?.embeds?.[0];
  return findId(embed);
};

async function cycleThroughEmbeds(message: Message, client: Client) {
  const channel = client.channels.cache.get(message.channelId) as TextBasedChannel;
  const messages = await channel.messages.fetch({ limit: 100 });

  let beatmapId;
  for (const [_id, message] of messages) {
    if (!(message.embeds.length > 0 && message.author.bot)) {
      continue;
    }
    beatmapId = await findId(message.embeds[0]);
    if (beatmapId) {
      break;
    }
  }
  return beatmapId;
}
export const getBeatmapId_FromContext = async (message: Message, client: Client) => (message.reference ? await getEmbedFromReply(message, client) : cycleThroughEmbeds(message, client));

export function Interactionhandler(interaction: Message | ChatInputCommandInteraction, args?: string[]) {
  const isSlash = interaction.type === InteractionType.ApplicationCommand;

  const reply = (options: any) => (isSlash ? interaction.editReply(options) : interaction.channel.send(options));
  const userArgs = isSlash ? [interaction.options.getString("user") || ""] : args || [""];
  const ppCount = isSlash ? interaction.options.getNumber("count") || 1 : 1;
  const ppValue = isSlash ? interaction.options.getNumber("pp") || 1 : 1;
  const rankValue = isSlash ? interaction.options.getNumber("rank") || 1 : 1;
  const commandName = isSlash ? [interaction.options.getString("command") || ""] : args || [""];
  const author = isSlash ? interaction.user : interaction.author;
  const mode = isSlash ? (interaction.options.getString("mode") as osuModes) || "osu" : "osu";
  const passOnly = isSlash ? interaction.options.getBoolean("passonly") || false : false;
  const index = isSlash ? (interaction.options.getInteger("index") ? interaction.options.getInteger("index")! - 1 : 0) : 0;
  const subcommand = isSlash ? interaction.options?.getSubcommand(false) || undefined : undefined;
  const prefix = isSlash ? interaction.options.getString("prefix") : undefined;
  const { guildId } = interaction;

  return { reply, userArgs, author, mode, passOnly, index, commandName, subcommand, guildId, prefix, ppValue, ppCount, rankValue };
}
