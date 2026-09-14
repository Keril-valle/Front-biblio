import { describe, expect, it } from 'vitest';
import type { UserSession } from '../types';
import { switchCampusSession } from './campus';

const session: UserSession = {
  accessToken: 'tok',
  email: 'jefa@una.cr',
  role: 'jefa',
  campus: 'nicoya',
  campusId: 1,
  name: 'Jefa Nicoya',
  userId: 'u-1',
};

describe('switchCampusSession', () => {
  it('cambia de Nicoya a Liberia manteniendo la sesión', () => {
    const next = switchCampusSession(session);
    expect(next.campus).toBe('liberia');
    expect(next.campusId).toBe(2);
    expect(next.accessToken).toBe('tok');
    expect(next.role).toBe('jefa');
    expect(next.name).toBe('Jefa Nicoya');
  });

  it('cambia de Liberia a Nicoya', () => {
    const next = switchCampusSession({ ...session, campus: 'liberia', campusId: 2 });
    expect(next.campus).toBe('nicoya');
    expect(next.campusId).toBe(1);
  });
});
