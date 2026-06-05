# Parked Features

These ideas are intentionally parked so they can be brought back later without rebuilding the concept from scratch.

## Leagues

Concept: a Clash of Clans-style league system for Beer Die groups.

Core rules:
- Each league can have up to 50 members.
- Each league has exactly 1 leader.
- The leader can promote members into co-leaders.
- Co-leaders can help manage the league, but they are not the owner/leader.
- The leader can set the league to Open or Invite Only.
- The leader can name the league.
- The leader can design a league badge shaped like a cube with 3 visible colored sides.

Original local-only version included:
- Leagues tab next to Tournaments.
- Create League form.
- League name input.
- Open / Invite Only selector.
- Cube color picker for top, left, and right sides.
- League card showing name, privacy, member count, and cube badge.
- Member list with leader/co-leader/member roles.
- Promote and demote controls.
- 50-member cap.

Future version should probably use Supabase tables so leagues work across phones:
- `leagues`
- `league_members`
- `league_invites`
- role rules for leader, co-leader, and member.

## My Profile

Concept: a personal player profile page tied to the logged-in user.

Current / intended fields:
- Player name.
- Nickname.
- Notes.

Purpose:
- Let each signed-in user create or edit their own identity.
- Use that profile name in game dropdowns and stats.
- Eventually connect the Supabase auth user to one player record.

Kinks to work out:
- Should a user be allowed to edit only their own profile?
- Should owners/admins be able to edit or delete other profiles?
- Should profile names be unique?
- Should stats follow a profile if the display name changes?
- Should the profile be stored locally or in Supabase?

Future Supabase version should probably use:
- `profiles`
- linked to Supabase `auth.users.id`
- fields like display name, nickname, avatar, role, created date.

## Premium / League Plans

Concept: keep the core app useful for free, then offer per-league upgrades for bigger or more serious leagues.

Free:
- Unlimited regular game logging.
- Unlimited friends.
- Tournaments.
- Join leagues.
- Create leagues up to 8 members.
- Stats.
- Rankings.
- Profile / career stats.
- PDF exports.
- Basic league chat.

League Plus:
- Price idea: $0.99/month per league.
- Increase league capacity from 8 to 24 members.
- Owner, Co-Leader, and Ref tools.
- League customization.
- Seasons.
- Archived seasons.
- Season awards.

Leagues MAX:
- Price idea: $1.99/month per league.
- Increase league capacity from 24 to 100 members.
- Weekly reports.
- Commissioner tools.
- Custom reports.
- Up to 3 custom league badges.
- Scheduled games.
- League announcements.
- League-wide polls.
- Enhanced season awards.

Notes:
- Charge per league instead of per user so friends can join without each person needing to pay.
- Free leagues can get a 7-day League Plus trial later.
- League Plus leagues can get a 7-day Leagues MAX trial later.

## Season Stat Rules

When seasons are implemented, season data can reset without touching lifetime progress.

Reset when a season ends:
- Season stats.
- Season rankings.
- Season awards.

Never reset when a season ends:
- League lifetime stats.
- Player career stats.
- Badges.
- Badge progress.

## 21+ Entrance Gate

Concept: a quick full-screen gate before the intro screen asking whether the user is at least 21 years old.

Original behavior:
- Navy modal using the Sinkd logo.
- Question: "Are you at least 21 years old?"
- Yes continued into the app intro.
- No signed the user out and showed a short message.

Reason parked:
- Removed from the live app for now so the first-run flow only shows the Sinkd intro once per account.
- Can be restored later if store review, legal guidance, or responsible-use positioning calls for it.
