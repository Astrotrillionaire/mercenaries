import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const required = (key: string): string => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing env var: ${key}`);
    return value;
};

const keypairFromPrivateKey = (key: string): Ed25519Keypair => {
    const { secretKey } = decodeSuiPrivateKey(key);
    return Ed25519Keypair.fromSecretKey(secretKey);
};

const network = (process.env.SUI_NETWORK ?? "localnet") as "localnet" | "testnet" | "mainnet";
export const client = new SuiJsonRpcClient({ url: required("SUI_RPC_URL"), network });

export const adminKeypair = keypairFromPrivateKey(required("ADMIN_PRIVATE_KEY"));
export const playerAKeypair = keypairFromPrivateKey(required("PLAYER_A_PRIVATE_KEY"));
export const playerBKeypair = keypairFromPrivateKey(required("PLAYER_B_PRIVATE_KEY"));

export const ids = {
    worldPackage: required("WORLD_PACKAGE_ID"),
    adminAcl: required("ADMIN_ACL_ID"),
    objectRegistry: required("OBJECT_REGISTRY"),
    killmailRegistry: required("KILLMAIL_REGISTRY"),
    bountyPackage: required("BOUNTY_PACKAGE_ID"),
    characterA: required("CHARACTER_A_ID"),
    characterB: required("CHARACTER_B_ID"),
};
