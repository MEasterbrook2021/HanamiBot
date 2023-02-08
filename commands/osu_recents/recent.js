const {
  EmbedBuilder,
  ActionRowBuilder,
  SelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const axios = require('axios');

// importing osu functions
const { CompareEmbed } = require('../../exports/compare_export.js')
const { LbSend } = require('../../exports/leaderboard_export.js')

const fs = require("fs");
const { v2, auth, tools, mods } = require("osu-api-extended")
const { Beatmap, Calculator } = require('rosu-pp')
const { Downloader, DownloadEntry } = require("osu-downloader")

module.exports.run = async (client, message, args, prefix) => {
  await message.channel.sendTyping()

  fs.readFile("./user-data.json", async (error, data) => {
    if (error) {
      console.log(error);
    } else {
      const userData = JSON.parse(data);
      let userargs
      let value = 0
      let mode = "osu"
      let RuleSetId = undefined
      let PassDetermine = 1

      if (message.mentions.users.size > 0) {
        const mentionedUser = message.mentions.users.first();
        try {
          if (mentionedUser) {
            if (message.content.includes(`<@${mentionedUser.id}>`)) {
              userargs = userData[mentionedUser.id].osuUsername;
            } else {
              userargs = userData[message.author.id].osuUsername;
            }
          }
        } catch (err) {
          console.error(err);
          if (mentionedUser) {
            if (message.content.includes(`<@${mentionedUser.id}>`)) {
              try {
                userargs = userData[mentionedUser.id].osuUsername;
              } catch (err) {
                message.reply(`No osu! user found for ${mentionedUser.tag}`);
              }
            } else {
              try {
                userargs = userData[message.author.id].osuUsername;
              } catch (err) {
                message.reply(
                  `Set your osu! username by using "${prefix}osuset **your username**"`
                );
              }
            }
          }
          return;
        }
      } else {
        if (args[0] === undefined) {
          try {
            userargs = userData[message.author.id].osuUsername;
          } catch (err) {
            console.error(err);
            message.reply(
              `Set your osu! username by using "${prefix}osuset **your username**"`
            );
            return;
          }
        } else {
          let string = args.join(" ").match(/"(.*?)"/)
          if (string) {
            userargs = string[1]
          } else {
            userargs = args[0]
          }
          if (args.includes('-i')) {
            const iIndex = args.indexOf('-i');
            value = args[iIndex + 1] - 1
          } else {
            value = 0
          }

          if (args.includes("-mania")) {
            mode = "mania"
            RuleSetId = 3
          }
          if (args.includes("-taiko")) {
            mode = "taiko"
            RuleSetId = 1
          }
          if (args.includes("-ctb")) {
            mode = "fruits"
            RuleSetId = 2
          }
          if (args.includes('-pass')) {
            PassDetermine = 0
          }

          if (args.join(" ").startsWith("-mania") || args.join(" ").startsWith("-ctb") || args.join(" ").startsWith("-taiko") || args.join(" ").startsWith("-i") || args.join(" ").startsWith("-pass") || args.join(" ").startsWith("mods") || args.join(" ").startsWith("+")) {
            try {
              userargs = userData[message.author.id].osuUsername
            } catch (err) {
              message.reply(`Set your osu! username by using "${prefix}link **your username**"`);
            }
          }
        }
      }

      let argValues = {};
      for (const arg of args) {
        const [key, value] = arg.split("=");
        argValues[key] = value;
      }

      if (userargs.length === 0) {
        try {
          userargs = userData[message.author.id].osuUsername;
        } catch (err) {
          message.reply(`Set your osu! username by using "${prefix}link **your username**"`);
        }
      }
      //log in
      await auth.login(process.env.client_id, process.env.client_secret);
      const user = await v2.user.details(userargs, mode)
      if (user.id === undefined) {
        message.channel.send(`**The player, \`${userargs}\` does not exist**`)
        return;
      }

      const row = new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("<")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("next")
            .setLabel(">")
            .setStyle(ButtonStyle.Success),
        )

      const rowMenu = new ActionRowBuilder()
        .addComponents(
          new SelectMenuBuilder()
            .setCustomId('select')
            .setPlaceholder(`Extra options for the map`)
            .addOptions(
              {
                label: `Turkish Leaderboard`,
                description: `Displays the Turkish Leaderboard of the map.`,
                value: 'ctlb',
              },
              {
                label: `Global Leaderboard`,
                description: `Displays the Global Leaderboard of the map.`,
                value: 'lb',
              },
              {
                label: `Compare`,
                description: `Compare your score with the play.`,
                value: 'mine',
              }
            ),
        );

      const disabledrowMenu = new ActionRowBuilder()
        .addComponents(
          new SelectMenuBuilder()
            .setCustomId('select')
            .setPlaceholder(`Extra options for the map.`)
            .setDisabled()
            .addOptions(
              {
                label: `Turkish Leaderboard`,
                description: `Displays the Turkish Leaderboard of the map.`,
                value: 'ctlb',
              },
              {
                label: `Global Leaderboard`,
                description: `Displays the Global Leaderboard of the map.`,
                value: 'lb',
              },
              {
                label: `Compare`,
                description: `Compare your score with the play.`,
                value: 'mine',
              }
            ),
        );




      let sortmod = 0

      async function GetRecent(value, user, mode) {
        try {
          //score set
          let score = await v2.user.scores.category(user.id, "recent", {
            include_fails: PassDetermine,
            mode: mode,
            limit: "100",
            offset: "0",
          });

        
          if (args.join(" ").includes("+")) {
            const iIndex = args.indexOf("+")
            modsArg = (args[iIndex + 1].slice(1)).toUpperCase().match(/[A-Z]{2}/g)
            argValues['mods'] = modsArg.join("")
          }

          let filteredscore
          let FilterMods = ""
          sortmod = 0

          if (argValues["mods"] != undefined) {
            sortmod = 1
            filteredscore = score.filter(x => x.mods.join("").split("").sort().join("").toLowerCase() == argValues["mods"].split("").sort().join("").toLowerCase())
            score = filteredscore
            FilterMods = `**Filtering mod(s): ${score[value].mods.join("").toUpperCase()}**`
          }


          if (!fs.existsSync(`./osuFiles/${score[value].beatmap.id}.osu`)) {
            console.log("no file.")
            const downloader = new Downloader({
              rootPath: './osuFiles',

              filesPerSecond: 0,
            });

            downloader.addSingleEntry(score[value].beatmap.id)
            await downloader.downloadSingle()
          }

          let modsone = `**+${score[value].mods.join("")}**`
          let modsID = mods.id(score[value].mods.join(""))

          if (!score[value].mods.join("").length) {
            modsone = "";
            modsID = 0
          }

          let scoreParam = {
            mode: RuleSetId,
            mods: modsID,
          }

          let map = new Beatmap({ path: `./osuFiles/${score[value].beatmap.id}.osu` })
          let calc = new Calculator(scoreParam)

          const mapValues = calc.mapAttributes(map)


          // ss pp
          let maxAttrs = calc.performance(map)

          //normal pp
          let CurAttrs = calc
            .n100(score[value].statistics.count_100)
            .n300(score[value].statistics.count_300)
            .n50(score[value].statistics.count_50)
            .nMisses(Number(score[value].statistics.count_miss))
            .combo(score[value].max_combo)
            .nGeki(score[value].statistics.count_geki)
            .nKatu(score[value].statistics.count_katu)
            .performance(map)

          //fc pp
          let FCAttrs = calc
            .n100(score[value].statistics.count_100)
            .n300(score[value].statistics.count_300)
            .n50(score[value].statistics.count_50)
            .nMisses(0)
            .combo(maxAttrs.difficulty.maxCombo)
            .nGeki(score[value].statistics.count_geki)
            .nKatu(score[value].statistics.count_katu)
            .performance(map)

          // retry counter
          const retryMap = score.map(x => x.beatmap.id)
          retryMap.splice(0, value)

          const mapId = score[value].beatmap.id

          function getRetryCount(retryMap, mapId) {
            let retryCounter = 0
            for (let i = 0; i < retryMap.length; i++) {
              if (retryMap[i] === mapId) {
                retryCounter++
              }
            }
            return retryCounter;
          }

          const retryCounter = getRetryCount(retryMap, mapId)

          //formatted values for user
          try {
            global_rank = user.statistics.global_rank.toLocaleString();
            country_rank = user.statistics.country_rank.toLocaleString();
          } catch (err) {
            global_rank = 0
            country_rank = 0
          }
          let user_pp = user.statistics.pp.toLocaleString();

          //hits
          let three = score[value].statistics.count_300
          let one = score[value].statistics.count_100
          let fifty = score[value].statistics.count_50
          let miss = Number(score[value].statistics.count_miss);

          //formatted values for score
          let map_score = score[value].score.toLocaleString();
          let acc = `**(${Number(score[value].accuracy * 100).toFixed(2)}%)**`
          let beatmap_id = Number(score[value].beatmap.id);

          //calculating pass percentage
          let objects = score[value].beatmap.count_circles + score[value].beatmap.count_sliders + score[value].beatmap.count_spinners
          let objectshit = score[value].statistics.count_300 +
            score[value].statistics.count_100 +
            score[value].statistics.count_50 +
            score[value].statistics.count_miss;

          let fraction = objectshit / objects;
          let percentage_raw = Number((fraction * 100).toFixed(2));
          let percentagenum = percentage_raw.toFixed(1);
          let percentage = `**(${percentagenum}%)** `;
          if (percentagenum == "100.0" || score[value].passed == true) {
            percentage = " ";
          }

          //score set at   
          time1 = new Date(score[value].created_at).getTime() / 1000

          //grades
          const grades = {
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
          let grade = score[value].rank;
          grade = grades[grade];


          //set title
          let title = `${score[value].beatmapset.artist} - ${score[value].beatmapset.title} [${score[value].beatmap.version}] `;

          pps = `**${CurAttrs.pp.toFixed(2)}**/${maxAttrs.pp.toFixed(2)}PP`
          if (CurAttrs.effectiveMissCount > 0) {
            Map300CountFc = objects - score[value].statistics.count_100 - score[value].statistics.count_50

            const FcAcc = tools.accuracy({
              "300": Map300CountFc,
              "geki": score[value].statistics.count_geki,
              "100": score[value].statistics.count_100,
              "katu": score[value].statistics.count_katu,
              "50": score[value].statistics.count_50,
              "0": 0,
              mode: mode
            })

            pps = `**${CurAttrs.pp.toFixed(2)}**/${maxAttrs.pp.toFixed(2)}PP ▹ (**${FCAttrs.pp.toFixed(2)}**PP for **${FcAcc}%**)`
          }

          let Hit = score[value].beatmap.hit_length
          let Total = score[value].beatmap.total_length

          if (score[value].mods.join(" ").toLowerCase().includes("dt")) {
            Hit = (score[value].beatmap.hit_length / 1.5).toFixed()
            Total = (score[value].beatmap.total_length / 1.5).toFixed()
          }

          //length

          let minutesHit = Math.floor(Hit / 60).toFixed()
          let secondsHit = (Hit % 60).toString().padStart(2, "0")
          let minutesTotal = Math.floor(Total / 60).toFixed()
          let secondsTotal = (Total % 60).toString().padStart(2, "0")

          let scorerank = await v2.scores.details(score[value].best_id, 'osu')
          if (score[value].passed == true) {
            if (scorerank.rank_global != undefined) {
              sc_rank = ` 🌐 #${scorerank.rank_global}`
            } else {
              sc_rank = " "
            }

          } else if (score[value].passed == false) {
            sc_rank = " "
          }
          let status = score[value].beatmapset.status.charAt(0).toUpperCase() + score[value].beatmapset.status.slice(1)
          //score embed
          const embed = new EmbedBuilder()
            .setColor('Purple')
            .setAuthor({
              name: `${user.username} ${user_pp}pp (#${global_rank} ${user.country_code}#${country_rank}) `,
              iconURL: `https://osuflags.omkserver.nl/${user.country_code}-256.png`,
              url: `https://osu.ppy.sh/u/${user.id}`,
            })
            .setTitle(title)
            .setURL(`https://osu.ppy.sh/b/${beatmap_id}`)
            .setDescription(`${grade} ${percentage}${modsone} • **__[${maxAttrs.difficulty.stars.toFixed(2)}★]__** \n▹${pps} \n▹${map_score} • ${acc} ${sc_rank}\n▹[ **${score[value].max_combo}**x/${maxAttrs.difficulty.maxCombo}x ] • { **${three}**/${one}/${fifty}/${miss} } \n▹Score Set <t:${time1}:R> • **Try #${retryCounter}**`)
            .setFields({ name: `**Beatmap info:**`, value: `BPM: \`${mapValues.bpm.toFixed()}\` Objects: \`${objects.toLocaleString()}\` Length: \`${minutesTotal}:${secondsTotal}\` (\`${minutesHit}:${secondsHit}\`)\nAR: \`${mapValues.ar.toFixed(1).toString().replace(/\.0+$/, "")}\` OD: \`${mapValues.od.toFixed(1).toString().replace(/\.0+$/, "")}\` CS: \`${mapValues.cs.toFixed(1).toString().replace(/\.0+$/, "")}\` HP: \`${mapValues.hp.toFixed(2).toString().replace(/\.0+$/, "")}\`` })
            .setImage(`https://assets.ppy.sh/beatmaps/${score[value].beatmapset.id}/covers/cover.jpg`)
            .setThumbnail(user.avatar_url)
            .setFooter({ text: `${status} map by ${score[value].beatmapset.creator}`, iconURL: `https://a.ppy.sh/${score[value].beatmapset.user_id}?1668890819.jpeg` })

          return { embed, FilterMods }
        } catch (err) {
          console.error(err);
          if (sortmod == 1) {
            message.channel.send(`**No recent plays with the mod combination for \`${user.username}\`**`)
            return;
          }
          message.channel.send(`**No recent plays for \`${user.username}\`**`);
        }
      }

      const Recent = await GetRecent(value, user, mode)

      message.channel.send({ content: Recent.FilterMods, embeds: [Recent.embed.data], components: [row, rowMenu] });


      const collector = message.channel.createMessageComponentCollector()


      try {
        collector.on("collect", async (i) => {
          try {


            if (i.customId == "previous") {
              value--
              const user = await v2.user.details(i.message.embeds[0].author.url.match(/\d+/)[0], mode)
              console.log(i.message.embeds[0].author.url.match(/\d+/)[0])
              
              console.log(user.id)
              const Recent = await GetRecent(value, user, mode)

              await i.update({ embeds: [Recent.embed.data], components: [row, disabledrowMenu] })
              return;
            }

            if (i.customId == "next") {
              value++

              const user = await v2.user.details(i.message.embeds[0].author.url.match(/\d+/)[0], mode)

              const Recent = await GetRecent(value, user, mode)

              await i.update({ embeds: [Recent.embed.data], components: [row, disabledrowMenu] })
              return;
            }


            await i.update({ embeds: [i.message.embeds[0]], components: [row, disabledrowMenu] })

            const userargs = userData[i.user.id].osuUsername

            if (userargs == undefined) {
              message.channel.send(`<@${i.user.id}> Please set your osu! username by typing **${prefix} "your username"**`);
              return;
            }
            const ModeString = "osu"
            if (i.values == "mine") {

              const user = await v2.user.details(userargs, ModeString)
              const beatmapId = i.message.embeds[0].url.match(/\d+/)[0]
              const mapinfo = await v2.beatmap.diff(beatmapId)


              const compareEmbed = await CompareEmbed(mapinfo, beatmapId, user, ModeString)
              message.channel.send({ embeds: [compareEmbed.embed.data], components: [rowMenu] })
              return;
            }

            if (i.values == "lb") {
              const beatmapId = i.message.embeds[0].url.match(/\d+/)[0]
              const response = await axios.get(`https://osu.ppy.sh/beatmaps/${beatmapId}/scores?mode=${ModeString}&type=global`, { headers: { Cookie: `osu_session=${process.env.OSU_SESSION}` } })
              const scores = response.data
              if (scores.length == 0) {
                message.reply("**No plays were found.**")
                return;
              }

              const LB = await LbSend(beatmapId, scores)
              message.channel.send({ content: "**Leaderboard**", embeds: [LB.embed.data], components: [rowMenu] })
            }

            if (i.values == "ctlb") {
              const beatmapId = i.message.embeds[0].url.match(/\d+/)[0]
              const response = await axios.get(`https://osu.ppy.sh/beatmaps/${beatmapId}/scores?mode=${ModeString}&type=country`, { headers: { Cookie: `osu_session=${process.env.OSU_SESSION}` } })
              const scores = response.data
              if (scores.length == 0) {
                message.reply("**No plays were found.**")
                return;
              }

              const LB = await LbSend(beatmapId, scores)
              message.channel.send({ content: "**TR Leaderboard**", embeds: [LB.embed.data], components: [rowMenu] })
            }

          } catch (err) {
            console.log(err)
          }
        })
      } catch (err) { }



    }
  });

};
exports.name = ["recent"];
exports.aliases = ["recent", "r", "rs"]
exports.description = ["Displays user's recent osu!standard play\n\n**Parameters:**\n\`username\` get the recent play of a user (must be first parameter) \n\`-i (int)\` get a specific play (1-100)\n\`-pass\` get the latest passed play (no parameters)\n\`mods=(string)\` get the latest play by mods"]
exports.usage = [`recent YoruNoKen\nrs Whitecat -i 4\nrs -pass -i 3\nrecent mods=dt -pass`]
exports.category = ["osu"]
