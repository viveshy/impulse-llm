# Watchlist and clouds: two features for teams adopting AI

Date: 2026-10-27. Owner: viveshy. The owner asked for features that help organisations adopting AI,
then said "go ahead" to my recommendation: a watchlist first, then an "On your cloud" view. The
design calls below are mine.

## Why

A team that has shipped on AI runs a handful of exact models on exact hosts. What breaks it is a
retirement it missed, a price change it didn't plan for, or a cloud that doesn't carry the model it
wants. Impulse already has the data (per-host retirement dates checked against the hosts' notices,
30 days of price history, successors, per-region listings); these two features put it in the shape
a team works in.

## 1. Watchlist (`/watchlist`)

A team lists what it runs and gets one page with what to act on, plus a calendar feed and an RSS
feed. No accounts: the list lives in the link.

- **Item** = a model on a host, optionally pinned to one listing (a version, region or deployment).
  URL: `/watchlist?w=claude-sonnet-4-5@amazon-bedrock~1a2b3c4d5e6f,gpt-5@openai`. The pin is the
  first 12 hex digits of the listing's GUID (stable: uuid5 of the LiteLLM key). At most 40 items;
  malformed entries are dropped, duplicates collapse.
- **Each row shows**: the model, host and API id; its status; what to move to; its price on that
  host and any move in the last 30 days.
  - Status, most urgent first: no longer listed anywhere / no longer on this host / the pinned
    version is gone / retired / retires on a date (with a countdown) / no retirement before a date
    ("not sooner than") / no date announced.
  - Unpinned rows show every retirement this host has scheduled for the model, labelled the way
    /retiring labels them ("2025-09-29 only", "except US government regions"). Pinned rows show only
    that listing's date.
  - Move to: the live successor that no API drops within 90 days of the retirement (the /retiring
    rule), and whether the same host serves it, at what price against today's.
  - A newer model in the line is shown even when nothing is retiring.
- **Feeds** (same `w` parameter):
  - `/watchlist/calendar.ics`: one all-day event per scheduled retirement, with alarms 30 and 7
    days before. UIDs are stable so calendar apps update events instead of duplicating them.
  - `/watchlist/feed.xml`: RSS items for retirements as they come within 90, 30 and 7 days (one item
    per stage, dated the day the stage starts), price changes on the watched listings (dated by the
    change), and a newer model in the line (dated by its release). No new storage is needed.
- **Adding**: search a model, pick the host, optionally pick a version or region. A "Watch" button on
  each model page opens the watchlist with that model ready to add.
- **Remembering**: the browser keeps the last list it edited (localStorage) and restores it when
  /watchlist is opened bare. Opening someone else's link never overwrites it.

## 2. Clouds (`/clouds`, `/clouds/[cloud]`)

For teams that can only buy through their cloud.

- Clouds: AWS (Amazon Bedrock), Microsoft Azure (Azure OpenAI, Azure AI Foundry), Google Cloud
  (Vertex AI).
  - Not covered (my call): Databricks, Oracle Cloud (OCI) and Snowflake. Checked against their own
    docs on 2026-10-27, the catalog's lists for them (LiteLLM's model map) lag badly: Databricks
    lacks GPT-6.x, Gemini 4 Argon, Claude Haiku and Sonnet 5.5 and Grok 4.7; Oracle lacks Grok 4.7,
    4.6 and 4.3 and still has GPT-5, which Oracle no longer lists; Snowflake has only older Claude
    models. Covering them would show them without models they sell, so /clouds names them and links
    their own lists instead. Bedrock, Azure and Vertex matched their docs for the lineup, except
    that the catalog has Grok 4.7 on Vertex while Google's page lists Grok 4.6 and 4.20.
- `/clouds`: a card per cloud (frontier models, labs, retirements in 12 months) and a matrix of the
  frontier labs' current lineups against the clouds: available or not, and the price against the
  lab's own API.
- `/clouds/[cloud]`: the frontier models on that cloud with price, premium over the lab's API, the
  regions it is listed in, and the next retirement there; the lineup models it does not carry; older
  frontier models it still serves.
  - "Older" means released in the last two years (my call): the catalog keeps listings clouds have
    quietly dropped (Claude 1, 2.1 and Instant on Bedrock), which are left to the host's own page.
- Region filter (`?zone=eu`): US, Europe, Asia Pacific, US government, Global. Only offered where the
  listings carry regions (Bedrock, Azure OpenAI); Vertex AI and Azure AI Foundry don't list regions
  per model, and the page says so and links the cloud's own region table. With a zone set, prices
  and retirements are those of the zone's listings.
  - A lineup model with no listing in the zone is "On AWS, outside Europe" (or "regional endpoints
    only" for Global) only when every listing of it on the cloud names a region (my call). When one
    names none, it may be sold in the zone after all, so the row says "region not listed" and links
    the cloud's own list. On 2026-10-27 that leaves Grok 4.7 on AWS as the only model placed
    outside a zone.
- Navigation (my call): Clouds sits between Labs and Hosts. With nine links, the header's search
  button shrinks to its icon between the lg and xl breakpoints so the row still fits at 1024px.

## Non-goals

- No accounts, email alerts or server-side storage of lists.
- No changes to the API or the sync.
- No region data invented where the catalog has none.

## Also in this change

The lab page's "Current" tile counted every model that is the newest in its line (85 for OpenAI,
against an 11-model lineup on the same page). Its tiles now count the models not retired, the
lineup, hosts and retirements, so they match the sections below them.

The site's mark was a pulse line, which the owner said reads as a heartbeat. It is now three inputs
firing into a spark: a neuron's impulse and the sign for AI in one (my design, after comparing nine
network-style candidates at 16 to 96px). The favicon, which had been a different mark, now draws the
same shapes, and a test keeps the two in step.
