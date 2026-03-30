import { useQuery } from "@tanstack/react-query";
import { fetchGraphQL } from "../lib/graphql";
import { CHARACTER_TYPE } from "../config";

const QUERY = `
  query GetCharacterByName($type: String!) {
    objects(filter: { type: $type }, first: 200) {
      nodes {
        asMoveObject {
          contents { json }
        }
      }
    }
  }
`;

async function findAddressByName(name: string): Promise<string | null> {
    const result: any = await fetchGraphQL(QUERY, { type: CHARACTER_TYPE });
    const nodes = result?.data?.objects?.nodes ?? [];
    for (const node of nodes) {
        const json = node.asMoveObject?.contents?.json;
        if (!json) continue;
        const charName = json.metadata?.name ?? json.metadata?.fields?.name ?? "";
        if (charName.toLowerCase() === name.toLowerCase()) {
            return json.character_address ?? null;
        }
    }
    return null;
}

export function useCharacterLookup(name: string) {
    return useQuery({
        queryKey: ["character", name],
        queryFn: () => findAddressByName(name),
        enabled: name.length > 2,
        staleTime: 60_000,
    });
}

async function findNameByAddress(address: string): Promise<string | null> {
    const result: any = await fetchGraphQL(QUERY, { type: CHARACTER_TYPE });
    const nodes = result?.data?.objects?.nodes ?? [];
    for (const node of nodes) {
        const json = node.asMoveObject?.contents?.json;
        if (!json) continue;
        if (json.character_address === address) {
            return json.metadata?.fields?.name ?? json.metadata?.name ?? null;
        }
    }
    return null;
}

export function useCharacterName(address: string) {
    return useQuery({
        queryKey: ["character-name", address],
        queryFn: () => findNameByAddress(address),
        enabled: address.length > 0,
        staleTime: 60_000,
    });
}
