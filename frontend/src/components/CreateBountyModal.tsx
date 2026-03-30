import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useQueryClient } from "@tanstack/react-query";
import { BOUNTY_PACKAGE_ID, COIN_TYPES, type CoinTypeKey } from "../config";
import { useCharacterLookup } from "../hooks/useCharacterName";

interface Props {
    onClose: () => void;
}

export function CreateBountyModal({ onClose }: Props) {
    const { signAndExecuteTransaction } = useDAppKit();
    const queryClient = useQueryClient();
    const [pilotName, setPilotName] = useState("");
    const [info, setInfo] = useState("");
    const [amount, setAmount] = useState("");
    const [coinKey, setCoinKey] = useState<CoinTypeKey>("SUI");
    const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const { data: resolvedAddress, isFetching: resolving } = useCharacterLookup(pilotName);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isRawAddress = pilotName.startsWith("0x");
        const target = isRawAddress ? pilotName : resolvedAddress;
        if (!target) {
            setStatus("error");
            setErrorMsg("PILOT NOT FOUND — enter a valid pilot name or 0x address");
            return;
        }
        if (!amount || !info) return;

        setStatus("pending");
        setErrorMsg("");
        try {
            const coinType = COIN_TYPES[coinKey];
            const mist = BigInt(Math.round(parseFloat(amount) * 1_000_000_000));
            const tx = new Transaction();
            const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(mist)]);
            tx.moveCall({
                target: `${BOUNTY_PACKAGE_ID}::bounty_system::create_bounty`,
                typeArguments: [coinType],
                arguments: [
                    tx.pure.address(target),
                    tx.pure.string(info),
                    payment,
                    tx.object("0x6"),
                ],
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

    const targetDisplay = resolvedAddress
        ? `${resolvedAddress.slice(0, 8)}...${resolvedAddress.slice(-6)}`
        : pilotName.startsWith("0x")
        ? `${pilotName.slice(0, 8)}...${pilotName.slice(-6)}`
        : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">// POST BOUNTY</span>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="field">
                        <label>TARGET PILOT</label>
                        <input
                            type="text"
                            value={pilotName}
                            onChange={(e) => setPilotName(e.target.value)}
                            placeholder="pilot name or 0x address"
                            required
                        />
                        {resolving && <span className="field-hint resolving">RESOLVING...</span>}
                        {targetDisplay && !resolving && (
                            <span className="field-hint resolved">→ {targetDisplay}</span>
                        )}
                        {pilotName.length > 2 && !resolving && !resolvedAddress && !pilotName.startsWith("0x") && (
                            <span className="field-hint warn">PILOT NOT FOUND — USE 0x ADDRESS</span>
                        )}
                    </div>

                    <div className="field">
                        <label>INTEL <span className="label-sub">(32 chars max)</span></label>
                        <input
                            type="text"
                            value={info}
                            onChange={(e) => setInfo(e.target.value.slice(0, 32))}
                            placeholder="last seen system, ship type..."
                            required
                        />
                        <span className="field-hint">{info.length}/32</span>
                    </div>

                    <div className="field">
                        <label>CURRENCY</label>
                        <div className="coin-selector">
                            {(Object.keys(COIN_TYPES) as CoinTypeKey[]).map(k => (
                                <button
                                    key={k}
                                    type="button"
                                    className={`coin-btn ${coinKey === k ? "active" : ""}`}
                                    onClick={() => setCoinKey(k)}
                                >
                                    {k}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="field">
                        <label>AMOUNT <span className="label-sub">({coinKey})</span></label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="1.0"
                            min="0.000000001"
                            step="any"
                            required
                        />
                    </div>

                    {status === "error" && (
                        <div className="form-error">{errorMsg}</div>
                    )}
                    {status === "done" && (
                        <div className="form-success">BOUNTY POSTED</div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={status === "pending" || status === "done"}
                    >
                        {status === "pending" ? "POSTING..." : "POST BOUNTY"}
                    </button>
                </form>
            </div>
        </div>
    );
}
