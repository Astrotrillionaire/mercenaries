import { useState } from "react";
import type { Bounty } from "../types";
import { ContributeModal } from "./ContributeModal";
import { useCharacterName } from "../hooks/useCharacterName";

interface Props {
    bounty: Bounty;
    index: number;
}

export function BountyRow({ bounty, index }: Props) {
    const [showContribute, setShowContribute] = useState(false);
    const [showAddr, setShowAddr] = useState(false);
    const { data: pilotName } = useCharacterName(bounty.tar);

    const potSui = (Number(bounty.pot) / 1_000_000_000).toFixed(3);
    const isHighValue = Number(bounty.pot) >= 10_000_000_000;
    const abbrevAddr = `${bounty.tar.slice(0, 8)}...${bounty.tar.slice(-6)}`;

    return (
        <>
            <tr className={`bounty-row ${isHighValue ? "high-value" : ""}`}>
                <td className="col-idx">{String(index + 1).padStart(3, "0")}</td>
                <td className="col-target">
                    <span
                        className="target-label"
                        onClick={() => setShowAddr(v => !v)}
                        title={showAddr ? "click to show name" : "click to show address"}
                    >
                        {showAddr
                            ? abbrevAddr
                            : (pilotName ?? abbrevAddr)
                        }
                    </span>
                </td>
                <td className="col-info">{bounty.info || "—"}</td>
                <td className={`col-pot ${isHighValue ? "pot-high" : ""}`}>
                    {potSui} <span className="unit">SUI</span>
                </td>
                <td className="col-actions">
                    <button
                        className="action-btn"
                        onClick={() => setShowContribute(true)}
                    >
                        + CONTRIBUTE
                    </button>
                </td>
            </tr>

            {showContribute && (
                <ContributeModal
                    bounty={bounty}
                    onClose={() => setShowContribute(false)}
                />
            )}
        </>
    );
}
