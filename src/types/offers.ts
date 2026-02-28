export type ContestMedia = {
  id?: string;
  url: string;
  kind?: string | null;
  created_at?: string | null;
};

export type Prize = {
  id?: string;
  name?: string | null;
  type?: string | null;
  quantity?: number | null;
  amount?: number | null;
  currency?: string | null;
  description?: string | null;
};

export type McqOption = {
  id?: string;
  label?: string | null;
  position?: number | null;
  is_correct?: boolean;
};

export type ContestEntriesStats = {
  total?: number;
  correct?: number;
  pending?: number;
  needs_review?: number;
};

export type ContestReferee = {
  user_id: string;
  role?: string | null;
  full_name?: string | null;
  display_name?: string | null;
};

export type ContestRules = {
  cover_url?: string | null;
  avatar_url?: string | null;
  icon_url?: string | null;
  gallery_urls?: string[];
  rules_markdown?: string | null;
  [key: string]: any;
} | null;

export type OrganizerSnapshot = {
  display_name?: string | null;
  display_avatar_url?: string | null;
  display_logo_url?: string | null;
  display_website_url?: string | null;
  display_phone?: string | null;
  display_social_json?: any;
  display_meta_json?: any;
};

export type ContestOrganizer = {
  link_id?: string | null;
  kind?: 'USER' | 'BUSINESS' | string;
  id?: string | null;
  name?: string | null;
  avatar?: string | null;
  logo?: string | null;
  website?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  href?: string | null;
  snapshot?: OrganizerSnapshot | null;
};

export type Contest = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: string;
  selection: string;
  status: string;
  visibility?: string | null;
  cover_url?: string | null;
  branding_theme?: {
    cover_url?: string | null;
    [key: string]: any;
  } | null;
  starts_at?: string | null;
  ends_at?: string | null;
  prizes?: Prize[] | null;
  mcq_options?: McqOption[] | null;
  entries_stats?: ContestEntriesStats | null;
  max_winners?: number | null;
  seed_commit?: string | null;
  prize_summary?: string | null;
  primary_organizer_link_id?: string | null;
  created_by_user_id?: string | null;
  media?: ContestMedia[] | null;
  referees?: ContestReferee[] | null;
  rules_json?: ContestRules;
  organizer?: ContestOrganizer | null;
  has_published_winners?: boolean;
  winners_published?: boolean;
  winners_count?: number;
  winners?: any[] | null;
  public_proof?: any;
  participation_channels?: {
    messenger?: {
      enabled?: boolean;
      page_id?: string | null;
      link?: string | null;
    } | null;
    comments?: {
      enabled?: boolean;
      page_id?: string | null;
      post_id?: string | null;
      link?: string | null;
    } | null;
  } | null;
};

export type PublicOffer = Contest;
