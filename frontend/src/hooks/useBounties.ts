import { useQuery } from "@tanstack/react-query";
import { fetchGraphQL } from "../lib/graphql";
import { BOUNTY_TYPE } from "../config";
import type { Bounty } from "../types";

const QUERY = `
  query GetBounties($type: String!, $after: String) {
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

async function fetchAllBounties(): Promise<Bounty[]> {
    const bounties: Bounty[] = [];
    let cursor: string | null = null;

    while (true) {
        const result: any = await fetchGraphQL(QUERY, {
            type: BOUNTY_TYPE,
            after: cursor,
        });

        const nodes = result?.data?.objects?.nodes ?? [];
        for (const node of nodes) {
            const json = node.asMoveObject?.contents?.json;
            if (!json) continue;
            bounties.push({
                id: node.address,
                tar: json.tar,
                info: json.info,
                pot: json.pot,
            });
        }

        const pageInfo = result?.data?.objects?.pageInfo;
        if (!pageInfo?.hasNextPage) break;
        cursor = pageInfo.endCursor;
    }

    return bounties;
}

export function useBounties() {
    return useQuery({
        queryKey: ["bounties"],
        queryFn: fetchAllBounties,
        refetchInterval: 10_000,
    });
}
