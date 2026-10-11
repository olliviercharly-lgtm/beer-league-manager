// Banque d'excuses bidons proposées dans la pop-up "Forfait".
// On en tire 3 au hasard à chaque ouverture (et à chaque clic sur "Autres excuses").
export const FORFAIT_EXCUSES: string[] = [
  "Mon chat a caché mes protège-tibias et refuse de négocier.",
  "Je suis en garde à vue pour excès de style sur la glace.",
  "Ma belle-mère vient dîner, j'ai besoin de tout mon courage ailleurs.",
  "Mes patins sont partis en vacances sans moi.",
  "J'ai promis à ma crosse une soirée en tête-à-tête.",
  "Je dois regarder un match de curling, c'est pour ma culture tactique.",
  "Mon horoscope m'interdit formellement tout contact avec la glace.",
  "Je fais une cure de désintox… de défaites.",
  "Mon sac de hockey sent tellement fort qu'il a été placé en quarantaine.",
  "Je suis coincé dans un tournoi de pétanque qui a dégénéré.",
  "Le Zamboni m'a ghosté, j'ai besoin de temps.",
  "J'ai un rendez-vous chez l'ostéo suite à ma dernière mise en échec… contre la bande.",
  "Ma femme a découvert le prix de mes nouvelles crosses.",
  "Je dois apprendre à freiner avant de revenir.",
  "Mon GPS ne connaît pas le chemin de la patinoire, et moi non plus.",
  "Je participe au championnat régional de sieste.",
  "Mon coiffeur m'a dit d'éviter le casque pendant 48 h.",
  "Je suis en pleine négociation de transfert avec l'équipe d'en face.",
  "J'ai prêté mes jambières au gardien des U9, il ne veut plus les rendre.",
  "Je garde mon énergie pour la troisième mi-temps de la semaine prochaine.",
  "Mon palet porte-bonheur a disparu, je ne joue pas sans lui.",
  "Le canapé m'a fait une offre que je ne pouvais pas refuser.",
  "Ma Playstation a besoin de moi pour un match de NHL, c'est presque pareil.",
  "J'ai perdu un pari, je dois passer la soirée en tutu.",
  "Je dois réapprendre à lacer mes patins, le tuto YouTube fait 3 heures.",
  "Mon médecin m'a prescrit du repos… et une bière, mais pas sur la glace.",
  "Je suis à court de ruban adhésif, impossible de jouer dans ces conditions.",
  "Ma voiture a refusé de démarrer en apprenant qu'on jouait contre les autres.",
  "Je fais du babysitting pour les enfants du coach adverse (espionnage).",
  "La lune est en Capricorne, mon tir du poignet n'y survivrait pas.",
]

export function pickExcuses(count = 3, exclude: string[] = []): string[] {
  const pool = FORFAIT_EXCUSES.filter((e) => !exclude.includes(e))
  const source = pool.length >= count ? pool : FORFAIT_EXCUSES
  const shuffled = [...source]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
