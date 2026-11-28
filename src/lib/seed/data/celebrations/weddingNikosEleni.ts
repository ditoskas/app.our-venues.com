import { routing } from "@/i18n/routing";
import { SEED_ASSETS } from "../../assets";
import type { CelebrationSeed } from "../../types";

// Second customer: a fully-populated island wedding with no Couple logins.
// Differs from the showcase wedding on purpose so more feature toggles have
// a fixture: the public site is on, max-guests is shown, seating is off.
export const WEDDING_NIKOS_ELENI: CelebrationSeed = {
  title: "Nikos & Eleni Wedding",
  type: "Marriage",
  createCoupleLogins: false,
  heroBackgroundSourcePath: SEED_ASSETS.story2,
  invitationSourcePath: SEED_ASSETS.story3,
  husband: {
    firstName: "Nikos",
    lastName: "Papadopoulos",
    mobile: "6944111222",
    email: "nikos.papadopoulos@example.com",
  },
  wife: {
    firstName: "Eleni",
    lastName: "Konstantinou",
    mobile: "6944333444",
    email: "eleni.konstantinou@example.com",
  },
  info: {
    celebrationDate: new Date(Date.UTC(2027, 5, 19)),
    headline: {
      el: "Λέμε «Ναι» κάτω από τον ουρανό της Σαντορίνης",
      en: "Saying “Yes” Under the Santorini Sky",
      ru: "Говорим «Да» под небом Санторини",
    },
    quote: {
      el: "Ό,τι κι αν φέρει ο άνεμος του Αιγαίου, θα το ζήσουμε μαζί.",
      en: "Whatever the Aegean wind may bring, we will face it together.",
      ru: "Что бы ни принёс ветер Эгейского моря, мы встретим это вместе.",
    },
    countdownParagraph: {
      el: "Μετράμε αντίστροφα για το πιο όμορφο ηλιοβασίλεμα της ζωής μας. Ελάτε να το μοιραστούμε στην Οία, με θέα την καλντέρα.",
      en: "We are counting down to the most beautiful sunset of our lives. Come share it with us in Oia, overlooking the caldera.",
      ru: "Мы ведём обратный отсчёт до самого красивого заката в нашей жизни. Разделите его с нами в Ии с видом на кальдеру.",
    },
    activeLanguages: [...routing.locales],
    maxGuestsPerInvitation: 4,
    showMaxGuests: true,
    showSeating: false,
    showLive: true,
    showReservation: true,
    isSitePublic: true,
  },
  story: {
    storyTitle: {
      el: "Πώς Γνωριστήκαμε",
      en: "How We Met",
      ru: "Как мы познакомились",
    },
    storySubtitle: {
      el: "Ένα καλοκαίρι που δεν τελείωσε ποτέ",
      en: "A summer that never ended",
      ru: "Лето, которое так и не закончилось",
    },
    storyParagraph: {
      el: "Γνωριστήκαμε σε ένα ιστιοπλοϊκό στις Κυκλάδες και από τότε ταξιδεύουμε μαζί.",
      en: "We met on a sailing trip around the Cyclades and have been travelling together ever since.",
      ru: "Мы познакомились в парусном походе по Кикладам и с тех пор путешествуем вместе.",
    },
  },
  timeline: [
    {
      title: { el: "Το Ιστιοπλοϊκό", en: "The Sailing Trip", ru: "Парусный поход" },
      description: {
        el: "Μια εβδομάδα στο Αιγαίο, δύο άγνωστοι στο ίδιο κατάστρωμα.",
        en: "A week on the Aegean, two strangers on the same deck.",
        ru: "Неделя в Эгейском море, двое незнакомцев на одной палубе.",
      },
      date: new Date(Date.UTC(2020, 6, 15)),
      imageSourcePath: SEED_ASSETS.story2,
    },
    {
      title: { el: "Το Πρώτο μας Σπίτι", en: "Our First Home", ru: "Наш первый дом" },
      description: {
        el: "Ένα μικρό διαμέρισμα στην Αθήνα με μεγάλο μπαλκόνι και πολλά φυτά.",
        en: "A tiny Athens flat with a big balcony and far too many plants.",
        ru: "Крошечная квартира в Афинах с большим балконом и слишком большим количеством растений.",
      },
      date: new Date(Date.UTC(2022, 2, 1)),
      imageSourcePath: SEED_ASSETS.story1,
    },
    {
      title: { el: "Η Πρόταση στην Οία", en: "The Proposal in Oia", ru: "Предложение в Ии" },
      description: {
        el: "Στο ηλιοβασίλεμα, μπροστά σε εκατοντάδες αγνώστους που χειροκρότησαν.",
        en: "At sunset, in front of hundreds of strangers who all applauded.",
        ru: "На закате, перед сотнями незнакомцев, которые все зааплодировали.",
      },
      date: new Date(Date.UTC(2025, 8, 20)),
      imageSourcePath: SEED_ASSETS.story3,
    },
  ],
  events: [
    {
      title: { el: "Τελετή Γάμου", en: "Wedding Ceremony", ru: "Свадебная церемония" },
      description: {
        el: "Η τελετή θα γίνει στον Ιερό Ναό Αγίου Γεωργίου. Παρακαλούμε να βρίσκεστε εκεί έως τις 18:30.",
        en: "The ceremony takes place at the Church of Agios Georgios. Please be seated by 18:30.",
        ru: "Церемония пройдёт в церкви Святого Георгия. Пожалуйста, займите места до 18:30.",
      },
      area: "Ceremony",
      date: new Date(Date.UTC(2027, 5, 19)),
      address: "Nikolaou Nomikou",
      city: "Oia",
      postCode: "84702",
      country: "Greece",
      mapLat: 36.4618,
      mapLng: 25.3753,
    },
    {
      title: { el: "Δεξίωση στην Καλντέρα", en: "Caldera Reception", ru: "Приём на кальдере" },
      description: {
        el: "Δείπνο, κρασί από την Σαντορίνη και χορός ως το πρωί.",
        en: "Dinner, Santorini wine and dancing until sunrise.",
        ru: "Ужин, вино Санторини и танцы до рассвета.",
      },
      area: "Reception",
      date: new Date(Date.UTC(2027, 5, 19)),
      address: "Imerovigli Main Road",
      city: "Imerovigli",
      postCode: "84700",
      country: "Greece",
      mapLat: 36.4319,
      mapLng: 25.4227,
    },
  ],
  guests: [
    {
      name: "Andreas Michailidis",
      phone: "+306945550001",
      email: "andreas.m@example.com",
      expectedAttendees: 2,
      confirmedAttendees: 2,
      confirmationDate: new Date(Date.UTC(2027, 2, 10)),
    },
    {
      name: "Katerina Vlachou",
      email: "katerina.v@example.com",
      expectedAttendees: 3,
      confirmedAttendees: 2,
      confirmationDate: new Date(Date.UTC(2027, 2, 14)),
    },
    {
      name: "Yannis Doukas",
      phone: "+306945550003",
      expectedAttendees: 2,
    },
    {
      name: "Sophia Lambrou",
      phone: "+306945550004",
      email: "sophia.l@example.com",
      expectedAttendees: 1,
      deniedDate: new Date(Date.UTC(2027, 2, 20)),
    },
  ],
  liveEvents: [
    {
      eventIndex: 0, // Wedding Ceremony
      guestIndex: 0, // Andreas Michailidis
      title: "Rings at Sunset",
      description: "The sun went down right as they said “I do”.",
      uploadedAt: new Date(Date.UTC(2027, 5, 19, 16, 10)),
      imageSourcePath: SEED_ASSETS.story3,
    },
  ],
};
