/**
 * Why a server feature is not available right now, said the way the learner can act on it: no connection
 * is "come back online", a service that is down is "try again in a moment" (the learner cannot fix a server).
 */
export function unavailableNote(what: string, online: boolean = typeof navigator === 'undefined' || navigator.onLine): string {
  return online
    ? `${what} şu an kullanılamıyor. Biraz sonra yeniden dene; uygulamanın geri kalanı aynen çalışır.`
    : `İnternet yok: ${what.toLocaleLowerCase('tr')} bağlantı gelince çalışır. Uygulamanın geri kalanı aynen çalışır.`
}
