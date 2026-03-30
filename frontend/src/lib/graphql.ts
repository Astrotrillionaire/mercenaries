import { GRAPHQL_URL } from "../config";

export async function fetchGraphQL<T = unknown>(
    query: string,
    variables: Record<string, unknown>
): Promise<{ data?: T; errors?: { message: string }[] }> {
    const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
    }
    return response.json();
}
