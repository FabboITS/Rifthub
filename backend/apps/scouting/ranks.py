"""Rank string <-> numeric score. IRON_4 = 0 … DIAMOND_1 = 2700, MASTER 2800, GM 2900, CHALLENGER 3000."""

TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"]
APEX = {"MASTER": 2800, "GRANDMASTER": 2900, "CHALLENGER": 3000}
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4}


def rank_to_score(rank):
    """Accepts 'DIAMOND_2', 'DIAMOND II', 'diamond' or 'MASTER'."""
    rank = str(rank).upper().replace(" ", "_")
    tier, _, div = rank.partition("_")
    if tier in APEX:
        return APEX[tier]
    if tier not in TIERS:
        raise ValueError(f"Rank sconosciuto: {rank}")
    div = ROMAN.get(div, int(div) if div.isdigit() else 4)
    return TIERS.index(tier) * 400 + (4 - div) * 100


def score_to_rank(score):
    for tier, value in sorted(APEX.items(), key=lambda kv: -kv[1]):
        if score >= value:
            return tier
    score = max(0, score)
    tier = TIERS[min(score // 400, len(TIERS) - 1)]
    div = 4 - min((score % 400) // 100, 3)
    return f"{tier}_{div}"


if __name__ == "__main__":
    assert rank_to_score("IRON_4") == 0
    assert rank_to_score("DIAMOND_1") == 2700
    assert rank_to_score("gold ii") == 1400
    assert rank_to_score("CHALLENGER") == 3000
    assert all(score_to_rank(rank_to_score(r)) == r for r in ["SILVER_3", "EMERALD_1", "MASTER"])
    print("ok")
