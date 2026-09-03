import { CampusInfo } from '../types';

export const CAMPUSES: Record<string, CampusInfo> = {
  nicoya: {
    id: 'nicoya',
    name: 'Nicoya',
    fullName: 'Sede Regional Chorotega — Campus Nicoya',
    libraryName: 'Biblioteca Nayuribe',
    location: 'Nicoya, Guanacaste',
    code: 'BIB-NAY-01',
    description: 'Atención a la comunidad universitaria y regional en Nicoya. Registro de servicios de consulta, préstamo, salas de estudio y capacitaciones.',
    schedule: 'Lunes a Viernes: 7:00 am - 7:00 pm',
    contactEmail: 'biblioteca.nayuribe@una.cr',
    phone: '+506 2562-6200',
    badge: 'Campus Nicoya',
    statsPreview: {
      monthlyAttentions: 1240,
      loansActive: 312,
      satisfactionRate: '98.5%'
    }
  },
  liberia: {
    id: 'liberia',
    name: 'Liberia',
    fullName: 'Sede Regional Chorotega — Campus Liberia',
    libraryName: 'Biblioteca Rose Marie Ruiz Bravo',
    location: 'Liberia, Guanacaste',
    code: 'BIB-RMRB-02',
    description: 'Atención especializada en recursos digitales, repositorio institucional y bibliotecología en el Campus Liberia.',
    schedule: 'Lunes a Viernes: 7:00 am - 7:00 pm',
    contactEmail: 'biblioteca.liberia@una.cr',
    phone: '+506 2562-6300',
    badge: 'Campus Liberia',
    statsPreview: {
      monthlyAttentions: 1480,
      loansActive: 405,
      satisfactionRate: '99.1%'
    }
  }
};
