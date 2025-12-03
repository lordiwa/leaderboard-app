// composables/useFirestore.js
import { ref } from 'vue';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getTierFromPoints, getPointsForResult } from '../utils/tierConfig';

export function useFirestore() {
    const participants = ref([]);
    const loading = ref(false);
    const error = ref(null);

    // Real-time listener for participants
    const subscribeToParticipants = (callback) => {
        const q = query(
            collection(db, 'participants'),
            orderBy('totalPoints', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            // Calculate ranks only for active participants
            let rank = 1;
            const rankedData = data.map(participant => {
                if (participant.active !== false) {
                    return { ...participant, rank: rank++ };
                }
                return { ...participant, rank: null };
            });

            participants.value = rankedData;
            if (callback) callback(rankedData);
        }, (err) => {
            error.value = err.message;
            console.error('Error fetching participants:', err);
        });
    };

    // Get all participants
    const getParticipants = async () => {
        loading.value = true;
        error.value = null;
        try {
            const q = query(
                collection(db, 'participants'),
                orderBy('totalPoints', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            // Calculate ranks only for active participants
            let rank = 1;
            const rankedData = data.map(participant => {
                if (participant.active !== false) {
                    return { ...participant, rank: rank++ };
                }
                return { ...participant, rank: null };
            });

            participants.value = rankedData;
            return participants.value;
        } catch (err) {
            error.value = err.message;
            console.error('Error fetching participants:', err);
            return [];
        } finally {
            loading.value = false;
        }
    };

    // Add new participant
    const addParticipant = async (name) => {
        loading.value = true;
        error.value = null;
        try {
            const participantData = {
                name,
                searchName: name.toLowerCase(),
                totalPoints: 0,
                category: 'F',
                wins: 0,
                losses: 0,
                draws: 0,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                active: true
            };

            const docRef = await addDoc(collection(db, 'participants'), participantData);
            return { id: docRef.id, ...participantData };
        } catch (err) {
            error.value = err.message;
            console.error('Error adding participant:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    // Add competitive match result (Win/Loss/Draw)
    const addMatchResult = async (participantId, resultType, adminId) => {
        loading.value = true;
        error.value = null;
        try {
            if (!['win', 'loss', 'draw'].includes(resultType)) {
                throw new Error('Invalid result type. Must be win, loss, or draw');
            }

            const participantRef = doc(db, 'participants', participantId);
            const participantSnap = await getDoc(participantRef);

            if (!participantSnap.exists()) {
                throw new Error('Participant not found');
            }

            const data = participantSnap.data();
            const previousPoints = data.totalPoints || 0;
            const pointsToAdd = getPointsForResult(resultType);
            const newPoints = previousPoints + pointsToAdd;
            const previousCategory = data.category;
            const newCategory = getTierFromPoints(newPoints).tier;

            // Update participant stats
            const updateData = {
                totalPoints: newPoints,
                category: newCategory,
                lastUpdated: serverTimestamp()
            };

            // Increment appropriate counter
            if (resultType === 'win') {
                updateData.wins = (data.wins || 0) + 1;
            } else if (resultType === 'loss') {
                updateData.losses = (data.losses || 0) + 1;
            } else if (resultType === 'draw') {
                updateData.draws = (data.draws || 0) + 1;
            }

            await updateDoc(participantRef, updateData);

            // Log history
            await addDoc(collection(db, 'pointHistory'), {
                participantId,
                participantName: data.name,
                pointSource: 'competitive-match',
                matchResult: resultType,
                pointsChanged: pointsToAdd,
                previousPoints,
                newPoints,
                previousCategory,
                newCategory,
                adminId,
                timestamp: serverTimestamp()
            });

            return {
                previousPoints,
                newPoints,
                previousCategory,
                newCategory,
                pointsAdded: pointsToAdd
            };
        } catch (err) {
            error.value = err.message;
            console.error('Error adding match result:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    // Add multiple match results in a single event (e.g., tournament round)
    const addEventResults = async (results, eventName, adminId) => {
        loading.value = true;
        error.value = null;
        try {
            const batch = writeBatch(db);
            const eventRef = doc(collection(db, 'tournaments'));
            const updates = [];

            // Process each result
            for (const result of results) {
                const participantRef = doc(db, 'participants', result.participantId);
                const participantSnap = await getDoc(participantRef);

                if (!participantSnap.exists()) continue;

                const data = participantSnap.data();
                const previousPoints = data.totalPoints || 0;
                const pointsToAdd = getPointsForResult(result.result);
                const newPoints = previousPoints + pointsToAdd;
                const previousCategory = data.category;
                const newCategory = getTierFromPoints(newPoints).tier;

                // Update participant
                const updateData = {
                    totalPoints: newPoints,
                    category: newCategory,
                    lastUpdated: serverTimestamp()
                };

                // Increment appropriate counters
                if (result.result === 'win') {
                    updateData.wins = (data.wins || 0) + 1;
                } else if (result.result === 'loss') {
                    updateData.losses = (data.losses || 0) + 1;
                } else if (result.result === 'draw') {
                    updateData.draws = (data.draws || 0) + 1;
                }

                batch.update(participantRef, updateData);

                // Add to history
                const historyRef = doc(collection(db, 'pointHistory'));
                batch.set(historyRef, {
                    participantId: result.participantId,
                    participantName: data.name,
                    pointSource: 'competitive-event',
                    matchResult: result.result,
                    pointsChanged: pointsToAdd,
                    previousPoints,
                    newPoints,
                    previousCategory,
                    newCategory,
                    eventId: eventRef.id,
                    eventName: eventName,
                    adminId,
                    timestamp: serverTimestamp()
                });

                updates.push({
                    name: data.name,
                    result: result.result,
                    pointsAdded: pointsToAdd,
                    previousPoints,
                    newPoints,
                    previousCategory,
                    newCategory
                });
            }

            // Save event record
            batch.set(eventRef, {
                date: serverTimestamp(),
                name: eventName || 'Competitive Event',
                results: results.map(r => ({
                    participantId: r.participantId,
                    participantName: r.participantName,
                    result: r.result
                })),
                adminId,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            return updates;
        } catch (err) {
            error.value = err.message;
            console.error('Error adding event results:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    // Manual adjustment
    const adjustPoints = async (participantId, pointsToAdd, reason, adminId) => {
        loading.value = true;
        error.value = null;
        try {
            const participantRef = doc(db, 'participants', participantId);
            const participantSnap = await getDoc(participantRef);

            if (!participantSnap.exists()) {
                throw new Error('Participant not found');
            }

            const data = participantSnap.data();
            const previousPoints = data.totalPoints || 0;
            const newPoints = Math.max(0, previousPoints + pointsToAdd); // Can't go below 0
            const previousCategory = data.category;
            const newCategory = getTierFromPoints(newPoints).tier;

            // Update participant
            await updateDoc(participantRef, {
                totalPoints: newPoints,
                category: newCategory,
                lastUpdated: serverTimestamp()
            });

            // Log history
            await addDoc(collection(db, 'pointHistory'), {
                participantId,
                participantName: data.name,
                pointSource: 'adjustment',
                pointsChanged: pointsToAdd,
                previousPoints,
                newPoints,
                previousCategory,
                newCategory,
                note: reason,
                adminId,
                timestamp: serverTimestamp()
            });

            return { previousPoints, newPoints, previousCategory, newCategory };
        } catch (err) {
            error.value = err.message;
            console.error('Error adjusting points:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    // Deactivate participant (soft delete)
    const deactivateParticipant = async (participantId) => {
        loading.value = true;
        error.value = null;
        try {
            const participantRef = doc(db, 'participants', participantId);
            await updateDoc(participantRef, {
                active: false,
                lastUpdated: serverTimestamp()
            });
            return true;
        } catch (err) {
            error.value = err.message;
            console.error('Error deactivating participant:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    // Reactivate participant
    const reactivateParticipant = async (participantId) => {
        loading.value = true;
        error.value = null;
        try {
            const participantRef = doc(db, 'participants', participantId);
            await updateDoc(participantRef, {
                active: true,
                lastUpdated: serverTimestamp()
            });
            return true;
        } catch (err) {
            error.value = err.message;
            console.error('Error reactivating participant:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    // Permanent delete participant (hard delete)
    const permanentDeleteParticipant = async (participantId) => {
        loading.value = true;
        error.value = null;
        try {
            const participantRef = doc(db, 'participants', participantId);
            await deleteDoc(participantRef);
            console.log('Successfully deleted participant:', participantId);
            return true;
        } catch (err) {
            error.value = err.message;
            console.error('Error permanently deleting participant:', err);
            console.error('Error code:', err.code);
            console.error('Full error:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    return {
        participants,
        loading,
        error,
        subscribeToParticipants,
        getParticipants,
        addParticipant,
        addMatchResult,
        addEventResults,
        adjustPoints,
        deactivateParticipant,
        reactivateParticipant,
        permanentDeleteParticipant
    };
}