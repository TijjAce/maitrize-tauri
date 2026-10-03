// Les écritures du cahier journal qui attendent encore leur enregistrement :
// on n'écrit qu'après une pause de frappe.
//
// À part du cahier journal lui-même : le versement d'une dictée du téléphone,
// qui tourne en tâche de fond, doit savoir qu'un bilan est en train de
// s'écrire — pour ne pas le toucher — sans charger tout l'écran du cahier.

export const enAttente = new Map<string, () => Promise<void>>();

/** Un bilan est-il en train de s'écrire dans le cahier journal ? Le versement d'une dictée attend alors son tour. */
export const bilanEnCoursDEcriture = (creneauId: string) => enAttente.has(creneauId);
