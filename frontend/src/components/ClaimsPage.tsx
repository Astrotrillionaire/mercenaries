import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useQueryClient } from "@tanstack/react-query";
import { BOUNTY_PACKAGE_ID } from "../config";
import { useClaimableBounties } from "../hooks/useClaimableBounties";
import type { PlayerCharacter } from "../hooks/usePlayerCharacter";
import type { ClaimableBounty } from "../hooks/useClaimableBounties";

interface Props {
    character: PlayerCharacter;
}

function ClaimRow({ bounty, character }: { bounty: ClaimableBounty; character: PlayerCharacter }) {
    const { signAndExecuteTransaction } = useDAppKit();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const potSui = (Number(bounty.pot) / 1_000_000_000).toFixed(3);
    const killDate = new Date(bounty.killTimestamp).toISOString().slice(0, 10);

    const handleClaim = async () => {
        setStatus("pending");
        setErrorMsg("");
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${BOUNTY_PACKAGE_ID}::bounty_system::payout_bounty`,
                arguments: [
                    tx.object(bounty.id),
                    tx.object(bounty.killmailId),
                    tx.object(bounty.killerCharId),
                    tx.object(bounty.victimCharId),
                ],
            });
            await signAndExecuteTransaction({ transaction: tx });
            await queryClient.invalidateQueries({ queryKey: ["claimable-bounties", character.id] });
            await queryClient.invalidateQueries({ queryKey: ["bounties"] });
            setStatus("done");
        } catch (err: any) {
            setStatus("error");
            setErrorMsg(err?.message ?? "Transaction failed");
        }
    };

    return (
        <tr className={`bounty-row ${status === "done" ? "claimed" : ""}`}>
            <td className="col-target">
                <span className="addr">{bounty.victimName}</span>
            </td>
            <td className="col-info">{bounty.info || "—"}</td>
            <td className="col-info">{killDate}</td>
            <td className="col-pot">
                {potSui} <span className="unit">SUI</span>
            </td>
            <td className="col-actions">
                {status === "done" ? (
                    <span className="claim-done">CLAIMED</span>
                ) : (
                    <>
                        <button
                            className="action-btn claim-btn"
                            onClick={handleClaim}
                            disabled={status === "pending"}
                        >
                            {status === "pending" ? "CLAIMING..." : "CLAIM"}
                        </button>
                        {status === "error" && (
                            <div className="claim-error">{errorMsg}</div>
                        )}
                    </>
                )}
            </td>
        </tr>
    );
}

export function ClaimsPage({ character }: Props) {
    const { data: bounties, isLoading } = useClaimableBounties(character);

    return (
        <div className="claims-page">
            <div className="board-header">
                <span className="blink">▶</span> CLAIMABLE BOUNTIES — PILOT: <span className="claims-pilot">{character.name}</span>
            </div>

            {isLoading ? (
                <div className="state-msg">SCANNING FOR KILLS...</div>
            ) : !bounties?.length ? (
                <div className="state-msg">NO CLAIMABLE BOUNTIES</div>
            ) : (
                <table className="bounty-table">
                    <thead>
                        <tr>
                            <th className="col-target">VICTIM</th>
                            <th className="col-info">INTEL</th>
                            <th className="col-info">KILL DATE</th>
                            <th className="col-pot">BOUNTY</th>
                            <th className="col-actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {bounties.map(b => (
                            <ClaimRow key={b.id} bounty={b} character={character} />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
