# Consistency-Based Algorithmic Draw

## 1. Goal and PRD Context

The PRD defines two draw logic types:
1. **Random**: Standard lottery style (generates 5 winning numbers, matches against user tickets).
2. **Algorithmic**: Weighted by score frequency.

The PRD's phrase "weighted by score frequency" is ambiguous. The underlying product goal is to **favour users with consistent recent golf scores**.

**Product Assumption for Algorithmic Mode:**
Instead of generating 5 winning numbers and assigning weights to those numbers, the algorithmic draw will directly evaluate each eligible user. It calculates a consistency metric from their latest 5 scores, converts it into a probability weight, and uses weighted random selection to pick the winners for the respective prize tiers (Tier 1 / "5-number match" equivalent, Tier 2 / "4-number match", and Tier 3 / "3-number match"). Consistency increases a user's probability of being selected but does NOT make the selection deterministic.

*Note: In Algorithmic mode, the terms "5-number match", "4-number match", and "3-number match" from the PRD serve purely as the names/labels for the three prize tiers (allocating 40%, 35%, and 25% of the pool respectively) rather than a literal mechanical description of how winners are found.*

---

## 2. The Algorithm

To favor consistent golfers, we calculate the variance in their most recent 5 scores and convert that into a weighting factor for a random selection process.

### Step 1: Calculate User Consistency Metric
For each eligible user $i$ with exactly 5 scores $(s_{i1}, s_{i2}, s_{i3}, s_{i4}, s_{i5})$:

1. Calculate the mean ($\mu_i$) of their 5 scores.
2. Calculate the standard deviation ($\sigma_i$) of their 5 scores.
   $$ \sigma_i = \sqrt{\frac{1}{5} \sum_{k=1}^{5} (s_{ik} - \mu_i)^2} $$

### Step 2: Convert to Probability Weight
A lower standard deviation indicates higher consistency. We need to invert this to create a weight $W_i$ where lower $\sigma$ results in a higher weight. To prevent division by zero for perfectly consistent players ($\sigma = 0$), we add a smoothing constant.

$$ W_i = \frac{1}{\sigma_i + 1} $$

*Example Weights:*
* $\sigma = 0$ (Perfect consistency): $W = 1.0$
* $\sigma = 1$: $W = 0.5$
* $\sigma = 5$: $W = 0.166$

### Step 3: Normalization (Optional but Recommended)
To prevent extreme skewing in very large pools, we can normalize the weights relative to the total sum of all weights $S$, where $S = \sum W_i$. 

Each user's normalized baseline probability is:
$$ P_{base, i} = \frac{W_i}{S} $$

To ensure the draw remains exciting and non-deterministic (giving highly inconsistent players at least a fighting chance), we introduce a tuning parameter $\alpha$ (e.g., $0.8$) that blends the consistency-based probability with a purely random uniform probability. Let $N$ be the total number of eligible users.

Final Probability Weight for User $i$:
$$ P_i = \alpha \times P_{base, i} + (1 - \alpha) \times \frac{1}{N} $$

### Step 4: Execute Weighted Random Selection
With the final probability weights array $P$, we perform a weighted random selection without replacement to fill the winner slots for each tier.
1. The engine decides how many winners are selected for each tier (this could be a fixed number or a configurable parameter per tier, depending on admin setup for algorithmic draws).
2. Users are drawn based on their $P_i$ until all winning slots are filled.

---

## 3. Edge Cases Handled
* **Fewer than 5 scores**: Handled via eligibility rules (user is entirely excluded from the draw calculation).
* **Identical scores (Perfect consistency)**: $\sigma = 0$. The formula gracefully handles this via the $+ 1$ smoothing constant, assigning them the maximum possible base weight ($W=1.0$).
* **Selection determinism**: The $\alpha$ parameter ensures that even users with high standard deviations retain a non-zero probability of winning, satisfying the requirement that consistency favors a user but does not guarantee a win.
* **Fairness and Auditing**: The random seed and the calculated weights for all participants at the time of the draw are logged to the database, ensuring the algorithmic draw's math can be audited and proven fair.
