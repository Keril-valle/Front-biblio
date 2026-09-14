import { CampusId, UserSession } from '../types';

// Mapeo al campus contrario (IDs de sede según el backend: 1 = Nicoya, 2 = Liberia).
export const OTHER_CAMPUS: Record<CampusId, { campus: CampusId; campusId: number }> = {
  nicoya: { campus: 'liberia', campusId: 2 },
  liberia: { campus: 'nicoya', campusId: 1 },
};

// La jefa opera en su campus de sesión: cambiar de campus es mutar la
// sesión al contrario, sin cerrar sesión ni pedir login de nuevo.
// La bibliotecóloga nunca usa esto (su sede viene del JWT).
export function switchCampusSession(session: UserSession): UserSession {
  const other = OTHER_CAMPUS[session.campus];
  return { ...session, campus: other.campus, campusId: other.campusId };
}
