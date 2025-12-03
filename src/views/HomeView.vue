<template>
  <div class="home-view">
    <div class="container">
      <div class="header-section">
        <h1 class="page-title">🏆 Leaderboard</h1>
        <p class="subtitle">Track your journey from F to S tier</p>
      </div>

      <!-- Search Bar -->
      <div class="search-section">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
              v-model="searchQuery"
              type="text"
              placeholder="Find your name..."
              class="search-input"
              @input="handleSearch"
          />
          <button v-if="searchQuery" @click="clearSearch" class="clear-btn">✕</button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-message">
        <p>❌ {{ error }}</p>
      </div>

      <!-- Leaderboard Table -->
      <div v-else class="leaderboard-container">
        <table class="leaderboard-table">
          <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-name">Name</th>
            <th class="col-tier">Tier</th>
            <th class="col-points">Total Points</th>
            <th class="col-stats">Stats</th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="participant in filteredParticipants"
              :key="participant.id"
              :class="['participant-row', { 'highlighted': participant.highlighted }]"
          >
            <td class="col-rank">
                <span class="rank-badge" :class="getRankClass(participant.rank)">
                  {{ participant.rank }}
                </span>
            </td>
            <td class="col-name">
              <span class="participant-name">{{ participant.name }}</span>
            </td>
            <td class="col-tier">
                <span
                    class="tier-badge"
                    :style="{
                    backgroundColor: getTierColor(participant.category),
                    boxShadow: `0 0 20px ${getTierColor(participant.category)}40`
                  }"
                >
                  {{ participant.category }}
                </span>
            </td>
            <td class="col-points">
              <span class="points-value">{{ participant.totalPoints }}</span>
            </td>
            <td class="col-stats">
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Casual:</span>
                  <span class="stat-value">{{ participant.casualWins || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Tournaments:</span>
                  <span class="stat-value">{{ participant.tournamentTop4s || 0 }}</span>
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>

        <div v-if="filteredParticipants.length === 0" class="no-results">
          <p>No participants found matching "{{ searchQuery }}"</p>
        </div>
      </div>

      <!-- Tier Legend -->
      <div class="tier-legend">
        <h3>Tier Requirements</h3>
        <div class="legend-grid">
          <div v-for="tier in tierThresholds" :key="tier.tier" class="legend-item">
            <span
                class="legend-badge"
                :style="{ backgroundColor: tier.color }"
            >
              {{ tier.tier }}
            </span>
            <span class="legend-text">{{ tier.minPoints }}+ points</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useFirestore } from '../composables/useFirestore';
import { TIER_THRESHOLDS, getTierColor } from '../utils/tierConfig';

const { participants, loading, error, subscribeToParticipants } = useFirestore();
const searchQuery = ref('');
const highlightedId = ref(null);
let unsubscribe = null;

const tierThresholds = TIER_THRESHOLDS;

onMounted(() => {
  unsubscribe = subscribeToParticipants();
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const filteredParticipants = computed(() => {
  // Filter out inactive participants
  const activeParticipants = participants.value.filter(p => p.active !== false);

  if (!searchQuery.value) {
    return activeParticipants.map(p => ({ ...p, highlighted: false }));
  }

  const query = searchQuery.value.toLowerCase();
  return activeParticipants
      .filter(p => p.searchName?.includes(query) || p.name?.toLowerCase().includes(query))
      .map(p => ({ ...p, highlighted: true }));
});

const handleSearch = () => {
  // Search is reactive through computed property
};

const clearSearch = () => {
  searchQuery.value = '';
  highlightedId.value = null;
};

const getRankClass = (rank) => {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return '';
};
</script>

<style scoped>
.home-view {
  padding: 2rem 0;
}

.header-section {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 1.125rem;
}

/* Search Section */
.search-section {
  margin-bottom: 2rem;
}

.search-box {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
}

.search-input {
  width: 100%;
  padding: 1rem 3rem 1rem 3rem;
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: 2rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 20px rgba(220, 38, 38, 0.2);
}

.clear-btn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  transition: color 0.2s;
}

.clear-btn:hover {
  color: var(--color-accent);
}

/* Loading & Error */
.loading {
  text-align: center;
  padding: 4rem 0;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  padding: 2rem;
  color: var(--color-accent);
  font-size: 1.125rem;
}

/* Leaderboard Table */
.leaderboard-container {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
  margin-bottom: 3rem;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-table thead {
  background: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-accent);
}

.leaderboard-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
}

.col-rank {
  width: 80px;
  text-align: center;
}

.col-tier {
  width: 100px;
  text-align: center;
}

.col-points {
  width: 150px;
  text-align: center;
}

.participant-row {
  border-bottom: 1px solid var(--color-border);
  transition: all 0.2s;
}

.participant-row:hover {
  background: var(--color-bg-secondary);
}

.participant-row.highlighted {
  background: rgba(220, 38, 38, 0.1);
  border-left: 4px solid var(--color-accent);
}

.participant-row td {
  padding: 1rem;
}

/* Rank Badge */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: bold;
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
  color: #000;
  border-color: #c0c0c0;
  box-shadow: 0 0 20px rgba(192, 192, 192, 0.5);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #e39a5c);
  color: #fff;
  border-color: #cd7f32;
  box-shadow: 0 0 20px rgba(205, 127, 50, 0.5);
}

/* Tier Badge */
.tier-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: bold;
  font-size: 1.25rem;
  color: white;
  min-width: 50px;
  text-align: center;
}

/* Points */
.points-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-accent);
}

/* Stats */
.stats-grid {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

/* No Results */
.no-results {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary);
}

/* Tier Legend */
.tier-legend {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 2rem;
}

.tier-legend h3 {
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
  text-align: center;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-bg-secondary);
  border-radius: 0.5rem;
}

.legend-badge {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-weight: bold;
  color: white;
}

.legend-text {
  color: var(--color-text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .leaderboard-table {
    font-size: 0.875rem;
  }

  .col-stats {
    display: none;
  }

  .stats-grid {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>