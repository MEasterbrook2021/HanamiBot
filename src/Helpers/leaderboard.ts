import { EmbedBuilder, Message } from "discord.js";
import { v2 } from "osu-api-extended";
import { response as BeatmapResponse } from "osu-api-extended/dist/types/v2_beatmap_id_details";
import { getBeatmap } from "../functions";
import { BeatmapInfo, commands, Locales } from "../Structure";
import { ExtendedClient } from "../Structure/index";
import { buildActionRow, buttonBoolsTops, downloadMap, firstButton, getBeatmapId_FromContext, getMap, getPerformanceDetails, getUsernameFromArgs, grades, insertData, Interactionhandler, lastButton, nextButton, previousButton, specifyButton } from "../utils";

const leaderboardExists = (beatmap: BeatmapResponse) => typeof beatmap.id === "number" || ["qualified", "ranked", "loved"].includes(beatmap.status?.toLowerCase());

export async function start({ interaction, client, args, type, locale }: { interaction: Message<boolean>; client: ExtendedClient; args: string[]; type: "global" | "country"; locale: Locales }) {
  const options = Interactionhandler(interaction, args);

  const userOptions = getUsernameFromArgs(options.author, options.userArgs, true);
  if (!userOptions) {
    return options.reply(locale.fails.error);
  }
  const page = parseInt((userOptions.flags.p as string) || (userOptions.flags.page as string)) - 1 || 0;

  const beatmapId = userOptions.beatmapId || (await getBeatmapId_FromContext(interaction, client));
  if (!beatmapId) {
    return options.reply(locale.fails.noLeaderboard);
  }
  const beatmap = await v2.beatmap.id.details(beatmapId);
  if (!leaderboardExists(beatmap)) {
    return options.reply(locale.fails.noBeatmapIdInCtx);
  }

  let file = getMap(beatmapId.toString())?.data;
  if (!file || !["ranked", "loved", "approved"].includes(beatmap.status)) {
    file = await downloadMap(beatmapId);
    insertData({ table: "maps", id: beatmapId.toString(), data: file });
  }

  const scores = (await fetch(
    `https://osu.ppy.sh/beatmaps/${beatmap.id}/scores?mode=${beatmap.mode}&type=${type}${
      userOptions?.mods?.codes
        ? userOptions.mods.codes
          .join("")
          .match(/.{1,2}/g)
          ?.map((mod: any) => `&mods[]=${mod}`)
          .join("")
        : ""
    }`,
    { headers: { Cookie: `osu_session=${process.env.OSU_SESSION}` } },
  ).then((res) => res.json())) as any;

  const scoresLength = scores.scores.length;
  const lengthCeil = Math.ceil(scoresLength / 5);
  if (scoresLength === 0) {
    return options.reply(locale.embeds.leaderboard.noScores);
  }

  if (page < 0 || page >= lengthCeil) {
    return options.reply(locale.fails.provideValidPage(lengthCeil));
  }

  const embedOptions = {
    map: await getBeatmap(beatmap, { mods: userOptions?.mods?.codes || [""] }, file, locale),
    plays: scores.scores,
    fetched: scores,
    page,
    file,
    length: scoresLength,
    locale,
    initializer: userOptions.user ? { user: interaction.author, score: scores.scores.find((score: any) => score.user.id === userOptions.user), index: scores.scores.findIndex((score: any) => score.user.id === userOptions.user) } : undefined,
  };
  const response = await options.reply({
    content: locale.embeds.leaderboard.type(type === "global" ? locale.embeds.leaderboard.global : locale.embeds.leaderboard.country),
    embeds: [await buildMapEmbed(embedOptions)],
    components: [buildActionRow([firstButton, previousButton, specifyButton, nextButton, lastButton], [page === 0, buttonBoolsTops("previous", embedOptions), false, buttonBoolsTops("next", embedOptions), page === lengthCeil - 1])],
  });
  client.sillyOptions[response.id] = { buttonHandler: "handleTopsButtons", type: commands.Top, embedOptions, response, pageBuilder: buildMapEmbed, initializer: options.author };
}

async function buildMapEmbed({ map, fetched, page, file, initializer, locale }: { map: BeatmapInfo; fetched: any; page: number; file: string; initializer: any | undefined; locale: Locales }) {
  const scores = fetched.scores;

  let description = [];
  const startPage = page! * 5;
  const endPage = startPage + 5;

  for (let i = startPage; i < endPage && i < scores.length; i++) {
    const score = scores[i];
    const stats = score.statistics;
    const mods = score.mods.length > 0 ? score.mods.map((mod: any) => mod.acronym) : [""];
    const hitValues = { count_300: stats.great || 0, count_100: stats.ok || 0, count_50: stats.meh || 0, count_miss: stats.miss || 0, count_geki: stats.perfect || 0, count_katu: stats.good || 0 };
    const performance = getPerformanceDetails({ mapText: file, maxCombo: score.max_combo, modsArg: mods, rulesetId: map.rulesetId, hitValues });

    const textRow1 = `**#${i + 1}** ${grades[score.rank]} **[${score.user.username}](https://osu.ppy.sh/users/${score.user.id}) \`${mods.join("") === "" ? "+NM" : `+${mods.join("")}`}\` __[${performance.maxPerf.difficulty.stars.toFixed(2)}★]__**\n`;
    const textRow2 = `>> **${performance.curPerf?.pp.toFixed(2)}**/${performance.maxPerf.pp.toFixed(2)}pp • (${(score.accuracy * 100).toFixed(2)}%) • ${score.total_score.toLocaleString()}\n`;
    const textRow3 = `>> [${score.max_combo}x/${map.maxCombo}x] { **${score.ruleset_id === 3 ? hitValues.count_geki + "/" : ""}${hitValues.count_300}**/${score.ruleset_id === 3 ? hitValues.count_katu + "/" : ""}${hitValues.count_100}/${score.ruleset_id === 1 ? "" : hitValues.count_50 + "/"}${hitValues.count_miss} } <t:${new Date(score.ended_at).getTime() / 1000}:R>`;
    description.push(textRow1 + textRow2 + textRow3);
  }

  let _userScore = "";
  if (initializer.score) {
    const score = initializer.score;
    const mods = score.mods.length > 0 ? score.mods.map((mod: any) => mod.acronym) : [""];
    const stats = score.statistics;
    const hitValues = { count_300: stats.great || 0, count_100: stats.ok || 0, count_50: stats.meh || 0, count_miss: stats.miss || 0, count_geki: stats.perfect || 0, count_katu: stats.good || 0 };
    const performance = getPerformanceDetails({ mapText: file, maxCombo: score.max_combo, modsArg: mods, rulesetId: map.rulesetId, hitValues });

    _userScore = `\n\n**__${locale.embeds.leaderboard.playScore(initializer.user.id)}__**\n**#${initializer.index + 1} [${score.user.username}](https://osu.ppy.sh/users/${score.user.id})**: ${score.total_score.toLocaleString()} [**${score.max_combo}x**/${map.maxCombo}x] **+${mods.join("")}**\n${grades[score.rank]} **${performance.curPerf?.pp.toFixed(2)}**/${performance.maxPerf.pp.toFixed(2)}pp (${
      (score.accuracy * 100).toFixed(2)
    }%) <t:${new Date(score.ended_at).getTime() / 1000}:R>`;
  }

  return new EmbedBuilder()
    .setTitle(`${map.artist} - ${map.title}`)
    .setURL(`https://osu.ppy.sh/b/${map.id}`)
    .setImage(map.background)
    .setDescription(description.join("\n") + _userScore)
    .setFooter({ text: `${locale.embeds.page(`${page + 1}/${Math.ceil(scores.length / 5)}`)} - ${locale.misc.poweredBy}` });
}
