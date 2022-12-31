const path = require('path');
const fs = require('fs');  //filesystem
const https = require('https');
const { exit } = require('process');
const wDir = path.dirname(__filename);  //set working dir to script dir

//read app settings
const settings = JSON.parse(fs.readFileSync(path.join(wDir, 'settings.json')));

//delete old json if exists
fs.rmSync(path.join(wDir, 'saved.json'), {
    force: true,
});

//download latest json AND create notes once download finishes
// https://stackoverflow.com/a/62588602
function get(url, resolve, reject) {
  https.get(url, (res) => {
    // if any other status codes are returned, those needed to be added here
    if(res.statusCode === 301 || res.statusCode === 302) {
      return get(res.headers.location, resolve, reject)
    }

	const filePath = fs.createWriteStream(path.join(wDir, 'saved.json'));

    res.on("data", (chunk) => {
	  filePath.write(chunk);
    });

    res.on("end", () => {
      try {
		filePath.close();
		createNotes();
		resolve('saved.json : Downloaded');
	} catch (err) {
        reject(err);
      }
    });
  });
}

async function getData(url) {
  return new Promise((resolve, reject) => get(url, resolve, reject));
}

// call
getData(settings.jsonUrl)
	.then((r) => { console.log(r); exit(0)})
	.catch((e) => { console.log(e); exit(1)});

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
