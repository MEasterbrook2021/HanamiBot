import type { osuModes } from "../../Structure";

const modeAliases: Record<string, { mode: osuModes }> = {
    stats: { mode: "osu" },
    st: { mode: "osu" },
    statstaiko: { mode: "taiko" },
    stt: { mode: "taiko" },
    statsmania: { mode: "mania" },
    stm: { mode: "mania" },
    statscatch: { mode: "fruits" },
    stc: { mode: "fruits" }
};

export const name = "stats";
export const aliases = Object.keys(modeAliases);
export const cooldown = 3000;
export const description = "Get information of a map.\nMods can be specified through +_, +!_, -!_ syntax";

export async function run(): Promise<void> {
    // hii
}
