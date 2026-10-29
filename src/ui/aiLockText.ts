export type Helper = 'ai' | 'speech' | 'voice'

const NAME: Record<Helper, string> = { ai: 'YZ özellikleri', speech: 'Telaffuz puanı', voice: 'Doğal ses' }

/** Why a paid helper is not there, in one sentence: the owner opens it per account; nobody brings a key. */
export const lockedText = (helper: Helper = 'ai') => `${NAME[helper]} hesabında henüz açık değil. Site sahibi açınca burada kendiliğinden kullanılabilir olur; anahtar girmen gerekmez.`
