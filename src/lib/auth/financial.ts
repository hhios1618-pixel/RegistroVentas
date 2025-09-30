// src/lib/auth/financial.ts

export const FINANCIAL_CONTROL_IDS: string[] = [
  '32c53c5d-cf04-425c-a50d-4c016df61d7f',
  'c23ba0b8-d289-4a0e-94f1-fc4b7a7fb88d',
  '07b93705-f631-4b67-b52a-f7c30bc2ba5b',
  '28b63f71-babb-4ee0-8c2a-8530007735b7',
];

type MeShape = {
  id?: string | null;
  person_pk?: string | null;
} | null | undefined;

export const hasFinancialAccess = (me: MeShape): boolean => {
  if (!me) return false;
  const id = me.person_pk ?? me.id ?? null;
  return id ? FINANCIAL_CONTROL_IDS.includes(id) : false;
};
