import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useQueryClient } from "@tanstack/react-query";
import { BOUNTY_PACKAGE_ID } from "../config";
import type { Bounty } from "../types";

interface Props {
    bounty: Bounty;
    onClose: () => void;
}

export function ContributeModal({ bounty, onClose }: Props) {
    const { signAndExecuteTransaction } = useDAppKit();
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("pending");
        setErrorMsg("");
        try {
            const mist = BigInt(Math.round(parseFloat(amount) * 1_000_000_000));
            const tx = new Transaction();
            const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(mist)]);
            tx.moveCall({
                target: `${BOUNTY_PACKAGE_ID}::bounty_system::contribute_bounty`,
                arguments: [tx.object(bounty.id), payment],
            });
            await signAndExecuteTransaction({ transaction: tx });
            await queryClient.invalidateQueries({ queryKey: ["bounties"] });
            setStatus("done");
            setTimeout(onClose, 1200);
        } catch (err: any) {
            setStatus("error");
            setErrorMsg(err?.message ?? "Transaction failed");
        }
    };

    const potSui = (Number(bounty.pot) / 1_000_000_000).toFixed(3);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">// ADD TO POT</span>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-target">
                    <span className="label-sub">TARGET</span>
                    <span className="addr">{bounty.tar.slice(0, 10)}...{bounty.tar.slice(-8)}</span>
                </div>
                <div className="modal-target">
                    <span className="label-sub">CURRENT POT</span>
                    <span className="pot-amt">{potSui} SUI</span>
                </div>

                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="field">
                        <label>CONTRIBUTION <span className="label-sub">(SUI)</span></label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.5"
                            min="0.000000001"
                            step="any"
                            required
                        />
                    </div>

                    {status === "error" && <div className="form-error">{errorMsg}</div>}
                    {status === "done" && <div className="form-success">CONTRIBUTION ADDED</div>}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={status === "pending" || status === "done"}
                    >
                        {status === "pending" ? "SUBMITTING..." : "CONTRIBUTE"}
                    </button>
                </form>
            </div>
        </div>
    );
}
