import fr from '../data/conjugation/fr.txt?raw'
import es from '../data/conjugation/es.txt?raw'
import { addConjugations } from './conjugation'

/**
 * Present-tense forms from UniMorph (CC BY-SA 3.0) for ~870 common French and Spanish verbs the
 * hand tables and safe rules don't cover (or get wrong: demostrar → demuestro). Built by
 * scripts/build-conjugations.ts; imported once at start-up, before any exercise is made.
 */
addConjugations('fr', fr)
addConjugations('es', es)
