import { Transaction } from "@mysten/sui/transactions";
import { client, ids } from "./config.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

const [bountyId, killmailId, killerCharId, victimCharId, killerPrivateKey] = process.argv.slice(2);

if (!bountyId || !killmailId || !killerCharId || !victimCharId || !killerPrivateKey) {
    console.error("Usage: pnpm payout_bounty <bounty_id> <killmail_id> <killer_char_id> <victim_char_id> <killer_private_key>");
    process.exit(1);
}

async function main() {
    const { secretKey } = decodeSuiPrivateKey(killerPrivateKey);
    const killerKeypair = Ed25519Keypair.fromSecretKey(secretKey);

    const tx = new Transaction();
    tx.moveCall({
        target: `${ids.bountyPackage}::bounty_system::payout_bounty`,
        arguments: [
            tx.object(bountyId),
            tx.object(killmailId),
            tx.object(killerCharId),
            tx.object(victimCharId),
        ],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: killerKeypair,
        options: { showEvents: true },
    });

    console.log("Digest:", result.digest);

    const event = result.events?.find((e) => e.type.includes("BountyClaimedEvent"));
    if (event) {
        console.log("BountyClaimedEvent:", JSON.stringify(event.parsedJson, null, 2));
    }
}

main().catch(console.error);
