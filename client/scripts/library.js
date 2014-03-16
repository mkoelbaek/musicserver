
var database,
	_ = require('./vendor/lodash.min.js');
	api = require('./api.js');

	function initialize() {
		var deferred = $.Deferred();

		api.db().done(function(db) {
			database = {items: db};
			deferred.resolve();
		});

		return deferred.promise();
	}


	function get(path)
	{
		if(!path || path.length === 0)
			return database;
		
		var item = database; 
		_.each(path, function(x) {
			item = _.find(item.items, function(y) { return y.name === x; });
		});

		return item;
	}

	//Artist and album can be extrapolated from path.
	function setSongInfo(item, path) {
		if(path.length < 2)
		{
			if(!item.song)
				item.song = item.name;
			item.album = 'NA';
			item.artist = 'NA';
		}
		if(path.length === 2)
		{
			item.artist = path[0];
			item.album = path[1];
			if(!item.song)
				item.song = item.name;
		} 
		if(path.length >= 3)
		{
			item.artist = path[0];
			item.album = path[1];
			
			if(!item.song)
				item.song = item.name;
			
			for(var i = 2; i < path.length; i++)
			{
				item.album += ' - ' + path[i];
			}
		}

		var str = '';
		_.each(path, function(x) {
			str += x + '/'
		});
		str += item.name;
		item.stream = '/api/stream?path=' + encodeURIComponent(str);
	}

	function getSongs(path)
	{
		var songs = [];

		var getSongsRecursive = function(item, currPath) {
			if(item.isFile)
			{
				currPath.pop();
				setSongInfo(item, currPath);
				songs.push(item)

				return;
			}

			_.each(item.items, function(x) {
				if(x.isFile) {
					setSongInfo(x, currPath);
					songs.push(x);
				} 
				else 
				{
					nextPath = currPath.slice(0);
					nextPath.push(x.name)
					getSongsRecursive(x, nextPath);
				}
			});
		}

		getSongsRecursive(get(path), path.slice(0));

		if(songs.length > 0) {
			var grouped = [];
			_.each(_.groupBy(songs, 'album'), function(x, p) { grouped.push(_.sortBy(x, 'track')) });



			var album = grouped.pop();
			var songs = _.sortBy(album.concat.apply(album, grouped), 'album');
		}

		return songs;
	}

module.exports = {
	initialize: initialize,
	get: get,
	getSongs: getSongs
};