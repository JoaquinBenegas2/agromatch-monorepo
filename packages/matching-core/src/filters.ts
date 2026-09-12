import type { Capability, FilterResult, GeoPoint, Need, Provider, TimeWindow } from '@org/shared-types';

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  return new Date(a.from).getTime() <= new Date(b.to).getTime() && new Date(b.from).getTime() <= new Date(a.to).getTime();
}

function daysInWindow(window: TimeWindow): number {
  const from = new Date(window.from).getTime();
  const to = new Date(window.to).getTime();
  return Math.max(0, (to - from) / (1000 * 60 * 60 * 24));
}

/**
 * M2 (RN-31): filtros duros del núcleo genérico, en orden, un `FilterResult`
 * por regla (todas comparten `rule: 'RN-31'`). Un candidato descartado por
 * cualquiera de estos va a `excluded` con el motivo en `detail`.
 */
export function hardFilters(need: Need, cap: Capability, prov: Provider): FilterResult[] {
  const { where, window } = need;
  const results: FilterResult[] = [];

  results.push(
    cap.category === need.category
      ? { rule: 'RN-31', passed: true, detail: `Categoría ${cap.category} coincide con la necesidad` }
      : { rule: 'RN-31', passed: false, detail: `Categoría ${cap.category} no coincide con la necesidad ${need.category}` },
  );

  // Una necesidad que no declara dónde (el matching genético: el semen viaja
  // por correo) no se puede medir contra un radio de cobertura. Lo mismo para
  // una necesidad sintética (la arma un vertical para una hembra puntual,
  // ADR-0002) aunque traiga un `where` de marcador. No se inventa una
  // ubicación ni se descarta al candidato: el filtro no aplica y el vertical
  // decide con sus propios filtros (RN-05/RN-06/RN-13).
  if (need.synthetic) {
    results.push({ rule: 'RN-31', passed: true, detail: 'Necesidad sintética: la cobertura geográfica no aplica' });
  } else if (!where) {
    results.push({ rule: 'RN-31', passed: true, detail: 'La necesidad no declara ubicación: no se evalúa cobertura' });
  } else {
    const distanceKm = haversineKm(where, prov.base);
    const radiusKm = cap.coverageRadiusKm;
    results.push(
      distanceKm <= radiusKm
        ? { rule: 'RN-31', passed: true, detail: `A ${distanceKm.toFixed(1)} km, dentro del radio de cobertura de ${radiusKm} km` }
        : { rule: 'RN-31', passed: false, detail: `A ${distanceKm.toFixed(1)} km, fuera del radio de cobertura de ${radiusKm} km` },
    );
  }

  if (need.synthetic) {
    results.push({ rule: 'RN-31', passed: true, detail: 'Necesidad sintética: la ventana de fechas no aplica' });
  } else if (!window) {
    results.push({ rule: 'RN-31', passed: true, detail: 'La necesidad no declara ventana: no se evalúa disponibilidad' });
  } else {
    const hasOverlap = cap.availability.length === 0 || cap.availability.some((slot) => overlaps(window, slot));
    results.push(
      hasOverlap
        ? { rule: 'RN-31', passed: true, detail: 'Disponible dentro de la ventana solicitada' }
        : { rule: 'RN-31', passed: false, detail: 'Sin disponibilidad que se superponga con la ventana solicitada' },
    );
  }

  if (need.magnitude && cap.capacityPerDay && window) {
    const days = daysInWindow(window);
    const capacityInWindow = cap.capacityPerDay.value * days;
    const enough = capacityInWindow >= need.magnitude.value;
    results.push(
      enough
        ? { rule: 'RN-31', passed: true, detail: `Capacidad de ${capacityInWindow} ${need.magnitude.unit} en la ventana, alcanza lo pedido (${need.magnitude.value})` }
        : { rule: 'RN-31', passed: false, detail: `Capacidad de ${capacityInWindow} ${need.magnitude.unit} en la ventana, no alcanza lo pedido (${need.magnitude.value})` },
    );
  } else {
    results.push({ rule: 'RN-31', passed: true, detail: 'Sin magnitud o capacidad declarada: no aplica' });
  }

  const requiredCerts = need.constraints.filter((c) => c.startsWith('cert:'));
  const missingCerts = requiredCerts.filter((c) => !cap.certifications.includes(c));
  results.push(
    missingCerts.length === 0
      ? { rule: 'RN-31', passed: true, detail: 'Cumple las certificaciones exigidas' }
      : { rule: 'RN-31', passed: false, detail: `Faltan certificaciones exigidas: ${missingCerts.join(', ')}` },
  );

  return results;
}
