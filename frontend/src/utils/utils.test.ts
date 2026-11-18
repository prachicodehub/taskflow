import { describe, expect, it } from 'vitest';
import { isOverdue, todayIso } from './date';
import { getTokenExpiry, isTokenExpired } from './token';
import { validateRegister } from './validation';

function fakeJwt(payload: object): string {
  const encode = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

describe('token utils', () => {
  it('reads the exp claim in milliseconds', () => {
    expect(getTokenExpiry(fakeJwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it('treats garbage and past tokens as expired', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
    expect(isTokenExpired(fakeJwt({ exp: 1 }))).toBe(true);
    expect(isTokenExpired(fakeJwt({ exp: Math.floor(Date.now() / 1000) + 600 }))).toBe(false);
  });
});

describe('date utils', () => {
  const now = new Date(2026, 10, 18); // 18 Nov 2026, local time

  it('formats today as yyyy-MM-dd', () => {
    expect(todayIso(now)).toBe('2026-11-18');
  });

  it('flags only unfinished tasks with a past due date', () => {
    expect(isOverdue({ dueDate: '2026-11-17', status: 'TODO' }, now)).toBe(true);
    expect(isOverdue({ dueDate: '2026-11-18', status: 'TODO' }, now)).toBe(false);
    expect(isOverdue({ dueDate: '2026-11-17', status: 'DONE' }, now)).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'TODO' }, now)).toBe(false);
  });
});

describe('validateRegister', () => {
  it('mirrors the backend password rule', () => {
    expect(validateRegister({ name: 'A', email: 'a@b.co', password: 'short1' }).password).toBeDefined();
    expect(validateRegister({ name: 'A', email: 'a@b.co', password: 'onlyletters' }).password).toBeDefined();
    expect(validateRegister({ name: 'A', email: 'a@b.co', password: 'letters123' })).toEqual({});
  });
});
