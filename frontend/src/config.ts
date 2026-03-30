const required = (key: string): string => {
    const v = import.meta.env[key];
    if (!v) throw new Error(`Missing env var: ${key}`);
    return v;
};

export const GRAPHQL_URL = required("VITE_SUI_GRAPHQL_ENDPOINT");
export const WORLD_PACKAGE_ID = required("VITE_EVE_WORLD_PACKAGE_ID");
export const BOUNTY_PACKAGE_ID = required("VITE_BOUNTY_PACKAGE_ID");
export const ADMIN_ACL_ID = required("VITE_ADMIN_ACL_ID");

export const BOUNTY_TYPE = `${BOUNTY_PACKAGE_ID}::bounty_system::Bounty`;
export const CHARACTER_TYPE = `${WORLD_PACKAGE_ID}::character::Character`;

export const COIN_TYPES = {
    SUI: "0x2::sui::SUI",
    EVE: "0x2a66a89b5a735738ffa4423ac024d23571326163f324f9051557617319e59d60::EVE::EVE",
} as const;

export type CoinTypeKey = keyof typeof COIN_TYPES;
