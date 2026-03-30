import { Transaction } from "@mysten/sui/transactions";
import { client, adminKeypair, ids } from "./config.js";

const [characterId, newAddress] = process.argv.slice(2);

if (!characterId || !newAddress) {
    console.error("Usage: pnpm exec tsx src/update-char-address.ts <character_id> <new_address>");
    process.exit(1);
}

async function main() {
    console.log(`Updating character ${characterId} -> ${newAddress}`);
    const tx = new Transaction();
    tx.moveCall({
        target: `${ids.worldPackage}::character::update_address`,
        arguments: [
            tx.object(characterId),
            tx.object(ids.adminAcl),
            tx.pure.address(newAddress),
        ],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: adminKeypair,
    });
    console.log("Done:", result.digest);
}

main().catch(console.error);
