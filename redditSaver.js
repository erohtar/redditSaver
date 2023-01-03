const path = require('path');
const fs = require('fs');  //filesystem
const https = require('https');
const wDir = path.dirname(__filename);  //set working dir to script dir

//read app settings
const settings = JSON.parse(fs.readFileSync(wDir + '\\settings.json'));

//delete old json if exists
fs.unlinkSync(wDir + '\\saved.json');

//download latest json AND create notes once download finishes
https.get(settings.jsonUrl,(res) => {
	const filePath = fs.createWriteStream(wDir + '\\saved.json');
	res.pipe(filePath);
	filePath.on('finish',() => {
		filePath.close();
		console.log('saved.json : Downloaded');
		createNotes();
	})
})


//read json and create notes
function createNotes() {
	//create root folder if doesn't already exist
	newDir(settings.rootPath);
	
	//read downloaded json
	const obj = JSON.parse(fs.readFileSync(wDir + '\\saved.json'));
	
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
		newDir(settings.rootPath + '\\' + thisSub);
		
		//if set to overwrite, delete existing file
		if (settings.overWrite)
		if (fs.existsSync(settings.rootPath + '\\' + thisSub + '\\' + thisNoteFile))
			fs.unlinkSync(settings.rootPath + '\\' + thisSub + '\\' + thisNoteFile);
		
		//write note file
		if (!fs.existsSync(settings.rootPath + '\\' + thisSub + '\\' + thisNoteFile))
		{
			console.log('Writing : ' + settings.rootPath + '\\' + thisSub + '\\' + thisNoteFile);
			fs.appendFileSync(settings.rootPath + '\\' + thisSub + '\\' + thisNoteFile, thisNote);
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
