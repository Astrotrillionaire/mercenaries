import { useQuery } from "@tanstack/react-query";
import { fetchGraphQL } from "../lib/graphql";
import { WORLD_PACKAGE_ID } from "../config";

const PLAYER_PROFILE_QUERY = `
  query GetPlayerProfile($address: String!, $type: String!) {
    address(address: $address) {
      objects(filter: { type: $type }, first: 50) {
        nodes {
          contents { json }
        }
      }
    }
  }
`;

const CHARACTER_BY_ID_QUERY = `
  query GetCharacterById($id: String!) {
    object(address: $id) {
      address
      asMoveObject {
        contents { json }
      }
    }
  }
`;

export interface PlayerCharacter {
    id: string;
    name: string;
    address: string;
    key: { item_id: string; tenant: string };
}

async function fetchPlayerCharacter(walletAddress: string): Promise<PlayerCharacter | null> {
    const profileType = `${WORLD_PACKAGE_ID}::character::PlayerProfile`;

    const profileResult: any = await fetchGraphQL(PLAYER_PROFILE_QUERY, {
        address: walletAddress,
        type: profileType,
    });

    const profileNodes: any[] = profileResult?.data?.address?.objects?.nodes ?? [];
    for (const profileNode of profileNodes) {
        const rawId = profileNode?.contents?.json?.character_id;
        const characterId = typeof rawId === "object" ? rawId?.bytes : rawId;
        if (!characterId) continue;

        const charResult: any = await fetchGraphQL(CHARACTER_BY_ID_QUERY, { id: characterId });
        const charNode = charResult?.data?.object;
        const json = charNode?.asMoveObject?.contents?.json;
        if (!json) continue;

        return {
            id: charNode.address,
            name: json.metadata?.name ?? json.metadata?.fields?.name ?? "UNKNOWN",
            address: json.character_address,
            key: json.key,
        };
    }
    return null;
}

export function usePlayerCharacter(walletAddress: string | undefined) {
    return useQuery({
        queryKey: ["player-character", walletAddress],
        queryFn: () => fetchPlayerCharacter(walletAddress!),
        enabled: !!walletAddress,
        staleTime: 60_000,
    });
}
