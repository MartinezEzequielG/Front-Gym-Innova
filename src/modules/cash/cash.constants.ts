export const MOVEMENT_TYPES = ['INCOME', 'EXPENSE', 'ADJUSTMENT'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const;
export type MovementMethod = (typeof MOVEMENT_METHODS)[number];