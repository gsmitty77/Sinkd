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

## Premium / League+

Concept: keep the core app useful for free, then offer a small per-league upgrade for bigger or more serious leagues.

Free:
- Unlimited regular game logging.
- Unlimited friends.
- Tournaments.
- Join leagues.
- Create leagues up to 8 members.
- Stats.
- Rankings.
- Profile / career stats.

League+:
- Price idea: $0.99/month per league.
- Increase league capacity from 8 to 50 members.
- Owner, Co-Leader, and Ref tools.
- League customization.
- Advanced rankings.
- Season history later.
- League records later.
- Additional future features.

Notes:
- Charge per league instead of per user so friends can join without each person needing to pay.
- Keep this parked until the app has real league usage and the paid features feel obvious.
