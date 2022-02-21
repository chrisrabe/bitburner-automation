const YOUTUBE_API = "https://youtube.googleapis.com/youtube/v3";
const API_KEY = "*";
const PLAYLIST_ID = "*";

function createUrl(baseUrl, params) {
	const paramStr = Object.keys(params)
		.map(key => `${key}=${encodeURIComponent(params[key])}`)
		.join('&');
	return `${baseUrl}?${paramStr}`;
}

async function getPlaylistItems() {
	const baseUrl = `${YOUTUBE_API}/playlistItems`;
	const params = {
		part: 'snippet,contentDetails,status',
		maxResults: 100,
		playlistId: PLAYLIST_ID,
		key: API_KEY
	};
	const url = createUrl(baseUrl, params);

	const res = await fetch(url);
	const data = await res.json();
	const result = data.items.map(item => {
		const titleParts = item.snippet.title.split('-');

		return {
			title: titleParts[titleParts.length - 1],
			id: item.contentDetails.videoId,
			status: item.status.privacyStatus
		}
	}).filter(item => item.status === "public");
	return result;
}

async function getVideoComments(video) {
	const baseUrl = `${YOUTUBE_API}/commentThreads`;
	const params = {
		part: 'snippet',
		maxResults: 100,
		videoId: video.id,
		key: API_KEY
	};
	const url = createUrl(baseUrl, params);
	const res = await fetch(url);
	const data = await res.json();
	const comments = data.items.map(item => ({
		videoTitle: video.title,
		text: item.snippet.topLevelComment.snippet.textOriginal,
		author: item.snippet.topLevelComment.snippet.authorDisplayName,
		date: item.snippet.topLevelComment.snippet.publishedAt
	}));
	return comments;
}

async function getPlaylistComments(playlistItems) {
	const comments = [];
	for (const video of playlistItems) {
		const vComments = await getVideoComments(video);
		vComments.forEach(com => comments.push(com));
	}
	return comments;
}

/** @param {NS} ns **/
export async function main(ns) {

	function displayComments(comments) {
		const lines = [];
		for (const c of comments) {
			const readableDate = new Date(c.date).toLocaleDateString();
			lines.push(`${c.author} @ ${c.videoTitle}\t: ${readableDate}`);
			lines.push(c.text);
			lines.push('');
		}
		const alertText = lines.join('\n');
		ns.alert(alertText);
	}

	const playlistItems = await getPlaylistItems();
	const comments = await getPlaylistComments(playlistItems);
	const sortedComments = comments.sort((a, b) => new Date(b.date) - new Date(a.date));
	displayComments(sortedComments);
}