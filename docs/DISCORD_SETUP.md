# Discord setup

The PRISM bot runs inside the website on Vercel. No separate server, no always-on process. The site calls Discord when something happens (a message, an approval, a saved lineup), and Discord calls the site when someone presses **Reply** in a DM.

Until `DISCORD_BOT_TOKEN` is set, everything falls back to the old webhooks (`DISCORD_WEBHOOK_URL`, `DISCORD_QA_WEBHOOK_URL`), so it's safe to deploy first and set the bot up after.

## What the bot does

| When | What happens in Discord |
|---|---|
| A student messages their coach | The coach gets a DM with **Reply** and **Open on PRISM** buttons. Reply opens a text box; the answer lands in the site chat. |
| A coach replies (site or Discord) | The student gets a DM with the same buttons. |
| Someone applies for coaching | A private ticket channel (`#application-<name>`) is opened for them and the coaches, with their answers. Also posted in the staff channel with a **Review** link. |
| An admin clicks **Approve for LMU / ACC / both** or **Decline** on an application (in the ticket or the staff channel) | Same as approving or declining in the coach queue. Approving makes the admin who clicked the student's coach, on the default tier, in the program clicked. Admins only; the buttons are replaced with who decided. |
| An application is declined | A note in their ticket, which becomes read-only for them. |
| Telemetry upload / new Cal.com booking | DM to the student's coach. |
| An application is approved | A note in their ticket (then read-only for them), the **LMU Academy** and/or **ACC Academy** role for their program, and a welcome DM. Changing a student's program on the site swaps those roles; moving them up to the **Driver** or **Elite** tier swaps LMU / ACC Academy for **LMU Driver** / **ACC Driver**; removed students lose all of them. |
| Someone is made a coach | **Coach** role. |
| A coach flags a student team-ready | Post in the captains channel. |
| A race is saved in edit mode | Lineup posted (then edited in place) in the lineups channel with the 9:16 lineup graphic, linked drivers mentioned, plus one Discord **scheduled event** per timeslot. A car can also have its lineup posted in its own channel (e.g. `#friday-lm24`), picked in the race editor. Unpublishing or deleting removes all of it. The editor says exactly what was posted and what's missing. |
| Results are saved | New results posted once in the results channel with a results graphic (tick box in the editor; up to six per post, the rest go out on the next save). |
| The roster is saved | Linked drivers get or lose the **LMU Driver** / **ACC Driver** role to match the main lineups. Link a driver to their account in the roster editor. Students on the Driver or Elite tier keep their Driver role either way. |
| Someone picks their main classes on `/profile` (two at most) | The matching class roles (**HY**, **LMP2**, **LMP3** and **GT3**); unticked ones are taken away. |
| Someone sets their first and last name on `/profile` | Their server nickname becomes that name (blank clears it). Bots can't rename the server owner or anyone with a role above the bot's; the page tells them. |
| Someone signs in | Their site-managed roles are brought up to date, for anything they missed while not in the server. |
| Someone signs in (optional) | Added to the server automatically (`NEXT_PUBLIC_DISCORD_AUTO_JOIN=true`). |

## 1. Create the app and bot

1. Go to <https://discord.com/developers/applications> → **New Application** → name it `PRISM` and give it the PRISM mark as its icon.
2. **General Information**: copy **Application ID** and **Public Key**.
3. **Bot**: press **Reset Token** and copy the token. No privileged intents are needed; leave them off. Turn **Public Bot** off.
4. **OAuth2 → Redirects**: add your Supabase callback URL (Supabase → Authentication → Providers → Discord shows it). This is the same app you can use for sign-in; if you already have a Discord app for Supabase login, do all of this on that app instead.

## 2. Invite the bot to the PRISM server

Open this link with your Application ID filled in:

```
https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot&permissions=17601178749968
```

That grants only: View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Manage Channels (for application tickets), Manage Roles, Manage Nicknames (for names set on `/profile`), Create Events, Manage Events.

**Already invited the bot with the older link?** Open the link above again and authorize; Discord updates the bot's permissions in place. (Or give the bot's role **Manage Channels**, **Attach Files** and **Manage Nicknames** in Server Settings → Roles.)

Then in **Server Settings → Roles**, drag the bot's role **above** LMU Academy, ACC Academy, Coach, LMU Driver, ACC Driver and the class roles. Discord only lets a bot hand out roles below its own.

## 3. Copy the IDs

Turn on **User Settings → Advanced → Developer Mode**, then right-click → **Copy ID** on the server, each role and each channel.

## 4. Vercel environment variables

| Variable | Value |
|---|---|
| `DISCORD_BOT_TOKEN` | Bot token from step 1 |
| `DISCORD_PUBLIC_KEY` | Public key from step 1 |
| `DISCORD_GUILD_ID` | Server ID |
| `DISCORD_ROLE_ACADEMY_LMU` | LMU Academy role ID (coached by PRISM, races for PRISM in LMU; give it the team chat) |
| `DISCORD_ROLE_ACADEMY_ACC` | ACC Academy role ID (coached by PRISM, races with Falcon in ACC; give it the ACC / Falcon channel) |
| `DISCORD_ROLE_COACH` | Coach role ID |
| `DISCORD_ROLE_LMU_DRIVER` | LMU Driver role ID |
| `DISCORD_ROLE_ACC_DRIVER` | ACC Driver role ID |
| `DISCORD_ROLE_CLASS_HY` | Hypercar class role ID |
| `DISCORD_ROLE_CLASS_LMP2` | LMP2 class role ID |
| `DISCORD_ROLE_CLASS_LMP3` | LMP3 class role ID |
| `DISCORD_ROLE_CLASS_GT3` | GT3 class role ID (LMU's LMGT3 and ACC's GT3) |
| `DISCORD_CHANNEL_LINEUPS` | Channel for race lineups |
| `DISCORD_CHANNEL_RESULTS` | Channel for results |
| `DISCORD_CHANNEL_STAFF` | Private coaches/admin channel (applications) |
| `DISCORD_CHANNEL_CAPTAINS` | Private captains channel (team-ready students) |
| `DISCORD_CATEGORY_APPLICATIONS` | Category the bot opens application tickets in (right-click the category → Copy ID). Make it hidden from `@everyone`. |
| `TEAM_TIMEZONE` | Timezone printed on lineup graphics, e.g. `America/New_York` (the default) |
| `NEXT_PUBLIC_DISCORD_AUTO_JOIN` | `true` to add people to the server when they sign in (Discord shows them an extra "join servers for you" permission) |

Any role or channel you leave out simply turns that feature off. Redeploy after adding them.

## 5. Point Discord at the site

After the deploy with `DISCORD_PUBLIC_KEY` is live: **General Information → Interactions Endpoint URL** →

```
https://www.prismsimsport.app/api/discord/interactions
```

Discord sends a test request when you save; it only saves if the site answers correctly.

## 6. Check it works

1. Sign in to the site once with your Discord account (so your account knows your Discord ID).
2. As a test student (or a second account), send a message from **Ask my coach**. The coach should get a DM.
3. Press **Reply** in the DM, write something, send. It should show up in the site chat.
4. In edit mode, save a published race with a future green flag. The lineup should post and a scheduled event appear.

## Suggested roles and channels

A starting point; adjust to taste.

**Roles** (bot role above the ones it manages)
- `Founder` / `Admin`
- `Team Captain`
- `Coach` *(managed by the site)*
- `LMU Driver` *(managed by the site)*
- `ACC Driver` *(managed by the site; Falcon Motorsport program)*
- `LMU Academy` *(managed by the site; coached by PRISM, races for PRISM)*
- `ACC Academy` *(managed by the site; coached by PRISM, races with Falcon)*
- `HY` / `LMP2` / `LMP3` / `GT3` *(managed by the site; picked on their profile. Role icons need server boost level 2)*
- `Member` *(everyone else)*

**Channels**
- `#announcements`: news, read-only
- `#lineups`: bot posts race lineups (read-only for members)
- `#results`: bot posts results (read-only for members)
- `#lmu` / `#acc`: chat per sim
- `#setups-and-replays`
- `#academy`: visible to `LMU Academy`, `ACC Academy` + `Coach`
- `#coaching-staff`: private, `Coach` + admins (set as `DISCORD_CHANNEL_STAFF`)
- `#captains`: private, captains + admins (set as `DISCORD_CHANNEL_CAPTAINS`)
