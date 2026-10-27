/** Visit counts stay off the site until they are worth showing: a handful of visits reads as an empty site. */
export const VISITS_SHOWN_ABOVE = 50;

/** Whether a 30-day visitor count is high enough to show. */
export const showVisits = (visitors: number | null | undefined): visitors is number =>
  visitors != null && visitors > VISITS_SHOWN_ABOVE;
