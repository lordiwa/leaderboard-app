<template>
  <div class="admin-dashboard">
    <div class="container">
      <h1 class="page-title">⚙️ Admin Dashboard</h1>

      <!-- Tabs -->
      <div class="tabs">
        <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['tab-btn', { active: activeTab === tab.id }]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Add/Manage Participants -->
        <div v-if="activeTab === 'add-participant'" class="card">
          <h2 class="card-title">👥 Manage Participants</h2>

          <!-- Add New Participant Form -->
          <form @submit.prevent="handleAddParticipant" class="form add-participant-form">
            <div class="form-group">
              <label>Add New Participant</label>
              <div class="input-group">
                <input
                    v-model="newParticipantName"
                    type="text"
                    required
                    class="input"
                    placeholder="Enter name..."
                />
                <button type="submit" class="btn btn-primary" :disabled="loading">
                  {{ loading ? 'Adding...' : '+ Add' }}
                </button>
              </div>
            </div>
          </form>

          <hr class="divider" />

          <!-- Participants List -->
          <div class="participants-section">
            <div class="list-header">
              <h3>All Participants ({{ filteredParticipantsList.length }})</h3>
              <div class="search-box-small">
                <span class="search-icon-small">🔍</span>
                <input
                    v-model="participantListSearch"
                    type="text"
                    placeholder="Search participants..."
                    class="input-small"
                />
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading && participants.length === 0" class="loading-small">
              <div class="spinner-small"></div>
              <p>Loading participants...</p>
            </div>

            <!-- Participants Table -->
            <div v-else class="participants-table-container">
              <table class="participants-table">
                <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Points</th>
                  <th>Tier</th>
                  <th>W-L-D</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                <tr
                    v-for="participant in filteredParticipantsList"
                    :key="participant.id"
                    :class="{ 'inactive-row': !participant.active }"
                >
                  <td class="rank-cell">{{ participant.rank }}</td>
                  <td class="name-cell">
                    <strong>{{ participant.name }}</strong>
                    <span v-if="!participant.active" class="inactive-badge">Inactive</span>
                  </td>
                  <td class="points-cell">{{ participant.totalPoints }}</td>
                  <td class="tier-cell">
                      <span
                          class="tier-badge-small"
                          :style="{ backgroundColor: getTierColor(participant.category) }"
                      >
                        {{ participant.category }}
                      </span>
                  </td>
                  <td class="record-cell">
                    <span class="record-label">{{ participant.wins || 0 }}-{{ participant.losses || 0 }}-{{ participant.draws || 0 }}</span>
                  </td>
                  <td class="actions-cell">
                    <div class="action-buttons">
                      <!-- Deactivate/Reactivate Button -->
                      <button
                          v-if="participant.active !== false"
                          @click="confirmDeactivate(participant)"
                          class="btn-deactivate"
                          :disabled="loading"
                          title="Hide from leaderboard (can be undone)"
                      >
                        ⏸️ Deactivate
                      </button>
                      <button
                          v-else
                          @click="confirmReactivate(participant)"
                          class="btn-reactivate"
                          :disabled="loading"
                          title="Show on leaderboard again"
                      >
                        ▶️ Reactivate
                      </button>

                      <!-- Permanent Delete Button -->
                      <button
                          @click="confirmPermanentDelete(participant)"
                          class="btn-permanent-delete"
                          :disabled="loading"
                          title="Permanently delete (cannot be undone!)"
                      >
                        🗑️ Delete Forever
                      </button>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>

              <div v-if="filteredParticipantsList.length === 0" class="no-participants">
                <p>No participants found</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Match Result Entry -->
        <div v-if="activeTab === 'match'" class="card">
          <h2 class="card-title">🎮 Register Match Result</h2>
          <form @submit.prevent="handleMatchResult" class="form">
            <div class="form-group">
              <label>Search Participant</label>
              <input
                  v-model="matchSearch"
                  type="text"
                  class="input"
                  placeholder="Type name..."
                  @input="filterParticipants"
              />
              <div v-if="matchSearch && filteredList.length > 0" class="dropdown">
                <button
                    v-for="p in filteredList"
                    :key="p.id"
                    type="button"
                    @click="selectParticipant(p, 'match')"
                    class="dropdown-item"
                >
                  {{ p.name }} - {{ p.totalPoints }} pts ({{ p.category }}) [{{ p.wins || 0 }}-{{ p.losses || 0 }}-{{ p.draws || 0 }}]
                </button>
              </div>
            </div>

            <div v-if="selectedMatch" class="match-result-options">
              <div class="participant-info">
                <h3>{{ selectedMatch.name }}</h3>
                <p>Current: {{ selectedMatch.totalPoints }} pts ({{ selectedMatch.category }})</p>
                <p>Record: {{ selectedMatch.wins || 0 }}-{{ selectedMatch.losses || 0 }}-{{ selectedMatch.draws || 0 }}</p>
              </div>

              <div class="result-buttons">
                <button
                    type="button"
                    @click="submitMatchResult('win')"
                    class="btn-result btn-win"
                    :disabled="loading"
                >
                  <span class="result-icon">✓</span>
                  <span class="result-text">
                    <span class="result-label">Victory</span>
                    <span class="result-points">+3 pts</span>
                  </span>
                </button>

                <button
                    type="button"
                    @click="submitMatchResult('draw')"
                    class="btn-result btn-draw"
                    :disabled="loading"
                >
                  <span class="result-icon">=</span>
                  <span class="result-text">
                    <span class="result-label">Draw</span>
                    <span class="result-points">+1 pt</span>
                  </span>
                </button>

                <button
                    type="button"
                    @click="submitMatchResult('loss')"
                    class="btn-result btn-loss"
                    :disabled="loading"
                >
                  <span class="result-icon">✗</span>
                  <span class="result-text">
                    <span class="result-label">Loss</span>
                    <span class="result-points">+0 pts</span>
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Event Results Entry -->
        <div v-if="activeTab === 'event'" class="card">
          <h2 class="card-title">🏆 Register Event Results</h2>
          <form @submit.prevent="handleEventResults" class="form">
            <div class="form-group">
              <label>Event Name (Optional)</label>
              <input
                  v-model="eventName"
                  type="text"
                  class="input"
                  placeholder="e.g., Store Championship Round 1"
              />
            </div>

            <div class="event-section">
              <h3 class="event-subtitle">Add Match Results</h3>
              <div class="match-entries">
                <div v-for="(match, index) in eventMatches" :key="index" class="match-entry">
                  <div class="match-number">Match {{ index + 1 }}</div>

                  <div class="match-inputs">
                    <div class="input-group-vertical">
                      <label>Participant</label>
                      <input
                          v-model="match.search"
                          type="text"
                          class="input"
                          placeholder="Search participant..."
                          @input="filterEventParticipants(index)"
                      />
                      <div v-if="match.search && eventFilteredList[index]?.length > 0" class="dropdown">
                        <button
                            v-for="p in eventFilteredList[index]"
                            :key="p.id"
                            type="button"
                            @click="selectEventParticipant(index, p)"
                            class="dropdown-item"
                        >
                          {{ p.name }} ({{ p.wins || 0 }}-{{ p.losses || 0 }}-{{ p.draws || 0 }})
                        </button>
                      </div>
                    </div>

                    <div class="input-group-vertical">
                      <label>Result</label>
                      <select v-model="match.result" class="input">
                        <option value="">Select result...</option>
                        <option value="win">Win (+3)</option>
                        <option value="draw">Draw (+1)</option>
                        <option value="loss">Loss (+0)</option>
                      </select>
                    </div>

                    <button
                        v-if="index > 0"
                        type="button"
                        @click="removeEventMatch(index)"
                        class="btn-remove"
                    >
                      ✕
                    </button>
                  </div>

                  <div v-if="match.participant" class="match-preview">
                    {{ match.participant.name }} - {{ match.result?.toUpperCase() || 'No result' }}
                  </div>
                </div>
              </div>

              <button
                  type="button"
                  @click="addEventMatch"
                  class="btn btn-secondary"
              >
                + Add Another Match
              </button>
            </div>

            <!-- Preview -->
            <div v-if="validEventMatches.length > 0" class="event-preview">
              <h3>Preview Changes:</h3>
              <div v-for="(match, index) in validEventMatches" :key="index" class="preview-item">
                <span class="preview-name">{{ match.participant.name }}</span>
                <span class="preview-result">{{ match.result.toUpperCase() }}</span>
                <span class="preview-change">
                  {{ match.participant.totalPoints }} → {{ match.participant.totalPoints + getPointsForResult(match.result) }}
                </span>
              </div>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                {{ loading ? 'Submitting...' : 'Submit Event Results' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Manual Adjustment -->
        <div v-if="activeTab === 'adjustment'" class="card">
          <h2 class="card-title">⚖️ Manual Point Adjustment</h2>
          <form @submit.prevent="handleAdjustment" class="form">
            <div class="form-group">
              <label>Search Participant</label>
              <input
                  v-model="adjustmentSearch"
                  type="text"
                  class="input"
                  placeholder="Type name..."
                  @input="filterParticipants"
              />
              <div v-if="adjustmentSearch && filteredList.length > 0" class="dropdown">
                <button
                    v-for="p in filteredList"
                    :key="p.id"
                    type="button"
                    @click="selectParticipant(p, 'adjustment')"
                    class="dropdown-item"
                >
                  {{ p.name }} - {{ p.totalPoints }} pts ({{ p.category }})
                </button>
              </div>
            </div>

            <div v-if="selectedAdjustment">
              <div class="form-group">
                <label>Points to Add/Subtract</label>
                <input
                    v-model.number="adjustmentPoints"
                    type="number"
                    required
                    class="input"
                    placeholder="Use negative for subtraction"
                />
              </div>

              <div class="form-group">
                <label>Reason (Required)</label>
                <textarea
                    v-model="adjustmentReason"
                    required
                    class="input"
                    rows="3"
                    placeholder="Explain why this adjustment is needed..."
                ></textarea>
              </div>

              <div class="adjustment-preview">
                <p>Current: {{ selectedAdjustment.totalPoints }} pts ({{ selectedAdjustment.category }})</p>
                <p class="preview">New: {{ Math.max(0, selectedAdjustment.totalPoints + (adjustmentPoints || 0)) }} pts
                  ({{ getTierFromPoints(Math.max(0, selectedAdjustment.totalPoints + (adjustmentPoints || 0))).tier }})
                </p>
              </div>

              <button type="submit" class="btn btn-primary" :disabled="loading || !adjustmentReason">
                {{ loading ? 'Adjusting...' : 'Apply Adjustment' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="success-toast">
        ✓ {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-toast">
        ❌ {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestore } from '../composables/useFirestore';
import * as tierConfig from '../utils/tierConfig';

const router = useRouter();
const {
  participants,
  loading,
  getParticipants,
  addParticipant,
  addMatchResult,
  addEventResults,
  adjustPoints,
  deactivateParticipant,
  reactivateParticipant,
  permanentDeleteParticipant
} = useFirestore();

// Expose tier utility functions
const getTierFromPoints = tierConfig.getTierFromPoints;
const getTierColor = tierConfig.getTierColor;
const getPointsForResult = tierConfig.getPointsForResult;

const activeTab = ref('add-participant');
const tabs = [
  { id: 'add-participant', label: 'Manage Participants' },
  { id: 'match', label: 'Match Result' },
  { id: 'event', label: 'Event Results' },
  { id: 'adjustment', label: 'Adjustment' }
];

// Participant List Management
const participantListSearch = ref('');

// Add Participant
const newParticipantName = ref('');

// Match Entry
const matchSearch = ref('');
const selectedMatch = ref(null);

// Event Entry
const eventName = ref('');
const eventMatches = ref([{ search: '', result: '', participant: null }]);
const eventFilteredList = ref({});

// Adjustment
const adjustmentSearch = ref('');
const selectedAdjustment = ref(null);
const adjustmentPoints = ref(0);
const adjustmentReason = ref('');

// Filtered participants for dropdown
const filteredList = ref([]);

// Messages
const successMessage = ref('');
const errorMessage = ref('');

// Current admin user
const currentAdminId = ref('');

// Filtered participants for management list
const filteredParticipantsList = computed(() => {
  if (!participantListSearch.value) {
    return participants.value;
  }
  const search = participantListSearch.value.toLowerCase();
  return participants.value.filter(p =>
      p.name?.toLowerCase().includes(search) ||
      p.searchName?.includes(search)
  );
});

const validEventMatches = computed(() => {
  return eventMatches.value.filter(m => m.participant && m.result);
});

onMounted(async () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      router.push('/login');
    } else {
      currentAdminId.value = user.uid;
    }
  });

  await getParticipants();
});

// Filter participants for search
const filterParticipants = () => {
  const search = (matchSearch.value || adjustmentSearch.value).toLowerCase();
  if (search.length < 2) {
    filteredList.value = [];
    return;
  }
  filteredList.value = participants.value.filter(p =>
      p.searchName?.includes(search) || p.name?.toLowerCase().includes(search)
  ).slice(0, 5);
};

// Select participant
const selectParticipant = (participant, type) => {
  if (type === 'match') {
    selectedMatch.value = participant;
    matchSearch.value = participant.name;
    filteredList.value = [];
  } else if (type === 'adjustment') {
    selectedAdjustment.value = participant;
    adjustmentSearch.value = participant.name;
    filteredList.value = [];
  }
};

// Event match functions
const addEventMatch = () => {
  eventMatches.value.push({ search: '', result: '', participant: null });
};

const removeEventMatch = (index) => {
  eventMatches.value.splice(index, 1);
};

const filterEventParticipants = (index) => {
  const search = eventMatches.value[index].search.toLowerCase();
  if (search.length < 2) {
    eventFilteredList.value[index] = [];
    return;
  }

  const selectedIds = eventMatches.value
      .map(m => m.participant?.id)
      .filter(id => id);

  eventFilteredList.value[index] = participants.value
      .filter(p =>
          !selectedIds.includes(p.id) &&
          (p.searchName?.includes(search) || p.name?.toLowerCase().includes(search))
      )
      .slice(0, 5);
};

const selectEventParticipant = (index, participant) => {
  eventMatches.value[index].participant = participant;
  eventMatches.value[index].search = participant.name;
  eventFilteredList.value[index] = [];
};

// Handlers
const handleAddParticipant = async () => {
  try {
    await addParticipant(newParticipantName.value);
    showSuccess('Participant added successfully!');
    newParticipantName.value = '';
    await getParticipants();
  } catch (error) {
    showError('Failed to add participant');
  }
};

// Match result handler
const submitMatchResult = async (resultType) => {
  if (!selectedMatch.value) return;

  try {
    await addMatchResult(selectedMatch.value.id, resultType, currentAdminId.value);
    const resultLabels = { win: 'Victory', draw: 'Draw', loss: 'Loss' };
    showSuccess(`${resultLabels[resultType]} recorded for ${selectedMatch.value.name}!`);
    matchSearch.value = '';
    selectedMatch.value = null;
    await getParticipants();
  } catch (error) {
    showError('Failed to record match result');
  }
};

const handleMatchResult = async () => {
  // This is handled by submitMatchResult buttons
};

// Event results handler
const handleEventResults = async () => {
  if (validEventMatches.value.length === 0) {
    showError('Please add at least one match result');
    return;
  }

  const results = validEventMatches.value.map(match => ({
    participantId: match.participant.id,
    participantName: match.participant.name,
    result: match.result
  }));

  try {
    await addEventResults(results, eventName.value || 'Competitive Event', currentAdminId.value);
    showSuccess('Event results submitted successfully!');
    eventName.value = '';
    eventMatches.value = [{ search: '', result: '', participant: null }];
    eventFilteredList.value = {};
    await getParticipants();
  } catch (error) {
    showError('Failed to submit event results');
  }
};

// Deactivate/Reactivate handlers
const confirmDeactivate = (participant) => {
  if (confirm(`Deactivate "${participant.name}"?\n\nThey will be hidden from the leaderboard but their data will be preserved. You can reactivate them later.`)) {
    handleDeactivateParticipant(participant.id);
  }
};

const handleDeactivateParticipant = async (participantId) => {
  try {
    await deactivateParticipant(participantId);
    showSuccess('Participant deactivated successfully!');
    await getParticipants();
  } catch (error) {
    showError('Failed to deactivate participant');
  }
};

const confirmReactivate = (participant) => {
  if (confirm(`Reactivate "${participant.name}"?\n\nThey will be visible on the leaderboard again.`)) {
    handleReactivateParticipant(participant.id);
  }
};

const handleReactivateParticipant = async (participantId) => {
  try {
    await reactivateParticipant(participantId);
    showSuccess('Participant reactivated successfully!');
    await getParticipants();
  } catch (error) {
    showError('Failed to reactivate participant');
  }
};

const confirmPermanentDelete = (participant) => {
  if (confirm(`⚠️ PERMANENT DELETE "${participant.name}"?\n\n⚠️ WARNING: This action CANNOT be undone!\n- All their points will be lost\n- All history will be deleted\n- They cannot be recovered\n\nAre you absolutely sure?`)) {
    handlePermanentDelete(participant.id);
  }
};

const handlePermanentDelete = async (participantId) => {
  try {
    await permanentDeleteParticipant(participantId);
    showSuccess('Participant permanently deleted!');
    await getParticipants();
  } catch (error) {
    showError('Failed to permanently delete participant');
  }
};

// Adjustment handler
const handleAdjustment = async () => {
  if (!selectedAdjustment.value || !adjustmentReason.value) return;

  try {
    await adjustPoints(
        selectedAdjustment.value.id,
        adjustmentPoints.value,
        adjustmentReason.value,
        currentAdminId.value
    );
    showSuccess(`Points adjusted for ${selectedAdjustment.value.name}!`);
    adjustmentSearch.value = '';
    selectedAdjustment.value = null;
    adjustmentPoints.value = 0;
    adjustmentReason.value = '';
    await getParticipants();
  } catch (error) {
    showError('Failed to adjust points');
  }
};

// Toast messages
const showSuccess = (message) => {
  successMessage.value = message;
  setTimeout(() => successMessage.value = '', 3000);
};

const showError = (message) => {
  errorMessage.value = message;
  setTimeout(() => errorMessage.value = '', 3000);
};
</script>

<style scoped>
.admin-dashboard {
  padding: 2rem 0;
}

.page-title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  text-align: center;
  color: var(--color-accent);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--color-border);
  overflow-x: auto;
}

.tab-btn {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--color-accent);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

/* Card */
.card-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* Dropdown */
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent);
  border-radius: 0.375rem;
  margin-top: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.dropdown-item {
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--color-border);
}

.dropdown-item:hover {
  background: var(--color-bg-card);
}

/* Match Result Options */
.match-result-options {
  padding: 1.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent);
  border-radius: 0.5rem;
}

.participant-info {
  margin-bottom: 1.5rem;
}

.participant-info h3 {
  margin-bottom: 0.5rem;
  color: var(--color-accent);
}

.participant-info p {
  color: var(--color-text-secondary);
  margin: 0.25rem 0;
}

.result-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.btn-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border: 2px solid;
  border-radius: 0.5rem;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  min-height: 100px;
}

.result-icon {
  font-size: 2rem;
}

.result-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.result-label {
  font-size: 1rem;
}

.result-points {
  font-size: 0.875rem;
  opacity: 0.8;
}

.btn-win {
  border-color: #22c55e;
  color: #22c55e;
}

.btn-win:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.1);
  transform: translateY(-2px);
}

.btn-draw {
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-draw:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.1);
  transform: translateY(-2px);
}

.btn-loss {
  border-color: #ef4444;
  color: #ef4444;
}

.btn-loss:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  transform: translateY(-2px);
}

/* Event Section */
.event-section {
  padding: 1.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.event-subtitle {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--color-text-primary);
}

.match-entries {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.match-entry {
  padding: 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
}

.match-number {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.match-inputs {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.input-group-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}

.input-group-vertical label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.btn-remove {
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 0.375rem;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-end;
}

.btn-remove:hover {
  background: #ef4444;
  color: white;
}

.match-preview {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0;
  border-top: 1px solid var(--color-border);
}

/* Event Preview */
.event-preview {
  padding: 1.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent);
  border-radius: 0.5rem;
}

.event-preview h3 {
  margin-bottom: 1rem;
  color: var(--color-accent);
}

.preview-item {
  padding: 0.75rem;
  background: var(--color-bg-card);
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  display: grid;
  grid-template-columns: 1.5fr 0.8fr 1.5fr;
  gap: 1rem;
  align-items: center;
}

.preview-name {
  font-weight: 600;
}

.preview-result {
  padding: 0.25rem 0.75rem;
  background: var(--color-accent);
  color: white;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
}

.preview-change {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* Adjustment */
.adjustment-preview {
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

/* Toasts */
.success-toast,
.error-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.success-toast {
  background: rgba(132, 204, 22, 0.2);
  border: 1px solid #84cc16;
  color: #84cc16;
}

.error-toast {
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Participant Management Styles */
.add-participant-form {
  margin-bottom: 2rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.input-group .input {
  flex: 1;
}

.input-group .btn {
  white-space: nowrap;
}

.divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 2rem 0;
}

.participants-section {
  margin-top: 1rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.list-header h3 {
  color: var(--color-text-primary);
  margin: 0;
}

.search-box-small {
  position: relative;
  width: 300px;
}

.search-icon-small {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
}

.input-small {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.input-small:focus {
  outline: none;
  border-color: var(--color-accent);
}

.loading-small {
  text-align: center;
  padding: 2rem;
}

.spinner-small {
  width: 30px;
  height: 30px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 0.5rem;
}

.participants-table-container {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.participants-table {
  width: 100%;
  border-collapse: collapse;
}

.participants-table thead {
  background: var(--color-bg-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.participants-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  border-bottom: 2px solid var(--color-border);
}

.participants-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.participants-table tbody tr:hover {
  background: var(--color-bg-secondary);
}

.participants-table tbody tr.inactive-row {
  opacity: 0.5;
}

.rank-cell {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inactive-badge {
  background: rgba(220, 38, 38, 0.2);
  color: var(--color-accent);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.points-cell {
  font-weight: 600;
  color: var(--color-accent);
}

.tier-cell {
  text-align: center;
}

.tier-badge-small {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: bold;
  font-size: 1rem;
  color: white;
}

.record-cell {
  text-align: center;
}

.record-label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.actions-cell {
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-deactivate,
.btn-reactivate,
.btn-permanent-delete {
  padding: 0.5rem 0.75rem;
  border: 1px solid;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.btn-deactivate {
  background: rgba(251, 191, 36, 0.1);
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-deactivate:hover:not(:disabled) {
  background: #f59e0b;
  color: white;
}

.btn-reactivate {
  background: rgba(34, 197, 94, 0.1);
  border-color: #22c55e;
  color: #22c55e;
}

.btn-reactivate:hover:not(:disabled) {
  background: #22c55e;
  color: white;
}

.btn-permanent-delete {
  background: rgba(220, 38, 38, 0.1);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-permanent-delete:hover:not(:disabled) {
  background: var(--color-accent);
  color: white;
  transform: scale(1.05);
}

.btn-deactivate:disabled,
.btn-reactivate:disabled,
.btn-permanent-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-participants {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

@media (max-width: 1024px) {
  .search-box-small {
    width: 100%;
  }

  .participants-table {
    font-size: 0.875rem;
  }

  .participants-table th,
  .participants-table td {
    padding: 0.5rem;
  }

  .match-inputs {
    grid-template-columns: 1fr;
  }

  .btn-remove {
    align-self: flex-start;
  }
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-box-small {
    width: 100%;
  }

  .participants-table-container {
    overflow-x: scroll;
  }

  .participants-table {
    min-width: 600px;
  }

  .result-buttons {
    grid-template-columns: 1fr;
  }

  .preview-item {
    grid-template-columns: 1fr;
  }
}
</style>