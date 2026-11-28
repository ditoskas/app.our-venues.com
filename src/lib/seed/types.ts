import type { AppLocale } from "@/i18n/routing";
import type { CelebrationType, LocalizedText } from "../celebrations";
import type { ProfessionalInput } from "../professionals";

export interface SpouseSeed {
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
}

export interface ProfessionalSeed extends ProfessionalInput {
  logoSourcePath?: string;
}

export interface CelebrationSeed {
  title: string;
  type: CelebrationType;
  husband: SpouseSeed;
  wife: SpouseSeed;
  // true → both spouses get a Couple-role login (needs `email`). Only the
  // showcase couple has logins; the other customers have full contact data
  // but no account.
  createCoupleLogins: boolean;
  // Premium subdomain to reserve under the type's domain (needs info.celebrationDate).
  subdomainLabel?: string;
  heroBackgroundSourcePath?: string;
  invitationSourcePath?: string;
  info?: {
    celebrationDate?: Date;
    headline?: LocalizedText;
    quote?: LocalizedText;
    countdownParagraph?: LocalizedText;
    activeLanguages?: AppLocale[];
    maxGuestsPerInvitation?: number;
    showMaxGuests?: boolean;
    showSeating?: boolean;
    showLive?: boolean;
    showReservation?: boolean;
    isSitePublic?: boolean;
  };
  story?: {
    storyTitle?: LocalizedText;
    storySubtitle?: LocalizedText;
    storyParagraph?: LocalizedText;
  };
  timeline?: {
    title: LocalizedText;
    description?: LocalizedText;
    date?: Date;
    imageSourcePath?: string;
  }[];
  events?: {
    title: LocalizedText;
    description?: LocalizedText;
    area?: string;
    date?: Date;
    city?: string;
    address?: string;
    postCode?: string;
    country?: string;
    mapLat?: number;
    mapLng?: number;
  }[];
  guests?: {
    name: string;
    phone?: string;
    email?: string;
    expectedAttendees?: number;
    confirmedAttendees?: number;
    confirmationDate?: Date;
    deniedDate?: Date;
  }[];
  // `eventIndex`/`guestIndex` are positions into `events`/`guests` above —
  // resolved to the generated EventItem/GuestItem ids after insertion, since
  // a LiveEventItem references them by id, not by array position.
  liveEvents?: {
    eventIndex: number;
    guestIndex: number;
    title: string;
    description?: string;
    uploadedAt: Date;
    imageSourcePath: string;
  }[];
}

// One row of the credentials table printed at the end of runSeeders().
export interface SeededLogin {
  email: string;
  password: string;
  role: string;
  name: string;
}
