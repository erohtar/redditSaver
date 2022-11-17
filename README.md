# redditSaver
**Automatically Download Saved Reddit Posts & Comments as Markdown Notes (into Obsidian)**

Sample output:
![image](https://user-images.githubusercontent.com/5120628/200579098-6311b7f4-0a72-45df-9490-705c25bee720.png)


## Features
- YAML Frontmatter is downloaded along with the markdown formatted note - supports using it with **Dataview** plugin (see below)
- Notes are saved in `reddit\<subreddit>\<note_title>` hierarchy
- Clickable link to the post/comment is added at the top of the note (besides being saved in Frontmatter)


## Setup
1. Go to [this url](https://ssl.reddit.com/prefs/feeds/) and copy this link:
![image](https://user-images.githubusercontent.com/5120628/200579587-48bad4e3-e569-4417-a76c-3e88f2353fa7.png)

2. Edit **settings.sample.json**, put above link and your notes target path there, and **rename to settings.json**
```
{
	"jsonUrl": "https://www.reddit.com/user/erohtar/saved.json?feed=xxxxxxxxx&user=erohtar",
	"rootPath": "C:\\ObsidianVault\\Reddit"
}
```

3. Download ([optionally portable](https://github.com/garethflowers/nodejs-portable/)) **node.js** and run **redditSaver.js** with it:
`<path>\node\node.exe redditSaver.js`

4. Done. Your notes should be created at the set path:
`<vault>\Reddit\<subreddit>\<title>__<id>.md`

## Dataview Example
![image](https://user-images.githubusercontent.com/5120628/202477778-1867f76c-aebc-4ca9-98d7-879a4317bc38.png)

Create a new note named 'redditSaver' at the root of your Obsidian vault, and put this code there to get a nice table view of all your saved posts/comments arranged with latest ones on top:

````
```dataview
TABLE WITHOUT ID "[" + title + "](" + file.path + ")" AS "Title", type AS "Type", sub AS "Sub"
FROM "Reddit"
SORT file.ctime DESC
```
````

## Additional Notes
- Reddit limits last 25 saved posts/comments in that feed
- Scheduled running of this script once daily (or so) will keep your latest saves updated automatically
- This is NOT an Obsidian plugin, and if someone wants to create one based on this idea or my code, they're more than welcome to
- To save reddit *crossposts*, go to the target posts and save that instead of the link post (a habit I'll have to get into myself as well)

