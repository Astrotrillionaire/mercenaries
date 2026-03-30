import { useQuery } from "@tanstack/react-query";
import { fetchGraphQL } from "../lib/graphql";
import { WORLD_PACKAGE_ID, BOUNTY_PACKAGE_ID } from "../config";
import type { PlayerCharacter } from "./usePlayerCharacter";
import type { Bounty } from "../types";

const PAGE_QUERY = `
  query GetObjects($type: String!, $after: String) {
    objects(filter: { type: $type }, first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        address
        asMoveObject {
          contents { json }
        }
      }
    }
  }
`;

export interface ClaimableBounty extends Bounty {
    killmailId: string;
    killTimestamp: number;
    killerCharId: string;
    victimCharId: string;
    victimName: string;
    coinType: string;
}

async function fetchAllPages(type: string): Promise<any[]> {
    const results: any[] = [];
    let cursor: string | null = null;
    while (true) {
        const result: any = await fetchGraphQL(PAGE_QUERY, { type, after: cursor });
        const nodes = result?.data?.objects?.nodes ?? [];
        results.push(...nodes);
        const pageInfo = result?.data?.objects?.pageInfo;
        if (!pageInfo?.hasNextPage) break;
        cursor = pageInfo.endCursor;
    }
    return results;
}

async function fetchClaimableBounties(character: PlayerCharacter): Promise<ClaimableBounty[]> {
    const killmailType = `${WORLD_PACKAGE_ID}::killmail::Killmail`;
    const characterType = `${WORLD_PACKAGE_ID}::character::Character`;

    const [killmailNodes, characterNodes] = await Promise.all([
        fetchAllPages(killmailType),
        fetchAllPages(characterType),
    ]);

    const victimCharByKey = new Map<string, { id: string; address: string; name: string }>();
    for (const n of characterNodes) {
        const json = n.asMoveObject?.contents?.json;
        if (!json) continue;
        const keyStr = `${json.key?.item_id}:${json.key?.tenant}`;
        victimCharByKey.set(keyStr, {
            id: n.address,
            address: json.character_address,
            name: json.metadata?.name ?? json.metadata?.fields?.name ?? "UNKNOWN",
        });
    }

    // collect all kills on each victim (any killer), and all my kills
    const killsByVictim = new Map<string, { timestampMs: number; killerKeyStr: string; killmailId: string }[]>();
    for (const n of killmailNodes) {
        const kill = n.asMoveObject?.contents?.json;
        if (!kill) continue;
        const victimKeyStr = `${kill.victim_id?.item_id}:${kill.victim_id?.tenant}`;
        const killerKeyStr = `${kill.killer_id?.item_id}:${kill.killer_id?.tenant}`;
        const timestampMs = Number(kill.kill_timestamp) * 1000;
        if (!killsByVictim.has(victimKeyStr)) killsByVictim.set(victimKeyStr, []);
        killsByVictim.get(victimKeyStr)!.push({ timestampMs, killerKeyStr, killmailId: n.address });
    }

    const myKeyStr = `${character.key?.item_id}:${character.key?.tenant}`;

    // for each victim address, find bounties, then check if we are the first killer after each bounty
    const claimable: ClaimableBounty[] = [];

    for (const [victimKeyStr, kills] of killsByVictim) {
        const victimChar = victimCharByKey.get(victimKeyStr);
        if (!victimChar) continue;

        // fetch bounties for this victim
        // we use a broad type prefix since bounty is now generic Bounty<T>
        const bountyType = `${BOUNTY_PACKAGE_ID}::bounty_system::Bounty`;
        const bountyNodes = await fetchAllPages(bountyType);

        const victimBounties = bountyNodes.filter(n => {
            const json = n.asMoveObject?.contents?.json;
            return json?.tar?.toLowerCase() === victimChar.address?.toLowerCase();
        });

        if (!victimBounties.length) continue;

        // sort kills by timestamp ascending
        const sortedKills = [...kills].sort((a, b) => a.timestampMs - b.timestampMs);

        for (const bountyNode of victimBounties) {
            const bounty = bountyNode.asMoveObject?.contents?.json;
            if (!bounty) continue;
            const bountyTimestamp = Number(bounty.timestamp);

            // find the first kill after this bounty was posted
            const firstKillAfter = sortedKills.find(k => k.timestampMs > bountyTimestamp);
            if (!firstKillAfter) continue;

            // only claimable if we are that first killer
            if (firstKillAfter.killerKeyStr !== myKeyStr) continue;

            claimable.push({
                id: bountyNode.address,
                tar: bounty.tar,
                info: bounty.info,
                pot: bounty.pot,
                killmailId: firstKillAfter.killmailId,
                killTimestamp: firstKillAfter.timestampMs,
                killerCharId: character.id,
                victimCharId: victimChar.id,
                victimName: victimChar.name,
                coinType: bountyNode.asMoveObject?.contents?.type ?? "",
            });
        }
    }

    return claimable;
}

export function useClaimableBounties(character: PlayerCharacter | null | undefined) {
    return useQuery({
        queryKey: ["claimable-bounties", character?.id],
        queryFn: () => fetchClaimableBounties(character!),
        enabled: !!character,
        refetchInterval: 15_000,
    });
}
