import json
import random
from collections import defaultdict

# 1. Load word lists
with open('target_words_id.txt', 'r', encoding='utf-8') as f:
    target_words = sorted(list(set(line.strip().lower() for line in f if len(line.strip()) == 5 and line.strip().isalpha())))

with open('valid_words_id.txt', 'r', encoding='utf-8') as f:
    valid_words = sorted(list(set(line.strip().lower() for line in f if len(line.strip()) == 5 and line.strip().isalpha())))

valid_set = set(valid_words)
valid_set.update(target_words)
valid_list = sorted(list(valid_set))

print(f"Target words count: {len(target_words)}")
print(f"Valid words count: {len(valid_list)}")

# 2. Write words.js
import os
os.makedirs('js', exist_ok=True)
os.makedirs('css', exist_ok=True)

with open('js/words.js', 'w', encoding='utf-8') as f:
    f.write("// Kamus Kata Bahasa Indonesia untuk Squareword ID\n")
    f.write("const VALID_WORDS_LIST = " + json.dumps(valid_list, separators=(',', ':')) + ";\n")
    f.write("const VALID_WORDS_SET = new Set(VALID_WORDS_LIST);\n")
    f.write("const TARGET_WORDS = " + json.dumps(target_words, separators=(',', ':')) + ";\n")

print("Created js/words.js")

# 3. Build prefixes for generator
prefixes = set()
for w in valid_set:
    for i in range(1, 6):
        prefixes.add(w[:i])

prefix_dict = defaultdict(list)
for w in target_words:
    for i in range(1, 5):
        prefix_dict[w[:i]].append(w)

seen = set()
puzzles = []

# Generate General (Asymmetric) puzzles (10 unique words per puzzle: 5 unique rows + 5 unique cols, 0 overlap)
def generate_asymmetric_bank(total_target=600):
    def backtrack(grid):
        if len(puzzles) >= total_target:
            return
        if len(grid) == 5:
            # Check all 5 rows are unique
            if len(set(grid)) == 5:
                # Check all 5 columns are valid and unique
                cols = [''.join(grid[r][c] for r in range(5)) for c in range(5)]
                if all(c in valid_set for c in cols) and len(set(cols)) == 5:
                    # Check NO overlap between rows and columns (10 unique words total)
                    if len(set(grid + cols)) == 10:
                        key = tuple(grid)
                        if key not in seen:
                            seen.add(key)
                            puzzles.append(list(grid))
            return
        
        idx = len(grid)
        possible_rows = []
        for cand in target_words:
            if cand in grid:
                continue
            valid = True
            for col in range(5):
                next_pref = ''.join(grid[r][col] for r in range(idx)) + cand[col]
                if next_pref not in prefixes:
                    valid = False
                    break
            if valid:
                possible_rows.append(cand)
        
        random.shuffle(possible_rows)
        for cand in possible_rows[:30]:
            grid.append(cand)
            backtrack(grid)
            grid.pop()
            if len(puzzles) >= total_target:
                return

    shuffled_targets = list(target_words)
    random.seed(42)
    random.shuffle(shuffled_targets)
    for start in shuffled_targets:
        backtrack([start])
        if len(puzzles) >= total_target:
            break

generate_asymmetric_bank(600)

print(f"Generated total {len(puzzles)} unique 5x5 puzzles for puzzle bank (100% 10 unique words per puzzle).")

# Shuffle final puzzles deterministically so every day gets a great mix
random.seed(2026)
random.shuffle(puzzles)

with open('js/puzzles.js', 'w', encoding='utf-8') as f:
    f.write("// Bank Teka-Teki 5x5 Squareword ID (100% 10 Kata Unik per Teka-Teki)\n")
    f.write("const DAILY_PUZZLES = " + json.dumps(puzzles, separators=(',', ':')) + ";\n")
    f.write("""
// Fungsi untuk mengambil puzzle harian berdasarkan tanggal
function getDailyPuzzle(date = new Date()) {
    // Epoch referensi: 1 Januari 2026
    const startEpoch = new Date(2026, 0, 1).getTime();
    const currentEpoch = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayIndex = Math.max(0, Math.floor((currentEpoch - startEpoch) / (24 * 60 * 60 * 1000)));
    const puzzleIndex = dayIndex % DAILY_PUZZLES.length;
    return {
        id: dayIndex + 1,
        date: date.toISOString().split('T')[0],
        grid: DAILY_PUZZLES[puzzleIndex]
    };
}

// Fungsi untuk membuat / memilih puzzle acak untuk mode Bebas / Unlimited
function getRandomPuzzle() {
    const randomIndex = Math.floor(Math.random() * DAILY_PUZZLES.length);
    return {
        id: 'Latihan-' + (randomIndex + 1),
        isPractice: true,
        grid: DAILY_PUZZLES[randomIndex]
    };
}
""")

print("Created js/puzzles.js")
