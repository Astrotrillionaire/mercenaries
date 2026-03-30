import { Transaction } from "@mysten/sui/transactions";
import { client, adminKeypair, ids } from "./config.js";

const [targetAddress, info, amountSui] = process.argv.slice(2);

if (!targetAddress || !info || !amountSui) {
    console.error("Usage: pnpm create_bounty <target_address> <info> <amount_in_sui>");
    process.exit(1);
}

const BOUNTY_MIST = BigInt(Math.round(parseFloat(amountSui) * 1_000_000_000));

async function main() {
    const tx = new Transaction();

    const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(BOUNTY_MIST)]);

    tx.moveCall({
        target: `${ids.bountyPackage}::bounty_system::create_bounty`,
        arguments: [
            tx.pure.address(targetAddress),
            tx.pure.string(info),
            payment,
        ],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: adminKeypair,
        options: { showEvents: true, showObjectChanges: true },
    });

    console.log("Digest:", result.digest);

    const created = result.objectChanges?.find(
        (c) => c.type === "created" && "objectType" in c && (c as any).objectType.includes("bounty_system::Bounty")
    );
    if (created) {
        console.log("Bounty object ID:", (created as any).objectId);
    }

    const event = result.events?.find((e) => e.type.includes("BountyCreatedEvent"));
    if (event) {
        console.log("BountyCreatedEvent:", JSON.stringify(event.parsedJson, null, 2));
    }
}

main().catch(console.error);
