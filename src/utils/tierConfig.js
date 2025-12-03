// utils/tierConfig.js

export const TIER_THRESHOLDS = [
    { tier: 'S', minPoints: 150, color: '#dc2626' },
    { tier: 'A', minPoints: 120, color: '#ea580c' },
    { tier: 'B', minPoints: 85, color: '#f59e0b' },
    { tier: 'C', minPoints: 50, color: '#84cc16' },
    { tier: 'D', minPoints: 25, color: '#06b6d4' },
    { tier: 'F', minPoints: 0, color: '#6b7280' }
];

export const POINTS_CONFIG = {
    competitive: {
        win: 3,
        loss: 0,
        draw: 1
    },
    // Mantener legacy para referencia histórica si es necesario
    legacy: {
        casualWin: 2,
        tournament: {
            first: 8,
            second: 7,
            third: 6,
            fourth: 5
        }
    }
};

export function getTierFromPoints(points) {
    for (const tier of TIER_THRESHOLDS) {
        if (points >= tier.minPoints) {
            return tier;
        }
    }
    return TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];
}

export function getTierColor(tierName) {
    const tier = TIER_THRESHOLDS.find(t => t.tier === tierName);
    return tier?.color || '#6b7280';
}

export function getPointsForPosition(position) {
    const points = {
        1: POINTS_CONFIG.legacy.tournament.first,
        2: POINTS_CONFIG.legacy.tournament.second,
        3: POINTS_CONFIG.legacy.tournament.third,
        4: POINTS_CONFIG.legacy.tournament.fourth
    };
    return points[position] || 0;
}

export function getPointsForResult(resultType) {
    const competitivePoints = POINTS_CONFIG.competitive;
    switch(resultType) {
        case 'win':
            return competitivePoints.win;
        case 'loss':
            return competitivePoints.loss;
        case 'draw':
            return competitivePoints.draw;
        default:
            return 0;
    }
}