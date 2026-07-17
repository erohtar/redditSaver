# redditSaver
**Automatically Download Saved Reddit Posts & Comments as Markdown Notes (into Obsidian)**

Sample output:
![image](https://user-images.githubusercontent.com/5120628/200579098-6311b7f4-0a72-45df-9490-705c25bee720.png)


## Features
- YAML Frontmatter is downloaded along with the markdown formatted note - supports using it with **Dataview** plugin (see below)
- Notes are saved in `reddit\<subreddit>\<note_title>` hierarchy
- Clickable link to the post/comment is added at the top of the note (besides being saved in Frontmatter)


## Setup
1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) and click **create another app...**
	- Set the type to **script** (required - this only works for script apps, and only for the account that created them)
	- Name it anything, e.g. `redditSaver`
	- Set the redirect uri to `http://localhost:8080` (the form requires one, but it's unused here)

2. Note down the two values reddit gives you:
	- `clientId` : the string right under the app name
	- `clientSecret` : the `secret` field

3. Copy **settings.sample.json** to **settings.json** and update these values:
	- `clientId` / `clientSecret` : from above
	- `username` / `password` : your reddit login
	- `rootPath` : Your notes target path (use double backslashes)
	- `overWrite` : If you wish to overwrite your existing note files with latest downloads, set this to 1
```
{
	"clientId": "xxxxxxxxxxxxxxxxxxxxxx",
	"clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
	"username": "erohtar",
	"password": "your-reddit-password",
	"rootPath": "C:\\ObsidianVault\\Reddit",
	"overWrite": 0
}
```
> **On storing your password:** this uses reddit's OAuth *password grant*, which means your password sits in plaintext in `settings.json` (gitignored). It's the tradeoff for never needing a browser step. It requires that **2FA is off** on the account, and it stops working when you change your password. If you'd rather not store it, reddit's refresh-token flow is the alternative - a one-time browser authorization instead.

4. Download ([optionally portable](https://github.com/garethflowers/nodejs-portable/)) **node.js** and run **redditSaver.js** with it:
`<path>\node\node.exe redditSaver.js`

5. Done. Your notes should be created at the set path:
`<vault>\Reddit\<subreddit>\<title>__<id>.md`

## Dataview Example
![image](https://user-images.githubusercontent.com/5120628/209553135-5a5d9571-0773-4e48-a571-f1b14732b770.png)

Create a new note named **redditSaver** at the root of your Obsidian vault, and put this code there to get a nice table view of all your saved posts/comments:

````
```dataview
TABLE WITHOUT ID "[" + title + "](" + file.path + ")" AS "Title", type AS "Type", sub AS "r/"
FROM "Reddit"
SORT file.ctime DESC
```
````

## Additional Notes
- This fetches the last 25 saved posts/comments. That's our own `limit=25` in the request, not a reddit restriction - the API allows up to 100 per page, and pages back to ~1000 items via the `after` cursor, so fetching your full history is a possible future addition
- Scheduled running of this script once daily (or so) will keep your latest saves updated automatically
- This is NOT an Obsidian plugin, and if someone wants to create one based on this idea or my code, they're more than welcome to
- To save a reddit *crosspost*, go to the target post and save that instead of the link post (a habit I'll have to get into myself as well)

