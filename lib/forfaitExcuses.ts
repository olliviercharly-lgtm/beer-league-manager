// Banque d'excuses bidons proposées dans la pop-up "Forfait".
// On en tire 3 au hasard à chaque ouverture (et à chaque clic sur "Autres excuses").
export const FORFAIT_EXCUSES: string[] = [
  // --- Le matos ---
  "Mon chat a caché mes protège-tibias et refuse de négocier.",
  "Mes patins sont partis en vacances sans moi.",
  "J'ai promis à ma crosse une soirée en tête-à-tête.",
  "Mon sac de hockey sent tellement fort qu'il a été placé en quarantaine.",
  "J'ai prêté mes jambières au gardien des U9, il ne veut plus les rendre.",
  "Mon palet porte-bonheur a disparu, je ne joue pas sans lui.",
  "Je suis à court de ruban adhésif, impossible de jouer dans ces conditions.",
  "Je dois réapprendre à lacer mes patins, le tuto YouTube fait 3 heures.",
  "Mes gants sèchent depuis le dernier match. On est sur une estimation à mars.",
  "Mon casque a rétréci au lavage. Ou alors c'est ma tête qui a gonflé après mon dernier but.",
  "Ma crosse est en arrêt maladie, elle a fait un burn-out après mes derniers tirs.",
  "Mon affûteur est en grève, mes lames coupent autant qu'une cuillère.",
  "J'ai mis ma coquille à l'envers la dernière fois, je suis encore en rééducation.",
  "Mon sac est resté dans le coffre depuis dimanche dernier. Personne n'ose l'ouvrir.",

  // --- La vie perso (version bidon) ---
  "Ma belle-mère vient dîner, j'ai besoin de tout mon courage ailleurs.",
  "Ma femme a découvert le prix de mes nouvelles crosses.",
  "J'ai perdu un pari, je dois passer la soirée en tutu.",
  "Je fais du babysitting pour les enfants du coach adverse (espionnage).",
  "C'est l'anniversaire de mon poisson rouge, il ne me le pardonnerait pas.",
  "Je monte un meuble IKEA. Il me reste 147 vis et aucun espoir.",
  "Ma moitié m'a donné le choix entre le hockey et le canapé. Je réfléchis encore.",
  "Mon voisin fait une soirée raclette, et j'ai des principes.",
  "Je suis témoin à un mariage… de pigeons sur mon balcon.",
  "Ma mère a appelé, et je suis encore au téléphone.",
  "J'ai rendez-vous avec mon banquier pour justifier mes dépenses en bière.",
  "Mon chien m'a regardé avec ses grands yeux. J'ai craqué.",

  // --- Santé imaginaire ---
  "Mon horoscope m'interdit formellement tout contact avec la glace.",
  "J'ai un rendez-vous chez l'ostéo suite à ma dernière mise en échec… contre la bande.",
  "Mon médecin m'a prescrit du repos… et une bière, mais pas sur la glace.",
  "Mon coiffeur m'a dit d'éviter le casque pendant 48 h.",
  "Je me suis claqué un muscle en me levant du canapé pour aller au frigo.",
  "J'ai une crampe préventive. Elle n'est pas encore là, mais je la sens venir.",
  "Mon cardio est resté coincé en 2019.",
  "Je suis allergique aux défaites, mon médecin préfère ne pas prendre de risque.",
  "J'ai mal au dos depuis que j'ai porté l'équipe la dernière fois.",
  "Mes chevilles demandent une pause syndicale.",

  // --- Logistique douteuse ---
  "Mon GPS ne connaît pas le chemin de la patinoire, et moi non plus.",
  "Ma voiture a refusé de démarrer en apprenant qu'on jouait contre les autres.",
  "Je suis coincé dans les bouchons… depuis mardi.",
  "J'ai confondu dimanche soir et lundi matin. Je suis déjà au bureau.",
  "Je suis parti à la mauvaise patinoire. Il y a du patinage artistique, et franchement je m'éclate.",
  "Le parking de la patinoire m'a mis un vent la semaine dernière, on est en froid.",
  "Mon covoitureur m'a lâché, et marcher en patins c'est compliqué.",

  // --- Hockey & ego ---
  "Je suis en garde à vue pour excès de style sur la glace.",
  "Je dois regarder un match de curling, c'est pour ma culture tactique.",
  "Je fais une cure de désintox… de défaites.",
  "Le Zamboni m'a ghosté, j'ai besoin de temps.",
  "Je dois apprendre à freiner avant de revenir.",
  "Je suis en pleine négociation de transfert avec l'équipe d'en face.",
  "Ma Playstation a besoin de moi pour un match de NHL, c'est presque pareil.",
  "Je laisse ma place pour que les autres aient enfin une chance de briller.",
  "Mon agent m'interdit de jouer sans revalorisation de contrat.",
  "Je suis en stage de préparation mentale. Pour l'instant, je prépare surtout le canapé.",
  "Les recruteurs de la NHL viennent me voir à domicile ce soir.",
  "Je boycotte tant que ma statue n'est pas installée devant la patinoire.",
  "Je fais une pause pour éviter de trop humilier l'équipe adverse.",
  "Je suis suspendu par la commission de discipline… de ma femme.",
  "J'ai revu mes stats de la saison. J'ai besoin d'être seul.",
  "Je tente un nouveau régime : zéro effort, 100 % récupération.",
  "Mon coach personnel (moi) m'a mis au repos.",

  // --- Troisième mi-temps ---
  "Je garde mon énergie pour la troisième mi-temps de la semaine prochaine.",
  "Je suis encore en récupération de la troisième mi-temps de la semaine dernière.",
  "J'ai oublié de ramener le pack la dernière fois, je n'ose plus me montrer.",
  "J'ai bu toutes les bières du pack en avance. Par solidarité, je reste à la maison.",
  "Je teste une nouvelle bière artisanale. C'est pour le club, je me sacrifie.",

  // --- Complètement absurde ---
  "Je suis coincé dans un tournoi de pétanque qui a dégénéré.",
  "Je participe au championnat régional de sieste.",
  "Le canapé m'a fait une offre que je ne pouvais pas refuser.",
  "La lune est en Capricorne, mon tir du poignet n'y survivrait pas.",
  "Des extraterrestres m'ont enlevé. Ils voulaient apprendre le slapshot.",
  "Je fais la queue pour un concert d’accordéon. Depuis jeudi.",
  "Je suis bloqué dans une partie de Monopoly qui dure depuis 2023.",
  "Un pingouin m'a défié en duel sur la banquise, j'ai accepté.",
  "J'ai pris rendez-vous avec un voyant pour savoir si on allait gagner. Il n'a pas voulu répondre.",
  "J'ai rejoint une secte qui vénère le Zamboni. Les réunions sont le dimanche soir.",
  "Mon jumeau maléfique a pris ma place. S'il vient, ne lui passez pas le palet.",
  "Je suis en train d'apprendre le patin à roulettes pour élargir mon jeu.",
  "Il fait trop froid pour aller à la patinoire.",
  "Je dois finir ma saison de Fort Boyard dans mon salon.",
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
