import { Transaction } from "@mysten/sui/transactions";
import { client, playerAKeypair, ids } from "./config.js";

const [bountyId, amountSui] = process.argv.slice(2);

if (!bountyId || !amountSui) {
    console.error("Usage: pnpm contribute_bounty <bounty_id> <amount_in_sui>");
    process.exit(1);
}

const CONTRIBUTION_MIST = BigInt(Math.round(parseFloat(amountSui) * 1_000_000_000));

async function main() {
    const tx = new Transaction();

    const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(CONTRIBUTION_MIST)]);

    tx.moveCall({
        target: `${ids.bountyPackage}::bounty_system::contribute_bounty`,
        arguments: [
            tx.object(bountyId),
            payment,
        ],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: playerAKeypair,
        options: { showEvents: true },
    });

    console.log("Digest:", result.digest);

    const event = result.events?.find((e) => e.type.includes("BountyContributedEvent"));
    if (event) {
        console.log("BountyContributedEvent:", JSON.stringify(event.parsedJson, null, 2));
    }
}

main().catch(console.error);
