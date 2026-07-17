const path = require('path');
const fs = require('fs');  //filesystem
const https = require('https');
const { exit } = require('process');
const wDir = path.dirname(__filename);  //set working dir to script dir

//read app settings
const settings = JSON.parse(fs.readFileSync(path.join(wDir, 'settings.json')));

//reddit requires this format: platform:appid:version (by /u/user)
const userAgent = 'windows:redditSaver:v1.05 (by /u/' + settings.username + ')';

//promisified https.request - buffers the body so status can be checked before anything is written
function request(options, body) {
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let data = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
		});
		req.on('error', reject);
		if (body) req.write(body);
		req.end();
	});
}

//trade username/password for a 1-hour access token
async function getToken() {
	const body = 'grant_type=password'
		+ '&username=' + encodeURIComponent(settings.username)
		+ '&password=' + encodeURIComponent(settings.password);

	const res = await request({
		method: 'POST',
		hostname: 'www.reddit.com',
		path: '/api/v1/access_token',
		headers: {
			'Authorization': 'Basic ' + Buffer.from(settings.clientId + ':' + settings.clientSecret).toString('base64'),
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(body),
			'User-Agent': userAgent
		}
	}, body);

	if (res.statusCode === 401)
		throw new Error('Auth failed (401) : check clientId/clientSecret, and that the app type is "script"');

	if (res.statusCode !== 200)
		throw new Error('Token request failed (' + res.statusCode + ') : ' + res.body);

	const parsed = JSON.parse(res.body);

	//reddit returns 200 (not 401) with an error body when the login itself is rejected
	if (parsed.error === 'invalid_grant')
		throw new Error('Login rejected : check username/password in settings.json. '
			+ 'Note this flow cannot work if the account has 2FA enabled.');

	if (!parsed.access_token)
		throw new Error('No access token returned : ' + res.body);

	return parsed.access_token;
}

//fetch the latest saved posts/comments
async function getSaved(token) {
	const res = await request({
		method: 'GET',
		hostname: 'oauth.reddit.com',  //NOT www.reddit.com - that host blocks non-browsers
		path: '/user/' + encodeURIComponent(settings.username) + '/saved?limit=25&raw_json=1',
		headers: {
			'Authorization': 'bearer ' + token,
			'User-Agent': userAgent
		}
	});

	if (res.statusCode === 403)
		throw new Error('Forbidden (403) : token is missing the "history" scope');

	if (res.statusCode === 429)
		throw new Error('Rate limited (429) : wait a minute and try again');

	if (res.statusCode !== 200)
		throw new Error('Saved request failed (' + res.statusCode + ') : ' + res.body);

	return res.body;
}

async function main() {
	const token = await getToken();
	const saved = await getSaved(token);

	//only touch saved.json once we have a validated 200, so a failed run leaves the last good one alone
	fs.writeFileSync(path.join(wDir, 'saved.json'), saved);
	console.log('saved.json : Downloaded');

	createNotes();
}

// call
main()
	.then(() => exit(0))
	.catch((e) => { console.log(e.message); exit(1)});

//read json and create notes
function createNotes() {
	//create root folder if doesn't already exist
	newDir(settings.rootPath);

	//read downloaded json
	const obj = JSON.parse(fs.readFileSync(path.join(wDir, 'saved.json')));

	//traverse through saves in the order they were saved, so that the latest notes are created at last
	for(let i=obj.data.children.length - 1; i>=0; i--) {
		let thisSub = obj.data.children[i].data.subreddit;
		let thisAuthor = obj.data.children[i].data.author;
		let thisUrl = 'https://www.reddit.com' + obj.data.children[i].data.permalink;
		let thisId = obj.data.children[i].data.id;
		let thisTimestamp = new Date(obj.data.children[i].data.created_utc * 1000);

		let thisType;
		let thisTitle;
		let thisBody;

		if(obj.data.children[i].data.title)
		{
			thisType = 'post';
			thisTitle = obj.data.children[i].data.title;
			thisBody = obj.data.children[i].data.selftext;
		}
		else
		{
			thisType = 'comment';
			thisTitle = obj.data.children[i].data.link_title;
			thisBody = obj.data.children[i].data.body;
		}

		//some cleanup
		thisBody = thisBody.replace(/&amp;#x200B;/g,'')  //some weird chars
		thisBody = thisBody.replace(/&amp;nbsp;/g,'')  //some weird chars
		thisBody = thisBody.replace(/&gt;/g,'>')  //quote correctly

		let thisNote = '---'
			+ '\nsub: ' + thisSub
			+ '\ntitle: ' + escChars(thisTitle)
			+ '\ntype: ' + thisType
			+ '\nauthor: ' + thisAuthor
			+ '\nurl: ' + thisUrl
			+ '\ntime: ' + thisTimestamp
			+ '\nid: ' + thisId
			+ '\n---\n[link](' + thisUrl + ')'
			+ '\n' + thisBody;

		let thisNoteFile = obj.data.children[i].data.permalink.toString().match(/\/comments\/[a-z0-9]+\/([^/]+)\//)[1] + '__' + thisId+ '.md';

		//create folder for sub if it doesn't exist
		newDir(path.join(settings.rootPath, thisSub));

		//if set to overwrite, delete existing file
		if (settings.overWrite)
		if (fs.existsSync(path.join(settings.rootPath, thisSub, thisNoteFile)))
			fs.unlinkSync(path.join(settings.rootPath, thisSub, thisNoteFile));

		//write note file
		if (!fs.existsSync(path.join(settings.rootPath, thisSub, thisNoteFile)))
		{
			console.log('Writing : ' + path.join(settings.rootPath, thisSub, thisNoteFile));
			fs.appendFileSync(path.join(settings.rootPath, thisSub, thisNoteFile), thisNote);
		}
	}
}

//using certain chars in YAML breaks it for Dataview
function escChars(value) {
	value = value.replace('\[','\\[');
	value = value.replace('\]','\\]');
	value = value.replace('\:','-');
	return value;
}

function newDir(dir) {
	if (fs.existsSync(dir)) {
		//console.log('Dir exists. Do nothing');
	} else {
		//console.log('Dir does not exist. So make one');
		fs.mkdirSync(dir, true)	//recursive: true
	}
}
