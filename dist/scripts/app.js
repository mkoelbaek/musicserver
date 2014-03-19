(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var list = function(path) 
{
	if(!path)
	{
		path = [];
	}

	return $.ajax({
		method: 'POST',
		url: '/api/list',
		cache: false,
		contentType: 'application/json',
		data: JSON.stringify({ path: path, expand: path.length > 0 }),
		processData: false,
		dataType: 'json'
	});
}

var db = function()
{
	return $.ajax({
		method: 'POST',
		url: '/api/db',
		cache: false,
		contentType: 'application/json',
		processData: false,
		dataType: 'json'
	});
}

var listsongs = function(path)
{
	if(!path)
	{
		return;		
	}

	return $.ajax({
		method: 'POST',
		url: '/api/listsongs',
		cache: false,
		contentType: 'application/json',
		data: JSON.stringify({ path: path }),
		processData: false,
		dataType: 'json'
	});
}

var song = function(path)
{
	if(!path)
	{
		return;
	}

	return $.ajax({
		method: 'POST',
		url: '/api/song',
		cache: false,
		contentType: 'application/json',
		data: JSON.stringify({ path: path }),
		processData: false,
		dataType: 'json'
	});
}

module.exports = {
	list: list,
	listsongs: listsongs,
	song: song,
	db: db
};

},{}],2:[function(require,module,exports){
var util = require('./util.js'),
	audioplayer = require('./audioplayer.js'),
	playlist = require('./playlist.js'),
	$progress, 
	$duration, 
	$position, 
	$song, 
	$artist, 
	$album, 
	$pause, 
	$next, 
	$prev;

$(function() {
	$progress = $("#progress .indicator");
	$duration = $("#duration");
	$position = $("#position");
	$song = $("#song");
	$artist = $("#artist");
	$album = $("#album");
	$pause = $("#pause");
	$next = $("#next");
	$prev = $("#prev");

	audioplayer.played.add(onPlayed);
	audioplayer.updated.add(onUpdated);
	audioplayer.paused.add(onPaused);
	audioplayer.resumed.add(onResumed);

	hookupEvents();
});

function onPaused() {
	$pause.removeClass('playing');
}

function onResumed()
{
	$pause.addClass('playing');
}

function onPlayed(item) {
	$song.html(item.song);
	$artist.html(item.artist);
	$album.html(item.album);

	$pause.addClass('playing');
};

function onUpdated(duration, current, percent)
{
	$progress.css("width", percent + "%");
	$position.html(util.secondsToTime(current));
	$duration.html(util.secondsToTime(duration));
}

function hookupEvents() {
	$pause.click(function() {
		if(!audioplayer.isPlaying())
			audioplayer.play();
		else
			audioplayer.pause();
	});

	$next.click(function() { playlist.next(); });
	$prev.click(function() { playlist.prev(); });
}

module.exports = {};
},{"./audioplayer.js":3,"./playlist.js":7,"./util.js":11}],3:[function(require,module,exports){
var $jPlayer, 
	isPlaying = false, 
	currentItem = null,
	signals = require('./vendor/signals.min.js'),
	audioplayer = {
		played: new signals.Signal(),
		paused: new signals.Signal(),
		resumed: new signals.Signal(),
		updated: new signals.Signal(),
		ended: new signals.Signal(),
		play: play,
		pause: pause,
		isPlaying: function() { return isPlaying; }
	};

$(function() {
	$jPlayer = $("#jPlayer");
	
	$jPlayer.jPlayer({ 
		supplied: 'mp3',
		timeupdate: updated,
		ended: function() {
			playing = false;
			audioplayer.ended.dispatch();
		}
	});
});

function updated(e) {
	var duration = e.jPlayer.status.duration === 0 ? currentItem.duration : e.jPlayer.status.duration;
	var current = e.jPlayer.status.currentTime;
	var percent = (current / duration) * 100;

	audioplayer.updated.dispatch(duration, current, percent);
}

function play(item)
{
	if(item) {
		isPlaying = true;
		currentItem = item;
		$jPlayer.jPlayer("setMedia", {
			mp3: item.stream
		});

		$jPlayer.jPlayer("play");
		audioplayer.played.dispatch(item);
	}
	else if(currentItem)
	{
		isPlaying = true;
		audioplayer.resumed.dispatch(item);
		$jPlayer.jPlayer("play");
	}
}

function pause()
{
	isPlaying = false;
	$jPlayer.jPlayer("pause");
	audioplayer.paused.dispatch();
}


module.exports = audioplayer;
},{"./vendor/signals.min.js":16}],4:[function(require,module,exports){
var navigation = require('./navigation.js');
var audiocontrols = require('./audiocontrols.js');

$(function() {
	navigation.initialize();
});


},{"./audiocontrols.js":2,"./navigation.js":6}],5:[function(require,module,exports){

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

},{"./api.js":1,"./vendor/lodash.min.js":13}],6:[function(require,module,exports){
var api = require('./api.js');
var playlist = require('./playlist.js');
var library = require('./library.js');
var _ = require('./vendor/lodash.min.js');
var templates = {
	itemDefault: require('./templates/navigation-default.js'),
	itemAlbum: require('./templates/navigation-album.js')
};

var $list, $up, currentPath = [], outerScroll = 0;
$(function() {
	$list = $("#list");
	$up = $("#up");
	$artist = $('h2.artist');

	$list.on('click', 'li', function() {
		var path = $(this).data('path');

		if(path.length === 1)
			navigate(path);
	});

	$list.on('dblclick', 'li', function() {
		var path = $(this).data('path');

		if(path.length !== 1)
			play(path);
	});

	$list.on('click', '.add', function(e) {
		e.stopPropagation();
		add($(this).parents('li').data('path'));
	});

	$list.on('click', '.play', function(e) {
		e.stopPropagation();
		play($(this).parents('li').data('path'));
	});

	$up.click(up);
});

function add(path, before)
{
	playlist.addSongs(library.getSongs(path), before);
}

function play(path)
{
	playlist.playSongs(library.getSongs(path));
}

function itemDragStart(e)
{
	e.dataTransfer.setData("item", JSON.stringify($(e.srcElement).data('item')));		
}


function up() {
	if(currentPath.length === 0)
		return;

	currentPath.pop();

	if(currentPath.length === 0)
		$up.addClass('hide');


	populateList(currentPath);
}

function navigate(path)
{
	$up.removeClass('hide');
	populateList(path);
}

function setBreadcrumb() {
	var str = "";
	$.each(currentPath, function(i,x) { str += x + "/"; });
	$breadcrumb.html(str.substring(0, str.length - 1));
}


function renderDefault(item, path, showAlphabet)
{
	var lastLetter = null;
	$.each(_.sortBy(item.items, 'name'), function(i,x) {
		var letter = x.name.substring(0,1)

		if(showAlphabet && lastLetter !== letter)
			$list.append('<li class="alphabet-letter" id="' + letter + '">' + letter + '</li>')

		var li = $(templates.itemDefault(x));
		$list.append(li);

		var itemPath = path.slice(0);
		itemPath.push(x.name);
		$(li).data('path', itemPath);

		lastLetter = x.name.substring(0,1);
		setTimeout(function() { li.addClass('enter'); }, 10);
	});
}

function renderArtist(item, path)
{
	_.each(item.items, function(x) 
	{
		var cover = _.find(x.images, function(y) { return y.size === 'large'; });
		x.cover = cover ? cover['#text'] : null;

		var album = $(templates.itemAlbum(x));
		$list.append(album)

		var albumPath = path.slice(0);
		albumPath.push(x.name);
		album.data('path', albumPath);

		renderDefault(x, albumPath.slice(0));

		setTimeout(function() { album.find('.row').addClass('enter'); }, 10);
	});
}


function populateList(path)
{
	$list.html('');

	path = path || [];
	currentPath = path;

	$artist.html(path.length === 0 ? 'Library' : path[0])
	$list.scrollTop(0);

	if(currentPath.length === 1)
		renderArtist(library.get(currentPath), currentPath.slice(0));
	else
		renderDefault(library.get(currentPath), currentPath.slice(0), true);
}

function initialize() {
	library.initialize().then(populateList);
}

module.exports = {
	itemDragStart: itemDragStart,
	add: add,
	populate: populateList,
	initialize: initialize
}
},{"./api.js":1,"./library.js":5,"./playlist.js":7,"./templates/navigation-album.js":8,"./templates/navigation-default.js":9,"./vendor/lodash.min.js":13}],7:[function(require,module,exports){
var audioplayer = require('./audioplayer.js'),
	api = require('./api.js'),
	util = require('./util.js'),
	mousetrap = require('./vendor/mousetrap.min.js'),
	currentSongs = [],
	currentIndex = null,
	dropIndex = null,
	$playlist, 
	currentDrag,
	selectedRows = [],
	_ = require('./vendor/lodash.min.js'),
	templates = {
		item: require('./templates/playlist-item.js')
	};

$(function() {
	$playlist = $("#playlist table tbody");

	$playlist.on('dblclick', '.item', function(e) {
		var curr = this;

		$playlist.find('.item').each(function(i,x) {
			if(x === curr)
			{
				currentIndex = i;
				return false;
			}
		});

		play();
	});

	$playlist.on('click', '.item', function(e) {
		if(e.ctrlKey)
		{
			ctrlSelect.call(this);
		}
		else if(e.shiftKey)
		{
			shiftSelect.call(this);
		}
		else {
			select([ this ]);
		}
	});

	mousetrap.bind('del', deleteSelected);

	$('#playlist table').sortable({
		containerSelector: 'table',
		itemPath: '> tbody',
		itemSelector: 'tr',
		placeholder: '<tr class="placeholder"/>',
		onDrop: function($item, container, _super)
		{
			var newOrder = [];

			$playlist.find('.item').each(function(i,x) 
			{
				newOrder.push(_.find(currentSongs, function(y) {
					return y.stream === $(x).data('stream');
				}));
			});

			currentSongs = newOrder;
			_super($item);
		}
	});

	audioplayer.ended.add(function()  {
		next();
	});
});



function deleteSelected() 
{
	for(var i = 0; i < currentSongs.length; i++)
	{
		if(_.find(selectedRows, function(x) { return currentSongs[i].stream === $(x).data('stream'); })) {
			currentSongs.splice(i, 1);
			i--;
		}
	}

	currentIndex = 0;
	render();
}

function shiftSelect() {
	if(selectedRows.length === 0)	
		return;

	var items = $playlist.find('.item');
	var startIndex = 0;
	var endIndex = 0;
	var curr = this;

	items.each(function(i,x) 
	{
		if(x === selectedRows[0])
			startIndex = i;

		if(x === curr)
			endIndex = i;
	});

	if(startIndex > endIndex)
	{
		var n = endIndex;
		endIndex = startIndex;
		startIndex = n;
	}

	selectedRows = items.slice(startIndex, endIndex + 1);
	select(selectedRows);
}

function ctrlSelect() {
	if(!_.contains(selectedRows, this))
	{
		selectedRows.push(this);
		select(selectedRows);
	}	
}

function addSongs(songs, before)
{
	if(!before)
		currentSongs = currentSongs.concat(songs);
	else {
		var after = currentSongs.splice(before, currentSongs.length);
		currentSongs = currentSongs.concat(songs, after);
	}

	render();
}

function select(rows)
{
	selectedRows = rows;

	$playlist.find('.item').removeClass('info');

	_.each(rows, function(x) {
		$(x).addClass('info')
	});
}

function playSongs(songs)
{
	currentSongs = [];

	addSongs(songs);
	currentIndex = 0; 
	play(); 
}

function play() {
	if(currentSongs.length === 0)
		return;

	if(!currentIndex || currentIndex >= currentSongs.length)
		currentIndex = 0;

	var song = currentSongs[currentIndex];
	audioplayer.play(song);
	
	$playlist.find('span.playing').addClass('hide');
	$playlist.find('.item').each(function(i,x) {

		if($(x).data('stream') === song.stream)
		{
			$(x).find('.playing').removeClass('hide');
		}
	});
}

function next() {
	currentIndex++;
	play();
}

function prev() {
	if(currentIndex === 0)
		return;

	currentIndex--;
	play();
}

function render() {
	$playlist.html('');
	$.each(currentSongs, function(i,x) {
		var row = $(templates.item({
			stream: x.stream,
			song: x.song,
			artist: x.artist,
			album: x.album,
			duration: util.secondsToTime(x.duration)
		}));

		$playlist.append(row);
		row.data('item', x);
	});
}

module.exports = {
	addSongs: addSongs,
	prev: prev,
	next: next,
	playSongs: playSongs
}
},{"./api.js":1,"./audioplayer.js":3,"./templates/playlist-item.js":10,"./util.js":11,"./vendor/lodash.min.js":13,"./vendor/mousetrap.min.js":15}],8:[function(require,module,exports){
jade = require("./../vendor/jaderuntime.js");function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),cover = locals_.cover,name = locals_.name,items = locals_.items;
buf.push("<li class=\"album\"><div class=\"row\"><div class=\"col-xs-4 cover\"><img" + (jade.attr("src", (cover || '/images/no-cover.png'), true, false)) + "/></div><div class=\"col-xs-8 info\"><h3>" + (jade.escape(null == (jade.interp = name) ? "" : jade.interp)) + "</h3><h5>2007</h5><h5>" + (jade.escape(null == (jade.interp = (items.length + " songs")) ? "" : jade.interp)) + "</h5><div class=\"btn-group\"><button class=\"btn btn-default play\"><span class=\"glyphicon glyphicon-play\"></span></button><button class=\"btn btn-default add\"><span class=\"glyphicon glyphicon-log-in\"></span></button></div></div></div></li>");;return buf.join("");
}module.exports = template;
},{"./../vendor/jaderuntime.js":12}],9:[function(require,module,exports){
jade = require("./../vendor/jaderuntime.js");function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),isFile = locals_.isFile,song = locals_.song,name = locals_.name;
buf.push("<li class=\"generic\">");
if ( isFile)
{
buf.push("<span>" + (jade.escape(null == (jade.interp = song) ? "" : jade.interp)) + "</span>");
}
else
{
buf.push("<span>" + (jade.escape(null == (jade.interp = name) ? "" : jade.interp)) + "</span><div class=\"btn-group pull-right\"><button class=\"btn btn-default play\"><span class=\"glyphicon glyphicon-play\"></span></button><button class=\"btn btn-default add\"><span class=\"glyphicon glyphicon-log-in\"></span></button></div>");
}
buf.push("</li>");;return buf.join("");
}module.exports = template;
},{"./../vendor/jaderuntime.js":12}],10:[function(require,module,exports){
jade = require("./../vendor/jaderuntime.js");function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),stream = locals_.stream,song = locals_.song,album = locals_.album,artist = locals_.artist,duration = locals_.duration;
buf.push("<tr" + (jade.attr("data-stream", stream, true, false)) + " class=\"item\"><td><span class=\"glyphicon glyphicon-volume-up playing hide\"></span><span>&nbsp;</span><span>" + (jade.escape(null == (jade.interp = song) ? "" : jade.interp)) + "</span></td><td>" + (jade.escape(null == (jade.interp = album) ? "" : jade.interp)) + "</td><td>" + (jade.escape(null == (jade.interp = artist) ? "" : jade.interp)) + "</td><td>" + (jade.escape(null == (jade.interp = duration) ? "" : jade.interp)) + "</td></tr>");;return buf.join("");
}module.exports = template;
},{"./../vendor/jaderuntime.js":12}],11:[function(require,module,exports){
var moment = require('./vendor/moment.js');

function secondsToTime(sec)
{
	return moment().startOf('day').add('s', sec).format('mm:ss')
}

module.exports = {
	secondsToTime: secondsToTime
};

},{"./vendor/moment.js":14}],12:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(' ') : val;
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};

/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str =  str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(require,module,exports){

},{}]},{},[1])
(1)
});
},{"fs":17}],13:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * @license
 * Lo-Dash 2.4.1 (Custom Build) lodash.com/license | Underscore.js 1.5.2 underscorejs.org/LICENSE
 * Build: `lodash modern -o ./dist/lodash.js`
 */
;(function(){function n(n,t,e){e=(e||0)-1;for(var r=n?n.length:0;++e<r;)if(n[e]===t)return e;return-1}function t(t,e){var r=typeof e;if(t=t.l,"boolean"==r||null==e)return t[e]?0:-1;"number"!=r&&"string"!=r&&(r="object");var u="number"==r?e:m+e;return t=(t=t[r])&&t[u],"object"==r?t&&-1<n(t,e)?0:-1:t?0:-1}function e(n){var t=this.l,e=typeof n;if("boolean"==e||null==n)t[n]=true;else{"number"!=e&&"string"!=e&&(e="object");var r="number"==e?n:m+n,t=t[e]||(t[e]={});"object"==e?(t[r]||(t[r]=[])).push(n):t[r]=true
}}function r(n){return n.charCodeAt(0)}function u(n,t){for(var e=n.m,r=t.m,u=-1,o=e.length;++u<o;){var i=e[u],a=r[u];if(i!==a){if(i>a||typeof i=="undefined")return 1;if(i<a||typeof a=="undefined")return-1}}return n.n-t.n}function o(n){var t=-1,r=n.length,u=n[0],o=n[r/2|0],i=n[r-1];if(u&&typeof u=="object"&&o&&typeof o=="object"&&i&&typeof i=="object")return false;for(u=f(),u["false"]=u["null"]=u["true"]=u.undefined=false,o=f(),o.k=n,o.l=u,o.push=e;++t<r;)o.push(n[t]);return o}function i(n){return"\\"+U[n]
}function a(){return h.pop()||[]}function f(){return g.pop()||{k:null,l:null,m:null,"false":false,n:0,"null":false,number:null,object:null,push:null,string:null,"true":false,undefined:false,o:null}}function l(n){n.length=0,h.length<_&&h.push(n)}function c(n){var t=n.l;t&&c(t),n.k=n.l=n.m=n.object=n.number=n.string=n.o=null,g.length<_&&g.push(n)}function p(n,t,e){t||(t=0),typeof e=="undefined"&&(e=n?n.length:0);var r=-1;e=e-t||0;for(var u=Array(0>e?0:e);++r<e;)u[r]=n[t+r];return u}function s(e){function h(n,t,e){if(!n||!V[typeof n])return n;
t=t&&typeof e=="undefined"?t:tt(t,e,3);for(var r=-1,u=V[typeof n]&&Fe(n),o=u?u.length:0;++r<o&&(e=u[r],false!==t(n[e],e,n)););return n}function g(n,t,e){var r;if(!n||!V[typeof n])return n;t=t&&typeof e=="undefined"?t:tt(t,e,3);for(r in n)if(false===t(n[r],r,n))break;return n}function _(n,t,e){var r,u=n,o=u;if(!u)return o;for(var i=arguments,a=0,f=typeof e=="number"?2:i.length;++a<f;)if((u=i[a])&&V[typeof u])for(var l=-1,c=V[typeof u]&&Fe(u),p=c?c.length:0;++l<p;)r=c[l],"undefined"==typeof o[r]&&(o[r]=u[r]);
return o}function U(n,t,e){var r,u=n,o=u;if(!u)return o;var i=arguments,a=0,f=typeof e=="number"?2:i.length;if(3<f&&"function"==typeof i[f-2])var l=tt(i[--f-1],i[f--],2);else 2<f&&"function"==typeof i[f-1]&&(l=i[--f]);for(;++a<f;)if((u=i[a])&&V[typeof u])for(var c=-1,p=V[typeof u]&&Fe(u),s=p?p.length:0;++c<s;)r=p[c],o[r]=l?l(o[r],u[r]):u[r];return o}function H(n){var t,e=[];if(!n||!V[typeof n])return e;for(t in n)me.call(n,t)&&e.push(t);return e}function J(n){return n&&typeof n=="object"&&!Te(n)&&me.call(n,"__wrapped__")?n:new Q(n)
}function Q(n,t){this.__chain__=!!t,this.__wrapped__=n}function X(n){function t(){if(r){var n=p(r);be.apply(n,arguments)}if(this instanceof t){var o=nt(e.prototype),n=e.apply(o,n||arguments);return wt(n)?n:o}return e.apply(u,n||arguments)}var e=n[0],r=n[2],u=n[4];return $e(t,n),t}function Z(n,t,e,r,u){if(e){var o=e(n);if(typeof o!="undefined")return o}if(!wt(n))return n;var i=ce.call(n);if(!K[i])return n;var f=Ae[i];switch(i){case T:case F:return new f(+n);case W:case P:return new f(n);case z:return o=f(n.source,C.exec(n)),o.lastIndex=n.lastIndex,o
}if(i=Te(n),t){var c=!r;r||(r=a()),u||(u=a());for(var s=r.length;s--;)if(r[s]==n)return u[s];o=i?f(n.length):{}}else o=i?p(n):U({},n);return i&&(me.call(n,"index")&&(o.index=n.index),me.call(n,"input")&&(o.input=n.input)),t?(r.push(n),u.push(o),(i?St:h)(n,function(n,i){o[i]=Z(n,t,e,r,u)}),c&&(l(r),l(u)),o):o}function nt(n){return wt(n)?ke(n):{}}function tt(n,t,e){if(typeof n!="function")return Ut;if(typeof t=="undefined"||!("prototype"in n))return n;var r=n.__bindData__;if(typeof r=="undefined"&&(De.funcNames&&(r=!n.name),r=r||!De.funcDecomp,!r)){var u=ge.call(n);
De.funcNames||(r=!O.test(u)),r||(r=E.test(u),$e(n,r))}if(false===r||true!==r&&1&r[1])return n;switch(e){case 1:return function(e){return n.call(t,e)};case 2:return function(e,r){return n.call(t,e,r)};case 3:return function(e,r,u){return n.call(t,e,r,u)};case 4:return function(e,r,u,o){return n.call(t,e,r,u,o)}}return Mt(n,t)}function et(n){function t(){var n=f?i:this;if(u){var h=p(u);be.apply(h,arguments)}return(o||c)&&(h||(h=p(arguments)),o&&be.apply(h,o),c&&h.length<a)?(r|=16,et([e,s?r:-4&r,h,null,i,a])):(h||(h=arguments),l&&(e=n[v]),this instanceof t?(n=nt(e.prototype),h=e.apply(n,h),wt(h)?h:n):e.apply(n,h))
}var e=n[0],r=n[1],u=n[2],o=n[3],i=n[4],a=n[5],f=1&r,l=2&r,c=4&r,s=8&r,v=e;return $e(t,n),t}function rt(e,r){var u=-1,i=st(),a=e?e.length:0,f=a>=b&&i===n,l=[];if(f){var p=o(r);p?(i=t,r=p):f=false}for(;++u<a;)p=e[u],0>i(r,p)&&l.push(p);return f&&c(r),l}function ut(n,t,e,r){r=(r||0)-1;for(var u=n?n.length:0,o=[];++r<u;){var i=n[r];if(i&&typeof i=="object"&&typeof i.length=="number"&&(Te(i)||yt(i))){t||(i=ut(i,t,e));var a=-1,f=i.length,l=o.length;for(o.length+=f;++a<f;)o[l++]=i[a]}else e||o.push(i)}return o
}function ot(n,t,e,r,u,o){if(e){var i=e(n,t);if(typeof i!="undefined")return!!i}if(n===t)return 0!==n||1/n==1/t;if(n===n&&!(n&&V[typeof n]||t&&V[typeof t]))return false;if(null==n||null==t)return n===t;var f=ce.call(n),c=ce.call(t);if(f==D&&(f=q),c==D&&(c=q),f!=c)return false;switch(f){case T:case F:return+n==+t;case W:return n!=+n?t!=+t:0==n?1/n==1/t:n==+t;case z:case P:return n==oe(t)}if(c=f==$,!c){var p=me.call(n,"__wrapped__"),s=me.call(t,"__wrapped__");if(p||s)return ot(p?n.__wrapped__:n,s?t.__wrapped__:t,e,r,u,o);
if(f!=q)return false;if(f=n.constructor,p=t.constructor,f!=p&&!(dt(f)&&f instanceof f&&dt(p)&&p instanceof p)&&"constructor"in n&&"constructor"in t)return false}for(f=!u,u||(u=a()),o||(o=a()),p=u.length;p--;)if(u[p]==n)return o[p]==t;var v=0,i=true;if(u.push(n),o.push(t),c){if(p=n.length,v=t.length,(i=v==p)||r)for(;v--;)if(c=p,s=t[v],r)for(;c--&&!(i=ot(n[c],s,e,r,u,o)););else if(!(i=ot(n[v],s,e,r,u,o)))break}else g(t,function(t,a,f){return me.call(f,a)?(v++,i=me.call(n,a)&&ot(n[a],t,e,r,u,o)):void 0}),i&&!r&&g(n,function(n,t,e){return me.call(e,t)?i=-1<--v:void 0
});return u.pop(),o.pop(),f&&(l(u),l(o)),i}function it(n,t,e,r,u){(Te(t)?St:h)(t,function(t,o){var i,a,f=t,l=n[o];if(t&&((a=Te(t))||Pe(t))){for(f=r.length;f--;)if(i=r[f]==t){l=u[f];break}if(!i){var c;e&&(f=e(l,t),c=typeof f!="undefined")&&(l=f),c||(l=a?Te(l)?l:[]:Pe(l)?l:{}),r.push(t),u.push(l),c||it(l,t,e,r,u)}}else e&&(f=e(l,t),typeof f=="undefined"&&(f=t)),typeof f!="undefined"&&(l=f);n[o]=l})}function at(n,t){return n+he(Re()*(t-n+1))}function ft(e,r,u){var i=-1,f=st(),p=e?e.length:0,s=[],v=!r&&p>=b&&f===n,h=u||v?a():s;
for(v&&(h=o(h),f=t);++i<p;){var g=e[i],y=u?u(g,i,e):g;(r?!i||h[h.length-1]!==y:0>f(h,y))&&((u||v)&&h.push(y),s.push(g))}return v?(l(h.k),c(h)):u&&l(h),s}function lt(n){return function(t,e,r){var u={};e=J.createCallback(e,r,3),r=-1;var o=t?t.length:0;if(typeof o=="number")for(;++r<o;){var i=t[r];n(u,i,e(i,r,t),t)}else h(t,function(t,r,o){n(u,t,e(t,r,o),o)});return u}}function ct(n,t,e,r,u,o){var i=1&t,a=4&t,f=16&t,l=32&t;if(!(2&t||dt(n)))throw new ie;f&&!e.length&&(t&=-17,f=e=false),l&&!r.length&&(t&=-33,l=r=false);
var c=n&&n.__bindData__;return c&&true!==c?(c=p(c),c[2]&&(c[2]=p(c[2])),c[3]&&(c[3]=p(c[3])),!i||1&c[1]||(c[4]=u),!i&&1&c[1]&&(t|=8),!a||4&c[1]||(c[5]=o),f&&be.apply(c[2]||(c[2]=[]),e),l&&we.apply(c[3]||(c[3]=[]),r),c[1]|=t,ct.apply(null,c)):(1==t||17===t?X:et)([n,t,e,r,u,o])}function pt(n){return Be[n]}function st(){var t=(t=J.indexOf)===Wt?n:t;return t}function vt(n){return typeof n=="function"&&pe.test(n)}function ht(n){var t,e;return n&&ce.call(n)==q&&(t=n.constructor,!dt(t)||t instanceof t)?(g(n,function(n,t){e=t
}),typeof e=="undefined"||me.call(n,e)):false}function gt(n){return We[n]}function yt(n){return n&&typeof n=="object"&&typeof n.length=="number"&&ce.call(n)==D||false}function mt(n,t,e){var r=Fe(n),u=r.length;for(t=tt(t,e,3);u--&&(e=r[u],false!==t(n[e],e,n)););return n}function bt(n){var t=[];return g(n,function(n,e){dt(n)&&t.push(e)}),t.sort()}function _t(n){for(var t=-1,e=Fe(n),r=e.length,u={};++t<r;){var o=e[t];u[n[o]]=o}return u}function dt(n){return typeof n=="function"}function wt(n){return!(!n||!V[typeof n])
}function jt(n){return typeof n=="number"||n&&typeof n=="object"&&ce.call(n)==W||false}function kt(n){return typeof n=="string"||n&&typeof n=="object"&&ce.call(n)==P||false}function xt(n){for(var t=-1,e=Fe(n),r=e.length,u=Xt(r);++t<r;)u[t]=n[e[t]];return u}function Ct(n,t,e){var r=-1,u=st(),o=n?n.length:0,i=false;return e=(0>e?Ie(0,o+e):e)||0,Te(n)?i=-1<u(n,t,e):typeof o=="number"?i=-1<(kt(n)?n.indexOf(t,e):u(n,t,e)):h(n,function(n){return++r<e?void 0:!(i=n===t)}),i}function Ot(n,t,e){var r=true;t=J.createCallback(t,e,3),e=-1;
var u=n?n.length:0;if(typeof u=="number")for(;++e<u&&(r=!!t(n[e],e,n)););else h(n,function(n,e,u){return r=!!t(n,e,u)});return r}function Nt(n,t,e){var r=[];t=J.createCallback(t,e,3),e=-1;var u=n?n.length:0;if(typeof u=="number")for(;++e<u;){var o=n[e];t(o,e,n)&&r.push(o)}else h(n,function(n,e,u){t(n,e,u)&&r.push(n)});return r}function It(n,t,e){t=J.createCallback(t,e,3),e=-1;var r=n?n.length:0;if(typeof r!="number"){var u;return h(n,function(n,e,r){return t(n,e,r)?(u=n,false):void 0}),u}for(;++e<r;){var o=n[e];
if(t(o,e,n))return o}}function St(n,t,e){var r=-1,u=n?n.length:0;if(t=t&&typeof e=="undefined"?t:tt(t,e,3),typeof u=="number")for(;++r<u&&false!==t(n[r],r,n););else h(n,t);return n}function Et(n,t,e){var r=n?n.length:0;if(t=t&&typeof e=="undefined"?t:tt(t,e,3),typeof r=="number")for(;r--&&false!==t(n[r],r,n););else{var u=Fe(n),r=u.length;h(n,function(n,e,o){return e=u?u[--r]:--r,t(o[e],e,o)})}return n}function Rt(n,t,e){var r=-1,u=n?n.length:0;if(t=J.createCallback(t,e,3),typeof u=="number")for(var o=Xt(u);++r<u;)o[r]=t(n[r],r,n);
else o=[],h(n,function(n,e,u){o[++r]=t(n,e,u)});return o}function At(n,t,e){var u=-1/0,o=u;if(typeof t!="function"&&e&&e[t]===n&&(t=null),null==t&&Te(n)){e=-1;for(var i=n.length;++e<i;){var a=n[e];a>o&&(o=a)}}else t=null==t&&kt(n)?r:J.createCallback(t,e,3),St(n,function(n,e,r){e=t(n,e,r),e>u&&(u=e,o=n)});return o}function Dt(n,t,e,r){if(!n)return e;var u=3>arguments.length;t=J.createCallback(t,r,4);var o=-1,i=n.length;if(typeof i=="number")for(u&&(e=n[++o]);++o<i;)e=t(e,n[o],o,n);else h(n,function(n,r,o){e=u?(u=false,n):t(e,n,r,o)
});return e}function $t(n,t,e,r){var u=3>arguments.length;return t=J.createCallback(t,r,4),Et(n,function(n,r,o){e=u?(u=false,n):t(e,n,r,o)}),e}function Tt(n){var t=-1,e=n?n.length:0,r=Xt(typeof e=="number"?e:0);return St(n,function(n){var e=at(0,++t);r[t]=r[e],r[e]=n}),r}function Ft(n,t,e){var r;t=J.createCallback(t,e,3),e=-1;var u=n?n.length:0;if(typeof u=="number")for(;++e<u&&!(r=t(n[e],e,n)););else h(n,function(n,e,u){return!(r=t(n,e,u))});return!!r}function Bt(n,t,e){var r=0,u=n?n.length:0;if(typeof t!="number"&&null!=t){var o=-1;
for(t=J.createCallback(t,e,3);++o<u&&t(n[o],o,n);)r++}else if(r=t,null==r||e)return n?n[0]:v;return p(n,0,Se(Ie(0,r),u))}function Wt(t,e,r){if(typeof r=="number"){var u=t?t.length:0;r=0>r?Ie(0,u+r):r||0}else if(r)return r=zt(t,e),t[r]===e?r:-1;return n(t,e,r)}function qt(n,t,e){if(typeof t!="number"&&null!=t){var r=0,u=-1,o=n?n.length:0;for(t=J.createCallback(t,e,3);++u<o&&t(n[u],u,n);)r++}else r=null==t||e?1:Ie(0,t);return p(n,r)}function zt(n,t,e,r){var u=0,o=n?n.length:u;for(e=e?J.createCallback(e,r,1):Ut,t=e(t);u<o;)r=u+o>>>1,e(n[r])<t?u=r+1:o=r;
return u}function Pt(n,t,e,r){return typeof t!="boolean"&&null!=t&&(r=e,e=typeof t!="function"&&r&&r[t]===n?null:t,t=false),null!=e&&(e=J.createCallback(e,r,3)),ft(n,t,e)}function Kt(){for(var n=1<arguments.length?arguments:arguments[0],t=-1,e=n?At(Ve(n,"length")):0,r=Xt(0>e?0:e);++t<e;)r[t]=Ve(n,t);return r}function Lt(n,t){var e=-1,r=n?n.length:0,u={};for(t||!r||Te(n[0])||(t=[]);++e<r;){var o=n[e];t?u[o]=t[e]:o&&(u[o[0]]=o[1])}return u}function Mt(n,t){return 2<arguments.length?ct(n,17,p(arguments,2),null,t):ct(n,1,null,null,t)
}function Vt(n,t,e){function r(){c&&ve(c),i=c=p=v,(g||h!==t)&&(s=Ue(),a=n.apply(l,o),c||i||(o=l=null))}function u(){var e=t-(Ue()-f);0<e?c=_e(u,e):(i&&ve(i),e=p,i=c=p=v,e&&(s=Ue(),a=n.apply(l,o),c||i||(o=l=null)))}var o,i,a,f,l,c,p,s=0,h=false,g=true;if(!dt(n))throw new ie;if(t=Ie(0,t)||0,true===e)var y=true,g=false;else wt(e)&&(y=e.leading,h="maxWait"in e&&(Ie(t,e.maxWait)||0),g="trailing"in e?e.trailing:g);return function(){if(o=arguments,f=Ue(),l=this,p=g&&(c||!y),false===h)var e=y&&!c;else{i||y||(s=f);var v=h-(f-s),m=0>=v;
m?(i&&(i=ve(i)),s=f,a=n.apply(l,o)):i||(i=_e(r,v))}return m&&c?c=ve(c):c||t===h||(c=_e(u,t)),e&&(m=true,a=n.apply(l,o)),!m||c||i||(o=l=null),a}}function Ut(n){return n}function Gt(n,t,e){var r=true,u=t&&bt(t);t&&(e||u.length)||(null==e&&(e=t),o=Q,t=n,n=J,u=bt(t)),false===e?r=false:wt(e)&&"chain"in e&&(r=e.chain);var o=n,i=dt(o);St(u,function(e){var u=n[e]=t[e];i&&(o.prototype[e]=function(){var t=this.__chain__,e=this.__wrapped__,i=[e];if(be.apply(i,arguments),i=u.apply(n,i),r||t){if(e===i&&wt(i))return this;
i=new o(i),i.__chain__=t}return i})})}function Ht(){}function Jt(n){return function(t){return t[n]}}function Qt(){return this.__wrapped__}e=e?Y.defaults(G.Object(),e,Y.pick(G,A)):G;var Xt=e.Array,Yt=e.Boolean,Zt=e.Date,ne=e.Function,te=e.Math,ee=e.Number,re=e.Object,ue=e.RegExp,oe=e.String,ie=e.TypeError,ae=[],fe=re.prototype,le=e._,ce=fe.toString,pe=ue("^"+oe(ce).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/toString| for [^\]]+/g,".*?")+"$"),se=te.ceil,ve=e.clearTimeout,he=te.floor,ge=ne.prototype.toString,ye=vt(ye=re.getPrototypeOf)&&ye,me=fe.hasOwnProperty,be=ae.push,_e=e.setTimeout,de=ae.splice,we=ae.unshift,je=function(){try{var n={},t=vt(t=re.defineProperty)&&t,e=t(n,n,n)&&t
}catch(r){}return e}(),ke=vt(ke=re.create)&&ke,xe=vt(xe=Xt.isArray)&&xe,Ce=e.isFinite,Oe=e.isNaN,Ne=vt(Ne=re.keys)&&Ne,Ie=te.max,Se=te.min,Ee=e.parseInt,Re=te.random,Ae={};Ae[$]=Xt,Ae[T]=Yt,Ae[F]=Zt,Ae[B]=ne,Ae[q]=re,Ae[W]=ee,Ae[z]=ue,Ae[P]=oe,Q.prototype=J.prototype;var De=J.support={};De.funcDecomp=!vt(e.a)&&E.test(s),De.funcNames=typeof ne.name=="string",J.templateSettings={escape:/<%-([\s\S]+?)%>/g,evaluate:/<%([\s\S]+?)%>/g,interpolate:N,variable:"",imports:{_:J}},ke||(nt=function(){function n(){}return function(t){if(wt(t)){n.prototype=t;
var r=new n;n.prototype=null}return r||e.Object()}}());var $e=je?function(n,t){M.value=t,je(n,"__bindData__",M)}:Ht,Te=xe||function(n){return n&&typeof n=="object"&&typeof n.length=="number"&&ce.call(n)==$||false},Fe=Ne?function(n){return wt(n)?Ne(n):[]}:H,Be={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},We=_t(Be),qe=ue("("+Fe(We).join("|")+")","g"),ze=ue("["+Fe(Be).join("")+"]","g"),Pe=ye?function(n){if(!n||ce.call(n)!=q)return false;var t=n.valueOf,e=vt(t)&&(e=ye(t))&&ye(e);return e?n==e||ye(n)==e:ht(n)
}:ht,Ke=lt(function(n,t,e){me.call(n,e)?n[e]++:n[e]=1}),Le=lt(function(n,t,e){(me.call(n,e)?n[e]:n[e]=[]).push(t)}),Me=lt(function(n,t,e){n[e]=t}),Ve=Rt,Ue=vt(Ue=Zt.now)&&Ue||function(){return(new Zt).getTime()},Ge=8==Ee(d+"08")?Ee:function(n,t){return Ee(kt(n)?n.replace(I,""):n,t||0)};return J.after=function(n,t){if(!dt(t))throw new ie;return function(){return 1>--n?t.apply(this,arguments):void 0}},J.assign=U,J.at=function(n){for(var t=arguments,e=-1,r=ut(t,true,false,1),t=t[2]&&t[2][t[1]]===n?1:r.length,u=Xt(t);++e<t;)u[e]=n[r[e]];
return u},J.bind=Mt,J.bindAll=function(n){for(var t=1<arguments.length?ut(arguments,true,false,1):bt(n),e=-1,r=t.length;++e<r;){var u=t[e];n[u]=ct(n[u],1,null,null,n)}return n},J.bindKey=function(n,t){return 2<arguments.length?ct(t,19,p(arguments,2),null,n):ct(t,3,null,null,n)},J.chain=function(n){return n=new Q(n),n.__chain__=true,n},J.compact=function(n){for(var t=-1,e=n?n.length:0,r=[];++t<e;){var u=n[t];u&&r.push(u)}return r},J.compose=function(){for(var n=arguments,t=n.length;t--;)if(!dt(n[t]))throw new ie;
return function(){for(var t=arguments,e=n.length;e--;)t=[n[e].apply(this,t)];return t[0]}},J.constant=function(n){return function(){return n}},J.countBy=Ke,J.create=function(n,t){var e=nt(n);return t?U(e,t):e},J.createCallback=function(n,t,e){var r=typeof n;if(null==n||"function"==r)return tt(n,t,e);if("object"!=r)return Jt(n);var u=Fe(n),o=u[0],i=n[o];return 1!=u.length||i!==i||wt(i)?function(t){for(var e=u.length,r=false;e--&&(r=ot(t[u[e]],n[u[e]],null,true)););return r}:function(n){return n=n[o],i===n&&(0!==i||1/i==1/n)
}},J.curry=function(n,t){return t=typeof t=="number"?t:+t||n.length,ct(n,4,null,null,null,t)},J.debounce=Vt,J.defaults=_,J.defer=function(n){if(!dt(n))throw new ie;var t=p(arguments,1);return _e(function(){n.apply(v,t)},1)},J.delay=function(n,t){if(!dt(n))throw new ie;var e=p(arguments,2);return _e(function(){n.apply(v,e)},t)},J.difference=function(n){return rt(n,ut(arguments,true,true,1))},J.filter=Nt,J.flatten=function(n,t,e,r){return typeof t!="boolean"&&null!=t&&(r=e,e=typeof t!="function"&&r&&r[t]===n?null:t,t=false),null!=e&&(n=Rt(n,e,r)),ut(n,t)
},J.forEach=St,J.forEachRight=Et,J.forIn=g,J.forInRight=function(n,t,e){var r=[];g(n,function(n,t){r.push(t,n)});var u=r.length;for(t=tt(t,e,3);u--&&false!==t(r[u--],r[u],n););return n},J.forOwn=h,J.forOwnRight=mt,J.functions=bt,J.groupBy=Le,J.indexBy=Me,J.initial=function(n,t,e){var r=0,u=n?n.length:0;if(typeof t!="number"&&null!=t){var o=u;for(t=J.createCallback(t,e,3);o--&&t(n[o],o,n);)r++}else r=null==t||e?1:t||r;return p(n,0,Se(Ie(0,u-r),u))},J.intersection=function(){for(var e=[],r=-1,u=arguments.length,i=a(),f=st(),p=f===n,s=a();++r<u;){var v=arguments[r];
(Te(v)||yt(v))&&(e.push(v),i.push(p&&v.length>=b&&o(r?e[r]:s)))}var p=e[0],h=-1,g=p?p.length:0,y=[];n:for(;++h<g;){var m=i[0],v=p[h];if(0>(m?t(m,v):f(s,v))){for(r=u,(m||s).push(v);--r;)if(m=i[r],0>(m?t(m,v):f(e[r],v)))continue n;y.push(v)}}for(;u--;)(m=i[u])&&c(m);return l(i),l(s),y},J.invert=_t,J.invoke=function(n,t){var e=p(arguments,2),r=-1,u=typeof t=="function",o=n?n.length:0,i=Xt(typeof o=="number"?o:0);return St(n,function(n){i[++r]=(u?t:n[t]).apply(n,e)}),i},J.keys=Fe,J.map=Rt,J.mapValues=function(n,t,e){var r={};
return t=J.createCallback(t,e,3),h(n,function(n,e,u){r[e]=t(n,e,u)}),r},J.max=At,J.memoize=function(n,t){function e(){var r=e.cache,u=t?t.apply(this,arguments):m+arguments[0];return me.call(r,u)?r[u]:r[u]=n.apply(this,arguments)}if(!dt(n))throw new ie;return e.cache={},e},J.merge=function(n){var t=arguments,e=2;if(!wt(n))return n;if("number"!=typeof t[2]&&(e=t.length),3<e&&"function"==typeof t[e-2])var r=tt(t[--e-1],t[e--],2);else 2<e&&"function"==typeof t[e-1]&&(r=t[--e]);for(var t=p(arguments,1,e),u=-1,o=a(),i=a();++u<e;)it(n,t[u],r,o,i);
return l(o),l(i),n},J.min=function(n,t,e){var u=1/0,o=u;if(typeof t!="function"&&e&&e[t]===n&&(t=null),null==t&&Te(n)){e=-1;for(var i=n.length;++e<i;){var a=n[e];a<o&&(o=a)}}else t=null==t&&kt(n)?r:J.createCallback(t,e,3),St(n,function(n,e,r){e=t(n,e,r),e<u&&(u=e,o=n)});return o},J.omit=function(n,t,e){var r={};if(typeof t!="function"){var u=[];g(n,function(n,t){u.push(t)});for(var u=rt(u,ut(arguments,true,false,1)),o=-1,i=u.length;++o<i;){var a=u[o];r[a]=n[a]}}else t=J.createCallback(t,e,3),g(n,function(n,e,u){t(n,e,u)||(r[e]=n)
});return r},J.once=function(n){var t,e;if(!dt(n))throw new ie;return function(){return t?e:(t=true,e=n.apply(this,arguments),n=null,e)}},J.pairs=function(n){for(var t=-1,e=Fe(n),r=e.length,u=Xt(r);++t<r;){var o=e[t];u[t]=[o,n[o]]}return u},J.partial=function(n){return ct(n,16,p(arguments,1))},J.partialRight=function(n){return ct(n,32,null,p(arguments,1))},J.pick=function(n,t,e){var r={};if(typeof t!="function")for(var u=-1,o=ut(arguments,true,false,1),i=wt(n)?o.length:0;++u<i;){var a=o[u];a in n&&(r[a]=n[a])
}else t=J.createCallback(t,e,3),g(n,function(n,e,u){t(n,e,u)&&(r[e]=n)});return r},J.pluck=Ve,J.property=Jt,J.pull=function(n){for(var t=arguments,e=0,r=t.length,u=n?n.length:0;++e<r;)for(var o=-1,i=t[e];++o<u;)n[o]===i&&(de.call(n,o--,1),u--);return n},J.range=function(n,t,e){n=+n||0,e=typeof e=="number"?e:+e||1,null==t&&(t=n,n=0);var r=-1;t=Ie(0,se((t-n)/(e||1)));for(var u=Xt(t);++r<t;)u[r]=n,n+=e;return u},J.reject=function(n,t,e){return t=J.createCallback(t,e,3),Nt(n,function(n,e,r){return!t(n,e,r)
})},J.remove=function(n,t,e){var r=-1,u=n?n.length:0,o=[];for(t=J.createCallback(t,e,3);++r<u;)e=n[r],t(e,r,n)&&(o.push(e),de.call(n,r--,1),u--);return o},J.rest=qt,J.shuffle=Tt,J.sortBy=function(n,t,e){var r=-1,o=Te(t),i=n?n.length:0,p=Xt(typeof i=="number"?i:0);for(o||(t=J.createCallback(t,e,3)),St(n,function(n,e,u){var i=p[++r]=f();o?i.m=Rt(t,function(t){return n[t]}):(i.m=a())[0]=t(n,e,u),i.n=r,i.o=n}),i=p.length,p.sort(u);i--;)n=p[i],p[i]=n.o,o||l(n.m),c(n);return p},J.tap=function(n,t){return t(n),n
},J.throttle=function(n,t,e){var r=true,u=true;if(!dt(n))throw new ie;return false===e?r=false:wt(e)&&(r="leading"in e?e.leading:r,u="trailing"in e?e.trailing:u),L.leading=r,L.maxWait=t,L.trailing=u,Vt(n,t,L)},J.times=function(n,t,e){n=-1<(n=+n)?n:0;var r=-1,u=Xt(n);for(t=tt(t,e,1);++r<n;)u[r]=t(r);return u},J.toArray=function(n){return n&&typeof n.length=="number"?p(n):xt(n)},J.transform=function(n,t,e,r){var u=Te(n);if(null==e)if(u)e=[];else{var o=n&&n.constructor;e=nt(o&&o.prototype)}return t&&(t=J.createCallback(t,r,4),(u?St:h)(n,function(n,r,u){return t(e,n,r,u)
})),e},J.union=function(){return ft(ut(arguments,true,true))},J.uniq=Pt,J.values=xt,J.where=Nt,J.without=function(n){return rt(n,p(arguments,1))},J.wrap=function(n,t){return ct(t,16,[n])},J.xor=function(){for(var n=-1,t=arguments.length;++n<t;){var e=arguments[n];if(Te(e)||yt(e))var r=r?ft(rt(r,e).concat(rt(e,r))):e}return r||[]},J.zip=Kt,J.zipObject=Lt,J.collect=Rt,J.drop=qt,J.each=St,J.eachRight=Et,J.extend=U,J.methods=bt,J.object=Lt,J.select=Nt,J.tail=qt,J.unique=Pt,J.unzip=Kt,Gt(J),J.clone=function(n,t,e,r){return typeof t!="boolean"&&null!=t&&(r=e,e=t,t=false),Z(n,t,typeof e=="function"&&tt(e,r,1))
},J.cloneDeep=function(n,t,e){return Z(n,true,typeof t=="function"&&tt(t,e,1))},J.contains=Ct,J.escape=function(n){return null==n?"":oe(n).replace(ze,pt)},J.every=Ot,J.find=It,J.findIndex=function(n,t,e){var r=-1,u=n?n.length:0;for(t=J.createCallback(t,e,3);++r<u;)if(t(n[r],r,n))return r;return-1},J.findKey=function(n,t,e){var r;return t=J.createCallback(t,e,3),h(n,function(n,e,u){return t(n,e,u)?(r=e,false):void 0}),r},J.findLast=function(n,t,e){var r;return t=J.createCallback(t,e,3),Et(n,function(n,e,u){return t(n,e,u)?(r=n,false):void 0
}),r},J.findLastIndex=function(n,t,e){var r=n?n.length:0;for(t=J.createCallback(t,e,3);r--;)if(t(n[r],r,n))return r;return-1},J.findLastKey=function(n,t,e){var r;return t=J.createCallback(t,e,3),mt(n,function(n,e,u){return t(n,e,u)?(r=e,false):void 0}),r},J.has=function(n,t){return n?me.call(n,t):false},J.identity=Ut,J.indexOf=Wt,J.isArguments=yt,J.isArray=Te,J.isBoolean=function(n){return true===n||false===n||n&&typeof n=="object"&&ce.call(n)==T||false},J.isDate=function(n){return n&&typeof n=="object"&&ce.call(n)==F||false
},J.isElement=function(n){return n&&1===n.nodeType||false},J.isEmpty=function(n){var t=true;if(!n)return t;var e=ce.call(n),r=n.length;return e==$||e==P||e==D||e==q&&typeof r=="number"&&dt(n.splice)?!r:(h(n,function(){return t=false}),t)},J.isEqual=function(n,t,e,r){return ot(n,t,typeof e=="function"&&tt(e,r,2))},J.isFinite=function(n){return Ce(n)&&!Oe(parseFloat(n))},J.isFunction=dt,J.isNaN=function(n){return jt(n)&&n!=+n},J.isNull=function(n){return null===n},J.isNumber=jt,J.isObject=wt,J.isPlainObject=Pe,J.isRegExp=function(n){return n&&typeof n=="object"&&ce.call(n)==z||false
},J.isString=kt,J.isUndefined=function(n){return typeof n=="undefined"},J.lastIndexOf=function(n,t,e){var r=n?n.length:0;for(typeof e=="number"&&(r=(0>e?Ie(0,r+e):Se(e,r-1))+1);r--;)if(n[r]===t)return r;return-1},J.mixin=Gt,J.noConflict=function(){return e._=le,this},J.noop=Ht,J.now=Ue,J.parseInt=Ge,J.random=function(n,t,e){var r=null==n,u=null==t;return null==e&&(typeof n=="boolean"&&u?(e=n,n=1):u||typeof t!="boolean"||(e=t,u=true)),r&&u&&(t=1),n=+n||0,u?(t=n,n=0):t=+t||0,e||n%1||t%1?(e=Re(),Se(n+e*(t-n+parseFloat("1e-"+((e+"").length-1))),t)):at(n,t)
},J.reduce=Dt,J.reduceRight=$t,J.result=function(n,t){if(n){var e=n[t];return dt(e)?n[t]():e}},J.runInContext=s,J.size=function(n){var t=n?n.length:0;return typeof t=="number"?t:Fe(n).length},J.some=Ft,J.sortedIndex=zt,J.template=function(n,t,e){var r=J.templateSettings;n=oe(n||""),e=_({},e,r);var u,o=_({},e.imports,r.imports),r=Fe(o),o=xt(o),a=0,f=e.interpolate||S,l="__p+='",f=ue((e.escape||S).source+"|"+f.source+"|"+(f===N?x:S).source+"|"+(e.evaluate||S).source+"|$","g");n.replace(f,function(t,e,r,o,f,c){return r||(r=o),l+=n.slice(a,c).replace(R,i),e&&(l+="'+__e("+e+")+'"),f&&(u=true,l+="';"+f+";\n__p+='"),r&&(l+="'+((__t=("+r+"))==null?'':__t)+'"),a=c+t.length,t
}),l+="';",f=e=e.variable,f||(e="obj",l="with("+e+"){"+l+"}"),l=(u?l.replace(w,""):l).replace(j,"$1").replace(k,"$1;"),l="function("+e+"){"+(f?"":e+"||("+e+"={});")+"var __t,__p='',__e=_.escape"+(u?",__j=Array.prototype.join;function print(){__p+=__j.call(arguments,'')}":";")+l+"return __p}";try{var c=ne(r,"return "+l).apply(v,o)}catch(p){throw p.source=l,p}return t?c(t):(c.source=l,c)},J.unescape=function(n){return null==n?"":oe(n).replace(qe,gt)},J.uniqueId=function(n){var t=++y;return oe(null==n?"":n)+t
},J.all=Ot,J.any=Ft,J.detect=It,J.findWhere=It,J.foldl=Dt,J.foldr=$t,J.include=Ct,J.inject=Dt,Gt(function(){var n={};return h(J,function(t,e){J.prototype[e]||(n[e]=t)}),n}(),false),J.first=Bt,J.last=function(n,t,e){var r=0,u=n?n.length:0;if(typeof t!="number"&&null!=t){var o=u;for(t=J.createCallback(t,e,3);o--&&t(n[o],o,n);)r++}else if(r=t,null==r||e)return n?n[u-1]:v;return p(n,Ie(0,u-r))},J.sample=function(n,t,e){return n&&typeof n.length!="number"&&(n=xt(n)),null==t||e?n?n[at(0,n.length-1)]:v:(n=Tt(n),n.length=Se(Ie(0,t),n.length),n)
},J.take=Bt,J.head=Bt,h(J,function(n,t){var e="sample"!==t;J.prototype[t]||(J.prototype[t]=function(t,r){var u=this.__chain__,o=n(this.__wrapped__,t,r);return u||null!=t&&(!r||e&&typeof t=="function")?new Q(o,u):o})}),J.VERSION="2.4.1",J.prototype.chain=function(){return this.__chain__=true,this},J.prototype.toString=function(){return oe(this.__wrapped__)},J.prototype.value=Qt,J.prototype.valueOf=Qt,St(["join","pop","shift"],function(n){var t=ae[n];J.prototype[n]=function(){var n=this.__chain__,e=t.apply(this.__wrapped__,arguments);
return n?new Q(e,n):e}}),St(["push","reverse","sort","unshift"],function(n){var t=ae[n];J.prototype[n]=function(){return t.apply(this.__wrapped__,arguments),this}}),St(["concat","slice","splice"],function(n){var t=ae[n];J.prototype[n]=function(){return new Q(t.apply(this.__wrapped__,arguments),this.__chain__)}}),J}var v,h=[],g=[],y=0,m=+new Date+"",b=75,_=40,d=" \t\x0B\f\xa0\ufeff\n\r\u2028\u2029\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000",w=/\b__p\+='';/g,j=/\b(__p\+=)''\+/g,k=/(__e\(.*?\)|\b__t\))\+'';/g,x=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,C=/\w*$/,O=/^\s*function[ \n\r\t]+\w/,N=/<%=([\s\S]+?)%>/g,I=RegExp("^["+d+"]*0+(?=.$)"),S=/($^)/,E=/\bthis\b/,R=/['\n\r\t\u2028\u2029\\]/g,A="Array Boolean Date Function Math Number Object RegExp String _ attachEvent clearTimeout isFinite isNaN parseInt setTimeout".split(" "),D="[object Arguments]",$="[object Array]",T="[object Boolean]",F="[object Date]",B="[object Function]",W="[object Number]",q="[object Object]",z="[object RegExp]",P="[object String]",K={};
K[B]=false,K[D]=K[$]=K[T]=K[F]=K[W]=K[q]=K[z]=K[P]=true;var L={leading:false,maxWait:0,trailing:false},M={configurable:false,enumerable:false,value:null,writable:false},V={"boolean":false,"function":true,object:true,number:false,string:false,undefined:false},U={"\\":"\\","'":"'","\n":"n","\r":"r","\t":"t","\u2028":"u2028","\u2029":"u2029"},G=V[typeof window]&&window||this,H=V[typeof exports]&&exports&&!exports.nodeType&&exports,J=V[typeof module]&&module&&!module.nodeType&&module,Q=J&&J.exports===H&&H,X=V[typeof global]&&global;!X||X.global!==X&&X.window!==X||(G=X);
var Y=s();typeof define=="function"&&typeof define.amd=="object"&&define.amd?(G._=Y, define(function(){return Y})):H&&J?Q?(J.exports=Y)._=Y:H._=Y:G._=Y}).call(this);
},{}],14:[function(require,module,exports){
//! moment.js
//! version : 2.5.1
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com
(function(a){function b(){return{empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1}}function c(a,b){return function(c){return k(a.call(this,c),b)}}function d(a,b){return function(c){return this.lang().ordinal(a.call(this,c),b)}}function e(){}function f(a){w(a),h(this,a)}function g(a){var b=q(a),c=b.year||0,d=b.month||0,e=b.week||0,f=b.day||0,g=b.hour||0,h=b.minute||0,i=b.second||0,j=b.millisecond||0;this._milliseconds=+j+1e3*i+6e4*h+36e5*g,this._days=+f+7*e,this._months=+d+12*c,this._data={},this._bubble()}function h(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return b.hasOwnProperty("toString")&&(a.toString=b.toString),b.hasOwnProperty("valueOf")&&(a.valueOf=b.valueOf),a}function i(a){var b,c={};for(b in a)a.hasOwnProperty(b)&&qb.hasOwnProperty(b)&&(c[b]=a[b]);return c}function j(a){return 0>a?Math.ceil(a):Math.floor(a)}function k(a,b,c){for(var d=""+Math.abs(a),e=a>=0;d.length<b;)d="0"+d;return(e?c?"+":"":"-")+d}function l(a,b,c,d){var e,f,g=b._milliseconds,h=b._days,i=b._months;g&&a._d.setTime(+a._d+g*c),(h||i)&&(e=a.minute(),f=a.hour()),h&&a.date(a.date()+h*c),i&&a.month(a.month()+i*c),g&&!d&&db.updateOffset(a),(h||i)&&(a.minute(e),a.hour(f))}function m(a){return"[object Array]"===Object.prototype.toString.call(a)}function n(a){return"[object Date]"===Object.prototype.toString.call(a)||a instanceof Date}function o(a,b,c){var d,e=Math.min(a.length,b.length),f=Math.abs(a.length-b.length),g=0;for(d=0;e>d;d++)(c&&a[d]!==b[d]||!c&&s(a[d])!==s(b[d]))&&g++;return g+f}function p(a){if(a){var b=a.toLowerCase().replace(/(.)s$/,"$1");a=Tb[a]||Ub[b]||b}return a}function q(a){var b,c,d={};for(c in a)a.hasOwnProperty(c)&&(b=p(c),b&&(d[b]=a[c]));return d}function r(b){var c,d;if(0===b.indexOf("week"))c=7,d="day";else{if(0!==b.indexOf("month"))return;c=12,d="month"}db[b]=function(e,f){var g,h,i=db.fn._lang[b],j=[];if("number"==typeof e&&(f=e,e=a),h=function(a){var b=db().utc().set(d,a);return i.call(db.fn._lang,b,e||"")},null!=f)return h(f);for(g=0;c>g;g++)j.push(h(g));return j}}function s(a){var b=+a,c=0;return 0!==b&&isFinite(b)&&(c=b>=0?Math.floor(b):Math.ceil(b)),c}function t(a,b){return new Date(Date.UTC(a,b+1,0)).getUTCDate()}function u(a){return v(a)?366:365}function v(a){return a%4===0&&a%100!==0||a%400===0}function w(a){var b;a._a&&-2===a._pf.overflow&&(b=a._a[jb]<0||a._a[jb]>11?jb:a._a[kb]<1||a._a[kb]>t(a._a[ib],a._a[jb])?kb:a._a[lb]<0||a._a[lb]>23?lb:a._a[mb]<0||a._a[mb]>59?mb:a._a[nb]<0||a._a[nb]>59?nb:a._a[ob]<0||a._a[ob]>999?ob:-1,a._pf._overflowDayOfYear&&(ib>b||b>kb)&&(b=kb),a._pf.overflow=b)}function x(a){return null==a._isValid&&(a._isValid=!isNaN(a._d.getTime())&&a._pf.overflow<0&&!a._pf.empty&&!a._pf.invalidMonth&&!a._pf.nullInput&&!a._pf.invalidFormat&&!a._pf.userInvalidated,a._strict&&(a._isValid=a._isValid&&0===a._pf.charsLeftOver&&0===a._pf.unusedTokens.length)),a._isValid}function y(a){return a?a.toLowerCase().replace("_","-"):a}function z(a,b){return b._isUTC?db(a).zone(b._offset||0):db(a).local()}function A(a,b){return b.abbr=a,pb[a]||(pb[a]=new e),pb[a].set(b),pb[a]}function B(a){delete pb[a]}function C(a){var b,c,d,e,f=0,g=function(a){if(!pb[a]&&rb)try{require("./lang/"+a)}catch(b){}return pb[a]};if(!a)return db.fn._lang;if(!m(a)){if(c=g(a))return c;a=[a]}for(;f<a.length;){for(e=y(a[f]).split("-"),b=e.length,d=y(a[f+1]),d=d?d.split("-"):null;b>0;){if(c=g(e.slice(0,b).join("-")))return c;if(d&&d.length>=b&&o(e,d,!0)>=b-1)break;b--}f++}return db.fn._lang}function D(a){return a.match(/\[[\s\S]/)?a.replace(/^\[|\]$/g,""):a.replace(/\\/g,"")}function E(a){var b,c,d=a.match(vb);for(b=0,c=d.length;c>b;b++)d[b]=Yb[d[b]]?Yb[d[b]]:D(d[b]);return function(e){var f="";for(b=0;c>b;b++)f+=d[b]instanceof Function?d[b].call(e,a):d[b];return f}}function F(a,b){return a.isValid()?(b=G(b,a.lang()),Vb[b]||(Vb[b]=E(b)),Vb[b](a)):a.lang().invalidDate()}function G(a,b){function c(a){return b.longDateFormat(a)||a}var d=5;for(wb.lastIndex=0;d>=0&&wb.test(a);)a=a.replace(wb,c),wb.lastIndex=0,d-=1;return a}function H(a,b){var c,d=b._strict;switch(a){case"DDDD":return Ib;case"YYYY":case"GGGG":case"gggg":return d?Jb:zb;case"Y":case"G":case"g":return Lb;case"YYYYYY":case"YYYYY":case"GGGGG":case"ggggg":return d?Kb:Ab;case"S":if(d)return Gb;case"SS":if(d)return Hb;case"SSS":if(d)return Ib;case"DDD":return yb;case"MMM":case"MMMM":case"dd":case"ddd":case"dddd":return Cb;case"a":case"A":return C(b._l)._meridiemParse;case"X":return Fb;case"Z":case"ZZ":return Db;case"T":return Eb;case"SSSS":return Bb;case"MM":case"DD":case"YY":case"GG":case"gg":case"HH":case"hh":case"mm":case"ss":case"ww":case"WW":return d?Hb:xb;case"M":case"D":case"d":case"H":case"h":case"m":case"s":case"w":case"W":case"e":case"E":return xb;default:return c=new RegExp(P(O(a.replace("\\","")),"i"))}}function I(a){a=a||"";var b=a.match(Db)||[],c=b[b.length-1]||[],d=(c+"").match(Qb)||["-",0,0],e=+(60*d[1])+s(d[2]);return"+"===d[0]?-e:e}function J(a,b,c){var d,e=c._a;switch(a){case"M":case"MM":null!=b&&(e[jb]=s(b)-1);break;case"MMM":case"MMMM":d=C(c._l).monthsParse(b),null!=d?e[jb]=d:c._pf.invalidMonth=b;break;case"D":case"DD":null!=b&&(e[kb]=s(b));break;case"DDD":case"DDDD":null!=b&&(c._dayOfYear=s(b));break;case"YY":e[ib]=s(b)+(s(b)>68?1900:2e3);break;case"YYYY":case"YYYYY":case"YYYYYY":e[ib]=s(b);break;case"a":case"A":c._isPm=C(c._l).isPM(b);break;case"H":case"HH":case"h":case"hh":e[lb]=s(b);break;case"m":case"mm":e[mb]=s(b);break;case"s":case"ss":e[nb]=s(b);break;case"S":case"SS":case"SSS":case"SSSS":e[ob]=s(1e3*("0."+b));break;case"X":c._d=new Date(1e3*parseFloat(b));break;case"Z":case"ZZ":c._useUTC=!0,c._tzm=I(b);break;case"w":case"ww":case"W":case"WW":case"d":case"dd":case"ddd":case"dddd":case"e":case"E":a=a.substr(0,1);case"gg":case"gggg":case"GG":case"GGGG":case"GGGGG":a=a.substr(0,2),b&&(c._w=c._w||{},c._w[a]=b)}}function K(a){var b,c,d,e,f,g,h,i,j,k,l=[];if(!a._d){for(d=M(a),a._w&&null==a._a[kb]&&null==a._a[jb]&&(f=function(b){var c=parseInt(b,10);return b?b.length<3?c>68?1900+c:2e3+c:c:null==a._a[ib]?db().weekYear():a._a[ib]},g=a._w,null!=g.GG||null!=g.W||null!=g.E?h=Z(f(g.GG),g.W||1,g.E,4,1):(i=C(a._l),j=null!=g.d?V(g.d,i):null!=g.e?parseInt(g.e,10)+i._week.dow:0,k=parseInt(g.w,10)||1,null!=g.d&&j<i._week.dow&&k++,h=Z(f(g.gg),k,j,i._week.doy,i._week.dow)),a._a[ib]=h.year,a._dayOfYear=h.dayOfYear),a._dayOfYear&&(e=null==a._a[ib]?d[ib]:a._a[ib],a._dayOfYear>u(e)&&(a._pf._overflowDayOfYear=!0),c=U(e,0,a._dayOfYear),a._a[jb]=c.getUTCMonth(),a._a[kb]=c.getUTCDate()),b=0;3>b&&null==a._a[b];++b)a._a[b]=l[b]=d[b];for(;7>b;b++)a._a[b]=l[b]=null==a._a[b]?2===b?1:0:a._a[b];l[lb]+=s((a._tzm||0)/60),l[mb]+=s((a._tzm||0)%60),a._d=(a._useUTC?U:T).apply(null,l)}}function L(a){var b;a._d||(b=q(a._i),a._a=[b.year,b.month,b.day,b.hour,b.minute,b.second,b.millisecond],K(a))}function M(a){var b=new Date;return a._useUTC?[b.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate()]:[b.getFullYear(),b.getMonth(),b.getDate()]}function N(a){a._a=[],a._pf.empty=!0;var b,c,d,e,f,g=C(a._l),h=""+a._i,i=h.length,j=0;for(d=G(a._f,g).match(vb)||[],b=0;b<d.length;b++)e=d[b],c=(h.match(H(e,a))||[])[0],c&&(f=h.substr(0,h.indexOf(c)),f.length>0&&a._pf.unusedInput.push(f),h=h.slice(h.indexOf(c)+c.length),j+=c.length),Yb[e]?(c?a._pf.empty=!1:a._pf.unusedTokens.push(e),J(e,c,a)):a._strict&&!c&&a._pf.unusedTokens.push(e);a._pf.charsLeftOver=i-j,h.length>0&&a._pf.unusedInput.push(h),a._isPm&&a._a[lb]<12&&(a._a[lb]+=12),a._isPm===!1&&12===a._a[lb]&&(a._a[lb]=0),K(a),w(a)}function O(a){return a.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(a,b,c,d,e){return b||c||d||e})}function P(a){return a.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}function Q(a){var c,d,e,f,g;if(0===a._f.length)return a._pf.invalidFormat=!0,a._d=new Date(0/0),void 0;for(f=0;f<a._f.length;f++)g=0,c=h({},a),c._pf=b(),c._f=a._f[f],N(c),x(c)&&(g+=c._pf.charsLeftOver,g+=10*c._pf.unusedTokens.length,c._pf.score=g,(null==e||e>g)&&(e=g,d=c));h(a,d||c)}function R(a){var b,c,d=a._i,e=Mb.exec(d);if(e){for(a._pf.iso=!0,b=0,c=Ob.length;c>b;b++)if(Ob[b][1].exec(d)){a._f=Ob[b][0]+(e[6]||" ");break}for(b=0,c=Pb.length;c>b;b++)if(Pb[b][1].exec(d)){a._f+=Pb[b][0];break}d.match(Db)&&(a._f+="Z"),N(a)}else a._d=new Date(d)}function S(b){var c=b._i,d=sb.exec(c);c===a?b._d=new Date:d?b._d=new Date(+d[1]):"string"==typeof c?R(b):m(c)?(b._a=c.slice(0),K(b)):n(c)?b._d=new Date(+c):"object"==typeof c?L(b):b._d=new Date(c)}function T(a,b,c,d,e,f,g){var h=new Date(a,b,c,d,e,f,g);return 1970>a&&h.setFullYear(a),h}function U(a){var b=new Date(Date.UTC.apply(null,arguments));return 1970>a&&b.setUTCFullYear(a),b}function V(a,b){if("string"==typeof a)if(isNaN(a)){if(a=b.weekdaysParse(a),"number"!=typeof a)return null}else a=parseInt(a,10);return a}function W(a,b,c,d,e){return e.relativeTime(b||1,!!c,a,d)}function X(a,b,c){var d=hb(Math.abs(a)/1e3),e=hb(d/60),f=hb(e/60),g=hb(f/24),h=hb(g/365),i=45>d&&["s",d]||1===e&&["m"]||45>e&&["mm",e]||1===f&&["h"]||22>f&&["hh",f]||1===g&&["d"]||25>=g&&["dd",g]||45>=g&&["M"]||345>g&&["MM",hb(g/30)]||1===h&&["y"]||["yy",h];return i[2]=b,i[3]=a>0,i[4]=c,W.apply({},i)}function Y(a,b,c){var d,e=c-b,f=c-a.day();return f>e&&(f-=7),e-7>f&&(f+=7),d=db(a).add("d",f),{week:Math.ceil(d.dayOfYear()/7),year:d.year()}}function Z(a,b,c,d,e){var f,g,h=U(a,0,1).getUTCDay();return c=null!=c?c:e,f=e-h+(h>d?7:0)-(e>h?7:0),g=7*(b-1)+(c-e)+f+1,{year:g>0?a:a-1,dayOfYear:g>0?g:u(a-1)+g}}function $(a){var b=a._i,c=a._f;return null===b?db.invalid({nullInput:!0}):("string"==typeof b&&(a._i=b=C().preparse(b)),db.isMoment(b)?(a=i(b),a._d=new Date(+b._d)):c?m(c)?Q(a):N(a):S(a),new f(a))}function _(a,b){db.fn[a]=db.fn[a+"s"]=function(a){var c=this._isUTC?"UTC":"";return null!=a?(this._d["set"+c+b](a),db.updateOffset(this),this):this._d["get"+c+b]()}}function ab(a){db.duration.fn[a]=function(){return this._data[a]}}function bb(a,b){db.duration.fn["as"+a]=function(){return+this/b}}function cb(a){var b=!1,c=db;"undefined"==typeof ender&&(a?(gb.moment=function(){return!b&&console&&console.warn&&(b=!0,console.warn("Accessing Moment through the global scope is deprecated, and will be removed in an upcoming release.")),c.apply(null,arguments)},h(gb.moment,c)):gb.moment=db)}for(var db,eb,fb="2.5.1",gb=this,hb=Math.round,ib=0,jb=1,kb=2,lb=3,mb=4,nb=5,ob=6,pb={},qb={_isAMomentObject:null,_i:null,_f:null,_l:null,_strict:null,_isUTC:null,_offset:null,_pf:null,_lang:null},rb="undefined"!=typeof module&&module.exports&&"undefined"!=typeof require,sb=/^\/?Date\((\-?\d+)/i,tb=/(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,ub=/^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,vb=/(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,wb=/(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,xb=/\d\d?/,yb=/\d{1,3}/,zb=/\d{1,4}/,Ab=/[+\-]?\d{1,6}/,Bb=/\d+/,Cb=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,Db=/Z|[\+\-]\d\d:?\d\d/gi,Eb=/T/i,Fb=/[\+\-]?\d+(\.\d{1,3})?/,Gb=/\d/,Hb=/\d\d/,Ib=/\d{3}/,Jb=/\d{4}/,Kb=/[+-]?\d{6}/,Lb=/[+-]?\d+/,Mb=/^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,Nb="YYYY-MM-DDTHH:mm:ssZ",Ob=[["YYYYYY-MM-DD",/[+-]\d{6}-\d{2}-\d{2}/],["YYYY-MM-DD",/\d{4}-\d{2}-\d{2}/],["GGGG-[W]WW-E",/\d{4}-W\d{2}-\d/],["GGGG-[W]WW",/\d{4}-W\d{2}/],["YYYY-DDD",/\d{4}-\d{3}/]],Pb=[["HH:mm:ss.SSSS",/(T| )\d\d:\d\d:\d\d\.\d{1,3}/],["HH:mm:ss",/(T| )\d\d:\d\d:\d\d/],["HH:mm",/(T| )\d\d:\d\d/],["HH",/(T| )\d\d/]],Qb=/([\+\-]|\d\d)/gi,Rb="Date|Hours|Minutes|Seconds|Milliseconds".split("|"),Sb={Milliseconds:1,Seconds:1e3,Minutes:6e4,Hours:36e5,Days:864e5,Months:2592e6,Years:31536e6},Tb={ms:"millisecond",s:"second",m:"minute",h:"hour",d:"day",D:"date",w:"week",W:"isoWeek",M:"month",y:"year",DDD:"dayOfYear",e:"weekday",E:"isoWeekday",gg:"weekYear",GG:"isoWeekYear"},Ub={dayofyear:"dayOfYear",isoweekday:"isoWeekday",isoweek:"isoWeek",weekyear:"weekYear",isoweekyear:"isoWeekYear"},Vb={},Wb="DDD w W M D d".split(" "),Xb="M D H h m s w W".split(" "),Yb={M:function(){return this.month()+1},MMM:function(a){return this.lang().monthsShort(this,a)},MMMM:function(a){return this.lang().months(this,a)},D:function(){return this.date()},DDD:function(){return this.dayOfYear()},d:function(){return this.day()},dd:function(a){return this.lang().weekdaysMin(this,a)},ddd:function(a){return this.lang().weekdaysShort(this,a)},dddd:function(a){return this.lang().weekdays(this,a)},w:function(){return this.week()},W:function(){return this.isoWeek()},YY:function(){return k(this.year()%100,2)},YYYY:function(){return k(this.year(),4)},YYYYY:function(){return k(this.year(),5)},YYYYYY:function(){var a=this.year(),b=a>=0?"+":"-";return b+k(Math.abs(a),6)},gg:function(){return k(this.weekYear()%100,2)},gggg:function(){return k(this.weekYear(),4)},ggggg:function(){return k(this.weekYear(),5)},GG:function(){return k(this.isoWeekYear()%100,2)},GGGG:function(){return k(this.isoWeekYear(),4)},GGGGG:function(){return k(this.isoWeekYear(),5)},e:function(){return this.weekday()},E:function(){return this.isoWeekday()},a:function(){return this.lang().meridiem(this.hours(),this.minutes(),!0)},A:function(){return this.lang().meridiem(this.hours(),this.minutes(),!1)},H:function(){return this.hours()},h:function(){return this.hours()%12||12},m:function(){return this.minutes()},s:function(){return this.seconds()},S:function(){return s(this.milliseconds()/100)},SS:function(){return k(s(this.milliseconds()/10),2)},SSS:function(){return k(this.milliseconds(),3)},SSSS:function(){return k(this.milliseconds(),3)},Z:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+k(s(a/60),2)+":"+k(s(a)%60,2)},ZZ:function(){var a=-this.zone(),b="+";return 0>a&&(a=-a,b="-"),b+k(s(a/60),2)+k(s(a)%60,2)},z:function(){return this.zoneAbbr()},zz:function(){return this.zoneName()},X:function(){return this.unix()},Q:function(){return this.quarter()}},Zb=["months","monthsShort","weekdays","weekdaysShort","weekdaysMin"];Wb.length;)eb=Wb.pop(),Yb[eb+"o"]=d(Yb[eb],eb);for(;Xb.length;)eb=Xb.pop(),Yb[eb+eb]=c(Yb[eb],2);for(Yb.DDDD=c(Yb.DDD,3),h(e.prototype,{set:function(a){var b,c;for(c in a)b=a[c],"function"==typeof b?this[c]=b:this["_"+c]=b},_months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),months:function(a){return this._months[a.month()]},_monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),monthsShort:function(a){return this._monthsShort[a.month()]},monthsParse:function(a){var b,c,d;for(this._monthsParse||(this._monthsParse=[]),b=0;12>b;b++)if(this._monthsParse[b]||(c=db.utc([2e3,b]),d="^"+this.months(c,"")+"|^"+this.monthsShort(c,""),this._monthsParse[b]=new RegExp(d.replace(".",""),"i")),this._monthsParse[b].test(a))return b},_weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdays:function(a){return this._weekdays[a.day()]},_weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysShort:function(a){return this._weekdaysShort[a.day()]},_weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),weekdaysMin:function(a){return this._weekdaysMin[a.day()]},weekdaysParse:function(a){var b,c,d;for(this._weekdaysParse||(this._weekdaysParse=[]),b=0;7>b;b++)if(this._weekdaysParse[b]||(c=db([2e3,1]).day(b),d="^"+this.weekdays(c,"")+"|^"+this.weekdaysShort(c,"")+"|^"+this.weekdaysMin(c,""),this._weekdaysParse[b]=new RegExp(d.replace(".",""),"i")),this._weekdaysParse[b].test(a))return b},_longDateFormat:{LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D YYYY",LLL:"MMMM D YYYY LT",LLLL:"dddd, MMMM D YYYY LT"},longDateFormat:function(a){var b=this._longDateFormat[a];return!b&&this._longDateFormat[a.toUpperCase()]&&(b=this._longDateFormat[a.toUpperCase()].replace(/MMMM|MM|DD|dddd/g,function(a){return a.slice(1)}),this._longDateFormat[a]=b),b},isPM:function(a){return"p"===(a+"").toLowerCase().charAt(0)},_meridiemParse:/[ap]\.?m?\.?/i,meridiem:function(a,b,c){return a>11?c?"pm":"PM":c?"am":"AM"},_calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},calendar:function(a,b){var c=this._calendar[a];return"function"==typeof c?c.apply(b):c},_relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},relativeTime:function(a,b,c,d){var e=this._relativeTime[c];return"function"==typeof e?e(a,b,c,d):e.replace(/%d/i,a)},pastFuture:function(a,b){var c=this._relativeTime[a>0?"future":"past"];return"function"==typeof c?c(b):c.replace(/%s/i,b)},ordinal:function(a){return this._ordinal.replace("%d",a)},_ordinal:"%d",preparse:function(a){return a},postformat:function(a){return a},week:function(a){return Y(a,this._week.dow,this._week.doy).week},_week:{dow:0,doy:6},_invalidDate:"Invalid date",invalidDate:function(){return this._invalidDate}}),db=function(c,d,e,f){var g;return"boolean"==typeof e&&(f=e,e=a),g={},g._isAMomentObject=!0,g._i=c,g._f=d,g._l=e,g._strict=f,g._isUTC=!1,g._pf=b(),$(g)},db.utc=function(c,d,e,f){var g;return"boolean"==typeof e&&(f=e,e=a),g={},g._isAMomentObject=!0,g._useUTC=!0,g._isUTC=!0,g._l=e,g._i=c,g._f=d,g._strict=f,g._pf=b(),$(g).utc()},db.unix=function(a){return db(1e3*a)},db.duration=function(a,b){var c,d,e,f=a,h=null;return db.isDuration(a)?f={ms:a._milliseconds,d:a._days,M:a._months}:"number"==typeof a?(f={},b?f[b]=a:f.milliseconds=a):(h=tb.exec(a))?(c="-"===h[1]?-1:1,f={y:0,d:s(h[kb])*c,h:s(h[lb])*c,m:s(h[mb])*c,s:s(h[nb])*c,ms:s(h[ob])*c}):(h=ub.exec(a))&&(c="-"===h[1]?-1:1,e=function(a){var b=a&&parseFloat(a.replace(",","."));return(isNaN(b)?0:b)*c},f={y:e(h[2]),M:e(h[3]),d:e(h[4]),h:e(h[5]),m:e(h[6]),s:e(h[7]),w:e(h[8])}),d=new g(f),db.isDuration(a)&&a.hasOwnProperty("_lang")&&(d._lang=a._lang),d},db.version=fb,db.defaultFormat=Nb,db.updateOffset=function(){},db.lang=function(a,b){var c;return a?(b?A(y(a),b):null===b?(B(a),a="en"):pb[a]||C(a),c=db.duration.fn._lang=db.fn._lang=C(a),c._abbr):db.fn._lang._abbr},db.langData=function(a){return a&&a._lang&&a._lang._abbr&&(a=a._lang._abbr),C(a)},db.isMoment=function(a){return a instanceof f||null!=a&&a.hasOwnProperty("_isAMomentObject")},db.isDuration=function(a){return a instanceof g},eb=Zb.length-1;eb>=0;--eb)r(Zb[eb]);for(db.normalizeUnits=function(a){return p(a)},db.invalid=function(a){var b=db.utc(0/0);return null!=a?h(b._pf,a):b._pf.userInvalidated=!0,b},db.parseZone=function(a){return db(a).parseZone()},h(db.fn=f.prototype,{clone:function(){return db(this)},valueOf:function(){return+this._d+6e4*(this._offset||0)},unix:function(){return Math.floor(+this/1e3)},toString:function(){return this.clone().lang("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},toDate:function(){return this._offset?new Date(+this):this._d},toISOString:function(){var a=db(this).utc();return 0<a.year()&&a.year()<=9999?F(a,"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"):F(a,"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]")},toArray:function(){var a=this;return[a.year(),a.month(),a.date(),a.hours(),a.minutes(),a.seconds(),a.milliseconds()]},isValid:function(){return x(this)},isDSTShifted:function(){return this._a?this.isValid()&&o(this._a,(this._isUTC?db.utc(this._a):db(this._a)).toArray())>0:!1},parsingFlags:function(){return h({},this._pf)},invalidAt:function(){return this._pf.overflow},utc:function(){return this.zone(0)},local:function(){return this.zone(0),this._isUTC=!1,this},format:function(a){var b=F(this,a||db.defaultFormat);return this.lang().postformat(b)},add:function(a,b){var c;return c="string"==typeof a?db.duration(+b,a):db.duration(a,b),l(this,c,1),this},subtract:function(a,b){var c;return c="string"==typeof a?db.duration(+b,a):db.duration(a,b),l(this,c,-1),this},diff:function(a,b,c){var d,e,f=z(a,this),g=6e4*(this.zone()-f.zone());return b=p(b),"year"===b||"month"===b?(d=432e5*(this.daysInMonth()+f.daysInMonth()),e=12*(this.year()-f.year())+(this.month()-f.month()),e+=(this-db(this).startOf("month")-(f-db(f).startOf("month")))/d,e-=6e4*(this.zone()-db(this).startOf("month").zone()-(f.zone()-db(f).startOf("month").zone()))/d,"year"===b&&(e/=12)):(d=this-f,e="second"===b?d/1e3:"minute"===b?d/6e4:"hour"===b?d/36e5:"day"===b?(d-g)/864e5:"week"===b?(d-g)/6048e5:d),c?e:j(e)},from:function(a,b){return db.duration(this.diff(a)).lang(this.lang()._abbr).humanize(!b)},fromNow:function(a){return this.from(db(),a)},calendar:function(){var a=z(db(),this).startOf("day"),b=this.diff(a,"days",!0),c=-6>b?"sameElse":-1>b?"lastWeek":0>b?"lastDay":1>b?"sameDay":2>b?"nextDay":7>b?"nextWeek":"sameElse";return this.format(this.lang().calendar(c,this))},isLeapYear:function(){return v(this.year())},isDST:function(){return this.zone()<this.clone().month(0).zone()||this.zone()<this.clone().month(5).zone()},day:function(a){var b=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=a?(a=V(a,this.lang()),this.add({d:a-b})):b},month:function(a){var b,c=this._isUTC?"UTC":"";return null!=a?"string"==typeof a&&(a=this.lang().monthsParse(a),"number"!=typeof a)?this:(b=this.date(),this.date(1),this._d["set"+c+"Month"](a),this.date(Math.min(b,this.daysInMonth())),db.updateOffset(this),this):this._d["get"+c+"Month"]()},startOf:function(a){switch(a=p(a)){case"year":this.month(0);case"month":this.date(1);case"week":case"isoWeek":case"day":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}return"week"===a?this.weekday(0):"isoWeek"===a&&this.isoWeekday(1),this},endOf:function(a){return a=p(a),this.startOf(a).add("isoWeek"===a?"week":a,1).subtract("ms",1)},isAfter:function(a,b){return b="undefined"!=typeof b?b:"millisecond",+this.clone().startOf(b)>+db(a).startOf(b)},isBefore:function(a,b){return b="undefined"!=typeof b?b:"millisecond",+this.clone().startOf(b)<+db(a).startOf(b)},isSame:function(a,b){return b=b||"ms",+this.clone().startOf(b)===+z(a,this).startOf(b)},min:function(a){return a=db.apply(null,arguments),this>a?this:a},max:function(a){return a=db.apply(null,arguments),a>this?this:a},zone:function(a){var b=this._offset||0;return null==a?this._isUTC?b:this._d.getTimezoneOffset():("string"==typeof a&&(a=I(a)),Math.abs(a)<16&&(a=60*a),this._offset=a,this._isUTC=!0,b!==a&&l(this,db.duration(b-a,"m"),1,!0),this)},zoneAbbr:function(){return this._isUTC?"UTC":""},zoneName:function(){return this._isUTC?"Coordinated Universal Time":""},parseZone:function(){return this._tzm?this.zone(this._tzm):"string"==typeof this._i&&this.zone(this._i),this},hasAlignedHourOffset:function(a){return a=a?db(a).zone():0,(this.zone()-a)%60===0},daysInMonth:function(){return t(this.year(),this.month())},dayOfYear:function(a){var b=hb((db(this).startOf("day")-db(this).startOf("year"))/864e5)+1;return null==a?b:this.add("d",a-b)},quarter:function(){return Math.ceil((this.month()+1)/3)},weekYear:function(a){var b=Y(this,this.lang()._week.dow,this.lang()._week.doy).year;return null==a?b:this.add("y",a-b)},isoWeekYear:function(a){var b=Y(this,1,4).year;return null==a?b:this.add("y",a-b)},week:function(a){var b=this.lang().week(this);return null==a?b:this.add("d",7*(a-b))},isoWeek:function(a){var b=Y(this,1,4).week;return null==a?b:this.add("d",7*(a-b))},weekday:function(a){var b=(this.day()+7-this.lang()._week.dow)%7;return null==a?b:this.add("d",a-b)},isoWeekday:function(a){return null==a?this.day()||7:this.day(this.day()%7?a:a-7)},get:function(a){return a=p(a),this[a]()},set:function(a,b){return a=p(a),"function"==typeof this[a]&&this[a](b),this},lang:function(b){return b===a?this._lang:(this._lang=C(b),this)}}),eb=0;eb<Rb.length;eb++)_(Rb[eb].toLowerCase().replace(/s$/,""),Rb[eb]);_("year","FullYear"),db.fn.days=db.fn.day,db.fn.months=db.fn.month,db.fn.weeks=db.fn.week,db.fn.isoWeeks=db.fn.isoWeek,db.fn.toJSON=db.fn.toISOString,h(db.duration.fn=g.prototype,{_bubble:function(){var a,b,c,d,e=this._milliseconds,f=this._days,g=this._months,h=this._data;h.milliseconds=e%1e3,a=j(e/1e3),h.seconds=a%60,b=j(a/60),h.minutes=b%60,c=j(b/60),h.hours=c%24,f+=j(c/24),h.days=f%30,g+=j(f/30),h.months=g%12,d=j(g/12),h.years=d},weeks:function(){return j(this.days()/7)},valueOf:function(){return this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*s(this._months/12)},humanize:function(a){var b=+this,c=X(b,!a,this.lang());return a&&(c=this.lang().pastFuture(b,c)),this.lang().postformat(c)},add:function(a,b){var c=db.duration(a,b);return this._milliseconds+=c._milliseconds,this._days+=c._days,this._months+=c._months,this._bubble(),this},subtract:function(a,b){var c=db.duration(a,b);return this._milliseconds-=c._milliseconds,this._days-=c._days,this._months-=c._months,this._bubble(),this},get:function(a){return a=p(a),this[a.toLowerCase()+"s"]()},as:function(a){return a=p(a),this["as"+a.charAt(0).toUpperCase()+a.slice(1)+"s"]()},lang:db.fn.lang,toIsoString:function(){var a=Math.abs(this.years()),b=Math.abs(this.months()),c=Math.abs(this.days()),d=Math.abs(this.hours()),e=Math.abs(this.minutes()),f=Math.abs(this.seconds()+this.milliseconds()/1e3);return this.asSeconds()?(this.asSeconds()<0?"-":"")+"P"+(a?a+"Y":"")+(b?b+"M":"")+(c?c+"D":"")+(d||e||f?"T":"")+(d?d+"H":"")+(e?e+"M":"")+(f?f+"S":""):"P0D"}});for(eb in Sb)Sb.hasOwnProperty(eb)&&(bb(eb,Sb[eb]),ab(eb.toLowerCase()));bb("Weeks",6048e5),db.duration.fn.asMonths=function(){return(+this-31536e6*this.years())/2592e6+12*this.years()},db.lang("en",{ordinal:function(a){var b=a%10,c=1===s(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";return a+c}}),rb?(module.exports=db,cb(!0)):"function"==typeof define&&define.amd?define("moment",function(b,c,d){return d.config&&d.config()&&d.config().noGlobal!==!0&&cb(d.config().noGlobal===a),db}):cb()}).call(this);
},{}],15:[function(require,module,exports){
/* mousetrap v1.4.6 craig.is/killing/mice */
(function(J,r,f){function s(a,b,d){a.addEventListener?a.addEventListener(b,d,!1):a.attachEvent("on"+b,d)}function A(a){if("keypress"==a.type){var b=String.fromCharCode(a.which);a.shiftKey||(b=b.toLowerCase());return b}return h[a.which]?h[a.which]:B[a.which]?B[a.which]:String.fromCharCode(a.which).toLowerCase()}function t(a){a=a||{};var b=!1,d;for(d in n)a[d]?b=!0:n[d]=0;b||(u=!1)}function C(a,b,d,c,e,v){var g,k,f=[],h=d.type;if(!l[a])return[];"keyup"==h&&w(a)&&(b=[a]);for(g=0;g<l[a].length;++g)if(k=
l[a][g],!(!c&&k.seq&&n[k.seq]!=k.level||h!=k.action||("keypress"!=h||d.metaKey||d.ctrlKey)&&b.sort().join(",")!==k.modifiers.sort().join(","))){var m=c&&k.seq==c&&k.level==v;(!c&&k.combo==e||m)&&l[a].splice(g,1);f.push(k)}return f}function K(a){var b=[];a.shiftKey&&b.push("shift");a.altKey&&b.push("alt");a.ctrlKey&&b.push("ctrl");a.metaKey&&b.push("meta");return b}function x(a,b,d,c){m.stopCallback(b,b.target||b.srcElement,d,c)||!1!==a(b,d)||(b.preventDefault?b.preventDefault():b.returnValue=!1,b.stopPropagation?
b.stopPropagation():b.cancelBubble=!0)}function y(a){"number"!==typeof a.which&&(a.which=a.keyCode);var b=A(a);b&&("keyup"==a.type&&z===b?z=!1:m.handleKey(b,K(a),a))}function w(a){return"shift"==a||"ctrl"==a||"alt"==a||"meta"==a}function L(a,b,d,c){function e(b){return function(){u=b;++n[a];clearTimeout(D);D=setTimeout(t,1E3)}}function v(b){x(d,b,a);"keyup"!==c&&(z=A(b));setTimeout(t,10)}for(var g=n[a]=0;g<b.length;++g){var f=g+1===b.length?v:e(c||E(b[g+1]).action);F(b[g],f,c,a,g)}}function E(a,b){var d,
c,e,f=[];d="+"===a?["+"]:a.split("+");for(e=0;e<d.length;++e)c=d[e],G[c]&&(c=G[c]),b&&"keypress"!=b&&H[c]&&(c=H[c],f.push("shift")),w(c)&&f.push(c);d=c;e=b;if(!e){if(!p){p={};for(var g in h)95<g&&112>g||h.hasOwnProperty(g)&&(p[h[g]]=g)}e=p[d]?"keydown":"keypress"}"keypress"==e&&f.length&&(e="keydown");return{key:c,modifiers:f,action:e}}function F(a,b,d,c,e){q[a+":"+d]=b;a=a.replace(/\s+/g," ");var f=a.split(" ");1<f.length?L(a,f,b,d):(d=E(a,d),l[d.key]=l[d.key]||[],C(d.key,d.modifiers,{type:d.action},
c,a,e),l[d.key][c?"unshift":"push"]({callback:b,modifiers:d.modifiers,action:d.action,seq:c,level:e,combo:a}))}var h={8:"backspace",9:"tab",13:"enter",16:"shift",17:"ctrl",18:"alt",20:"capslock",27:"esc",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down",45:"ins",46:"del",91:"meta",93:"meta",224:"meta"},B={106:"*",107:"+",109:"-",110:".",111:"/",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'"},H={"~":"`","!":"1",
"@":"2","#":"3",$:"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0",_:"-","+":"=",":":";",'"':"'","<":",",">":".","?":"/","|":"\\"},G={option:"alt",command:"meta","return":"enter",escape:"esc",mod:/Mac|iPod|iPhone|iPad/.test(navigator.platform)?"meta":"ctrl"},p,l={},q={},n={},D,z=!1,I=!1,u=!1;for(f=1;20>f;++f)h[111+f]="f"+f;for(f=0;9>=f;++f)h[f+96]=f;s(r,"keypress",y);s(r,"keydown",y);s(r,"keyup",y);var m={bind:function(a,b,d){a=a instanceof Array?a:[a];for(var c=0;c<a.length;++c)F(a[c],b,d);return this},
unbind:function(a,b){return m.bind(a,function(){},b)},trigger:function(a,b){if(q[a+":"+b])q[a+":"+b]({},a);return this},reset:function(){l={};q={};return this},stopCallback:function(a,b){return-1<(" "+b.className+" ").indexOf(" mousetrap ")?!1:"INPUT"==b.tagName||"SELECT"==b.tagName||"TEXTAREA"==b.tagName||b.isContentEditable},handleKey:function(a,b,d){var c=C(a,b,d),e;b={};var f=0,g=!1;for(e=0;e<c.length;++e)c[e].seq&&(f=Math.max(f,c[e].level));for(e=0;e<c.length;++e)c[e].seq?c[e].level==f&&(g=!0,
b[c[e].seq]=1,x(c[e].callback,d,c[e].combo,c[e].seq)):g||x(c[e].callback,d,c[e].combo);c="keypress"==d.type&&I;d.type!=u||w(a)||c||t(b);I=g&&"keydown"==d.type}};J.Mousetrap=m;"function"===typeof define&&define.amd&&define(m)})(window,document);

module.exports = window.Mousetrap;
window.Mousetrap = null;
},{}],16:[function(require,module,exports){
/*

 JS Signals <http://millermedeiros.github.com/js-signals/>
 Released under the MIT license
 Author: Miller Medeiros
 Version: 1.0.0 - Build: 268 (2012/11/29 05:48 PM)
*/
(function(i){function h(a,b,c,d,e){this._listener=b;this._isOnce=c;this.context=d;this._signal=a;this._priority=e||0}function g(a,b){if(typeof a!=="function")throw Error("listener is a required param of {fn}() and should be a Function.".replace("{fn}",b));}function e(){this._bindings=[];this._prevParams=null;var a=this;this.dispatch=function(){e.prototype.dispatch.apply(a,arguments)}}h.prototype={active:!0,params:null,execute:function(a){var b;this.active&&this._listener&&(a=this.params?this.params.concat(a):
a,b=this._listener.apply(this.context,a),this._isOnce&&this.detach());return b},detach:function(){return this.isBound()?this._signal.remove(this._listener,this.context):null},isBound:function(){return!!this._signal&&!!this._listener},isOnce:function(){return this._isOnce},getListener:function(){return this._listener},getSignal:function(){return this._signal},_destroy:function(){delete this._signal;delete this._listener;delete this.context},toString:function(){return"[SignalBinding isOnce:"+this._isOnce+
", isBound:"+this.isBound()+", active:"+this.active+"]"}};e.prototype={VERSION:"1.0.0",memorize:!1,_shouldPropagate:!0,active:!0,_registerListener:function(a,b,c,d){var e=this._indexOfListener(a,c);if(e!==-1){if(a=this._bindings[e],a.isOnce()!==b)throw Error("You cannot add"+(b?"":"Once")+"() then add"+(!b?"":"Once")+"() the same listener without removing the relationship first.");}else a=new h(this,a,b,c,d),this._addBinding(a);this.memorize&&this._prevParams&&a.execute(this._prevParams);return a},
_addBinding:function(a){var b=this._bindings.length;do--b;while(this._bindings[b]&&a._priority<=this._bindings[b]._priority);this._bindings.splice(b+1,0,a)},_indexOfListener:function(a,b){for(var c=this._bindings.length,d;c--;)if(d=this._bindings[c],d._listener===a&&d.context===b)return c;return-1},has:function(a,b){return this._indexOfListener(a,b)!==-1},add:function(a,b,c){g(a,"add");return this._registerListener(a,!1,b,c)},addOnce:function(a,b,c){g(a,"addOnce");return this._registerListener(a,
!0,b,c)},remove:function(a,b){g(a,"remove");var c=this._indexOfListener(a,b);c!==-1&&(this._bindings[c]._destroy(),this._bindings.splice(c,1));return a},removeAll:function(){for(var a=this._bindings.length;a--;)this._bindings[a]._destroy();this._bindings.length=0},getNumListeners:function(){return this._bindings.length},halt:function(){this._shouldPropagate=!1},dispatch:function(a){if(this.active){var b=Array.prototype.slice.call(arguments),c=this._bindings.length,d;if(this.memorize)this._prevParams=
b;if(c){d=this._bindings.slice();this._shouldPropagate=!0;do c--;while(d[c]&&this._shouldPropagate&&d[c].execute(b)!==!1)}}},forget:function(){this._prevParams=null},dispose:function(){this.removeAll();delete this._bindings;delete this._prevParams},toString:function(){return"[Signal active:"+this.active+" numListeners:"+this.getNumListeners()+"]"}};var f=e;f.Signal=e;typeof define==="function"&&define.amd?define(function(){return f}):typeof module!=="undefined"&&module.exports?module.exports=f:i.signals=
f})(this);
},{}],17:[function(require,module,exports){

},{}]},{},[4])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9uYWhpbGFzL1Byb2pla3Rlci9NdXNpY1NlcnZlci9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9uYWhpbGFzL1Byb2pla3Rlci9NdXNpY1NlcnZlci9jbGllbnQvc2NyaXB0cy9hcGkuanMiLCIvaG9tZS9uYWhpbGFzL1Byb2pla3Rlci9NdXNpY1NlcnZlci9jbGllbnQvc2NyaXB0cy9hdWRpb2NvbnRyb2xzLmpzIiwiL2hvbWUvbmFoaWxhcy9Qcm9qZWt0ZXIvTXVzaWNTZXJ2ZXIvY2xpZW50L3NjcmlwdHMvYXVkaW9wbGF5ZXIuanMiLCIvaG9tZS9uYWhpbGFzL1Byb2pla3Rlci9NdXNpY1NlcnZlci9jbGllbnQvc2NyaXB0cy9mYWtlXzNlZDQ3YWY2LmpzIiwiL2hvbWUvbmFoaWxhcy9Qcm9qZWt0ZXIvTXVzaWNTZXJ2ZXIvY2xpZW50L3NjcmlwdHMvbGlicmFyeS5qcyIsIi9ob21lL25haGlsYXMvUHJvamVrdGVyL011c2ljU2VydmVyL2NsaWVudC9zY3JpcHRzL25hdmlnYXRpb24uanMiLCIvaG9tZS9uYWhpbGFzL1Byb2pla3Rlci9NdXNpY1NlcnZlci9jbGllbnQvc2NyaXB0cy9wbGF5bGlzdC5qcyIsIi9ob21lL25haGlsYXMvUHJvamVrdGVyL011c2ljU2VydmVyL2NsaWVudC9zY3JpcHRzL3RlbXBsYXRlcy9uYXZpZ2F0aW9uLWFsYnVtLmpzIiwiL2hvbWUvbmFoaWxhcy9Qcm9qZWt0ZXIvTXVzaWNTZXJ2ZXIvY2xpZW50L3NjcmlwdHMvdGVtcGxhdGVzL25hdmlnYXRpb24tZGVmYXVsdC5qcyIsIi9ob21lL25haGlsYXMvUHJvamVrdGVyL011c2ljU2VydmVyL2NsaWVudC9zY3JpcHRzL3RlbXBsYXRlcy9wbGF5bGlzdC1pdGVtLmpzIiwiL2hvbWUvbmFoaWxhcy9Qcm9qZWt0ZXIvTXVzaWNTZXJ2ZXIvY2xpZW50L3NjcmlwdHMvdXRpbC5qcyIsIi9ob21lL25haGlsYXMvUHJvamVrdGVyL011c2ljU2VydmVyL2NsaWVudC9zY3JpcHRzL3ZlbmRvci9qYWRlcnVudGltZS5qcyIsIi9ob21lL25haGlsYXMvUHJvamVrdGVyL011c2ljU2VydmVyL2NsaWVudC9zY3JpcHRzL3ZlbmRvci9sb2Rhc2gubWluLmpzIiwiL2hvbWUvbmFoaWxhcy9Qcm9qZWt0ZXIvTXVzaWNTZXJ2ZXIvY2xpZW50L3NjcmlwdHMvdmVuZG9yL21vbWVudC5qcyIsIi9ob21lL25haGlsYXMvUHJvamVrdGVyL011c2ljU2VydmVyL2NsaWVudC9zY3JpcHRzL3ZlbmRvci9tb3VzZXRyYXAubWluLmpzIiwiL2hvbWUvbmFoaWxhcy9Qcm9qZWt0ZXIvTXVzaWNTZXJ2ZXIvY2xpZW50L3NjcmlwdHMvdmVuZG9yL3NpZ25hbHMubWluLmpzIiwiL2hvbWUvbmFoaWxhcy9Qcm9qZWt0ZXIvTXVzaWNTZXJ2ZXIvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbGlzdCA9IGZ1bmN0aW9uKHBhdGgpIFxue1xuXHRpZighcGF0aClcblx0e1xuXHRcdHBhdGggPSBbXTtcblx0fVxuXG5cdHJldHVybiAkLmFqYXgoe1xuXHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdHVybDogJy9hcGkvbGlzdCcsXG5cdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG5cdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoeyBwYXRoOiBwYXRoLCBleHBhbmQ6IHBhdGgubGVuZ3RoID4gMCB9KSxcblx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0ZGF0YVR5cGU6ICdqc29uJ1xuXHR9KTtcbn1cblxudmFyIGRiID0gZnVuY3Rpb24oKVxue1xuXHRyZXR1cm4gJC5hamF4KHtcblx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHR1cmw6ICcvYXBpL2RiJyxcblx0XHRjYWNoZTogZmFsc2UsXG5cdFx0Y29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0ZGF0YVR5cGU6ICdqc29uJ1xuXHR9KTtcbn1cblxudmFyIGxpc3Rzb25ncyA9IGZ1bmN0aW9uKHBhdGgpXG57XG5cdGlmKCFwYXRoKVxuXHR7XG5cdFx0cmV0dXJuO1x0XHRcblx0fVxuXG5cdHJldHVybiAkLmFqYXgoe1xuXHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdHVybDogJy9hcGkvbGlzdHNvbmdzJyxcblx0XHRjYWNoZTogZmFsc2UsXG5cdFx0Y29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeSh7IHBhdGg6IHBhdGggfSksXG5cdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdGRhdGFUeXBlOiAnanNvbidcblx0fSk7XG59XG5cbnZhciBzb25nID0gZnVuY3Rpb24ocGF0aClcbntcblx0aWYoIXBhdGgpXG5cdHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRyZXR1cm4gJC5hamF4KHtcblx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHR1cmw6ICcvYXBpL3NvbmcnLFxuXHRcdGNhY2hlOiBmYWxzZSxcblx0XHRjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuXHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KHsgcGF0aDogcGF0aCB9KSxcblx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0ZGF0YVR5cGU6ICdqc29uJ1xuXHR9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGxpc3Q6IGxpc3QsXG5cdGxpc3Rzb25nczogbGlzdHNvbmdzLFxuXHRzb25nOiBzb25nLFxuXHRkYjogZGJcbn07XG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpLFxuXHRhdWRpb3BsYXllciA9IHJlcXVpcmUoJy4vYXVkaW9wbGF5ZXIuanMnKSxcblx0cGxheWxpc3QgPSByZXF1aXJlKCcuL3BsYXlsaXN0LmpzJyksXG5cdCRwcm9ncmVzcywgXG5cdCRkdXJhdGlvbiwgXG5cdCRwb3NpdGlvbiwgXG5cdCRzb25nLCBcblx0JGFydGlzdCwgXG5cdCRhbGJ1bSwgXG5cdCRwYXVzZSwgXG5cdCRuZXh0LCBcblx0JHByZXY7XG5cbiQoZnVuY3Rpb24oKSB7XG5cdCRwcm9ncmVzcyA9ICQoXCIjcHJvZ3Jlc3MgLmluZGljYXRvclwiKTtcblx0JGR1cmF0aW9uID0gJChcIiNkdXJhdGlvblwiKTtcblx0JHBvc2l0aW9uID0gJChcIiNwb3NpdGlvblwiKTtcblx0JHNvbmcgPSAkKFwiI3NvbmdcIik7XG5cdCRhcnRpc3QgPSAkKFwiI2FydGlzdFwiKTtcblx0JGFsYnVtID0gJChcIiNhbGJ1bVwiKTtcblx0JHBhdXNlID0gJChcIiNwYXVzZVwiKTtcblx0JG5leHQgPSAkKFwiI25leHRcIik7XG5cdCRwcmV2ID0gJChcIiNwcmV2XCIpO1xuXG5cdGF1ZGlvcGxheWVyLnBsYXllZC5hZGQob25QbGF5ZWQpO1xuXHRhdWRpb3BsYXllci51cGRhdGVkLmFkZChvblVwZGF0ZWQpO1xuXHRhdWRpb3BsYXllci5wYXVzZWQuYWRkKG9uUGF1c2VkKTtcblx0YXVkaW9wbGF5ZXIucmVzdW1lZC5hZGQob25SZXN1bWVkKTtcblxuXHRob29rdXBFdmVudHMoKTtcbn0pO1xuXG5mdW5jdGlvbiBvblBhdXNlZCgpIHtcblx0JHBhdXNlLnJlbW92ZUNsYXNzKCdwbGF5aW5nJyk7XG59XG5cbmZ1bmN0aW9uIG9uUmVzdW1lZCgpXG57XG5cdCRwYXVzZS5hZGRDbGFzcygncGxheWluZycpO1xufVxuXG5mdW5jdGlvbiBvblBsYXllZChpdGVtKSB7XG5cdCRzb25nLmh0bWwoaXRlbS5zb25nKTtcblx0JGFydGlzdC5odG1sKGl0ZW0uYXJ0aXN0KTtcblx0JGFsYnVtLmh0bWwoaXRlbS5hbGJ1bSk7XG5cblx0JHBhdXNlLmFkZENsYXNzKCdwbGF5aW5nJyk7XG59O1xuXG5mdW5jdGlvbiBvblVwZGF0ZWQoZHVyYXRpb24sIGN1cnJlbnQsIHBlcmNlbnQpXG57XG5cdCRwcm9ncmVzcy5jc3MoXCJ3aWR0aFwiLCBwZXJjZW50ICsgXCIlXCIpO1xuXHQkcG9zaXRpb24uaHRtbCh1dGlsLnNlY29uZHNUb1RpbWUoY3VycmVudCkpO1xuXHQkZHVyYXRpb24uaHRtbCh1dGlsLnNlY29uZHNUb1RpbWUoZHVyYXRpb24pKTtcbn1cblxuZnVuY3Rpb24gaG9va3VwRXZlbnRzKCkge1xuXHQkcGF1c2UuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0aWYoIWF1ZGlvcGxheWVyLmlzUGxheWluZygpKVxuXHRcdFx0YXVkaW9wbGF5ZXIucGxheSgpO1xuXHRcdGVsc2Vcblx0XHRcdGF1ZGlvcGxheWVyLnBhdXNlKCk7XG5cdH0pO1xuXG5cdCRuZXh0LmNsaWNrKGZ1bmN0aW9uKCkgeyBwbGF5bGlzdC5uZXh0KCk7IH0pO1xuXHQkcHJldi5jbGljayhmdW5jdGlvbigpIHsgcGxheWxpc3QucHJldigpOyB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7fTsiLCJ2YXIgJGpQbGF5ZXIsIFxuXHRpc1BsYXlpbmcgPSBmYWxzZSwgXG5cdGN1cnJlbnRJdGVtID0gbnVsbCxcblx0c2lnbmFscyA9IHJlcXVpcmUoJy4vdmVuZG9yL3NpZ25hbHMubWluLmpzJyksXG5cdGF1ZGlvcGxheWVyID0ge1xuXHRcdHBsYXllZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG5cdFx0cGF1c2VkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcblx0XHRyZXN1bWVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcblx0XHR1cGRhdGVkOiBuZXcgc2lnbmFscy5TaWduYWwoKSxcblx0XHRlbmRlZDogbmV3IHNpZ25hbHMuU2lnbmFsKCksXG5cdFx0cGxheTogcGxheSxcblx0XHRwYXVzZTogcGF1c2UsXG5cdFx0aXNQbGF5aW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIGlzUGxheWluZzsgfVxuXHR9O1xuXG4kKGZ1bmN0aW9uKCkge1xuXHQkalBsYXllciA9ICQoXCIjalBsYXllclwiKTtcblx0XG5cdCRqUGxheWVyLmpQbGF5ZXIoeyBcblx0XHRzdXBwbGllZDogJ21wMycsXG5cdFx0dGltZXVwZGF0ZTogdXBkYXRlZCxcblx0XHRlbmRlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRwbGF5aW5nID0gZmFsc2U7XG5cdFx0XHRhdWRpb3BsYXllci5lbmRlZC5kaXNwYXRjaCgpO1xuXHRcdH1cblx0fSk7XG59KTtcblxuZnVuY3Rpb24gdXBkYXRlZChlKSB7XG5cdHZhciBkdXJhdGlvbiA9IGUualBsYXllci5zdGF0dXMuZHVyYXRpb24gPT09IDAgPyBjdXJyZW50SXRlbS5kdXJhdGlvbiA6IGUualBsYXllci5zdGF0dXMuZHVyYXRpb247XG5cdHZhciBjdXJyZW50ID0gZS5qUGxheWVyLnN0YXR1cy5jdXJyZW50VGltZTtcblx0dmFyIHBlcmNlbnQgPSAoY3VycmVudCAvIGR1cmF0aW9uKSAqIDEwMDtcblxuXHRhdWRpb3BsYXllci51cGRhdGVkLmRpc3BhdGNoKGR1cmF0aW9uLCBjdXJyZW50LCBwZXJjZW50KTtcbn1cblxuZnVuY3Rpb24gcGxheShpdGVtKVxue1xuXHRpZihpdGVtKSB7XG5cdFx0aXNQbGF5aW5nID0gdHJ1ZTtcblx0XHRjdXJyZW50SXRlbSA9IGl0ZW07XG5cdFx0JGpQbGF5ZXIualBsYXllcihcInNldE1lZGlhXCIsIHtcblx0XHRcdG1wMzogaXRlbS5zdHJlYW1cblx0XHR9KTtcblxuXHRcdCRqUGxheWVyLmpQbGF5ZXIoXCJwbGF5XCIpO1xuXHRcdGF1ZGlvcGxheWVyLnBsYXllZC5kaXNwYXRjaChpdGVtKTtcblx0fVxuXHRlbHNlIGlmKGN1cnJlbnRJdGVtKVxuXHR7XG5cdFx0aXNQbGF5aW5nID0gdHJ1ZTtcblx0XHRhdWRpb3BsYXllci5yZXN1bWVkLmRpc3BhdGNoKGl0ZW0pO1xuXHRcdCRqUGxheWVyLmpQbGF5ZXIoXCJwbGF5XCIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBhdXNlKClcbntcblx0aXNQbGF5aW5nID0gZmFsc2U7XG5cdCRqUGxheWVyLmpQbGF5ZXIoXCJwYXVzZVwiKTtcblx0YXVkaW9wbGF5ZXIucGF1c2VkLmRpc3BhdGNoKCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBhdWRpb3BsYXllcjsiLCJ2YXIgbmF2aWdhdGlvbiA9IHJlcXVpcmUoJy4vbmF2aWdhdGlvbi5qcycpO1xudmFyIGF1ZGlvY29udHJvbHMgPSByZXF1aXJlKCcuL2F1ZGlvY29udHJvbHMuanMnKTtcblxuJChmdW5jdGlvbigpIHtcblx0bmF2aWdhdGlvbi5pbml0aWFsaXplKCk7XG59KTtcblxuIiwiXG52YXIgZGF0YWJhc2UsXG5cdF8gPSByZXF1aXJlKCcuL3ZlbmRvci9sb2Rhc2gubWluLmpzJyk7XG5cdGFwaSA9IHJlcXVpcmUoJy4vYXBpLmpzJyk7XG5cblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblx0XHR2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cblx0XHRhcGkuZGIoKS5kb25lKGZ1bmN0aW9uKGRiKSB7XG5cdFx0XHRkYXRhYmFzZSA9IHtpdGVtczogZGJ9O1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSgpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gZ2V0KHBhdGgpXG5cdHtcblx0XHRpZighcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMClcblx0XHRcdHJldHVybiBkYXRhYmFzZTtcblx0XHRcblx0XHR2YXIgaXRlbSA9IGRhdGFiYXNlOyBcblx0XHRfLmVhY2gocGF0aCwgZnVuY3Rpb24oeCkge1xuXHRcdFx0aXRlbSA9IF8uZmluZChpdGVtLml0ZW1zLCBmdW5jdGlvbih5KSB7IHJldHVybiB5Lm5hbWUgPT09IHg7IH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGl0ZW07XG5cdH1cblxuXHQvL0FydGlzdCBhbmQgYWxidW0gY2FuIGJlIGV4dHJhcG9sYXRlZCBmcm9tIHBhdGguXG5cdGZ1bmN0aW9uIHNldFNvbmdJbmZvKGl0ZW0sIHBhdGgpIHtcblx0XHRpZihwYXRoLmxlbmd0aCA8IDIpXG5cdFx0e1xuXHRcdFx0aWYoIWl0ZW0uc29uZylcblx0XHRcdFx0aXRlbS5zb25nID0gaXRlbS5uYW1lO1xuXHRcdFx0aXRlbS5hbGJ1bSA9ICdOQSc7XG5cdFx0XHRpdGVtLmFydGlzdCA9ICdOQSc7XG5cdFx0fVxuXHRcdGlmKHBhdGgubGVuZ3RoID09PSAyKVxuXHRcdHtcblx0XHRcdGl0ZW0uYXJ0aXN0ID0gcGF0aFswXTtcblx0XHRcdGl0ZW0uYWxidW0gPSBwYXRoWzFdO1xuXHRcdFx0aWYoIWl0ZW0uc29uZylcblx0XHRcdFx0aXRlbS5zb25nID0gaXRlbS5uYW1lO1xuXHRcdH0gXG5cdFx0aWYocGF0aC5sZW5ndGggPj0gMylcblx0XHR7XG5cdFx0XHRpdGVtLmFydGlzdCA9IHBhdGhbMF07XG5cdFx0XHRpdGVtLmFsYnVtID0gcGF0aFsxXTtcblx0XHRcdFxuXHRcdFx0aWYoIWl0ZW0uc29uZylcblx0XHRcdFx0aXRlbS5zb25nID0gaXRlbS5uYW1lO1xuXHRcdFx0XG5cdFx0XHRmb3IodmFyIGkgPSAyOyBpIDwgcGF0aC5sZW5ndGg7IGkrKylcblx0XHRcdHtcblx0XHRcdFx0aXRlbS5hbGJ1bSArPSAnIC0gJyArIHBhdGhbaV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIHN0ciA9ICcnO1xuXHRcdF8uZWFjaChwYXRoLCBmdW5jdGlvbih4KSB7XG5cdFx0XHRzdHIgKz0geCArICcvJ1xuXHRcdH0pO1xuXHRcdHN0ciArPSBpdGVtLm5hbWU7XG5cdFx0aXRlbS5zdHJlYW0gPSAnL2FwaS9zdHJlYW0/cGF0aD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cik7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRTb25ncyhwYXRoKVxuXHR7XG5cdFx0dmFyIHNvbmdzID0gW107XG5cblx0XHR2YXIgZ2V0U29uZ3NSZWN1cnNpdmUgPSBmdW5jdGlvbihpdGVtLCBjdXJyUGF0aCkge1xuXHRcdFx0aWYoaXRlbS5pc0ZpbGUpXG5cdFx0XHR7XG5cdFx0XHRcdGN1cnJQYXRoLnBvcCgpO1xuXHRcdFx0XHRzZXRTb25nSW5mbyhpdGVtLCBjdXJyUGF0aCk7XG5cdFx0XHRcdHNvbmdzLnB1c2goaXRlbSlcblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdF8uZWFjaChpdGVtLml0ZW1zLCBmdW5jdGlvbih4KSB7XG5cdFx0XHRcdGlmKHguaXNGaWxlKSB7XG5cdFx0XHRcdFx0c2V0U29uZ0luZm8oeCwgY3VyclBhdGgpO1xuXHRcdFx0XHRcdHNvbmdzLnB1c2goeCk7XG5cdFx0XHRcdH0gXG5cdFx0XHRcdGVsc2UgXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRuZXh0UGF0aCA9IGN1cnJQYXRoLnNsaWNlKDApO1xuXHRcdFx0XHRcdG5leHRQYXRoLnB1c2goeC5uYW1lKVxuXHRcdFx0XHRcdGdldFNvbmdzUmVjdXJzaXZlKHgsIG5leHRQYXRoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Z2V0U29uZ3NSZWN1cnNpdmUoZ2V0KHBhdGgpLCBwYXRoLnNsaWNlKDApKTtcblxuXHRcdGlmKHNvbmdzLmxlbmd0aCA+IDApIHtcblx0XHRcdHZhciBncm91cGVkID0gW107XG5cdFx0XHRfLmVhY2goXy5ncm91cEJ5KHNvbmdzLCAnYWxidW0nKSwgZnVuY3Rpb24oeCwgcCkgeyBncm91cGVkLnB1c2goXy5zb3J0QnkoeCwgJ3RyYWNrJykpIH0pO1xuXG5cblxuXHRcdFx0dmFyIGFsYnVtID0gZ3JvdXBlZC5wb3AoKTtcblx0XHRcdHZhciBzb25ncyA9IF8uc29ydEJ5KGFsYnVtLmNvbmNhdC5hcHBseShhbGJ1bSwgZ3JvdXBlZCksICdhbGJ1bScpO1xuXHRcdH1cblxuXHRcdHJldHVybiBzb25ncztcblx0fVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcblx0Z2V0OiBnZXQsXG5cdGdldFNvbmdzOiBnZXRTb25nc1xufTtcbiIsInZhciBhcGkgPSByZXF1aXJlKCcuL2FwaS5qcycpO1xudmFyIHBsYXlsaXN0ID0gcmVxdWlyZSgnLi9wbGF5bGlzdC5qcycpO1xudmFyIGxpYnJhcnkgPSByZXF1aXJlKCcuL2xpYnJhcnkuanMnKTtcbnZhciBfID0gcmVxdWlyZSgnLi92ZW5kb3IvbG9kYXNoLm1pbi5qcycpO1xudmFyIHRlbXBsYXRlcyA9IHtcblx0aXRlbURlZmF1bHQ6IHJlcXVpcmUoJy4vdGVtcGxhdGVzL25hdmlnYXRpb24tZGVmYXVsdC5qcycpLFxuXHRpdGVtQWxidW06IHJlcXVpcmUoJy4vdGVtcGxhdGVzL25hdmlnYXRpb24tYWxidW0uanMnKVxufTtcblxudmFyICRsaXN0LCAkdXAsIGN1cnJlbnRQYXRoID0gW10sIG91dGVyU2Nyb2xsID0gMDtcbiQoZnVuY3Rpb24oKSB7XG5cdCRsaXN0ID0gJChcIiNsaXN0XCIpO1xuXHQkdXAgPSAkKFwiI3VwXCIpO1xuXHQkYXJ0aXN0ID0gJCgnaDIuYXJ0aXN0Jyk7XG5cblx0JGxpc3Qub24oJ2NsaWNrJywgJ2xpJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHBhdGggPSAkKHRoaXMpLmRhdGEoJ3BhdGgnKTtcblxuXHRcdGlmKHBhdGgubGVuZ3RoID09PSAxKVxuXHRcdFx0bmF2aWdhdGUocGF0aCk7XG5cdH0pO1xuXG5cdCRsaXN0Lm9uKCdkYmxjbGljaycsICdsaScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBwYXRoID0gJCh0aGlzKS5kYXRhKCdwYXRoJyk7XG5cblx0XHRpZihwYXRoLmxlbmd0aCAhPT0gMSlcblx0XHRcdHBsYXkocGF0aCk7XG5cdH0pO1xuXG5cdCRsaXN0Lm9uKCdjbGljaycsICcuYWRkJywgZnVuY3Rpb24oZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0YWRkKCQodGhpcykucGFyZW50cygnbGknKS5kYXRhKCdwYXRoJykpO1xuXHR9KTtcblxuXHQkbGlzdC5vbignY2xpY2snLCAnLnBsYXknLCBmdW5jdGlvbihlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRwbGF5KCQodGhpcykucGFyZW50cygnbGknKS5kYXRhKCdwYXRoJykpO1xuXHR9KTtcblxuXHQkdXAuY2xpY2sodXApO1xufSk7XG5cbmZ1bmN0aW9uIGFkZChwYXRoLCBiZWZvcmUpXG57XG5cdHBsYXlsaXN0LmFkZFNvbmdzKGxpYnJhcnkuZ2V0U29uZ3MocGF0aCksIGJlZm9yZSk7XG59XG5cbmZ1bmN0aW9uIHBsYXkocGF0aClcbntcblx0cGxheWxpc3QucGxheVNvbmdzKGxpYnJhcnkuZ2V0U29uZ3MocGF0aCkpO1xufVxuXG5mdW5jdGlvbiBpdGVtRHJhZ1N0YXJ0KGUpXG57XG5cdGUuZGF0YVRyYW5zZmVyLnNldERhdGEoXCJpdGVtXCIsIEpTT04uc3RyaW5naWZ5KCQoZS5zcmNFbGVtZW50KS5kYXRhKCdpdGVtJykpKTtcdFx0XG59XG5cblxuZnVuY3Rpb24gdXAoKSB7XG5cdGlmKGN1cnJlbnRQYXRoLmxlbmd0aCA9PT0gMClcblx0XHRyZXR1cm47XG5cblx0Y3VycmVudFBhdGgucG9wKCk7XG5cblx0aWYoY3VycmVudFBhdGgubGVuZ3RoID09PSAwKVxuXHRcdCR1cC5hZGRDbGFzcygnaGlkZScpO1xuXG5cblx0cG9wdWxhdGVMaXN0KGN1cnJlbnRQYXRoKTtcbn1cblxuZnVuY3Rpb24gbmF2aWdhdGUocGF0aClcbntcblx0JHVwLnJlbW92ZUNsYXNzKCdoaWRlJyk7XG5cdHBvcHVsYXRlTGlzdChwYXRoKTtcbn1cblxuZnVuY3Rpb24gc2V0QnJlYWRjcnVtYigpIHtcblx0dmFyIHN0ciA9IFwiXCI7XG5cdCQuZWFjaChjdXJyZW50UGF0aCwgZnVuY3Rpb24oaSx4KSB7IHN0ciArPSB4ICsgXCIvXCI7IH0pO1xuXHQkYnJlYWRjcnVtYi5odG1sKHN0ci5zdWJzdHJpbmcoMCwgc3RyLmxlbmd0aCAtIDEpKTtcbn1cblxuXG5mdW5jdGlvbiByZW5kZXJEZWZhdWx0KGl0ZW0sIHBhdGgsIHNob3dBbHBoYWJldClcbntcblx0dmFyIGxhc3RMZXR0ZXIgPSBudWxsO1xuXHQkLmVhY2goXy5zb3J0QnkoaXRlbS5pdGVtcywgJ25hbWUnKSwgZnVuY3Rpb24oaSx4KSB7XG5cdFx0dmFyIGxldHRlciA9IHgubmFtZS5zdWJzdHJpbmcoMCwxKVxuXG5cdFx0aWYoc2hvd0FscGhhYmV0ICYmIGxhc3RMZXR0ZXIgIT09IGxldHRlcilcblx0XHRcdCRsaXN0LmFwcGVuZCgnPGxpIGNsYXNzPVwiYWxwaGFiZXQtbGV0dGVyXCIgaWQ9XCInICsgbGV0dGVyICsgJ1wiPicgKyBsZXR0ZXIgKyAnPC9saT4nKVxuXG5cdFx0dmFyIGxpID0gJCh0ZW1wbGF0ZXMuaXRlbURlZmF1bHQoeCkpO1xuXHRcdCRsaXN0LmFwcGVuZChsaSk7XG5cblx0XHR2YXIgaXRlbVBhdGggPSBwYXRoLnNsaWNlKDApO1xuXHRcdGl0ZW1QYXRoLnB1c2goeC5uYW1lKTtcblx0XHQkKGxpKS5kYXRhKCdwYXRoJywgaXRlbVBhdGgpO1xuXG5cdFx0bGFzdExldHRlciA9IHgubmFtZS5zdWJzdHJpbmcoMCwxKTtcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBsaS5hZGRDbGFzcygnZW50ZXInKTsgfSwgMTApO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQXJ0aXN0KGl0ZW0sIHBhdGgpXG57XG5cdF8uZWFjaChpdGVtLml0ZW1zLCBmdW5jdGlvbih4KSBcblx0e1xuXHRcdHZhciBjb3ZlciA9IF8uZmluZCh4LmltYWdlcywgZnVuY3Rpb24oeSkgeyByZXR1cm4geS5zaXplID09PSAnbGFyZ2UnOyB9KTtcblx0XHR4LmNvdmVyID0gY292ZXIgPyBjb3ZlclsnI3RleHQnXSA6IG51bGw7XG5cblx0XHR2YXIgYWxidW0gPSAkKHRlbXBsYXRlcy5pdGVtQWxidW0oeCkpO1xuXHRcdCRsaXN0LmFwcGVuZChhbGJ1bSlcblxuXHRcdHZhciBhbGJ1bVBhdGggPSBwYXRoLnNsaWNlKDApO1xuXHRcdGFsYnVtUGF0aC5wdXNoKHgubmFtZSk7XG5cdFx0YWxidW0uZGF0YSgncGF0aCcsIGFsYnVtUGF0aCk7XG5cblx0XHRyZW5kZXJEZWZhdWx0KHgsIGFsYnVtUGF0aC5zbGljZSgwKSk7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBhbGJ1bS5maW5kKCcucm93JykuYWRkQ2xhc3MoJ2VudGVyJyk7IH0sIDEwKTtcblx0fSk7XG59XG5cblxuZnVuY3Rpb24gcG9wdWxhdGVMaXN0KHBhdGgpXG57XG5cdCRsaXN0Lmh0bWwoJycpO1xuXG5cdHBhdGggPSBwYXRoIHx8IFtdO1xuXHRjdXJyZW50UGF0aCA9IHBhdGg7XG5cblx0JGFydGlzdC5odG1sKHBhdGgubGVuZ3RoID09PSAwID8gJ0xpYnJhcnknIDogcGF0aFswXSlcblx0JGxpc3Quc2Nyb2xsVG9wKDApO1xuXG5cdGlmKGN1cnJlbnRQYXRoLmxlbmd0aCA9PT0gMSlcblx0XHRyZW5kZXJBcnRpc3QobGlicmFyeS5nZXQoY3VycmVudFBhdGgpLCBjdXJyZW50UGF0aC5zbGljZSgwKSk7XG5cdGVsc2Vcblx0XHRyZW5kZXJEZWZhdWx0KGxpYnJhcnkuZ2V0KGN1cnJlbnRQYXRoKSwgY3VycmVudFBhdGguc2xpY2UoMCksIHRydWUpO1xufVxuXG5mdW5jdGlvbiBpbml0aWFsaXplKCkge1xuXHRsaWJyYXJ5LmluaXRpYWxpemUoKS50aGVuKHBvcHVsYXRlTGlzdCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpdGVtRHJhZ1N0YXJ0OiBpdGVtRHJhZ1N0YXJ0LFxuXHRhZGQ6IGFkZCxcblx0cG9wdWxhdGU6IHBvcHVsYXRlTGlzdCxcblx0aW5pdGlhbGl6ZTogaW5pdGlhbGl6ZVxufSIsInZhciBhdWRpb3BsYXllciA9IHJlcXVpcmUoJy4vYXVkaW9wbGF5ZXIuanMnKSxcblx0YXBpID0gcmVxdWlyZSgnLi9hcGkuanMnKSxcblx0dXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpLFxuXHRtb3VzZXRyYXAgPSByZXF1aXJlKCcuL3ZlbmRvci9tb3VzZXRyYXAubWluLmpzJyksXG5cdGN1cnJlbnRTb25ncyA9IFtdLFxuXHRjdXJyZW50SW5kZXggPSBudWxsLFxuXHRkcm9wSW5kZXggPSBudWxsLFxuXHQkcGxheWxpc3QsIFxuXHRjdXJyZW50RHJhZyxcblx0c2VsZWN0ZWRSb3dzID0gW10sXG5cdF8gPSByZXF1aXJlKCcuL3ZlbmRvci9sb2Rhc2gubWluLmpzJyksXG5cdHRlbXBsYXRlcyA9IHtcblx0XHRpdGVtOiByZXF1aXJlKCcuL3RlbXBsYXRlcy9wbGF5bGlzdC1pdGVtLmpzJylcblx0fTtcblxuJChmdW5jdGlvbigpIHtcblx0JHBsYXlsaXN0ID0gJChcIiNwbGF5bGlzdCB0YWJsZSB0Ym9keVwiKTtcblxuXHQkcGxheWxpc3Qub24oJ2RibGNsaWNrJywgJy5pdGVtJywgZnVuY3Rpb24oZSkge1xuXHRcdHZhciBjdXJyID0gdGhpcztcblxuXHRcdCRwbGF5bGlzdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oaSx4KSB7XG5cdFx0XHRpZih4ID09PSBjdXJyKVxuXHRcdFx0e1xuXHRcdFx0XHRjdXJyZW50SW5kZXggPSBpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRwbGF5KCk7XG5cdH0pO1xuXG5cdCRwbGF5bGlzdC5vbignY2xpY2snLCAnLml0ZW0nLCBmdW5jdGlvbihlKSB7XG5cdFx0aWYoZS5jdHJsS2V5KVxuXHRcdHtcblx0XHRcdGN0cmxTZWxlY3QuY2FsbCh0aGlzKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihlLnNoaWZ0S2V5KVxuXHRcdHtcblx0XHRcdHNoaWZ0U2VsZWN0LmNhbGwodGhpcyk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0c2VsZWN0KFsgdGhpcyBdKTtcblx0XHR9XG5cdH0pO1xuXG5cdG1vdXNldHJhcC5iaW5kKCdkZWwnLCBkZWxldGVTZWxlY3RlZCk7XG5cblx0JCgnI3BsYXlsaXN0IHRhYmxlJykuc29ydGFibGUoe1xuXHRcdGNvbnRhaW5lclNlbGVjdG9yOiAndGFibGUnLFxuXHRcdGl0ZW1QYXRoOiAnPiB0Ym9keScsXG5cdFx0aXRlbVNlbGVjdG9yOiAndHInLFxuXHRcdHBsYWNlaG9sZGVyOiAnPHRyIGNsYXNzPVwicGxhY2Vob2xkZXJcIi8+Jyxcblx0XHRvbkRyb3A6IGZ1bmN0aW9uKCRpdGVtLCBjb250YWluZXIsIF9zdXBlcilcblx0XHR7XG5cdFx0XHR2YXIgbmV3T3JkZXIgPSBbXTtcblxuXHRcdFx0JHBsYXlsaXN0LmZpbmQoJy5pdGVtJykuZWFjaChmdW5jdGlvbihpLHgpIFxuXHRcdFx0e1xuXHRcdFx0XHRuZXdPcmRlci5wdXNoKF8uZmluZChjdXJyZW50U29uZ3MsIGZ1bmN0aW9uKHkpIHtcblx0XHRcdFx0XHRyZXR1cm4geS5zdHJlYW0gPT09ICQoeCkuZGF0YSgnc3RyZWFtJyk7XG5cdFx0XHRcdH0pKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRjdXJyZW50U29uZ3MgPSBuZXdPcmRlcjtcblx0XHRcdF9zdXBlcigkaXRlbSk7XG5cdFx0fVxuXHR9KTtcblxuXHRhdWRpb3BsYXllci5lbmRlZC5hZGQoZnVuY3Rpb24oKSAge1xuXHRcdG5leHQoKTtcblx0fSk7XG59KTtcblxuXG5cbmZ1bmN0aW9uIGRlbGV0ZVNlbGVjdGVkKCkgXG57XG5cdGZvcih2YXIgaSA9IDA7IGkgPCBjdXJyZW50U29uZ3MubGVuZ3RoOyBpKyspXG5cdHtcblx0XHRpZihfLmZpbmQoc2VsZWN0ZWRSb3dzLCBmdW5jdGlvbih4KSB7IHJldHVybiBjdXJyZW50U29uZ3NbaV0uc3RyZWFtID09PSAkKHgpLmRhdGEoJ3N0cmVhbScpOyB9KSkge1xuXHRcdFx0Y3VycmVudFNvbmdzLnNwbGljZShpLCAxKTtcblx0XHRcdGktLTtcblx0XHR9XG5cdH1cblxuXHRjdXJyZW50SW5kZXggPSAwO1xuXHRyZW5kZXIoKTtcbn1cblxuZnVuY3Rpb24gc2hpZnRTZWxlY3QoKSB7XG5cdGlmKHNlbGVjdGVkUm93cy5sZW5ndGggPT09IDApXHRcblx0XHRyZXR1cm47XG5cblx0dmFyIGl0ZW1zID0gJHBsYXlsaXN0LmZpbmQoJy5pdGVtJyk7XG5cdHZhciBzdGFydEluZGV4ID0gMDtcblx0dmFyIGVuZEluZGV4ID0gMDtcblx0dmFyIGN1cnIgPSB0aGlzO1xuXG5cdGl0ZW1zLmVhY2goZnVuY3Rpb24oaSx4KSBcblx0e1xuXHRcdGlmKHggPT09IHNlbGVjdGVkUm93c1swXSlcblx0XHRcdHN0YXJ0SW5kZXggPSBpO1xuXG5cdFx0aWYoeCA9PT0gY3Vycilcblx0XHRcdGVuZEluZGV4ID0gaTtcblx0fSk7XG5cblx0aWYoc3RhcnRJbmRleCA+IGVuZEluZGV4KVxuXHR7XG5cdFx0dmFyIG4gPSBlbmRJbmRleDtcblx0XHRlbmRJbmRleCA9IHN0YXJ0SW5kZXg7XG5cdFx0c3RhcnRJbmRleCA9IG47XG5cdH1cblxuXHRzZWxlY3RlZFJvd3MgPSBpdGVtcy5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleCArIDEpO1xuXHRzZWxlY3Qoc2VsZWN0ZWRSb3dzKTtcbn1cblxuZnVuY3Rpb24gY3RybFNlbGVjdCgpIHtcblx0aWYoIV8uY29udGFpbnMoc2VsZWN0ZWRSb3dzLCB0aGlzKSlcblx0e1xuXHRcdHNlbGVjdGVkUm93cy5wdXNoKHRoaXMpO1xuXHRcdHNlbGVjdChzZWxlY3RlZFJvd3MpO1xuXHR9XHRcbn1cblxuZnVuY3Rpb24gYWRkU29uZ3Moc29uZ3MsIGJlZm9yZSlcbntcblx0aWYoIWJlZm9yZSlcblx0XHRjdXJyZW50U29uZ3MgPSBjdXJyZW50U29uZ3MuY29uY2F0KHNvbmdzKTtcblx0ZWxzZSB7XG5cdFx0dmFyIGFmdGVyID0gY3VycmVudFNvbmdzLnNwbGljZShiZWZvcmUsIGN1cnJlbnRTb25ncy5sZW5ndGgpO1xuXHRcdGN1cnJlbnRTb25ncyA9IGN1cnJlbnRTb25ncy5jb25jYXQoc29uZ3MsIGFmdGVyKTtcblx0fVxuXG5cdHJlbmRlcigpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Qocm93cylcbntcblx0c2VsZWN0ZWRSb3dzID0gcm93cztcblxuXHQkcGxheWxpc3QuZmluZCgnLml0ZW0nKS5yZW1vdmVDbGFzcygnaW5mbycpO1xuXG5cdF8uZWFjaChyb3dzLCBmdW5jdGlvbih4KSB7XG5cdFx0JCh4KS5hZGRDbGFzcygnaW5mbycpXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBwbGF5U29uZ3Moc29uZ3MpXG57XG5cdGN1cnJlbnRTb25ncyA9IFtdO1xuXG5cdGFkZFNvbmdzKHNvbmdzKTtcblx0Y3VycmVudEluZGV4ID0gMDsgXG5cdHBsYXkoKTsgXG59XG5cbmZ1bmN0aW9uIHBsYXkoKSB7XG5cdGlmKGN1cnJlbnRTb25ncy5sZW5ndGggPT09IDApXG5cdFx0cmV0dXJuO1xuXG5cdGlmKCFjdXJyZW50SW5kZXggfHwgY3VycmVudEluZGV4ID49IGN1cnJlbnRTb25ncy5sZW5ndGgpXG5cdFx0Y3VycmVudEluZGV4ID0gMDtcblxuXHR2YXIgc29uZyA9IGN1cnJlbnRTb25nc1tjdXJyZW50SW5kZXhdO1xuXHRhdWRpb3BsYXllci5wbGF5KHNvbmcpO1xuXHRcblx0JHBsYXlsaXN0LmZpbmQoJ3NwYW4ucGxheWluZycpLmFkZENsYXNzKCdoaWRlJyk7XG5cdCRwbGF5bGlzdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oaSx4KSB7XG5cblx0XHRpZigkKHgpLmRhdGEoJ3N0cmVhbScpID09PSBzb25nLnN0cmVhbSlcblx0XHR7XG5cdFx0XHQkKHgpLmZpbmQoJy5wbGF5aW5nJykucmVtb3ZlQ2xhc3MoJ2hpZGUnKTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBuZXh0KCkge1xuXHRjdXJyZW50SW5kZXgrKztcblx0cGxheSgpO1xufVxuXG5mdW5jdGlvbiBwcmV2KCkge1xuXHRpZihjdXJyZW50SW5kZXggPT09IDApXG5cdFx0cmV0dXJuO1xuXG5cdGN1cnJlbnRJbmRleC0tO1xuXHRwbGF5KCk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlcigpIHtcblx0JHBsYXlsaXN0Lmh0bWwoJycpO1xuXHQkLmVhY2goY3VycmVudFNvbmdzLCBmdW5jdGlvbihpLHgpIHtcblx0XHR2YXIgcm93ID0gJCh0ZW1wbGF0ZXMuaXRlbSh7XG5cdFx0XHRzdHJlYW06IHguc3RyZWFtLFxuXHRcdFx0c29uZzogeC5zb25nLFxuXHRcdFx0YXJ0aXN0OiB4LmFydGlzdCxcblx0XHRcdGFsYnVtOiB4LmFsYnVtLFxuXHRcdFx0ZHVyYXRpb246IHV0aWwuc2Vjb25kc1RvVGltZSh4LmR1cmF0aW9uKVxuXHRcdH0pKTtcblxuXHRcdCRwbGF5bGlzdC5hcHBlbmQocm93KTtcblx0XHRyb3cuZGF0YSgnaXRlbScsIHgpO1xuXHR9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGFkZFNvbmdzOiBhZGRTb25ncyxcblx0cHJldjogcHJldixcblx0bmV4dDogbmV4dCxcblx0cGxheVNvbmdzOiBwbGF5U29uZ3Ncbn0iLCJqYWRlID0gcmVxdWlyZShcIi4vLi4vdmVuZG9yL2phZGVydW50aW1lLmpzXCIpO2Z1bmN0aW9uIHRlbXBsYXRlKGxvY2Fscykge1xudmFyIGJ1ZiA9IFtdO1xudmFyIGphZGVfbWl4aW5zID0ge307XG52YXIgbG9jYWxzXyA9IChsb2NhbHMgfHwge30pLGNvdmVyID0gbG9jYWxzXy5jb3ZlcixuYW1lID0gbG9jYWxzXy5uYW1lLGl0ZW1zID0gbG9jYWxzXy5pdGVtcztcbmJ1Zi5wdXNoKFwiPGxpIGNsYXNzPVxcXCJhbGJ1bVxcXCI+PGRpdiBjbGFzcz1cXFwicm93XFxcIj48ZGl2IGNsYXNzPVxcXCJjb2wteHMtNCBjb3ZlclxcXCI+PGltZ1wiICsgKGphZGUuYXR0cihcInNyY1wiLCAoY292ZXIgfHwgJy9pbWFnZXMvbm8tY292ZXIucG5nJyksIHRydWUsIGZhbHNlKSkgKyBcIi8+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29sLXhzLTggaW5mb1xcXCI+PGgzPlwiICsgKGphZGUuZXNjYXBlKG51bGwgPT0gKGphZGUuaW50ZXJwID0gbmFtZSkgPyBcIlwiIDogamFkZS5pbnRlcnApKSArIFwiPC9oMz48aDU+MjAwNzwvaDU+PGg1PlwiICsgKGphZGUuZXNjYXBlKG51bGwgPT0gKGphZGUuaW50ZXJwID0gKGl0ZW1zLmxlbmd0aCArIFwiIHNvbmdzXCIpKSA/IFwiXCIgOiBqYWRlLmludGVycCkpICsgXCI8L2g1PjxkaXYgY2xhc3M9XFxcImJ0bi1ncm91cFxcXCI+PGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IHBsYXlcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsYXlcXFwiPjwvc3Bhbj48L2J1dHRvbj48YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgYWRkXFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1sb2ctaW5cXFwiPjwvc3Bhbj48L2J1dHRvbj48L2Rpdj48L2Rpdj48L2Rpdj48L2xpPlwiKTs7cmV0dXJuIGJ1Zi5qb2luKFwiXCIpO1xufW1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGU7IiwiamFkZSA9IHJlcXVpcmUoXCIuLy4uL3ZlbmRvci9qYWRlcnVudGltZS5qc1wiKTtmdW5jdGlvbiB0ZW1wbGF0ZShsb2NhbHMpIHtcbnZhciBidWYgPSBbXTtcbnZhciBqYWRlX21peGlucyA9IHt9O1xudmFyIGxvY2Fsc18gPSAobG9jYWxzIHx8IHt9KSxpc0ZpbGUgPSBsb2NhbHNfLmlzRmlsZSxzb25nID0gbG9jYWxzXy5zb25nLG5hbWUgPSBsb2NhbHNfLm5hbWU7XG5idWYucHVzaChcIjxsaSBjbGFzcz1cXFwiZ2VuZXJpY1xcXCI+XCIpO1xuaWYgKCBpc0ZpbGUpXG57XG5idWYucHVzaChcIjxzcGFuPlwiICsgKGphZGUuZXNjYXBlKG51bGwgPT0gKGphZGUuaW50ZXJwID0gc29uZykgPyBcIlwiIDogamFkZS5pbnRlcnApKSArIFwiPC9zcGFuPlwiKTtcbn1cbmVsc2VcbntcbmJ1Zi5wdXNoKFwiPHNwYW4+XCIgKyAoamFkZS5lc2NhcGUobnVsbCA9PSAoamFkZS5pbnRlcnAgPSBuYW1lKSA/IFwiXCIgOiBqYWRlLmludGVycCkpICsgXCI8L3NwYW4+PGRpdiBjbGFzcz1cXFwiYnRuLWdyb3VwIHB1bGwtcmlnaHRcXFwiPjxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBwbGF5XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbGF5XFxcIj48L3NwYW4+PC9idXR0b24+PGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGFkZFxcXCI+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tbG9nLWluXFxcIj48L3NwYW4+PC9idXR0b24+PC9kaXY+XCIpO1xufVxuYnVmLnB1c2goXCI8L2xpPlwiKTs7cmV0dXJuIGJ1Zi5qb2luKFwiXCIpO1xufW1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGU7IiwiamFkZSA9IHJlcXVpcmUoXCIuLy4uL3ZlbmRvci9qYWRlcnVudGltZS5qc1wiKTtmdW5jdGlvbiB0ZW1wbGF0ZShsb2NhbHMpIHtcbnZhciBidWYgPSBbXTtcbnZhciBqYWRlX21peGlucyA9IHt9O1xudmFyIGxvY2Fsc18gPSAobG9jYWxzIHx8IHt9KSxzdHJlYW0gPSBsb2NhbHNfLnN0cmVhbSxzb25nID0gbG9jYWxzXy5zb25nLGFsYnVtID0gbG9jYWxzXy5hbGJ1bSxhcnRpc3QgPSBsb2NhbHNfLmFydGlzdCxkdXJhdGlvbiA9IGxvY2Fsc18uZHVyYXRpb247XG5idWYucHVzaChcIjx0clwiICsgKGphZGUuYXR0cihcImRhdGEtc3RyZWFtXCIsIHN0cmVhbSwgdHJ1ZSwgZmFsc2UpKSArIFwiIGNsYXNzPVxcXCJpdGVtXFxcIj48dGQ+PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tdm9sdW1lLXVwIHBsYXlpbmcgaGlkZVxcXCI+PC9zcGFuPjxzcGFuPiZuYnNwOzwvc3Bhbj48c3Bhbj5cIiArIChqYWRlLmVzY2FwZShudWxsID09IChqYWRlLmludGVycCA9IHNvbmcpID8gXCJcIiA6IGphZGUuaW50ZXJwKSkgKyBcIjwvc3Bhbj48L3RkPjx0ZD5cIiArIChqYWRlLmVzY2FwZShudWxsID09IChqYWRlLmludGVycCA9IGFsYnVtKSA/IFwiXCIgOiBqYWRlLmludGVycCkpICsgXCI8L3RkPjx0ZD5cIiArIChqYWRlLmVzY2FwZShudWxsID09IChqYWRlLmludGVycCA9IGFydGlzdCkgPyBcIlwiIDogamFkZS5pbnRlcnApKSArIFwiPC90ZD48dGQ+XCIgKyAoamFkZS5lc2NhcGUobnVsbCA9PSAoamFkZS5pbnRlcnAgPSBkdXJhdGlvbikgPyBcIlwiIDogamFkZS5pbnRlcnApKSArIFwiPC90ZD48L3RyPlwiKTs7cmV0dXJuIGJ1Zi5qb2luKFwiXCIpO1xufW1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGU7IiwidmFyIG1vbWVudCA9IHJlcXVpcmUoJy4vdmVuZG9yL21vbWVudC5qcycpO1xuXG5mdW5jdGlvbiBzZWNvbmRzVG9UaW1lKHNlYylcbntcblx0cmV0dXJuIG1vbWVudCgpLnN0YXJ0T2YoJ2RheScpLmFkZCgncycsIHNlYykuZm9ybWF0KCdtbTpzcycpXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRzZWNvbmRzVG9UaW1lOiBzZWNvbmRzVG9UaW1lXG59O1xuIiwidmFyIGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307IWZ1bmN0aW9uKGUpe2lmKFwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzKW1vZHVsZS5leHBvcnRzPWUoKTtlbHNlIGlmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZClkZWZpbmUoZSk7ZWxzZXt2YXIgZjtcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P2Y9d2luZG93OlwidW5kZWZpbmVkXCIhPXR5cGVvZiBnbG9iYWw/Zj1nbG9iYWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNlbGYmJihmPXNlbGYpLGYuamFkZT1lKCl9fShmdW5jdGlvbigpe3ZhciBkZWZpbmUsbW9kdWxlLGV4cG9ydHM7cmV0dXJuIChmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBNZXJnZSB0d28gYXR0cmlidXRlIG9iamVjdHMgZ2l2aW5nIHByZWNlZGVuY2VcbiAqIHRvIHZhbHVlcyBpbiBvYmplY3QgYGJgLiBDbGFzc2VzIGFyZSBzcGVjaWFsLWNhc2VkXG4gKiBhbGxvd2luZyBmb3IgYXJyYXlzIGFuZCBtZXJnaW5nL2pvaW5pbmcgYXBwcm9wcmlhdGVseVxuICogcmVzdWx0aW5nIGluIGEgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gKiBAcGFyYW0ge09iamVjdH0gYlxuICogQHJldHVybiB7T2JqZWN0fSBhXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gbWVyZ2UoYSwgYikge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHZhciBhdHRycyA9IGFbMF07XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhdHRycyA9IG1lcmdlKGF0dHJzLCBhW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJzO1xuICB9XG4gIHZhciBhYyA9IGFbJ2NsYXNzJ107XG4gIHZhciBiYyA9IGJbJ2NsYXNzJ107XG5cbiAgaWYgKGFjIHx8IGJjKSB7XG4gICAgYWMgPSBhYyB8fCBbXTtcbiAgICBiYyA9IGJjIHx8IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShhYykpIGFjID0gW2FjXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYmMpKSBiYyA9IFtiY107XG4gICAgYVsnY2xhc3MnXSA9IGFjLmNvbmNhdChiYykuZmlsdGVyKG51bGxzKTtcbiAgfVxuXG4gIGZvciAodmFyIGtleSBpbiBiKSB7XG4gICAgaWYgKGtleSAhPSAnY2xhc3MnKSB7XG4gICAgICBhW2tleV0gPSBiW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGE7XG59O1xuXG4vKipcbiAqIEZpbHRlciBudWxsIGB2YWxgcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG51bGxzKHZhbCkge1xuICByZXR1cm4gdmFsICE9IG51bGwgJiYgdmFsICE9PSAnJztcbn1cblxuLyoqXG4gKiBqb2luIGFycmF5IGFzIGNsYXNzZXMuXG4gKlxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZXhwb3J0cy5qb2luQ2xhc3NlcyA9IGpvaW5DbGFzc2VzO1xuZnVuY3Rpb24gam9pbkNsYXNzZXModmFsKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHZhbCkgPyB2YWwubWFwKGpvaW5DbGFzc2VzKS5maWx0ZXIobnVsbHMpLmpvaW4oJyAnKSA6IHZhbDtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGdpdmVuIGNsYXNzZXMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gY2xhc3Nlc1xuICogQHBhcmFtIHtBcnJheS48Qm9vbGVhbj59IGVzY2FwZWRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZXhwb3J0cy5jbHMgPSBmdW5jdGlvbiBjbHMoY2xhc3NlcywgZXNjYXBlZCkge1xuICB2YXIgYnVmID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2xhc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChlc2NhcGVkICYmIGVzY2FwZWRbaV0pIHtcbiAgICAgIGJ1Zi5wdXNoKGV4cG9ydHMuZXNjYXBlKGpvaW5DbGFzc2VzKFtjbGFzc2VzW2ldXSkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmLnB1c2goam9pbkNsYXNzZXMoY2xhc3Nlc1tpXSkpO1xuICAgIH1cbiAgfVxuICB2YXIgdGV4dCA9IGpvaW5DbGFzc2VzKGJ1Zik7XG4gIGlmICh0ZXh0Lmxlbmd0aCkge1xuICAgIHJldHVybiAnIGNsYXNzPVwiJyArIHRleHQgKyAnXCInO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnJztcbiAgfVxufTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIGdpdmVuIGF0dHJpYnV0ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGVzY2FwZWRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdGVyc2VcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZXhwb3J0cy5hdHRyID0gZnVuY3Rpb24gYXR0cihrZXksIHZhbCwgZXNjYXBlZCwgdGVyc2UpIHtcbiAgaWYgKCdib29sZWFuJyA9PSB0eXBlb2YgdmFsIHx8IG51bGwgPT0gdmFsKSB7XG4gICAgaWYgKHZhbCkge1xuICAgICAgcmV0dXJuICcgJyArICh0ZXJzZSA/IGtleSA6IGtleSArICc9XCInICsga2V5ICsgJ1wiJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH0gZWxzZSBpZiAoMCA9PSBrZXkuaW5kZXhPZignZGF0YScpICYmICdzdHJpbmcnICE9IHR5cGVvZiB2YWwpIHtcbiAgICByZXR1cm4gJyAnICsga2V5ICsgXCI9J1wiICsgSlNPTi5zdHJpbmdpZnkodmFsKS5yZXBsYWNlKC8nL2csICcmYXBvczsnKSArIFwiJ1wiO1xuICB9IGVsc2UgaWYgKGVzY2FwZWQpIHtcbiAgICByZXR1cm4gJyAnICsga2V5ICsgJz1cIicgKyBleHBvcnRzLmVzY2FwZSh2YWwpICsgJ1wiJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJyAnICsga2V5ICsgJz1cIicgKyB2YWwgKyAnXCInO1xuICB9XG59O1xuXG4vKipcbiAqIFJlbmRlciB0aGUgZ2l2ZW4gYXR0cmlidXRlcyBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtPYmplY3R9IGVzY2FwZWRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZXhwb3J0cy5hdHRycyA9IGZ1bmN0aW9uIGF0dHJzKG9iaiwgdGVyc2Upe1xuICB2YXIgYnVmID0gW107XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuXG4gIGlmIChrZXlzLmxlbmd0aCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV1cbiAgICAgICAgLCB2YWwgPSBvYmpba2V5XTtcblxuICAgICAgaWYgKCdjbGFzcycgPT0ga2V5KSB7XG4gICAgICAgIGlmICh2YWwgPSBqb2luQ2xhc3Nlcyh2YWwpKSB7XG4gICAgICAgICAgYnVmLnB1c2goJyAnICsga2V5ICsgJz1cIicgKyB2YWwgKyAnXCInKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnVmLnB1c2goZXhwb3J0cy5hdHRyKGtleSwgdmFsLCBmYWxzZSwgdGVyc2UpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmLmpvaW4oJycpO1xufTtcblxuLyoqXG4gKiBFc2NhcGUgdGhlIGdpdmVuIHN0cmluZyBvZiBgaHRtbGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMuZXNjYXBlID0gZnVuY3Rpb24gZXNjYXBlKGh0bWwpe1xuICB2YXIgcmVzdWx0ID0gU3RyaW5nKGh0bWwpXG4gICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gIGlmIChyZXN1bHQgPT09ICcnICsgaHRtbCkgcmV0dXJuIGh0bWw7XG4gIGVsc2UgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogUmUtdGhyb3cgdGhlIGdpdmVuIGBlcnJgIGluIGNvbnRleHQgdG8gdGhlXG4gKiB0aGUgamFkZSBpbiBgZmlsZW5hbWVgIGF0IHRoZSBnaXZlbiBgbGluZW5vYC5cbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlbmFtZVxuICogQHBhcmFtIHtTdHJpbmd9IGxpbmVub1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5yZXRocm93ID0gZnVuY3Rpb24gcmV0aHJvdyhlcnIsIGZpbGVuYW1lLCBsaW5lbm8sIHN0cil7XG4gIGlmICghKGVyciBpbnN0YW5jZW9mIEVycm9yKSkgdGhyb3cgZXJyO1xuICBpZiAoKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgfHwgIWZpbGVuYW1lKSAmJiAhc3RyKSB7XG4gICAgZXJyLm1lc3NhZ2UgKz0gJyBvbiBsaW5lICcgKyBsaW5lbm87XG4gICAgdGhyb3cgZXJyO1xuICB9XG4gIHRyeSB7XG4gICAgc3RyID0gIHN0ciB8fCByZXF1aXJlKCdmcycpLnJlYWRGaWxlU3luYyhmaWxlbmFtZSwgJ3V0ZjgnKVxuICB9IGNhdGNoIChleCkge1xuICAgIHJldGhyb3coZXJyLCBudWxsLCBsaW5lbm8pXG4gIH1cbiAgdmFyIGNvbnRleHQgPSAzXG4gICAgLCBsaW5lcyA9IHN0ci5zcGxpdCgnXFxuJylcbiAgICAsIHN0YXJ0ID0gTWF0aC5tYXgobGluZW5vIC0gY29udGV4dCwgMClcbiAgICAsIGVuZCA9IE1hdGgubWluKGxpbmVzLmxlbmd0aCwgbGluZW5vICsgY29udGV4dCk7XG5cbiAgLy8gRXJyb3IgY29udGV4dFxuICB2YXIgY29udGV4dCA9IGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLm1hcChmdW5jdGlvbihsaW5lLCBpKXtcbiAgICB2YXIgY3VyciA9IGkgKyBzdGFydCArIDE7XG4gICAgcmV0dXJuIChjdXJyID09IGxpbmVubyA/ICcgID4gJyA6ICcgICAgJylcbiAgICAgICsgY3VyclxuICAgICAgKyAnfCAnXG4gICAgICArIGxpbmU7XG4gIH0pLmpvaW4oJ1xcbicpO1xuXG4gIC8vIEFsdGVyIGV4Y2VwdGlvbiBtZXNzYWdlXG4gIGVyci5wYXRoID0gZmlsZW5hbWU7XG4gIGVyci5tZXNzYWdlID0gKGZpbGVuYW1lIHx8ICdKYWRlJykgKyAnOicgKyBsaW5lbm9cbiAgICArICdcXG4nICsgY29udGV4dCArICdcXG5cXG4nICsgZXJyLm1lc3NhZ2U7XG4gIHRocm93IGVycjtcbn07XG5cbn0se1wiZnNcIjoyfV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cbn0se31dfSx7fSxbMV0pXG4oMSlcbn0pOyIsInZhciBnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8qKlxuICogQGxpY2Vuc2VcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgbG9kYXNoLmNvbS9saWNlbnNlIHwgVW5kZXJzY29yZS5qcyAxLjUuMiB1bmRlcnNjb3JlanMub3JnL0xJQ0VOU0VcbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiAtbyAuL2Rpc3QvbG9kYXNoLmpzYFxuICovXG47KGZ1bmN0aW9uKCl7ZnVuY3Rpb24gbihuLHQsZSl7ZT0oZXx8MCktMTtmb3IodmFyIHI9bj9uLmxlbmd0aDowOysrZTxyOylpZihuW2VdPT09dClyZXR1cm4gZTtyZXR1cm4tMX1mdW5jdGlvbiB0KHQsZSl7dmFyIHI9dHlwZW9mIGU7aWYodD10LmwsXCJib29sZWFuXCI9PXJ8fG51bGw9PWUpcmV0dXJuIHRbZV0/MDotMTtcIm51bWJlclwiIT1yJiZcInN0cmluZ1wiIT1yJiYocj1cIm9iamVjdFwiKTt2YXIgdT1cIm51bWJlclwiPT1yP2U6bStlO3JldHVybiB0PSh0PXRbcl0pJiZ0W3VdLFwib2JqZWN0XCI9PXI/dCYmLTE8bih0LGUpPzA6LTE6dD8wOi0xfWZ1bmN0aW9uIGUobil7dmFyIHQ9dGhpcy5sLGU9dHlwZW9mIG47aWYoXCJib29sZWFuXCI9PWV8fG51bGw9PW4pdFtuXT10cnVlO2Vsc2V7XCJudW1iZXJcIiE9ZSYmXCJzdHJpbmdcIiE9ZSYmKGU9XCJvYmplY3RcIik7dmFyIHI9XCJudW1iZXJcIj09ZT9uOm0rbix0PXRbZV18fCh0W2VdPXt9KTtcIm9iamVjdFwiPT1lPyh0W3JdfHwodFtyXT1bXSkpLnB1c2gobik6dFtyXT10cnVlXG59fWZ1bmN0aW9uIHIobil7cmV0dXJuIG4uY2hhckNvZGVBdCgwKX1mdW5jdGlvbiB1KG4sdCl7Zm9yKHZhciBlPW4ubSxyPXQubSx1PS0xLG89ZS5sZW5ndGg7Kyt1PG87KXt2YXIgaT1lW3VdLGE9clt1XTtpZihpIT09YSl7aWYoaT5hfHx0eXBlb2YgaT09XCJ1bmRlZmluZWRcIilyZXR1cm4gMTtpZihpPGF8fHR5cGVvZiBhPT1cInVuZGVmaW5lZFwiKXJldHVybi0xfX1yZXR1cm4gbi5uLXQubn1mdW5jdGlvbiBvKG4pe3ZhciB0PS0xLHI9bi5sZW5ndGgsdT1uWzBdLG89bltyLzJ8MF0saT1uW3ItMV07aWYodSYmdHlwZW9mIHU9PVwib2JqZWN0XCImJm8mJnR5cGVvZiBvPT1cIm9iamVjdFwiJiZpJiZ0eXBlb2YgaT09XCJvYmplY3RcIilyZXR1cm4gZmFsc2U7Zm9yKHU9ZigpLHVbXCJmYWxzZVwiXT11W1wibnVsbFwiXT11W1widHJ1ZVwiXT11LnVuZGVmaW5lZD1mYWxzZSxvPWYoKSxvLms9bixvLmw9dSxvLnB1c2g9ZTsrK3Q8cjspby5wdXNoKG5bdF0pO3JldHVybiBvfWZ1bmN0aW9uIGkobil7cmV0dXJuXCJcXFxcXCIrVVtuXVxufWZ1bmN0aW9uIGEoKXtyZXR1cm4gaC5wb3AoKXx8W119ZnVuY3Rpb24gZigpe3JldHVybiBnLnBvcCgpfHx7azpudWxsLGw6bnVsbCxtOm51bGwsXCJmYWxzZVwiOmZhbHNlLG46MCxcIm51bGxcIjpmYWxzZSxudW1iZXI6bnVsbCxvYmplY3Q6bnVsbCxwdXNoOm51bGwsc3RyaW5nOm51bGwsXCJ0cnVlXCI6ZmFsc2UsdW5kZWZpbmVkOmZhbHNlLG86bnVsbH19ZnVuY3Rpb24gbChuKXtuLmxlbmd0aD0wLGgubGVuZ3RoPF8mJmgucHVzaChuKX1mdW5jdGlvbiBjKG4pe3ZhciB0PW4ubDt0JiZjKHQpLG4uaz1uLmw9bi5tPW4ub2JqZWN0PW4ubnVtYmVyPW4uc3RyaW5nPW4ubz1udWxsLGcubGVuZ3RoPF8mJmcucHVzaChuKX1mdW5jdGlvbiBwKG4sdCxlKXt0fHwodD0wKSx0eXBlb2YgZT09XCJ1bmRlZmluZWRcIiYmKGU9bj9uLmxlbmd0aDowKTt2YXIgcj0tMTtlPWUtdHx8MDtmb3IodmFyIHU9QXJyYXkoMD5lPzA6ZSk7KytyPGU7KXVbcl09blt0K3JdO3JldHVybiB1fWZ1bmN0aW9uIHMoZSl7ZnVuY3Rpb24gaChuLHQsZSl7aWYoIW58fCFWW3R5cGVvZiBuXSlyZXR1cm4gbjtcbnQ9dCYmdHlwZW9mIGU9PVwidW5kZWZpbmVkXCI/dDp0dCh0LGUsMyk7Zm9yKHZhciByPS0xLHU9Vlt0eXBlb2Ygbl0mJkZlKG4pLG89dT91Lmxlbmd0aDowOysrcjxvJiYoZT11W3JdLGZhbHNlIT09dChuW2VdLGUsbikpOyk7cmV0dXJuIG59ZnVuY3Rpb24gZyhuLHQsZSl7dmFyIHI7aWYoIW58fCFWW3R5cGVvZiBuXSlyZXR1cm4gbjt0PXQmJnR5cGVvZiBlPT1cInVuZGVmaW5lZFwiP3Q6dHQodCxlLDMpO2ZvcihyIGluIG4paWYoZmFsc2U9PT10KG5bcl0scixuKSlicmVhaztyZXR1cm4gbn1mdW5jdGlvbiBfKG4sdCxlKXt2YXIgcix1PW4sbz11O2lmKCF1KXJldHVybiBvO2Zvcih2YXIgaT1hcmd1bWVudHMsYT0wLGY9dHlwZW9mIGU9PVwibnVtYmVyXCI/MjppLmxlbmd0aDsrK2E8ZjspaWYoKHU9aVthXSkmJlZbdHlwZW9mIHVdKWZvcih2YXIgbD0tMSxjPVZbdHlwZW9mIHVdJiZGZSh1KSxwPWM/Yy5sZW5ndGg6MDsrK2w8cDspcj1jW2xdLFwidW5kZWZpbmVkXCI9PXR5cGVvZiBvW3JdJiYob1tyXT11W3JdKTtcbnJldHVybiBvfWZ1bmN0aW9uIFUobix0LGUpe3ZhciByLHU9bixvPXU7aWYoIXUpcmV0dXJuIG87dmFyIGk9YXJndW1lbnRzLGE9MCxmPXR5cGVvZiBlPT1cIm51bWJlclwiPzI6aS5sZW5ndGg7aWYoMzxmJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBpW2YtMl0pdmFyIGw9dHQoaVstLWYtMV0saVtmLS1dLDIpO2Vsc2UgMjxmJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBpW2YtMV0mJihsPWlbLS1mXSk7Zm9yKDsrK2E8ZjspaWYoKHU9aVthXSkmJlZbdHlwZW9mIHVdKWZvcih2YXIgYz0tMSxwPVZbdHlwZW9mIHVdJiZGZSh1KSxzPXA/cC5sZW5ndGg6MDsrK2M8czspcj1wW2NdLG9bcl09bD9sKG9bcl0sdVtyXSk6dVtyXTtyZXR1cm4gb31mdW5jdGlvbiBIKG4pe3ZhciB0LGU9W107aWYoIW58fCFWW3R5cGVvZiBuXSlyZXR1cm4gZTtmb3IodCBpbiBuKW1lLmNhbGwobix0KSYmZS5wdXNoKHQpO3JldHVybiBlfWZ1bmN0aW9uIEoobil7cmV0dXJuIG4mJnR5cGVvZiBuPT1cIm9iamVjdFwiJiYhVGUobikmJm1lLmNhbGwobixcIl9fd3JhcHBlZF9fXCIpP246bmV3IFEobilcbn1mdW5jdGlvbiBRKG4sdCl7dGhpcy5fX2NoYWluX189ISF0LHRoaXMuX193cmFwcGVkX189bn1mdW5jdGlvbiBYKG4pe2Z1bmN0aW9uIHQoKXtpZihyKXt2YXIgbj1wKHIpO2JlLmFwcGx5KG4sYXJndW1lbnRzKX1pZih0aGlzIGluc3RhbmNlb2YgdCl7dmFyIG89bnQoZS5wcm90b3R5cGUpLG49ZS5hcHBseShvLG58fGFyZ3VtZW50cyk7cmV0dXJuIHd0KG4pP246b31yZXR1cm4gZS5hcHBseSh1LG58fGFyZ3VtZW50cyl9dmFyIGU9blswXSxyPW5bMl0sdT1uWzRdO3JldHVybiAkZSh0LG4pLHR9ZnVuY3Rpb24gWihuLHQsZSxyLHUpe2lmKGUpe3ZhciBvPWUobik7aWYodHlwZW9mIG8hPVwidW5kZWZpbmVkXCIpcmV0dXJuIG99aWYoIXd0KG4pKXJldHVybiBuO3ZhciBpPWNlLmNhbGwobik7aWYoIUtbaV0pcmV0dXJuIG47dmFyIGY9QWVbaV07c3dpdGNoKGkpe2Nhc2UgVDpjYXNlIEY6cmV0dXJuIG5ldyBmKCtuKTtjYXNlIFc6Y2FzZSBQOnJldHVybiBuZXcgZihuKTtjYXNlIHo6cmV0dXJuIG89ZihuLnNvdXJjZSxDLmV4ZWMobikpLG8ubGFzdEluZGV4PW4ubGFzdEluZGV4LG9cbn1pZihpPVRlKG4pLHQpe3ZhciBjPSFyO3J8fChyPWEoKSksdXx8KHU9YSgpKTtmb3IodmFyIHM9ci5sZW5ndGg7cy0tOylpZihyW3NdPT1uKXJldHVybiB1W3NdO289aT9mKG4ubGVuZ3RoKTp7fX1lbHNlIG89aT9wKG4pOlUoe30sbik7cmV0dXJuIGkmJihtZS5jYWxsKG4sXCJpbmRleFwiKSYmKG8uaW5kZXg9bi5pbmRleCksbWUuY2FsbChuLFwiaW5wdXRcIikmJihvLmlucHV0PW4uaW5wdXQpKSx0PyhyLnB1c2gobiksdS5wdXNoKG8pLChpP1N0OmgpKG4sZnVuY3Rpb24obixpKXtvW2ldPVoobix0LGUscix1KX0pLGMmJihsKHIpLGwodSkpLG8pOm99ZnVuY3Rpb24gbnQobil7cmV0dXJuIHd0KG4pP2tlKG4pOnt9fWZ1bmN0aW9uIHR0KG4sdCxlKXtpZih0eXBlb2YgbiE9XCJmdW5jdGlvblwiKXJldHVybiBVdDtpZih0eXBlb2YgdD09XCJ1bmRlZmluZWRcInx8IShcInByb3RvdHlwZVwiaW4gbikpcmV0dXJuIG47dmFyIHI9bi5fX2JpbmREYXRhX187aWYodHlwZW9mIHI9PVwidW5kZWZpbmVkXCImJihEZS5mdW5jTmFtZXMmJihyPSFuLm5hbWUpLHI9cnx8IURlLmZ1bmNEZWNvbXAsIXIpKXt2YXIgdT1nZS5jYWxsKG4pO1xuRGUuZnVuY05hbWVzfHwocj0hTy50ZXN0KHUpKSxyfHwocj1FLnRlc3QodSksJGUobixyKSl9aWYoZmFsc2U9PT1yfHx0cnVlIT09ciYmMSZyWzFdKXJldHVybiBuO3N3aXRjaChlKXtjYXNlIDE6cmV0dXJuIGZ1bmN0aW9uKGUpe3JldHVybiBuLmNhbGwodCxlKX07Y2FzZSAyOnJldHVybiBmdW5jdGlvbihlLHIpe3JldHVybiBuLmNhbGwodCxlLHIpfTtjYXNlIDM6cmV0dXJuIGZ1bmN0aW9uKGUscix1KXtyZXR1cm4gbi5jYWxsKHQsZSxyLHUpfTtjYXNlIDQ6cmV0dXJuIGZ1bmN0aW9uKGUscix1LG8pe3JldHVybiBuLmNhbGwodCxlLHIsdSxvKX19cmV0dXJuIE10KG4sdCl9ZnVuY3Rpb24gZXQobil7ZnVuY3Rpb24gdCgpe3ZhciBuPWY/aTp0aGlzO2lmKHUpe3ZhciBoPXAodSk7YmUuYXBwbHkoaCxhcmd1bWVudHMpfXJldHVybihvfHxjKSYmKGh8fChoPXAoYXJndW1lbnRzKSksbyYmYmUuYXBwbHkoaCxvKSxjJiZoLmxlbmd0aDxhKT8ocnw9MTYsZXQoW2Uscz9yOi00JnIsaCxudWxsLGksYV0pKTooaHx8KGg9YXJndW1lbnRzKSxsJiYoZT1uW3ZdKSx0aGlzIGluc3RhbmNlb2YgdD8obj1udChlLnByb3RvdHlwZSksaD1lLmFwcGx5KG4saCksd3QoaCk/aDpuKTplLmFwcGx5KG4saCkpXG59dmFyIGU9blswXSxyPW5bMV0sdT1uWzJdLG89blszXSxpPW5bNF0sYT1uWzVdLGY9MSZyLGw9MiZyLGM9NCZyLHM9OCZyLHY9ZTtyZXR1cm4gJGUodCxuKSx0fWZ1bmN0aW9uIHJ0KGUscil7dmFyIHU9LTEsaT1zdCgpLGE9ZT9lLmxlbmd0aDowLGY9YT49YiYmaT09PW4sbD1bXTtpZihmKXt2YXIgcD1vKHIpO3A/KGk9dCxyPXApOmY9ZmFsc2V9Zm9yKDsrK3U8YTspcD1lW3VdLDA+aShyLHApJiZsLnB1c2gocCk7cmV0dXJuIGYmJmMociksbH1mdW5jdGlvbiB1dChuLHQsZSxyKXtyPShyfHwwKS0xO2Zvcih2YXIgdT1uP24ubGVuZ3RoOjAsbz1bXTsrK3I8dTspe3ZhciBpPW5bcl07aWYoaSYmdHlwZW9mIGk9PVwib2JqZWN0XCImJnR5cGVvZiBpLmxlbmd0aD09XCJudW1iZXJcIiYmKFRlKGkpfHx5dChpKSkpe3R8fChpPXV0KGksdCxlKSk7dmFyIGE9LTEsZj1pLmxlbmd0aCxsPW8ubGVuZ3RoO2ZvcihvLmxlbmd0aCs9ZjsrK2E8Zjspb1tsKytdPWlbYV19ZWxzZSBlfHxvLnB1c2goaSl9cmV0dXJuIG9cbn1mdW5jdGlvbiBvdChuLHQsZSxyLHUsbyl7aWYoZSl7dmFyIGk9ZShuLHQpO2lmKHR5cGVvZiBpIT1cInVuZGVmaW5lZFwiKXJldHVybiEhaX1pZihuPT09dClyZXR1cm4gMCE9PW58fDEvbj09MS90O2lmKG49PT1uJiYhKG4mJlZbdHlwZW9mIG5dfHx0JiZWW3R5cGVvZiB0XSkpcmV0dXJuIGZhbHNlO2lmKG51bGw9PW58fG51bGw9PXQpcmV0dXJuIG49PT10O3ZhciBmPWNlLmNhbGwobiksYz1jZS5jYWxsKHQpO2lmKGY9PUQmJihmPXEpLGM9PUQmJihjPXEpLGYhPWMpcmV0dXJuIGZhbHNlO3N3aXRjaChmKXtjYXNlIFQ6Y2FzZSBGOnJldHVybituPT0rdDtjYXNlIFc6cmV0dXJuIG4hPStuP3QhPSt0OjA9PW4/MS9uPT0xL3Q6bj09K3Q7Y2FzZSB6OmNhc2UgUDpyZXR1cm4gbj09b2UodCl9aWYoYz1mPT0kLCFjKXt2YXIgcD1tZS5jYWxsKG4sXCJfX3dyYXBwZWRfX1wiKSxzPW1lLmNhbGwodCxcIl9fd3JhcHBlZF9fXCIpO2lmKHB8fHMpcmV0dXJuIG90KHA/bi5fX3dyYXBwZWRfXzpuLHM/dC5fX3dyYXBwZWRfXzp0LGUscix1LG8pO1xuaWYoZiE9cSlyZXR1cm4gZmFsc2U7aWYoZj1uLmNvbnN0cnVjdG9yLHA9dC5jb25zdHJ1Y3RvcixmIT1wJiYhKGR0KGYpJiZmIGluc3RhbmNlb2YgZiYmZHQocCkmJnAgaW5zdGFuY2VvZiBwKSYmXCJjb25zdHJ1Y3RvclwiaW4gbiYmXCJjb25zdHJ1Y3RvclwiaW4gdClyZXR1cm4gZmFsc2V9Zm9yKGY9IXUsdXx8KHU9YSgpKSxvfHwobz1hKCkpLHA9dS5sZW5ndGg7cC0tOylpZih1W3BdPT1uKXJldHVybiBvW3BdPT10O3ZhciB2PTAsaT10cnVlO2lmKHUucHVzaChuKSxvLnB1c2godCksYyl7aWYocD1uLmxlbmd0aCx2PXQubGVuZ3RoLChpPXY9PXApfHxyKWZvcig7di0tOylpZihjPXAscz10W3ZdLHIpZm9yKDtjLS0mJiEoaT1vdChuW2NdLHMsZSxyLHUsbykpOyk7ZWxzZSBpZighKGk9b3Qoblt2XSxzLGUscix1LG8pKSlicmVha31lbHNlIGcodCxmdW5jdGlvbih0LGEsZil7cmV0dXJuIG1lLmNhbGwoZixhKT8odisrLGk9bWUuY2FsbChuLGEpJiZvdChuW2FdLHQsZSxyLHUsbykpOnZvaWQgMH0pLGkmJiFyJiZnKG4sZnVuY3Rpb24obix0LGUpe3JldHVybiBtZS5jYWxsKGUsdCk/aT0tMTwtLXY6dm9pZCAwXG59KTtyZXR1cm4gdS5wb3AoKSxvLnBvcCgpLGYmJihsKHUpLGwobykpLGl9ZnVuY3Rpb24gaXQobix0LGUscix1KXsoVGUodCk/U3Q6aCkodCxmdW5jdGlvbih0LG8pe3ZhciBpLGEsZj10LGw9bltvXTtpZih0JiYoKGE9VGUodCkpfHxQZSh0KSkpe2ZvcihmPXIubGVuZ3RoO2YtLTspaWYoaT1yW2ZdPT10KXtsPXVbZl07YnJlYWt9aWYoIWkpe3ZhciBjO2UmJihmPWUobCx0KSxjPXR5cGVvZiBmIT1cInVuZGVmaW5lZFwiKSYmKGw9ZiksY3x8KGw9YT9UZShsKT9sOltdOlBlKGwpP2w6e30pLHIucHVzaCh0KSx1LnB1c2gobCksY3x8aXQobCx0LGUscix1KX19ZWxzZSBlJiYoZj1lKGwsdCksdHlwZW9mIGY9PVwidW5kZWZpbmVkXCImJihmPXQpKSx0eXBlb2YgZiE9XCJ1bmRlZmluZWRcIiYmKGw9Zik7bltvXT1sfSl9ZnVuY3Rpb24gYXQobix0KXtyZXR1cm4gbitoZShSZSgpKih0LW4rMSkpfWZ1bmN0aW9uIGZ0KGUscix1KXt2YXIgaT0tMSxmPXN0KCkscD1lP2UubGVuZ3RoOjAscz1bXSx2PSFyJiZwPj1iJiZmPT09bixoPXV8fHY/YSgpOnM7XG5mb3IodiYmKGg9byhoKSxmPXQpOysraTxwOyl7dmFyIGc9ZVtpXSx5PXU/dShnLGksZSk6Zzsocj8haXx8aFtoLmxlbmd0aC0xXSE9PXk6MD5mKGgseSkpJiYoKHV8fHYpJiZoLnB1c2goeSkscy5wdXNoKGcpKX1yZXR1cm4gdj8obChoLmspLGMoaCkpOnUmJmwoaCksc31mdW5jdGlvbiBsdChuKXtyZXR1cm4gZnVuY3Rpb24odCxlLHIpe3ZhciB1PXt9O2U9Si5jcmVhdGVDYWxsYmFjayhlLHIsMykscj0tMTt2YXIgbz10P3QubGVuZ3RoOjA7aWYodHlwZW9mIG89PVwibnVtYmVyXCIpZm9yKDsrK3I8bzspe3ZhciBpPXRbcl07bih1LGksZShpLHIsdCksdCl9ZWxzZSBoKHQsZnVuY3Rpb24odCxyLG8pe24odSx0LGUodCxyLG8pLG8pfSk7cmV0dXJuIHV9fWZ1bmN0aW9uIGN0KG4sdCxlLHIsdSxvKXt2YXIgaT0xJnQsYT00JnQsZj0xNiZ0LGw9MzImdDtpZighKDImdHx8ZHQobikpKXRocm93IG5ldyBpZTtmJiYhZS5sZW5ndGgmJih0Jj0tMTcsZj1lPWZhbHNlKSxsJiYhci5sZW5ndGgmJih0Jj0tMzMsbD1yPWZhbHNlKTtcbnZhciBjPW4mJm4uX19iaW5kRGF0YV9fO3JldHVybiBjJiZ0cnVlIT09Yz8oYz1wKGMpLGNbMl0mJihjWzJdPXAoY1syXSkpLGNbM10mJihjWzNdPXAoY1szXSkpLCFpfHwxJmNbMV18fChjWzRdPXUpLCFpJiYxJmNbMV0mJih0fD04KSwhYXx8NCZjWzFdfHwoY1s1XT1vKSxmJiZiZS5hcHBseShjWzJdfHwoY1syXT1bXSksZSksbCYmd2UuYXBwbHkoY1szXXx8KGNbM109W10pLHIpLGNbMV18PXQsY3QuYXBwbHkobnVsbCxjKSk6KDE9PXR8fDE3PT09dD9YOmV0KShbbix0LGUscix1LG9dKX1mdW5jdGlvbiBwdChuKXtyZXR1cm4gQmVbbl19ZnVuY3Rpb24gc3QoKXt2YXIgdD0odD1KLmluZGV4T2YpPT09V3Q/bjp0O3JldHVybiB0fWZ1bmN0aW9uIHZ0KG4pe3JldHVybiB0eXBlb2Ygbj09XCJmdW5jdGlvblwiJiZwZS50ZXN0KG4pfWZ1bmN0aW9uIGh0KG4pe3ZhciB0LGU7cmV0dXJuIG4mJmNlLmNhbGwobik9PXEmJih0PW4uY29uc3RydWN0b3IsIWR0KHQpfHx0IGluc3RhbmNlb2YgdCk/KGcobixmdW5jdGlvbihuLHQpe2U9dFxufSksdHlwZW9mIGU9PVwidW5kZWZpbmVkXCJ8fG1lLmNhbGwobixlKSk6ZmFsc2V9ZnVuY3Rpb24gZ3Qobil7cmV0dXJuIFdlW25dfWZ1bmN0aW9uIHl0KG4pe3JldHVybiBuJiZ0eXBlb2Ygbj09XCJvYmplY3RcIiYmdHlwZW9mIG4ubGVuZ3RoPT1cIm51bWJlclwiJiZjZS5jYWxsKG4pPT1EfHxmYWxzZX1mdW5jdGlvbiBtdChuLHQsZSl7dmFyIHI9RmUobiksdT1yLmxlbmd0aDtmb3IodD10dCh0LGUsMyk7dS0tJiYoZT1yW3VdLGZhbHNlIT09dChuW2VdLGUsbikpOyk7cmV0dXJuIG59ZnVuY3Rpb24gYnQobil7dmFyIHQ9W107cmV0dXJuIGcobixmdW5jdGlvbihuLGUpe2R0KG4pJiZ0LnB1c2goZSl9KSx0LnNvcnQoKX1mdW5jdGlvbiBfdChuKXtmb3IodmFyIHQ9LTEsZT1GZShuKSxyPWUubGVuZ3RoLHU9e307Kyt0PHI7KXt2YXIgbz1lW3RdO3VbbltvXV09b31yZXR1cm4gdX1mdW5jdGlvbiBkdChuKXtyZXR1cm4gdHlwZW9mIG49PVwiZnVuY3Rpb25cIn1mdW5jdGlvbiB3dChuKXtyZXR1cm4hKCFufHwhVlt0eXBlb2Ygbl0pXG59ZnVuY3Rpb24ganQobil7cmV0dXJuIHR5cGVvZiBuPT1cIm51bWJlclwifHxuJiZ0eXBlb2Ygbj09XCJvYmplY3RcIiYmY2UuY2FsbChuKT09V3x8ZmFsc2V9ZnVuY3Rpb24ga3Qobil7cmV0dXJuIHR5cGVvZiBuPT1cInN0cmluZ1wifHxuJiZ0eXBlb2Ygbj09XCJvYmplY3RcIiYmY2UuY2FsbChuKT09UHx8ZmFsc2V9ZnVuY3Rpb24geHQobil7Zm9yKHZhciB0PS0xLGU9RmUobikscj1lLmxlbmd0aCx1PVh0KHIpOysrdDxyOyl1W3RdPW5bZVt0XV07cmV0dXJuIHV9ZnVuY3Rpb24gQ3Qobix0LGUpe3ZhciByPS0xLHU9c3QoKSxvPW4/bi5sZW5ndGg6MCxpPWZhbHNlO3JldHVybiBlPSgwPmU/SWUoMCxvK2UpOmUpfHwwLFRlKG4pP2k9LTE8dShuLHQsZSk6dHlwZW9mIG89PVwibnVtYmVyXCI/aT0tMTwoa3Qobik/bi5pbmRleE9mKHQsZSk6dShuLHQsZSkpOmgobixmdW5jdGlvbihuKXtyZXR1cm4rK3I8ZT92b2lkIDA6IShpPW49PT10KX0pLGl9ZnVuY3Rpb24gT3Qobix0LGUpe3ZhciByPXRydWU7dD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSxlPS0xO1xudmFyIHU9bj9uLmxlbmd0aDowO2lmKHR5cGVvZiB1PT1cIm51bWJlclwiKWZvcig7KytlPHUmJihyPSEhdChuW2VdLGUsbikpOyk7ZWxzZSBoKG4sZnVuY3Rpb24obixlLHUpe3JldHVybiByPSEhdChuLGUsdSl9KTtyZXR1cm4gcn1mdW5jdGlvbiBOdChuLHQsZSl7dmFyIHI9W107dD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSxlPS0xO3ZhciB1PW4/bi5sZW5ndGg6MDtpZih0eXBlb2YgdT09XCJudW1iZXJcIilmb3IoOysrZTx1Oyl7dmFyIG89bltlXTt0KG8sZSxuKSYmci5wdXNoKG8pfWVsc2UgaChuLGZ1bmN0aW9uKG4sZSx1KXt0KG4sZSx1KSYmci5wdXNoKG4pfSk7cmV0dXJuIHJ9ZnVuY3Rpb24gSXQobix0LGUpe3Q9Si5jcmVhdGVDYWxsYmFjayh0LGUsMyksZT0tMTt2YXIgcj1uP24ubGVuZ3RoOjA7aWYodHlwZW9mIHIhPVwibnVtYmVyXCIpe3ZhciB1O3JldHVybiBoKG4sZnVuY3Rpb24obixlLHIpe3JldHVybiB0KG4sZSxyKT8odT1uLGZhbHNlKTp2b2lkIDB9KSx1fWZvcig7KytlPHI7KXt2YXIgbz1uW2VdO1xuaWYodChvLGUsbikpcmV0dXJuIG99fWZ1bmN0aW9uIFN0KG4sdCxlKXt2YXIgcj0tMSx1PW4/bi5sZW5ndGg6MDtpZih0PXQmJnR5cGVvZiBlPT1cInVuZGVmaW5lZFwiP3Q6dHQodCxlLDMpLHR5cGVvZiB1PT1cIm51bWJlclwiKWZvcig7KytyPHUmJmZhbHNlIT09dChuW3JdLHIsbik7KTtlbHNlIGgobix0KTtyZXR1cm4gbn1mdW5jdGlvbiBFdChuLHQsZSl7dmFyIHI9bj9uLmxlbmd0aDowO2lmKHQ9dCYmdHlwZW9mIGU9PVwidW5kZWZpbmVkXCI/dDp0dCh0LGUsMyksdHlwZW9mIHI9PVwibnVtYmVyXCIpZm9yKDtyLS0mJmZhbHNlIT09dChuW3JdLHIsbik7KTtlbHNle3ZhciB1PUZlKG4pLHI9dS5sZW5ndGg7aChuLGZ1bmN0aW9uKG4sZSxvKXtyZXR1cm4gZT11P3VbLS1yXTotLXIsdChvW2VdLGUsbyl9KX1yZXR1cm4gbn1mdW5jdGlvbiBSdChuLHQsZSl7dmFyIHI9LTEsdT1uP24ubGVuZ3RoOjA7aWYodD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSx0eXBlb2YgdT09XCJudW1iZXJcIilmb3IodmFyIG89WHQodSk7KytyPHU7KW9bcl09dChuW3JdLHIsbik7XG5lbHNlIG89W10saChuLGZ1bmN0aW9uKG4sZSx1KXtvWysrcl09dChuLGUsdSl9KTtyZXR1cm4gb31mdW5jdGlvbiBBdChuLHQsZSl7dmFyIHU9LTEvMCxvPXU7aWYodHlwZW9mIHQhPVwiZnVuY3Rpb25cIiYmZSYmZVt0XT09PW4mJih0PW51bGwpLG51bGw9PXQmJlRlKG4pKXtlPS0xO2Zvcih2YXIgaT1uLmxlbmd0aDsrK2U8aTspe3ZhciBhPW5bZV07YT5vJiYobz1hKX19ZWxzZSB0PW51bGw9PXQmJmt0KG4pP3I6Si5jcmVhdGVDYWxsYmFjayh0LGUsMyksU3QobixmdW5jdGlvbihuLGUscil7ZT10KG4sZSxyKSxlPnUmJih1PWUsbz1uKX0pO3JldHVybiBvfWZ1bmN0aW9uIER0KG4sdCxlLHIpe2lmKCFuKXJldHVybiBlO3ZhciB1PTM+YXJndW1lbnRzLmxlbmd0aDt0PUouY3JlYXRlQ2FsbGJhY2sodCxyLDQpO3ZhciBvPS0xLGk9bi5sZW5ndGg7aWYodHlwZW9mIGk9PVwibnVtYmVyXCIpZm9yKHUmJihlPW5bKytvXSk7KytvPGk7KWU9dChlLG5bb10sbyxuKTtlbHNlIGgobixmdW5jdGlvbihuLHIsbyl7ZT11Pyh1PWZhbHNlLG4pOnQoZSxuLHIsbylcbn0pO3JldHVybiBlfWZ1bmN0aW9uICR0KG4sdCxlLHIpe3ZhciB1PTM+YXJndW1lbnRzLmxlbmd0aDtyZXR1cm4gdD1KLmNyZWF0ZUNhbGxiYWNrKHQsciw0KSxFdChuLGZ1bmN0aW9uKG4scixvKXtlPXU/KHU9ZmFsc2Usbik6dChlLG4scixvKX0pLGV9ZnVuY3Rpb24gVHQobil7dmFyIHQ9LTEsZT1uP24ubGVuZ3RoOjAscj1YdCh0eXBlb2YgZT09XCJudW1iZXJcIj9lOjApO3JldHVybiBTdChuLGZ1bmN0aW9uKG4pe3ZhciBlPWF0KDAsKyt0KTtyW3RdPXJbZV0scltlXT1ufSkscn1mdW5jdGlvbiBGdChuLHQsZSl7dmFyIHI7dD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSxlPS0xO3ZhciB1PW4/bi5sZW5ndGg6MDtpZih0eXBlb2YgdT09XCJudW1iZXJcIilmb3IoOysrZTx1JiYhKHI9dChuW2VdLGUsbikpOyk7ZWxzZSBoKG4sZnVuY3Rpb24obixlLHUpe3JldHVybiEocj10KG4sZSx1KSl9KTtyZXR1cm4hIXJ9ZnVuY3Rpb24gQnQobix0LGUpe3ZhciByPTAsdT1uP24ubGVuZ3RoOjA7aWYodHlwZW9mIHQhPVwibnVtYmVyXCImJm51bGwhPXQpe3ZhciBvPS0xO1xuZm9yKHQ9Si5jcmVhdGVDYWxsYmFjayh0LGUsMyk7KytvPHUmJnQobltvXSxvLG4pOylyKyt9ZWxzZSBpZihyPXQsbnVsbD09cnx8ZSlyZXR1cm4gbj9uWzBdOnY7cmV0dXJuIHAobiwwLFNlKEllKDAsciksdSkpfWZ1bmN0aW9uIFd0KHQsZSxyKXtpZih0eXBlb2Ygcj09XCJudW1iZXJcIil7dmFyIHU9dD90Lmxlbmd0aDowO3I9MD5yP0llKDAsdStyKTpyfHwwfWVsc2UgaWYocilyZXR1cm4gcj16dCh0LGUpLHRbcl09PT1lP3I6LTE7cmV0dXJuIG4odCxlLHIpfWZ1bmN0aW9uIHF0KG4sdCxlKXtpZih0eXBlb2YgdCE9XCJudW1iZXJcIiYmbnVsbCE9dCl7dmFyIHI9MCx1PS0xLG89bj9uLmxlbmd0aDowO2Zvcih0PUouY3JlYXRlQ2FsbGJhY2sodCxlLDMpOysrdTxvJiZ0KG5bdV0sdSxuKTspcisrfWVsc2Ugcj1udWxsPT10fHxlPzE6SWUoMCx0KTtyZXR1cm4gcChuLHIpfWZ1bmN0aW9uIHp0KG4sdCxlLHIpe3ZhciB1PTAsbz1uP24ubGVuZ3RoOnU7Zm9yKGU9ZT9KLmNyZWF0ZUNhbGxiYWNrKGUsciwxKTpVdCx0PWUodCk7dTxvOylyPXUrbz4+PjEsZShuW3JdKTx0P3U9cisxOm89cjtcbnJldHVybiB1fWZ1bmN0aW9uIFB0KG4sdCxlLHIpe3JldHVybiB0eXBlb2YgdCE9XCJib29sZWFuXCImJm51bGwhPXQmJihyPWUsZT10eXBlb2YgdCE9XCJmdW5jdGlvblwiJiZyJiZyW3RdPT09bj9udWxsOnQsdD1mYWxzZSksbnVsbCE9ZSYmKGU9Si5jcmVhdGVDYWxsYmFjayhlLHIsMykpLGZ0KG4sdCxlKX1mdW5jdGlvbiBLdCgpe2Zvcih2YXIgbj0xPGFyZ3VtZW50cy5sZW5ndGg/YXJndW1lbnRzOmFyZ3VtZW50c1swXSx0PS0xLGU9bj9BdChWZShuLFwibGVuZ3RoXCIpKTowLHI9WHQoMD5lPzA6ZSk7Kyt0PGU7KXJbdF09VmUobix0KTtyZXR1cm4gcn1mdW5jdGlvbiBMdChuLHQpe3ZhciBlPS0xLHI9bj9uLmxlbmd0aDowLHU9e307Zm9yKHR8fCFyfHxUZShuWzBdKXx8KHQ9W10pOysrZTxyOyl7dmFyIG89bltlXTt0P3Vbb109dFtlXTpvJiYodVtvWzBdXT1vWzFdKX1yZXR1cm4gdX1mdW5jdGlvbiBNdChuLHQpe3JldHVybiAyPGFyZ3VtZW50cy5sZW5ndGg/Y3QobiwxNyxwKGFyZ3VtZW50cywyKSxudWxsLHQpOmN0KG4sMSxudWxsLG51bGwsdClcbn1mdW5jdGlvbiBWdChuLHQsZSl7ZnVuY3Rpb24gcigpe2MmJnZlKGMpLGk9Yz1wPXYsKGd8fGghPT10KSYmKHM9VWUoKSxhPW4uYXBwbHkobCxvKSxjfHxpfHwobz1sPW51bGwpKX1mdW5jdGlvbiB1KCl7dmFyIGU9dC0oVWUoKS1mKTswPGU/Yz1fZSh1LGUpOihpJiZ2ZShpKSxlPXAsaT1jPXA9dixlJiYocz1VZSgpLGE9bi5hcHBseShsLG8pLGN8fGl8fChvPWw9bnVsbCkpKX12YXIgbyxpLGEsZixsLGMscCxzPTAsaD1mYWxzZSxnPXRydWU7aWYoIWR0KG4pKXRocm93IG5ldyBpZTtpZih0PUllKDAsdCl8fDAsdHJ1ZT09PWUpdmFyIHk9dHJ1ZSxnPWZhbHNlO2Vsc2Ugd3QoZSkmJih5PWUubGVhZGluZyxoPVwibWF4V2FpdFwiaW4gZSYmKEllKHQsZS5tYXhXYWl0KXx8MCksZz1cInRyYWlsaW5nXCJpbiBlP2UudHJhaWxpbmc6Zyk7cmV0dXJuIGZ1bmN0aW9uKCl7aWYobz1hcmd1bWVudHMsZj1VZSgpLGw9dGhpcyxwPWcmJihjfHwheSksZmFsc2U9PT1oKXZhciBlPXkmJiFjO2Vsc2V7aXx8eXx8KHM9Zik7dmFyIHY9aC0oZi1zKSxtPTA+PXY7XG5tPyhpJiYoaT12ZShpKSkscz1mLGE9bi5hcHBseShsLG8pKTppfHwoaT1fZShyLHYpKX1yZXR1cm4gbSYmYz9jPXZlKGMpOmN8fHQ9PT1ofHwoYz1fZSh1LHQpKSxlJiYobT10cnVlLGE9bi5hcHBseShsLG8pKSwhbXx8Y3x8aXx8KG89bD1udWxsKSxhfX1mdW5jdGlvbiBVdChuKXtyZXR1cm4gbn1mdW5jdGlvbiBHdChuLHQsZSl7dmFyIHI9dHJ1ZSx1PXQmJmJ0KHQpO3QmJihlfHx1Lmxlbmd0aCl8fChudWxsPT1lJiYoZT10KSxvPVEsdD1uLG49Six1PWJ0KHQpKSxmYWxzZT09PWU/cj1mYWxzZTp3dChlKSYmXCJjaGFpblwiaW4gZSYmKHI9ZS5jaGFpbik7dmFyIG89bixpPWR0KG8pO1N0KHUsZnVuY3Rpb24oZSl7dmFyIHU9bltlXT10W2VdO2kmJihvLnByb3RvdHlwZVtlXT1mdW5jdGlvbigpe3ZhciB0PXRoaXMuX19jaGFpbl9fLGU9dGhpcy5fX3dyYXBwZWRfXyxpPVtlXTtpZihiZS5hcHBseShpLGFyZ3VtZW50cyksaT11LmFwcGx5KG4saSkscnx8dCl7aWYoZT09PWkmJnd0KGkpKXJldHVybiB0aGlzO1xuaT1uZXcgbyhpKSxpLl9fY2hhaW5fXz10fXJldHVybiBpfSl9KX1mdW5jdGlvbiBIdCgpe31mdW5jdGlvbiBKdChuKXtyZXR1cm4gZnVuY3Rpb24odCl7cmV0dXJuIHRbbl19fWZ1bmN0aW9uIFF0KCl7cmV0dXJuIHRoaXMuX193cmFwcGVkX199ZT1lP1kuZGVmYXVsdHMoRy5PYmplY3QoKSxlLFkucGljayhHLEEpKTpHO3ZhciBYdD1lLkFycmF5LFl0PWUuQm9vbGVhbixadD1lLkRhdGUsbmU9ZS5GdW5jdGlvbix0ZT1lLk1hdGgsZWU9ZS5OdW1iZXIscmU9ZS5PYmplY3QsdWU9ZS5SZWdFeHAsb2U9ZS5TdHJpbmcsaWU9ZS5UeXBlRXJyb3IsYWU9W10sZmU9cmUucHJvdG90eXBlLGxlPWUuXyxjZT1mZS50b1N0cmluZyxwZT11ZShcIl5cIitvZShjZSkucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csXCJcXFxcJCZcIikucmVwbGFjZSgvdG9TdHJpbmd8IGZvciBbXlxcXV0rL2csXCIuKj9cIikrXCIkXCIpLHNlPXRlLmNlaWwsdmU9ZS5jbGVhclRpbWVvdXQsaGU9dGUuZmxvb3IsZ2U9bmUucHJvdG90eXBlLnRvU3RyaW5nLHllPXZ0KHllPXJlLmdldFByb3RvdHlwZU9mKSYmeWUsbWU9ZmUuaGFzT3duUHJvcGVydHksYmU9YWUucHVzaCxfZT1lLnNldFRpbWVvdXQsZGU9YWUuc3BsaWNlLHdlPWFlLnVuc2hpZnQsamU9ZnVuY3Rpb24oKXt0cnl7dmFyIG49e30sdD12dCh0PXJlLmRlZmluZVByb3BlcnR5KSYmdCxlPXQobixuLG4pJiZ0XG59Y2F0Y2gocil7fXJldHVybiBlfSgpLGtlPXZ0KGtlPXJlLmNyZWF0ZSkmJmtlLHhlPXZ0KHhlPVh0LmlzQXJyYXkpJiZ4ZSxDZT1lLmlzRmluaXRlLE9lPWUuaXNOYU4sTmU9dnQoTmU9cmUua2V5cykmJk5lLEllPXRlLm1heCxTZT10ZS5taW4sRWU9ZS5wYXJzZUludCxSZT10ZS5yYW5kb20sQWU9e307QWVbJF09WHQsQWVbVF09WXQsQWVbRl09WnQsQWVbQl09bmUsQWVbcV09cmUsQWVbV109ZWUsQWVbel09dWUsQWVbUF09b2UsUS5wcm90b3R5cGU9Si5wcm90b3R5cGU7dmFyIERlPUouc3VwcG9ydD17fTtEZS5mdW5jRGVjb21wPSF2dChlLmEpJiZFLnRlc3QocyksRGUuZnVuY05hbWVzPXR5cGVvZiBuZS5uYW1lPT1cInN0cmluZ1wiLEoudGVtcGxhdGVTZXR0aW5ncz17ZXNjYXBlOi88JS0oW1xcc1xcU10rPyklPi9nLGV2YWx1YXRlOi88JShbXFxzXFxTXSs/KSU+L2csaW50ZXJwb2xhdGU6Tix2YXJpYWJsZTpcIlwiLGltcG9ydHM6e186Sn19LGtlfHwobnQ9ZnVuY3Rpb24oKXtmdW5jdGlvbiBuKCl7fXJldHVybiBmdW5jdGlvbih0KXtpZih3dCh0KSl7bi5wcm90b3R5cGU9dDtcbnZhciByPW5ldyBuO24ucHJvdG90eXBlPW51bGx9cmV0dXJuIHJ8fGUuT2JqZWN0KCl9fSgpKTt2YXIgJGU9amU/ZnVuY3Rpb24obix0KXtNLnZhbHVlPXQsamUobixcIl9fYmluZERhdGFfX1wiLE0pfTpIdCxUZT14ZXx8ZnVuY3Rpb24obil7cmV0dXJuIG4mJnR5cGVvZiBuPT1cIm9iamVjdFwiJiZ0eXBlb2Ygbi5sZW5ndGg9PVwibnVtYmVyXCImJmNlLmNhbGwobik9PSR8fGZhbHNlfSxGZT1OZT9mdW5jdGlvbihuKXtyZXR1cm4gd3Qobik/TmUobik6W119OkgsQmU9e1wiJlwiOlwiJmFtcDtcIixcIjxcIjpcIiZsdDtcIixcIj5cIjpcIiZndDtcIiwnXCInOlwiJnF1b3Q7XCIsXCInXCI6XCImIzM5O1wifSxXZT1fdChCZSkscWU9dWUoXCIoXCIrRmUoV2UpLmpvaW4oXCJ8XCIpK1wiKVwiLFwiZ1wiKSx6ZT11ZShcIltcIitGZShCZSkuam9pbihcIlwiKStcIl1cIixcImdcIiksUGU9eWU/ZnVuY3Rpb24obil7aWYoIW58fGNlLmNhbGwobikhPXEpcmV0dXJuIGZhbHNlO3ZhciB0PW4udmFsdWVPZixlPXZ0KHQpJiYoZT15ZSh0KSkmJnllKGUpO3JldHVybiBlP249PWV8fHllKG4pPT1lOmh0KG4pXG59Omh0LEtlPWx0KGZ1bmN0aW9uKG4sdCxlKXttZS5jYWxsKG4sZSk/bltlXSsrOm5bZV09MX0pLExlPWx0KGZ1bmN0aW9uKG4sdCxlKXsobWUuY2FsbChuLGUpP25bZV06bltlXT1bXSkucHVzaCh0KX0pLE1lPWx0KGZ1bmN0aW9uKG4sdCxlKXtuW2VdPXR9KSxWZT1SdCxVZT12dChVZT1adC5ub3cpJiZVZXx8ZnVuY3Rpb24oKXtyZXR1cm4obmV3IFp0KS5nZXRUaW1lKCl9LEdlPTg9PUVlKGQrXCIwOFwiKT9FZTpmdW5jdGlvbihuLHQpe3JldHVybiBFZShrdChuKT9uLnJlcGxhY2UoSSxcIlwiKTpuLHR8fDApfTtyZXR1cm4gSi5hZnRlcj1mdW5jdGlvbihuLHQpe2lmKCFkdCh0KSl0aHJvdyBuZXcgaWU7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIDE+LS1uP3QuYXBwbHkodGhpcyxhcmd1bWVudHMpOnZvaWQgMH19LEouYXNzaWduPVUsSi5hdD1mdW5jdGlvbihuKXtmb3IodmFyIHQ9YXJndW1lbnRzLGU9LTEscj11dCh0LHRydWUsZmFsc2UsMSksdD10WzJdJiZ0WzJdW3RbMV1dPT09bj8xOnIubGVuZ3RoLHU9WHQodCk7KytlPHQ7KXVbZV09bltyW2VdXTtcbnJldHVybiB1fSxKLmJpbmQ9TXQsSi5iaW5kQWxsPWZ1bmN0aW9uKG4pe2Zvcih2YXIgdD0xPGFyZ3VtZW50cy5sZW5ndGg/dXQoYXJndW1lbnRzLHRydWUsZmFsc2UsMSk6YnQobiksZT0tMSxyPXQubGVuZ3RoOysrZTxyOyl7dmFyIHU9dFtlXTtuW3VdPWN0KG5bdV0sMSxudWxsLG51bGwsbil9cmV0dXJuIG59LEouYmluZEtleT1mdW5jdGlvbihuLHQpe3JldHVybiAyPGFyZ3VtZW50cy5sZW5ndGg/Y3QodCwxOSxwKGFyZ3VtZW50cywyKSxudWxsLG4pOmN0KHQsMyxudWxsLG51bGwsbil9LEouY2hhaW49ZnVuY3Rpb24obil7cmV0dXJuIG49bmV3IFEobiksbi5fX2NoYWluX189dHJ1ZSxufSxKLmNvbXBhY3Q9ZnVuY3Rpb24obil7Zm9yKHZhciB0PS0xLGU9bj9uLmxlbmd0aDowLHI9W107Kyt0PGU7KXt2YXIgdT1uW3RdO3UmJnIucHVzaCh1KX1yZXR1cm4gcn0sSi5jb21wb3NlPWZ1bmN0aW9uKCl7Zm9yKHZhciBuPWFyZ3VtZW50cyx0PW4ubGVuZ3RoO3QtLTspaWYoIWR0KG5bdF0pKXRocm93IG5ldyBpZTtcbnJldHVybiBmdW5jdGlvbigpe2Zvcih2YXIgdD1hcmd1bWVudHMsZT1uLmxlbmd0aDtlLS07KXQ9W25bZV0uYXBwbHkodGhpcyx0KV07cmV0dXJuIHRbMF19fSxKLmNvbnN0YW50PWZ1bmN0aW9uKG4pe3JldHVybiBmdW5jdGlvbigpe3JldHVybiBufX0sSi5jb3VudEJ5PUtlLEouY3JlYXRlPWZ1bmN0aW9uKG4sdCl7dmFyIGU9bnQobik7cmV0dXJuIHQ/VShlLHQpOmV9LEouY3JlYXRlQ2FsbGJhY2s9ZnVuY3Rpb24obix0LGUpe3ZhciByPXR5cGVvZiBuO2lmKG51bGw9PW58fFwiZnVuY3Rpb25cIj09cilyZXR1cm4gdHQobix0LGUpO2lmKFwib2JqZWN0XCIhPXIpcmV0dXJuIEp0KG4pO3ZhciB1PUZlKG4pLG89dVswXSxpPW5bb107cmV0dXJuIDEhPXUubGVuZ3RofHxpIT09aXx8d3QoaSk/ZnVuY3Rpb24odCl7Zm9yKHZhciBlPXUubGVuZ3RoLHI9ZmFsc2U7ZS0tJiYocj1vdCh0W3VbZV1dLG5bdVtlXV0sbnVsbCx0cnVlKSk7KTtyZXR1cm4gcn06ZnVuY3Rpb24obil7cmV0dXJuIG49bltvXSxpPT09biYmKDAhPT1pfHwxL2k9PTEvbilcbn19LEouY3Vycnk9ZnVuY3Rpb24obix0KXtyZXR1cm4gdD10eXBlb2YgdD09XCJudW1iZXJcIj90Oit0fHxuLmxlbmd0aCxjdChuLDQsbnVsbCxudWxsLG51bGwsdCl9LEouZGVib3VuY2U9VnQsSi5kZWZhdWx0cz1fLEouZGVmZXI9ZnVuY3Rpb24obil7aWYoIWR0KG4pKXRocm93IG5ldyBpZTt2YXIgdD1wKGFyZ3VtZW50cywxKTtyZXR1cm4gX2UoZnVuY3Rpb24oKXtuLmFwcGx5KHYsdCl9LDEpfSxKLmRlbGF5PWZ1bmN0aW9uKG4sdCl7aWYoIWR0KG4pKXRocm93IG5ldyBpZTt2YXIgZT1wKGFyZ3VtZW50cywyKTtyZXR1cm4gX2UoZnVuY3Rpb24oKXtuLmFwcGx5KHYsZSl9LHQpfSxKLmRpZmZlcmVuY2U9ZnVuY3Rpb24obil7cmV0dXJuIHJ0KG4sdXQoYXJndW1lbnRzLHRydWUsdHJ1ZSwxKSl9LEouZmlsdGVyPU50LEouZmxhdHRlbj1mdW5jdGlvbihuLHQsZSxyKXtyZXR1cm4gdHlwZW9mIHQhPVwiYm9vbGVhblwiJiZudWxsIT10JiYocj1lLGU9dHlwZW9mIHQhPVwiZnVuY3Rpb25cIiYmciYmclt0XT09PW4/bnVsbDp0LHQ9ZmFsc2UpLG51bGwhPWUmJihuPVJ0KG4sZSxyKSksdXQobix0KVxufSxKLmZvckVhY2g9U3QsSi5mb3JFYWNoUmlnaHQ9RXQsSi5mb3JJbj1nLEouZm9ySW5SaWdodD1mdW5jdGlvbihuLHQsZSl7dmFyIHI9W107ZyhuLGZ1bmN0aW9uKG4sdCl7ci5wdXNoKHQsbil9KTt2YXIgdT1yLmxlbmd0aDtmb3IodD10dCh0LGUsMyk7dS0tJiZmYWxzZSE9PXQoclt1LS1dLHJbdV0sbik7KTtyZXR1cm4gbn0sSi5mb3JPd249aCxKLmZvck93blJpZ2h0PW10LEouZnVuY3Rpb25zPWJ0LEouZ3JvdXBCeT1MZSxKLmluZGV4Qnk9TWUsSi5pbml0aWFsPWZ1bmN0aW9uKG4sdCxlKXt2YXIgcj0wLHU9bj9uLmxlbmd0aDowO2lmKHR5cGVvZiB0IT1cIm51bWJlclwiJiZudWxsIT10KXt2YXIgbz11O2Zvcih0PUouY3JlYXRlQ2FsbGJhY2sodCxlLDMpO28tLSYmdChuW29dLG8sbik7KXIrK31lbHNlIHI9bnVsbD09dHx8ZT8xOnR8fHI7cmV0dXJuIHAobiwwLFNlKEllKDAsdS1yKSx1KSl9LEouaW50ZXJzZWN0aW9uPWZ1bmN0aW9uKCl7Zm9yKHZhciBlPVtdLHI9LTEsdT1hcmd1bWVudHMubGVuZ3RoLGk9YSgpLGY9c3QoKSxwPWY9PT1uLHM9YSgpOysrcjx1Oyl7dmFyIHY9YXJndW1lbnRzW3JdO1xuKFRlKHYpfHx5dCh2KSkmJihlLnB1c2godiksaS5wdXNoKHAmJnYubGVuZ3RoPj1iJiZvKHI/ZVtyXTpzKSkpfXZhciBwPWVbMF0saD0tMSxnPXA/cC5sZW5ndGg6MCx5PVtdO246Zm9yKDsrK2g8Zzspe3ZhciBtPWlbMF0sdj1wW2hdO2lmKDA+KG0/dChtLHYpOmYocyx2KSkpe2ZvcihyPXUsKG18fHMpLnB1c2godik7LS1yOylpZihtPWlbcl0sMD4obT90KG0sdik6ZihlW3JdLHYpKSljb250aW51ZSBuO3kucHVzaCh2KX19Zm9yKDt1LS07KShtPWlbdV0pJiZjKG0pO3JldHVybiBsKGkpLGwocykseX0sSi5pbnZlcnQ9X3QsSi5pbnZva2U9ZnVuY3Rpb24obix0KXt2YXIgZT1wKGFyZ3VtZW50cywyKSxyPS0xLHU9dHlwZW9mIHQ9PVwiZnVuY3Rpb25cIixvPW4/bi5sZW5ndGg6MCxpPVh0KHR5cGVvZiBvPT1cIm51bWJlclwiP286MCk7cmV0dXJuIFN0KG4sZnVuY3Rpb24obil7aVsrK3JdPSh1P3Q6blt0XSkuYXBwbHkobixlKX0pLGl9LEoua2V5cz1GZSxKLm1hcD1SdCxKLm1hcFZhbHVlcz1mdW5jdGlvbihuLHQsZSl7dmFyIHI9e307XG5yZXR1cm4gdD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSxoKG4sZnVuY3Rpb24obixlLHUpe3JbZV09dChuLGUsdSl9KSxyfSxKLm1heD1BdCxKLm1lbW9pemU9ZnVuY3Rpb24obix0KXtmdW5jdGlvbiBlKCl7dmFyIHI9ZS5jYWNoZSx1PXQ/dC5hcHBseSh0aGlzLGFyZ3VtZW50cyk6bSthcmd1bWVudHNbMF07cmV0dXJuIG1lLmNhbGwocix1KT9yW3VdOnJbdV09bi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9aWYoIWR0KG4pKXRocm93IG5ldyBpZTtyZXR1cm4gZS5jYWNoZT17fSxlfSxKLm1lcmdlPWZ1bmN0aW9uKG4pe3ZhciB0PWFyZ3VtZW50cyxlPTI7aWYoIXd0KG4pKXJldHVybiBuO2lmKFwibnVtYmVyXCIhPXR5cGVvZiB0WzJdJiYoZT10Lmxlbmd0aCksMzxlJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0W2UtMl0pdmFyIHI9dHQodFstLWUtMV0sdFtlLS1dLDIpO2Vsc2UgMjxlJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0W2UtMV0mJihyPXRbLS1lXSk7Zm9yKHZhciB0PXAoYXJndW1lbnRzLDEsZSksdT0tMSxvPWEoKSxpPWEoKTsrK3U8ZTspaXQobix0W3VdLHIsbyxpKTtcbnJldHVybiBsKG8pLGwoaSksbn0sSi5taW49ZnVuY3Rpb24obix0LGUpe3ZhciB1PTEvMCxvPXU7aWYodHlwZW9mIHQhPVwiZnVuY3Rpb25cIiYmZSYmZVt0XT09PW4mJih0PW51bGwpLG51bGw9PXQmJlRlKG4pKXtlPS0xO2Zvcih2YXIgaT1uLmxlbmd0aDsrK2U8aTspe3ZhciBhPW5bZV07YTxvJiYobz1hKX19ZWxzZSB0PW51bGw9PXQmJmt0KG4pP3I6Si5jcmVhdGVDYWxsYmFjayh0LGUsMyksU3QobixmdW5jdGlvbihuLGUscil7ZT10KG4sZSxyKSxlPHUmJih1PWUsbz1uKX0pO3JldHVybiBvfSxKLm9taXQ9ZnVuY3Rpb24obix0LGUpe3ZhciByPXt9O2lmKHR5cGVvZiB0IT1cImZ1bmN0aW9uXCIpe3ZhciB1PVtdO2cobixmdW5jdGlvbihuLHQpe3UucHVzaCh0KX0pO2Zvcih2YXIgdT1ydCh1LHV0KGFyZ3VtZW50cyx0cnVlLGZhbHNlLDEpKSxvPS0xLGk9dS5sZW5ndGg7KytvPGk7KXt2YXIgYT11W29dO3JbYV09blthXX19ZWxzZSB0PUouY3JlYXRlQ2FsbGJhY2sodCxlLDMpLGcobixmdW5jdGlvbihuLGUsdSl7dChuLGUsdSl8fChyW2VdPW4pXG59KTtyZXR1cm4gcn0sSi5vbmNlPWZ1bmN0aW9uKG4pe3ZhciB0LGU7aWYoIWR0KG4pKXRocm93IG5ldyBpZTtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gdD9lOih0PXRydWUsZT1uLmFwcGx5KHRoaXMsYXJndW1lbnRzKSxuPW51bGwsZSl9fSxKLnBhaXJzPWZ1bmN0aW9uKG4pe2Zvcih2YXIgdD0tMSxlPUZlKG4pLHI9ZS5sZW5ndGgsdT1YdChyKTsrK3Q8cjspe3ZhciBvPWVbdF07dVt0XT1bbyxuW29dXX1yZXR1cm4gdX0sSi5wYXJ0aWFsPWZ1bmN0aW9uKG4pe3JldHVybiBjdChuLDE2LHAoYXJndW1lbnRzLDEpKX0sSi5wYXJ0aWFsUmlnaHQ9ZnVuY3Rpb24obil7cmV0dXJuIGN0KG4sMzIsbnVsbCxwKGFyZ3VtZW50cywxKSl9LEoucGljaz1mdW5jdGlvbihuLHQsZSl7dmFyIHI9e307aWYodHlwZW9mIHQhPVwiZnVuY3Rpb25cIilmb3IodmFyIHU9LTEsbz11dChhcmd1bWVudHMsdHJ1ZSxmYWxzZSwxKSxpPXd0KG4pP28ubGVuZ3RoOjA7Kyt1PGk7KXt2YXIgYT1vW3VdO2EgaW4gbiYmKHJbYV09blthXSlcbn1lbHNlIHQ9Si5jcmVhdGVDYWxsYmFjayh0LGUsMyksZyhuLGZ1bmN0aW9uKG4sZSx1KXt0KG4sZSx1KSYmKHJbZV09bil9KTtyZXR1cm4gcn0sSi5wbHVjaz1WZSxKLnByb3BlcnR5PUp0LEoucHVsbD1mdW5jdGlvbihuKXtmb3IodmFyIHQ9YXJndW1lbnRzLGU9MCxyPXQubGVuZ3RoLHU9bj9uLmxlbmd0aDowOysrZTxyOylmb3IodmFyIG89LTEsaT10W2VdOysrbzx1OyluW29dPT09aSYmKGRlLmNhbGwobixvLS0sMSksdS0tKTtyZXR1cm4gbn0sSi5yYW5nZT1mdW5jdGlvbihuLHQsZSl7bj0rbnx8MCxlPXR5cGVvZiBlPT1cIm51bWJlclwiP2U6K2V8fDEsbnVsbD09dCYmKHQ9bixuPTApO3ZhciByPS0xO3Q9SWUoMCxzZSgodC1uKS8oZXx8MSkpKTtmb3IodmFyIHU9WHQodCk7KytyPHQ7KXVbcl09bixuKz1lO3JldHVybiB1fSxKLnJlamVjdD1mdW5jdGlvbihuLHQsZSl7cmV0dXJuIHQ9Si5jcmVhdGVDYWxsYmFjayh0LGUsMyksTnQobixmdW5jdGlvbihuLGUscil7cmV0dXJuIXQobixlLHIpXG59KX0sSi5yZW1vdmU9ZnVuY3Rpb24obix0LGUpe3ZhciByPS0xLHU9bj9uLmxlbmd0aDowLG89W107Zm9yKHQ9Si5jcmVhdGVDYWxsYmFjayh0LGUsMyk7KytyPHU7KWU9bltyXSx0KGUscixuKSYmKG8ucHVzaChlKSxkZS5jYWxsKG4sci0tLDEpLHUtLSk7cmV0dXJuIG99LEoucmVzdD1xdCxKLnNodWZmbGU9VHQsSi5zb3J0Qnk9ZnVuY3Rpb24obix0LGUpe3ZhciByPS0xLG89VGUodCksaT1uP24ubGVuZ3RoOjAscD1YdCh0eXBlb2YgaT09XCJudW1iZXJcIj9pOjApO2ZvcihvfHwodD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSksU3QobixmdW5jdGlvbihuLGUsdSl7dmFyIGk9cFsrK3JdPWYoKTtvP2kubT1SdCh0LGZ1bmN0aW9uKHQpe3JldHVybiBuW3RdfSk6KGkubT1hKCkpWzBdPXQobixlLHUpLGkubj1yLGkubz1ufSksaT1wLmxlbmd0aCxwLnNvcnQodSk7aS0tOyluPXBbaV0scFtpXT1uLm8sb3x8bChuLm0pLGMobik7cmV0dXJuIHB9LEoudGFwPWZ1bmN0aW9uKG4sdCl7cmV0dXJuIHQobiksblxufSxKLnRocm90dGxlPWZ1bmN0aW9uKG4sdCxlKXt2YXIgcj10cnVlLHU9dHJ1ZTtpZighZHQobikpdGhyb3cgbmV3IGllO3JldHVybiBmYWxzZT09PWU/cj1mYWxzZTp3dChlKSYmKHI9XCJsZWFkaW5nXCJpbiBlP2UubGVhZGluZzpyLHU9XCJ0cmFpbGluZ1wiaW4gZT9lLnRyYWlsaW5nOnUpLEwubGVhZGluZz1yLEwubWF4V2FpdD10LEwudHJhaWxpbmc9dSxWdChuLHQsTCl9LEoudGltZXM9ZnVuY3Rpb24obix0LGUpe249LTE8KG49K24pP246MDt2YXIgcj0tMSx1PVh0KG4pO2Zvcih0PXR0KHQsZSwxKTsrK3I8bjspdVtyXT10KHIpO3JldHVybiB1fSxKLnRvQXJyYXk9ZnVuY3Rpb24obil7cmV0dXJuIG4mJnR5cGVvZiBuLmxlbmd0aD09XCJudW1iZXJcIj9wKG4pOnh0KG4pfSxKLnRyYW5zZm9ybT1mdW5jdGlvbihuLHQsZSxyKXt2YXIgdT1UZShuKTtpZihudWxsPT1lKWlmKHUpZT1bXTtlbHNle3ZhciBvPW4mJm4uY29uc3RydWN0b3I7ZT1udChvJiZvLnByb3RvdHlwZSl9cmV0dXJuIHQmJih0PUouY3JlYXRlQ2FsbGJhY2sodCxyLDQpLCh1P1N0OmgpKG4sZnVuY3Rpb24obixyLHUpe3JldHVybiB0KGUsbixyLHUpXG59KSksZX0sSi51bmlvbj1mdW5jdGlvbigpe3JldHVybiBmdCh1dChhcmd1bWVudHMsdHJ1ZSx0cnVlKSl9LEoudW5pcT1QdCxKLnZhbHVlcz14dCxKLndoZXJlPU50LEoud2l0aG91dD1mdW5jdGlvbihuKXtyZXR1cm4gcnQobixwKGFyZ3VtZW50cywxKSl9LEoud3JhcD1mdW5jdGlvbihuLHQpe3JldHVybiBjdCh0LDE2LFtuXSl9LEoueG9yPWZ1bmN0aW9uKCl7Zm9yKHZhciBuPS0xLHQ9YXJndW1lbnRzLmxlbmd0aDsrK248dDspe3ZhciBlPWFyZ3VtZW50c1tuXTtpZihUZShlKXx8eXQoZSkpdmFyIHI9cj9mdChydChyLGUpLmNvbmNhdChydChlLHIpKSk6ZX1yZXR1cm4gcnx8W119LEouemlwPUt0LEouemlwT2JqZWN0PUx0LEouY29sbGVjdD1SdCxKLmRyb3A9cXQsSi5lYWNoPVN0LEouZWFjaFJpZ2h0PUV0LEouZXh0ZW5kPVUsSi5tZXRob2RzPWJ0LEoub2JqZWN0PUx0LEouc2VsZWN0PU50LEoudGFpbD1xdCxKLnVuaXF1ZT1QdCxKLnVuemlwPUt0LEd0KEopLEouY2xvbmU9ZnVuY3Rpb24obix0LGUscil7cmV0dXJuIHR5cGVvZiB0IT1cImJvb2xlYW5cIiYmbnVsbCE9dCYmKHI9ZSxlPXQsdD1mYWxzZSksWihuLHQsdHlwZW9mIGU9PVwiZnVuY3Rpb25cIiYmdHQoZSxyLDEpKVxufSxKLmNsb25lRGVlcD1mdW5jdGlvbihuLHQsZSl7cmV0dXJuIFoobix0cnVlLHR5cGVvZiB0PT1cImZ1bmN0aW9uXCImJnR0KHQsZSwxKSl9LEouY29udGFpbnM9Q3QsSi5lc2NhcGU9ZnVuY3Rpb24obil7cmV0dXJuIG51bGw9PW4/XCJcIjpvZShuKS5yZXBsYWNlKHplLHB0KX0sSi5ldmVyeT1PdCxKLmZpbmQ9SXQsSi5maW5kSW5kZXg9ZnVuY3Rpb24obix0LGUpe3ZhciByPS0xLHU9bj9uLmxlbmd0aDowO2Zvcih0PUouY3JlYXRlQ2FsbGJhY2sodCxlLDMpOysrcjx1OylpZih0KG5bcl0scixuKSlyZXR1cm4gcjtyZXR1cm4tMX0sSi5maW5kS2V5PWZ1bmN0aW9uKG4sdCxlKXt2YXIgcjtyZXR1cm4gdD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSxoKG4sZnVuY3Rpb24obixlLHUpe3JldHVybiB0KG4sZSx1KT8ocj1lLGZhbHNlKTp2b2lkIDB9KSxyfSxKLmZpbmRMYXN0PWZ1bmN0aW9uKG4sdCxlKXt2YXIgcjtyZXR1cm4gdD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSxFdChuLGZ1bmN0aW9uKG4sZSx1KXtyZXR1cm4gdChuLGUsdSk/KHI9bixmYWxzZSk6dm9pZCAwXG59KSxyfSxKLmZpbmRMYXN0SW5kZXg9ZnVuY3Rpb24obix0LGUpe3ZhciByPW4/bi5sZW5ndGg6MDtmb3IodD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKTtyLS07KWlmKHQobltyXSxyLG4pKXJldHVybiByO3JldHVybi0xfSxKLmZpbmRMYXN0S2V5PWZ1bmN0aW9uKG4sdCxlKXt2YXIgcjtyZXR1cm4gdD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKSxtdChuLGZ1bmN0aW9uKG4sZSx1KXtyZXR1cm4gdChuLGUsdSk/KHI9ZSxmYWxzZSk6dm9pZCAwfSkscn0sSi5oYXM9ZnVuY3Rpb24obix0KXtyZXR1cm4gbj9tZS5jYWxsKG4sdCk6ZmFsc2V9LEouaWRlbnRpdHk9VXQsSi5pbmRleE9mPVd0LEouaXNBcmd1bWVudHM9eXQsSi5pc0FycmF5PVRlLEouaXNCb29sZWFuPWZ1bmN0aW9uKG4pe3JldHVybiB0cnVlPT09bnx8ZmFsc2U9PT1ufHxuJiZ0eXBlb2Ygbj09XCJvYmplY3RcIiYmY2UuY2FsbChuKT09VHx8ZmFsc2V9LEouaXNEYXRlPWZ1bmN0aW9uKG4pe3JldHVybiBuJiZ0eXBlb2Ygbj09XCJvYmplY3RcIiYmY2UuY2FsbChuKT09Rnx8ZmFsc2Vcbn0sSi5pc0VsZW1lbnQ9ZnVuY3Rpb24obil7cmV0dXJuIG4mJjE9PT1uLm5vZGVUeXBlfHxmYWxzZX0sSi5pc0VtcHR5PWZ1bmN0aW9uKG4pe3ZhciB0PXRydWU7aWYoIW4pcmV0dXJuIHQ7dmFyIGU9Y2UuY2FsbChuKSxyPW4ubGVuZ3RoO3JldHVybiBlPT0kfHxlPT1QfHxlPT1EfHxlPT1xJiZ0eXBlb2Ygcj09XCJudW1iZXJcIiYmZHQobi5zcGxpY2UpPyFyOihoKG4sZnVuY3Rpb24oKXtyZXR1cm4gdD1mYWxzZX0pLHQpfSxKLmlzRXF1YWw9ZnVuY3Rpb24obix0LGUscil7cmV0dXJuIG90KG4sdCx0eXBlb2YgZT09XCJmdW5jdGlvblwiJiZ0dChlLHIsMikpfSxKLmlzRmluaXRlPWZ1bmN0aW9uKG4pe3JldHVybiBDZShuKSYmIU9lKHBhcnNlRmxvYXQobikpfSxKLmlzRnVuY3Rpb249ZHQsSi5pc05hTj1mdW5jdGlvbihuKXtyZXR1cm4ganQobikmJm4hPStufSxKLmlzTnVsbD1mdW5jdGlvbihuKXtyZXR1cm4gbnVsbD09PW59LEouaXNOdW1iZXI9anQsSi5pc09iamVjdD13dCxKLmlzUGxhaW5PYmplY3Q9UGUsSi5pc1JlZ0V4cD1mdW5jdGlvbihuKXtyZXR1cm4gbiYmdHlwZW9mIG49PVwib2JqZWN0XCImJmNlLmNhbGwobik9PXp8fGZhbHNlXG59LEouaXNTdHJpbmc9a3QsSi5pc1VuZGVmaW5lZD1mdW5jdGlvbihuKXtyZXR1cm4gdHlwZW9mIG49PVwidW5kZWZpbmVkXCJ9LEoubGFzdEluZGV4T2Y9ZnVuY3Rpb24obix0LGUpe3ZhciByPW4/bi5sZW5ndGg6MDtmb3IodHlwZW9mIGU9PVwibnVtYmVyXCImJihyPSgwPmU/SWUoMCxyK2UpOlNlKGUsci0xKSkrMSk7ci0tOylpZihuW3JdPT09dClyZXR1cm4gcjtyZXR1cm4tMX0sSi5taXhpbj1HdCxKLm5vQ29uZmxpY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gZS5fPWxlLHRoaXN9LEoubm9vcD1IdCxKLm5vdz1VZSxKLnBhcnNlSW50PUdlLEoucmFuZG9tPWZ1bmN0aW9uKG4sdCxlKXt2YXIgcj1udWxsPT1uLHU9bnVsbD09dDtyZXR1cm4gbnVsbD09ZSYmKHR5cGVvZiBuPT1cImJvb2xlYW5cIiYmdT8oZT1uLG49MSk6dXx8dHlwZW9mIHQhPVwiYm9vbGVhblwifHwoZT10LHU9dHJ1ZSkpLHImJnUmJih0PTEpLG49K258fDAsdT8odD1uLG49MCk6dD0rdHx8MCxlfHxuJTF8fHQlMT8oZT1SZSgpLFNlKG4rZSoodC1uK3BhcnNlRmxvYXQoXCIxZS1cIisoKGUrXCJcIikubGVuZ3RoLTEpKSksdCkpOmF0KG4sdClcbn0sSi5yZWR1Y2U9RHQsSi5yZWR1Y2VSaWdodD0kdCxKLnJlc3VsdD1mdW5jdGlvbihuLHQpe2lmKG4pe3ZhciBlPW5bdF07cmV0dXJuIGR0KGUpP25bdF0oKTplfX0sSi5ydW5JbkNvbnRleHQ9cyxKLnNpemU9ZnVuY3Rpb24obil7dmFyIHQ9bj9uLmxlbmd0aDowO3JldHVybiB0eXBlb2YgdD09XCJudW1iZXJcIj90OkZlKG4pLmxlbmd0aH0sSi5zb21lPUZ0LEouc29ydGVkSW5kZXg9enQsSi50ZW1wbGF0ZT1mdW5jdGlvbihuLHQsZSl7dmFyIHI9Si50ZW1wbGF0ZVNldHRpbmdzO249b2Uobnx8XCJcIiksZT1fKHt9LGUscik7dmFyIHUsbz1fKHt9LGUuaW1wb3J0cyxyLmltcG9ydHMpLHI9RmUobyksbz14dChvKSxhPTAsZj1lLmludGVycG9sYXRlfHxTLGw9XCJfX3ArPSdcIixmPXVlKChlLmVzY2FwZXx8Uykuc291cmNlK1wifFwiK2Yuc291cmNlK1wifFwiKyhmPT09Tj94OlMpLnNvdXJjZStcInxcIisoZS5ldmFsdWF0ZXx8Uykuc291cmNlK1wifCRcIixcImdcIik7bi5yZXBsYWNlKGYsZnVuY3Rpb24odCxlLHIsbyxmLGMpe3JldHVybiByfHwocj1vKSxsKz1uLnNsaWNlKGEsYykucmVwbGFjZShSLGkpLGUmJihsKz1cIicrX19lKFwiK2UrXCIpKydcIiksZiYmKHU9dHJ1ZSxsKz1cIic7XCIrZitcIjtcXG5fX3ArPSdcIiksciYmKGwrPVwiJysoKF9fdD0oXCIrcitcIikpPT1udWxsPycnOl9fdCkrJ1wiKSxhPWMrdC5sZW5ndGgsdFxufSksbCs9XCInO1wiLGY9ZT1lLnZhcmlhYmxlLGZ8fChlPVwib2JqXCIsbD1cIndpdGgoXCIrZStcIil7XCIrbCtcIn1cIiksbD0odT9sLnJlcGxhY2UodyxcIlwiKTpsKS5yZXBsYWNlKGosXCIkMVwiKS5yZXBsYWNlKGssXCIkMTtcIiksbD1cImZ1bmN0aW9uKFwiK2UrXCIpe1wiKyhmP1wiXCI6ZStcInx8KFwiK2UrXCI9e30pO1wiKStcInZhciBfX3QsX19wPScnLF9fZT1fLmVzY2FwZVwiKyh1P1wiLF9faj1BcnJheS5wcm90b3R5cGUuam9pbjtmdW5jdGlvbiBwcmludCgpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKX1cIjpcIjtcIikrbCtcInJldHVybiBfX3B9XCI7dHJ5e3ZhciBjPW5lKHIsXCJyZXR1cm4gXCIrbCkuYXBwbHkodixvKX1jYXRjaChwKXt0aHJvdyBwLnNvdXJjZT1sLHB9cmV0dXJuIHQ/Yyh0KTooYy5zb3VyY2U9bCxjKX0sSi51bmVzY2FwZT1mdW5jdGlvbihuKXtyZXR1cm4gbnVsbD09bj9cIlwiOm9lKG4pLnJlcGxhY2UocWUsZ3QpfSxKLnVuaXF1ZUlkPWZ1bmN0aW9uKG4pe3ZhciB0PSsreTtyZXR1cm4gb2UobnVsbD09bj9cIlwiOm4pK3Rcbn0sSi5hbGw9T3QsSi5hbnk9RnQsSi5kZXRlY3Q9SXQsSi5maW5kV2hlcmU9SXQsSi5mb2xkbD1EdCxKLmZvbGRyPSR0LEouaW5jbHVkZT1DdCxKLmluamVjdD1EdCxHdChmdW5jdGlvbigpe3ZhciBuPXt9O3JldHVybiBoKEosZnVuY3Rpb24odCxlKXtKLnByb3RvdHlwZVtlXXx8KG5bZV09dCl9KSxufSgpLGZhbHNlKSxKLmZpcnN0PUJ0LEoubGFzdD1mdW5jdGlvbihuLHQsZSl7dmFyIHI9MCx1PW4/bi5sZW5ndGg6MDtpZih0eXBlb2YgdCE9XCJudW1iZXJcIiYmbnVsbCE9dCl7dmFyIG89dTtmb3IodD1KLmNyZWF0ZUNhbGxiYWNrKHQsZSwzKTtvLS0mJnQobltvXSxvLG4pOylyKyt9ZWxzZSBpZihyPXQsbnVsbD09cnx8ZSlyZXR1cm4gbj9uW3UtMV06djtyZXR1cm4gcChuLEllKDAsdS1yKSl9LEouc2FtcGxlPWZ1bmN0aW9uKG4sdCxlKXtyZXR1cm4gbiYmdHlwZW9mIG4ubGVuZ3RoIT1cIm51bWJlclwiJiYobj14dChuKSksbnVsbD09dHx8ZT9uP25bYXQoMCxuLmxlbmd0aC0xKV06djoobj1UdChuKSxuLmxlbmd0aD1TZShJZSgwLHQpLG4ubGVuZ3RoKSxuKVxufSxKLnRha2U9QnQsSi5oZWFkPUJ0LGgoSixmdW5jdGlvbihuLHQpe3ZhciBlPVwic2FtcGxlXCIhPT10O0oucHJvdG90eXBlW3RdfHwoSi5wcm90b3R5cGVbdF09ZnVuY3Rpb24odCxyKXt2YXIgdT10aGlzLl9fY2hhaW5fXyxvPW4odGhpcy5fX3dyYXBwZWRfXyx0LHIpO3JldHVybiB1fHxudWxsIT10JiYoIXJ8fGUmJnR5cGVvZiB0PT1cImZ1bmN0aW9uXCIpP25ldyBRKG8sdSk6b30pfSksSi5WRVJTSU9OPVwiMi40LjFcIixKLnByb3RvdHlwZS5jaGFpbj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fY2hhaW5fXz10cnVlLHRoaXN9LEoucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIG9lKHRoaXMuX193cmFwcGVkX18pfSxKLnByb3RvdHlwZS52YWx1ZT1RdCxKLnByb3RvdHlwZS52YWx1ZU9mPVF0LFN0KFtcImpvaW5cIixcInBvcFwiLFwic2hpZnRcIl0sZnVuY3Rpb24obil7dmFyIHQ9YWVbbl07Si5wcm90b3R5cGVbbl09ZnVuY3Rpb24oKXt2YXIgbj10aGlzLl9fY2hhaW5fXyxlPXQuYXBwbHkodGhpcy5fX3dyYXBwZWRfXyxhcmd1bWVudHMpO1xucmV0dXJuIG4/bmV3IFEoZSxuKTplfX0pLFN0KFtcInB1c2hcIixcInJldmVyc2VcIixcInNvcnRcIixcInVuc2hpZnRcIl0sZnVuY3Rpb24obil7dmFyIHQ9YWVbbl07Si5wcm90b3R5cGVbbl09ZnVuY3Rpb24oKXtyZXR1cm4gdC5hcHBseSh0aGlzLl9fd3JhcHBlZF9fLGFyZ3VtZW50cyksdGhpc319KSxTdChbXCJjb25jYXRcIixcInNsaWNlXCIsXCJzcGxpY2VcIl0sZnVuY3Rpb24obil7dmFyIHQ9YWVbbl07Si5wcm90b3R5cGVbbl09ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IFEodC5hcHBseSh0aGlzLl9fd3JhcHBlZF9fLGFyZ3VtZW50cyksdGhpcy5fX2NoYWluX18pfX0pLEp9dmFyIHYsaD1bXSxnPVtdLHk9MCxtPStuZXcgRGF0ZStcIlwiLGI9NzUsXz00MCxkPVwiIFxcdFxceDBCXFxmXFx4YTBcXHVmZWZmXFxuXFxyXFx1MjAyOFxcdTIwMjlcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXCIsdz0vXFxiX19wXFwrPScnOy9nLGo9L1xcYihfX3BcXCs9KScnXFwrL2csaz0vKF9fZVxcKC4qP1xcKXxcXGJfX3RcXCkpXFwrJyc7L2cseD0vXFwkXFx7KFteXFxcXH1dKig/OlxcXFwuW15cXFxcfV0qKSopXFx9L2csQz0vXFx3KiQvLE89L15cXHMqZnVuY3Rpb25bIFxcblxcclxcdF0rXFx3LyxOPS88JT0oW1xcc1xcU10rPyklPi9nLEk9UmVnRXhwKFwiXltcIitkK1wiXSowKyg/PS4kKVwiKSxTPS8oJF4pLyxFPS9cXGJ0aGlzXFxiLyxSPS9bJ1xcblxcclxcdFxcdTIwMjhcXHUyMDI5XFxcXF0vZyxBPVwiQXJyYXkgQm9vbGVhbiBEYXRlIEZ1bmN0aW9uIE1hdGggTnVtYmVyIE9iamVjdCBSZWdFeHAgU3RyaW5nIF8gYXR0YWNoRXZlbnQgY2xlYXJUaW1lb3V0IGlzRmluaXRlIGlzTmFOIHBhcnNlSW50IHNldFRpbWVvdXRcIi5zcGxpdChcIiBcIiksRD1cIltvYmplY3QgQXJndW1lbnRzXVwiLCQ9XCJbb2JqZWN0IEFycmF5XVwiLFQ9XCJbb2JqZWN0IEJvb2xlYW5dXCIsRj1cIltvYmplY3QgRGF0ZV1cIixCPVwiW29iamVjdCBGdW5jdGlvbl1cIixXPVwiW29iamVjdCBOdW1iZXJdXCIscT1cIltvYmplY3QgT2JqZWN0XVwiLHo9XCJbb2JqZWN0IFJlZ0V4cF1cIixQPVwiW29iamVjdCBTdHJpbmddXCIsSz17fTtcbktbQl09ZmFsc2UsS1tEXT1LWyRdPUtbVF09S1tGXT1LW1ddPUtbcV09S1t6XT1LW1BdPXRydWU7dmFyIEw9e2xlYWRpbmc6ZmFsc2UsbWF4V2FpdDowLHRyYWlsaW5nOmZhbHNlfSxNPXtjb25maWd1cmFibGU6ZmFsc2UsZW51bWVyYWJsZTpmYWxzZSx2YWx1ZTpudWxsLHdyaXRhYmxlOmZhbHNlfSxWPXtcImJvb2xlYW5cIjpmYWxzZSxcImZ1bmN0aW9uXCI6dHJ1ZSxvYmplY3Q6dHJ1ZSxudW1iZXI6ZmFsc2Usc3RyaW5nOmZhbHNlLHVuZGVmaW5lZDpmYWxzZX0sVT17XCJcXFxcXCI6XCJcXFxcXCIsXCInXCI6XCInXCIsXCJcXG5cIjpcIm5cIixcIlxcclwiOlwiclwiLFwiXFx0XCI6XCJ0XCIsXCJcXHUyMDI4XCI6XCJ1MjAyOFwiLFwiXFx1MjAyOVwiOlwidTIwMjlcIn0sRz1WW3R5cGVvZiB3aW5kb3ddJiZ3aW5kb3d8fHRoaXMsSD1WW3R5cGVvZiBleHBvcnRzXSYmZXhwb3J0cyYmIWV4cG9ydHMubm9kZVR5cGUmJmV4cG9ydHMsSj1WW3R5cGVvZiBtb2R1bGVdJiZtb2R1bGUmJiFtb2R1bGUubm9kZVR5cGUmJm1vZHVsZSxRPUomJkouZXhwb3J0cz09PUgmJkgsWD1WW3R5cGVvZiBnbG9iYWxdJiZnbG9iYWw7IVh8fFguZ2xvYmFsIT09WCYmWC53aW5kb3chPT1YfHwoRz1YKTtcbnZhciBZPXMoKTt0eXBlb2YgZGVmaW5lPT1cImZ1bmN0aW9uXCImJnR5cGVvZiBkZWZpbmUuYW1kPT1cIm9iamVjdFwiJiZkZWZpbmUuYW1kPyhHLl89WSwgZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIFl9KSk6SCYmSj9RPyhKLmV4cG9ydHM9WSkuXz1ZOkguXz1ZOkcuXz1ZfSkuY2FsbCh0aGlzKTsiLCIvLyEgbW9tZW50LmpzXG4vLyEgdmVyc2lvbiA6IDIuNS4xXG4vLyEgYXV0aG9ycyA6IFRpbSBXb29kLCBJc2tyZW4gQ2hlcm5ldiwgTW9tZW50LmpzIGNvbnRyaWJ1dG9yc1xuLy8hIGxpY2Vuc2UgOiBNSVRcbi8vISBtb21lbnRqcy5jb21cbihmdW5jdGlvbihhKXtmdW5jdGlvbiBiKCl7cmV0dXJue2VtcHR5OiExLHVudXNlZFRva2VuczpbXSx1bnVzZWRJbnB1dDpbXSxvdmVyZmxvdzotMixjaGFyc0xlZnRPdmVyOjAsbnVsbElucHV0OiExLGludmFsaWRNb250aDpudWxsLGludmFsaWRGb3JtYXQ6ITEsdXNlckludmFsaWRhdGVkOiExLGlzbzohMX19ZnVuY3Rpb24gYyhhLGIpe3JldHVybiBmdW5jdGlvbihjKXtyZXR1cm4gayhhLmNhbGwodGhpcyxjKSxiKX19ZnVuY3Rpb24gZChhLGIpe3JldHVybiBmdW5jdGlvbihjKXtyZXR1cm4gdGhpcy5sYW5nKCkub3JkaW5hbChhLmNhbGwodGhpcyxjKSxiKX19ZnVuY3Rpb24gZSgpe31mdW5jdGlvbiBmKGEpe3coYSksaCh0aGlzLGEpfWZ1bmN0aW9uIGcoYSl7dmFyIGI9cShhKSxjPWIueWVhcnx8MCxkPWIubW9udGh8fDAsZT1iLndlZWt8fDAsZj1iLmRheXx8MCxnPWIuaG91cnx8MCxoPWIubWludXRlfHwwLGk9Yi5zZWNvbmR8fDAsaj1iLm1pbGxpc2Vjb25kfHwwO3RoaXMuX21pbGxpc2Vjb25kcz0raisxZTMqaSs2ZTQqaCszNmU1KmcsdGhpcy5fZGF5cz0rZis3KmUsdGhpcy5fbW9udGhzPStkKzEyKmMsdGhpcy5fZGF0YT17fSx0aGlzLl9idWJibGUoKX1mdW5jdGlvbiBoKGEsYil7Zm9yKHZhciBjIGluIGIpYi5oYXNPd25Qcm9wZXJ0eShjKSYmKGFbY109YltjXSk7cmV0dXJuIGIuaGFzT3duUHJvcGVydHkoXCJ0b1N0cmluZ1wiKSYmKGEudG9TdHJpbmc9Yi50b1N0cmluZyksYi5oYXNPd25Qcm9wZXJ0eShcInZhbHVlT2ZcIikmJihhLnZhbHVlT2Y9Yi52YWx1ZU9mKSxhfWZ1bmN0aW9uIGkoYSl7dmFyIGIsYz17fTtmb3IoYiBpbiBhKWEuaGFzT3duUHJvcGVydHkoYikmJnFiLmhhc093blByb3BlcnR5KGIpJiYoY1tiXT1hW2JdKTtyZXR1cm4gY31mdW5jdGlvbiBqKGEpe3JldHVybiAwPmE/TWF0aC5jZWlsKGEpOk1hdGguZmxvb3IoYSl9ZnVuY3Rpb24gayhhLGIsYyl7Zm9yKHZhciBkPVwiXCIrTWF0aC5hYnMoYSksZT1hPj0wO2QubGVuZ3RoPGI7KWQ9XCIwXCIrZDtyZXR1cm4oZT9jP1wiK1wiOlwiXCI6XCItXCIpK2R9ZnVuY3Rpb24gbChhLGIsYyxkKXt2YXIgZSxmLGc9Yi5fbWlsbGlzZWNvbmRzLGg9Yi5fZGF5cyxpPWIuX21vbnRocztnJiZhLl9kLnNldFRpbWUoK2EuX2QrZypjKSwoaHx8aSkmJihlPWEubWludXRlKCksZj1hLmhvdXIoKSksaCYmYS5kYXRlKGEuZGF0ZSgpK2gqYyksaSYmYS5tb250aChhLm1vbnRoKCkraSpjKSxnJiYhZCYmZGIudXBkYXRlT2Zmc2V0KGEpLChofHxpKSYmKGEubWludXRlKGUpLGEuaG91cihmKSl9ZnVuY3Rpb24gbShhKXtyZXR1cm5cIltvYmplY3QgQXJyYXldXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYSl9ZnVuY3Rpb24gbihhKXtyZXR1cm5cIltvYmplY3QgRGF0ZV1cIj09PU9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKXx8YSBpbnN0YW5jZW9mIERhdGV9ZnVuY3Rpb24gbyhhLGIsYyl7dmFyIGQsZT1NYXRoLm1pbihhLmxlbmd0aCxiLmxlbmd0aCksZj1NYXRoLmFicyhhLmxlbmd0aC1iLmxlbmd0aCksZz0wO2ZvcihkPTA7ZT5kO2QrKykoYyYmYVtkXSE9PWJbZF18fCFjJiZzKGFbZF0pIT09cyhiW2RdKSkmJmcrKztyZXR1cm4gZytmfWZ1bmN0aW9uIHAoYSl7aWYoYSl7dmFyIGI9YS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoLyguKXMkLyxcIiQxXCIpO2E9VGJbYV18fFViW2JdfHxifXJldHVybiBhfWZ1bmN0aW9uIHEoYSl7dmFyIGIsYyxkPXt9O2ZvcihjIGluIGEpYS5oYXNPd25Qcm9wZXJ0eShjKSYmKGI9cChjKSxiJiYoZFtiXT1hW2NdKSk7cmV0dXJuIGR9ZnVuY3Rpb24gcihiKXt2YXIgYyxkO2lmKDA9PT1iLmluZGV4T2YoXCJ3ZWVrXCIpKWM9NyxkPVwiZGF5XCI7ZWxzZXtpZigwIT09Yi5pbmRleE9mKFwibW9udGhcIikpcmV0dXJuO2M9MTIsZD1cIm1vbnRoXCJ9ZGJbYl09ZnVuY3Rpb24oZSxmKXt2YXIgZyxoLGk9ZGIuZm4uX2xhbmdbYl0saj1bXTtpZihcIm51bWJlclwiPT10eXBlb2YgZSYmKGY9ZSxlPWEpLGg9ZnVuY3Rpb24oYSl7dmFyIGI9ZGIoKS51dGMoKS5zZXQoZCxhKTtyZXR1cm4gaS5jYWxsKGRiLmZuLl9sYW5nLGIsZXx8XCJcIil9LG51bGwhPWYpcmV0dXJuIGgoZik7Zm9yKGc9MDtjPmc7ZysrKWoucHVzaChoKGcpKTtyZXR1cm4gan19ZnVuY3Rpb24gcyhhKXt2YXIgYj0rYSxjPTA7cmV0dXJuIDAhPT1iJiZpc0Zpbml0ZShiKSYmKGM9Yj49MD9NYXRoLmZsb29yKGIpOk1hdGguY2VpbChiKSksY31mdW5jdGlvbiB0KGEsYil7cmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKGEsYisxLDApKS5nZXRVVENEYXRlKCl9ZnVuY3Rpb24gdShhKXtyZXR1cm4gdihhKT8zNjY6MzY1fWZ1bmN0aW9uIHYoYSl7cmV0dXJuIGElND09PTAmJmElMTAwIT09MHx8YSU0MDA9PT0wfWZ1bmN0aW9uIHcoYSl7dmFyIGI7YS5fYSYmLTI9PT1hLl9wZi5vdmVyZmxvdyYmKGI9YS5fYVtqYl08MHx8YS5fYVtqYl0+MTE/amI6YS5fYVtrYl08MXx8YS5fYVtrYl0+dChhLl9hW2liXSxhLl9hW2piXSk/a2I6YS5fYVtsYl08MHx8YS5fYVtsYl0+MjM/bGI6YS5fYVttYl08MHx8YS5fYVttYl0+NTk/bWI6YS5fYVtuYl08MHx8YS5fYVtuYl0+NTk/bmI6YS5fYVtvYl08MHx8YS5fYVtvYl0+OTk5P29iOi0xLGEuX3BmLl9vdmVyZmxvd0RheU9mWWVhciYmKGliPmJ8fGI+a2IpJiYoYj1rYiksYS5fcGYub3ZlcmZsb3c9Yil9ZnVuY3Rpb24geChhKXtyZXR1cm4gbnVsbD09YS5faXNWYWxpZCYmKGEuX2lzVmFsaWQ9IWlzTmFOKGEuX2QuZ2V0VGltZSgpKSYmYS5fcGYub3ZlcmZsb3c8MCYmIWEuX3BmLmVtcHR5JiYhYS5fcGYuaW52YWxpZE1vbnRoJiYhYS5fcGYubnVsbElucHV0JiYhYS5fcGYuaW52YWxpZEZvcm1hdCYmIWEuX3BmLnVzZXJJbnZhbGlkYXRlZCxhLl9zdHJpY3QmJihhLl9pc1ZhbGlkPWEuX2lzVmFsaWQmJjA9PT1hLl9wZi5jaGFyc0xlZnRPdmVyJiYwPT09YS5fcGYudW51c2VkVG9rZW5zLmxlbmd0aCkpLGEuX2lzVmFsaWR9ZnVuY3Rpb24geShhKXtyZXR1cm4gYT9hLnRvTG93ZXJDYXNlKCkucmVwbGFjZShcIl9cIixcIi1cIik6YX1mdW5jdGlvbiB6KGEsYil7cmV0dXJuIGIuX2lzVVRDP2RiKGEpLnpvbmUoYi5fb2Zmc2V0fHwwKTpkYihhKS5sb2NhbCgpfWZ1bmN0aW9uIEEoYSxiKXtyZXR1cm4gYi5hYmJyPWEscGJbYV18fChwYlthXT1uZXcgZSkscGJbYV0uc2V0KGIpLHBiW2FdfWZ1bmN0aW9uIEIoYSl7ZGVsZXRlIHBiW2FdfWZ1bmN0aW9uIEMoYSl7dmFyIGIsYyxkLGUsZj0wLGc9ZnVuY3Rpb24oYSl7aWYoIXBiW2FdJiZyYil0cnl7cmVxdWlyZShcIi4vbGFuZy9cIithKX1jYXRjaChiKXt9cmV0dXJuIHBiW2FdfTtpZighYSlyZXR1cm4gZGIuZm4uX2xhbmc7aWYoIW0oYSkpe2lmKGM9ZyhhKSlyZXR1cm4gYzthPVthXX1mb3IoO2Y8YS5sZW5ndGg7KXtmb3IoZT15KGFbZl0pLnNwbGl0KFwiLVwiKSxiPWUubGVuZ3RoLGQ9eShhW2YrMV0pLGQ9ZD9kLnNwbGl0KFwiLVwiKTpudWxsO2I+MDspe2lmKGM9ZyhlLnNsaWNlKDAsYikuam9pbihcIi1cIikpKXJldHVybiBjO2lmKGQmJmQubGVuZ3RoPj1iJiZvKGUsZCwhMCk+PWItMSlicmVhaztiLS19ZisrfXJldHVybiBkYi5mbi5fbGFuZ31mdW5jdGlvbiBEKGEpe3JldHVybiBhLm1hdGNoKC9cXFtbXFxzXFxTXS8pP2EucmVwbGFjZSgvXlxcW3xcXF0kL2csXCJcIik6YS5yZXBsYWNlKC9cXFxcL2csXCJcIil9ZnVuY3Rpb24gRShhKXt2YXIgYixjLGQ9YS5tYXRjaCh2Yik7Zm9yKGI9MCxjPWQubGVuZ3RoO2M+YjtiKyspZFtiXT1ZYltkW2JdXT9ZYltkW2JdXTpEKGRbYl0pO3JldHVybiBmdW5jdGlvbihlKXt2YXIgZj1cIlwiO2ZvcihiPTA7Yz5iO2IrKylmKz1kW2JdaW5zdGFuY2VvZiBGdW5jdGlvbj9kW2JdLmNhbGwoZSxhKTpkW2JdO3JldHVybiBmfX1mdW5jdGlvbiBGKGEsYil7cmV0dXJuIGEuaXNWYWxpZCgpPyhiPUcoYixhLmxhbmcoKSksVmJbYl18fChWYltiXT1FKGIpKSxWYltiXShhKSk6YS5sYW5nKCkuaW52YWxpZERhdGUoKX1mdW5jdGlvbiBHKGEsYil7ZnVuY3Rpb24gYyhhKXtyZXR1cm4gYi5sb25nRGF0ZUZvcm1hdChhKXx8YX12YXIgZD01O2Zvcih3Yi5sYXN0SW5kZXg9MDtkPj0wJiZ3Yi50ZXN0KGEpOylhPWEucmVwbGFjZSh3YixjKSx3Yi5sYXN0SW5kZXg9MCxkLT0xO3JldHVybiBhfWZ1bmN0aW9uIEgoYSxiKXt2YXIgYyxkPWIuX3N0cmljdDtzd2l0Y2goYSl7Y2FzZVwiRERERFwiOnJldHVybiBJYjtjYXNlXCJZWVlZXCI6Y2FzZVwiR0dHR1wiOmNhc2VcImdnZ2dcIjpyZXR1cm4gZD9KYjp6YjtjYXNlXCJZXCI6Y2FzZVwiR1wiOmNhc2VcImdcIjpyZXR1cm4gTGI7Y2FzZVwiWVlZWVlZXCI6Y2FzZVwiWVlZWVlcIjpjYXNlXCJHR0dHR1wiOmNhc2VcImdnZ2dnXCI6cmV0dXJuIGQ/S2I6QWI7Y2FzZVwiU1wiOmlmKGQpcmV0dXJuIEdiO2Nhc2VcIlNTXCI6aWYoZClyZXR1cm4gSGI7Y2FzZVwiU1NTXCI6aWYoZClyZXR1cm4gSWI7Y2FzZVwiREREXCI6cmV0dXJuIHliO2Nhc2VcIk1NTVwiOmNhc2VcIk1NTU1cIjpjYXNlXCJkZFwiOmNhc2VcImRkZFwiOmNhc2VcImRkZGRcIjpyZXR1cm4gQ2I7Y2FzZVwiYVwiOmNhc2VcIkFcIjpyZXR1cm4gQyhiLl9sKS5fbWVyaWRpZW1QYXJzZTtjYXNlXCJYXCI6cmV0dXJuIEZiO2Nhc2VcIlpcIjpjYXNlXCJaWlwiOnJldHVybiBEYjtjYXNlXCJUXCI6cmV0dXJuIEViO2Nhc2VcIlNTU1NcIjpyZXR1cm4gQmI7Y2FzZVwiTU1cIjpjYXNlXCJERFwiOmNhc2VcIllZXCI6Y2FzZVwiR0dcIjpjYXNlXCJnZ1wiOmNhc2VcIkhIXCI6Y2FzZVwiaGhcIjpjYXNlXCJtbVwiOmNhc2VcInNzXCI6Y2FzZVwid3dcIjpjYXNlXCJXV1wiOnJldHVybiBkP0hiOnhiO2Nhc2VcIk1cIjpjYXNlXCJEXCI6Y2FzZVwiZFwiOmNhc2VcIkhcIjpjYXNlXCJoXCI6Y2FzZVwibVwiOmNhc2VcInNcIjpjYXNlXCJ3XCI6Y2FzZVwiV1wiOmNhc2VcImVcIjpjYXNlXCJFXCI6cmV0dXJuIHhiO2RlZmF1bHQ6cmV0dXJuIGM9bmV3IFJlZ0V4cChQKE8oYS5yZXBsYWNlKFwiXFxcXFwiLFwiXCIpKSxcImlcIikpfX1mdW5jdGlvbiBJKGEpe2E9YXx8XCJcIjt2YXIgYj1hLm1hdGNoKERiKXx8W10sYz1iW2IubGVuZ3RoLTFdfHxbXSxkPShjK1wiXCIpLm1hdGNoKFFiKXx8W1wiLVwiLDAsMF0sZT0rKDYwKmRbMV0pK3MoZFsyXSk7cmV0dXJuXCIrXCI9PT1kWzBdPy1lOmV9ZnVuY3Rpb24gSihhLGIsYyl7dmFyIGQsZT1jLl9hO3N3aXRjaChhKXtjYXNlXCJNXCI6Y2FzZVwiTU1cIjpudWxsIT1iJiYoZVtqYl09cyhiKS0xKTticmVhaztjYXNlXCJNTU1cIjpjYXNlXCJNTU1NXCI6ZD1DKGMuX2wpLm1vbnRoc1BhcnNlKGIpLG51bGwhPWQ/ZVtqYl09ZDpjLl9wZi5pbnZhbGlkTW9udGg9YjticmVhaztjYXNlXCJEXCI6Y2FzZVwiRERcIjpudWxsIT1iJiYoZVtrYl09cyhiKSk7YnJlYWs7Y2FzZVwiREREXCI6Y2FzZVwiRERERFwiOm51bGwhPWImJihjLl9kYXlPZlllYXI9cyhiKSk7YnJlYWs7Y2FzZVwiWVlcIjplW2liXT1zKGIpKyhzKGIpPjY4PzE5MDA6MmUzKTticmVhaztjYXNlXCJZWVlZXCI6Y2FzZVwiWVlZWVlcIjpjYXNlXCJZWVlZWVlcIjplW2liXT1zKGIpO2JyZWFrO2Nhc2VcImFcIjpjYXNlXCJBXCI6Yy5faXNQbT1DKGMuX2wpLmlzUE0oYik7YnJlYWs7Y2FzZVwiSFwiOmNhc2VcIkhIXCI6Y2FzZVwiaFwiOmNhc2VcImhoXCI6ZVtsYl09cyhiKTticmVhaztjYXNlXCJtXCI6Y2FzZVwibW1cIjplW21iXT1zKGIpO2JyZWFrO2Nhc2VcInNcIjpjYXNlXCJzc1wiOmVbbmJdPXMoYik7YnJlYWs7Y2FzZVwiU1wiOmNhc2VcIlNTXCI6Y2FzZVwiU1NTXCI6Y2FzZVwiU1NTU1wiOmVbb2JdPXMoMWUzKihcIjAuXCIrYikpO2JyZWFrO2Nhc2VcIlhcIjpjLl9kPW5ldyBEYXRlKDFlMypwYXJzZUZsb2F0KGIpKTticmVhaztjYXNlXCJaXCI6Y2FzZVwiWlpcIjpjLl91c2VVVEM9ITAsYy5fdHptPUkoYik7YnJlYWs7Y2FzZVwid1wiOmNhc2VcInd3XCI6Y2FzZVwiV1wiOmNhc2VcIldXXCI6Y2FzZVwiZFwiOmNhc2VcImRkXCI6Y2FzZVwiZGRkXCI6Y2FzZVwiZGRkZFwiOmNhc2VcImVcIjpjYXNlXCJFXCI6YT1hLnN1YnN0cigwLDEpO2Nhc2VcImdnXCI6Y2FzZVwiZ2dnZ1wiOmNhc2VcIkdHXCI6Y2FzZVwiR0dHR1wiOmNhc2VcIkdHR0dHXCI6YT1hLnN1YnN0cigwLDIpLGImJihjLl93PWMuX3d8fHt9LGMuX3dbYV09Yil9fWZ1bmN0aW9uIEsoYSl7dmFyIGIsYyxkLGUsZixnLGgsaSxqLGssbD1bXTtpZighYS5fZCl7Zm9yKGQ9TShhKSxhLl93JiZudWxsPT1hLl9hW2tiXSYmbnVsbD09YS5fYVtqYl0mJihmPWZ1bmN0aW9uKGIpe3ZhciBjPXBhcnNlSW50KGIsMTApO3JldHVybiBiP2IubGVuZ3RoPDM/Yz42OD8xOTAwK2M6MmUzK2M6YzpudWxsPT1hLl9hW2liXT9kYigpLndlZWtZZWFyKCk6YS5fYVtpYl19LGc9YS5fdyxudWxsIT1nLkdHfHxudWxsIT1nLld8fG51bGwhPWcuRT9oPVooZihnLkdHKSxnLld8fDEsZy5FLDQsMSk6KGk9QyhhLl9sKSxqPW51bGwhPWcuZD9WKGcuZCxpKTpudWxsIT1nLmU/cGFyc2VJbnQoZy5lLDEwKStpLl93ZWVrLmRvdzowLGs9cGFyc2VJbnQoZy53LDEwKXx8MSxudWxsIT1nLmQmJmo8aS5fd2Vlay5kb3cmJmsrKyxoPVooZihnLmdnKSxrLGosaS5fd2Vlay5kb3ksaS5fd2Vlay5kb3cpKSxhLl9hW2liXT1oLnllYXIsYS5fZGF5T2ZZZWFyPWguZGF5T2ZZZWFyKSxhLl9kYXlPZlllYXImJihlPW51bGw9PWEuX2FbaWJdP2RbaWJdOmEuX2FbaWJdLGEuX2RheU9mWWVhcj51KGUpJiYoYS5fcGYuX292ZXJmbG93RGF5T2ZZZWFyPSEwKSxjPVUoZSwwLGEuX2RheU9mWWVhciksYS5fYVtqYl09Yy5nZXRVVENNb250aCgpLGEuX2Fba2JdPWMuZ2V0VVRDRGF0ZSgpKSxiPTA7Mz5iJiZudWxsPT1hLl9hW2JdOysrYilhLl9hW2JdPWxbYl09ZFtiXTtmb3IoOzc+YjtiKyspYS5fYVtiXT1sW2JdPW51bGw9PWEuX2FbYl0/Mj09PWI/MTowOmEuX2FbYl07bFtsYl0rPXMoKGEuX3R6bXx8MCkvNjApLGxbbWJdKz1zKChhLl90em18fDApJTYwKSxhLl9kPShhLl91c2VVVEM/VTpUKS5hcHBseShudWxsLGwpfX1mdW5jdGlvbiBMKGEpe3ZhciBiO2EuX2R8fChiPXEoYS5faSksYS5fYT1bYi55ZWFyLGIubW9udGgsYi5kYXksYi5ob3VyLGIubWludXRlLGIuc2Vjb25kLGIubWlsbGlzZWNvbmRdLEsoYSkpfWZ1bmN0aW9uIE0oYSl7dmFyIGI9bmV3IERhdGU7cmV0dXJuIGEuX3VzZVVUQz9bYi5nZXRVVENGdWxsWWVhcigpLGIuZ2V0VVRDTW9udGgoKSxiLmdldFVUQ0RhdGUoKV06W2IuZ2V0RnVsbFllYXIoKSxiLmdldE1vbnRoKCksYi5nZXREYXRlKCldfWZ1bmN0aW9uIE4oYSl7YS5fYT1bXSxhLl9wZi5lbXB0eT0hMDt2YXIgYixjLGQsZSxmLGc9QyhhLl9sKSxoPVwiXCIrYS5faSxpPWgubGVuZ3RoLGo9MDtmb3IoZD1HKGEuX2YsZykubWF0Y2godmIpfHxbXSxiPTA7YjxkLmxlbmd0aDtiKyspZT1kW2JdLGM9KGgubWF0Y2goSChlLGEpKXx8W10pWzBdLGMmJihmPWguc3Vic3RyKDAsaC5pbmRleE9mKGMpKSxmLmxlbmd0aD4wJiZhLl9wZi51bnVzZWRJbnB1dC5wdXNoKGYpLGg9aC5zbGljZShoLmluZGV4T2YoYykrYy5sZW5ndGgpLGorPWMubGVuZ3RoKSxZYltlXT8oYz9hLl9wZi5lbXB0eT0hMTphLl9wZi51bnVzZWRUb2tlbnMucHVzaChlKSxKKGUsYyxhKSk6YS5fc3RyaWN0JiYhYyYmYS5fcGYudW51c2VkVG9rZW5zLnB1c2goZSk7YS5fcGYuY2hhcnNMZWZ0T3Zlcj1pLWosaC5sZW5ndGg+MCYmYS5fcGYudW51c2VkSW5wdXQucHVzaChoKSxhLl9pc1BtJiZhLl9hW2xiXTwxMiYmKGEuX2FbbGJdKz0xMiksYS5faXNQbT09PSExJiYxMj09PWEuX2FbbGJdJiYoYS5fYVtsYl09MCksSyhhKSx3KGEpfWZ1bmN0aW9uIE8oYSl7cmV0dXJuIGEucmVwbGFjZSgvXFxcXChcXFspfFxcXFwoXFxdKXxcXFsoW15cXF1cXFtdKilcXF18XFxcXCguKS9nLGZ1bmN0aW9uKGEsYixjLGQsZSl7cmV0dXJuIGJ8fGN8fGR8fGV9KX1mdW5jdGlvbiBQKGEpe3JldHVybiBhLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZyxcIlxcXFwkJlwiKX1mdW5jdGlvbiBRKGEpe3ZhciBjLGQsZSxmLGc7aWYoMD09PWEuX2YubGVuZ3RoKXJldHVybiBhLl9wZi5pbnZhbGlkRm9ybWF0PSEwLGEuX2Q9bmV3IERhdGUoMC8wKSx2b2lkIDA7Zm9yKGY9MDtmPGEuX2YubGVuZ3RoO2YrKylnPTAsYz1oKHt9LGEpLGMuX3BmPWIoKSxjLl9mPWEuX2ZbZl0sTihjKSx4KGMpJiYoZys9Yy5fcGYuY2hhcnNMZWZ0T3ZlcixnKz0xMCpjLl9wZi51bnVzZWRUb2tlbnMubGVuZ3RoLGMuX3BmLnNjb3JlPWcsKG51bGw9PWV8fGU+ZykmJihlPWcsZD1jKSk7aChhLGR8fGMpfWZ1bmN0aW9uIFIoYSl7dmFyIGIsYyxkPWEuX2ksZT1NYi5leGVjKGQpO2lmKGUpe2ZvcihhLl9wZi5pc289ITAsYj0wLGM9T2IubGVuZ3RoO2M+YjtiKyspaWYoT2JbYl1bMV0uZXhlYyhkKSl7YS5fZj1PYltiXVswXSsoZVs2XXx8XCIgXCIpO2JyZWFrfWZvcihiPTAsYz1QYi5sZW5ndGg7Yz5iO2IrKylpZihQYltiXVsxXS5leGVjKGQpKXthLl9mKz1QYltiXVswXTticmVha31kLm1hdGNoKERiKSYmKGEuX2YrPVwiWlwiKSxOKGEpfWVsc2UgYS5fZD1uZXcgRGF0ZShkKX1mdW5jdGlvbiBTKGIpe3ZhciBjPWIuX2ksZD1zYi5leGVjKGMpO2M9PT1hP2IuX2Q9bmV3IERhdGU6ZD9iLl9kPW5ldyBEYXRlKCtkWzFdKTpcInN0cmluZ1wiPT10eXBlb2YgYz9SKGIpOm0oYyk/KGIuX2E9Yy5zbGljZSgwKSxLKGIpKTpuKGMpP2IuX2Q9bmV3IERhdGUoK2MpOlwib2JqZWN0XCI9PXR5cGVvZiBjP0woYik6Yi5fZD1uZXcgRGF0ZShjKX1mdW5jdGlvbiBUKGEsYixjLGQsZSxmLGcpe3ZhciBoPW5ldyBEYXRlKGEsYixjLGQsZSxmLGcpO3JldHVybiAxOTcwPmEmJmguc2V0RnVsbFllYXIoYSksaH1mdW5jdGlvbiBVKGEpe3ZhciBiPW5ldyBEYXRlKERhdGUuVVRDLmFwcGx5KG51bGwsYXJndW1lbnRzKSk7cmV0dXJuIDE5NzA+YSYmYi5zZXRVVENGdWxsWWVhcihhKSxifWZ1bmN0aW9uIFYoYSxiKXtpZihcInN0cmluZ1wiPT10eXBlb2YgYSlpZihpc05hTihhKSl7aWYoYT1iLndlZWtkYXlzUGFyc2UoYSksXCJudW1iZXJcIiE9dHlwZW9mIGEpcmV0dXJuIG51bGx9ZWxzZSBhPXBhcnNlSW50KGEsMTApO3JldHVybiBhfWZ1bmN0aW9uIFcoYSxiLGMsZCxlKXtyZXR1cm4gZS5yZWxhdGl2ZVRpbWUoYnx8MSwhIWMsYSxkKX1mdW5jdGlvbiBYKGEsYixjKXt2YXIgZD1oYihNYXRoLmFicyhhKS8xZTMpLGU9aGIoZC82MCksZj1oYihlLzYwKSxnPWhiKGYvMjQpLGg9aGIoZy8zNjUpLGk9NDU+ZCYmW1wic1wiLGRdfHwxPT09ZSYmW1wibVwiXXx8NDU+ZSYmW1wibW1cIixlXXx8MT09PWYmJltcImhcIl18fDIyPmYmJltcImhoXCIsZl18fDE9PT1nJiZbXCJkXCJdfHwyNT49ZyYmW1wiZGRcIixnXXx8NDU+PWcmJltcIk1cIl18fDM0NT5nJiZbXCJNTVwiLGhiKGcvMzApXXx8MT09PWgmJltcInlcIl18fFtcInl5XCIsaF07cmV0dXJuIGlbMl09YixpWzNdPWE+MCxpWzRdPWMsVy5hcHBseSh7fSxpKX1mdW5jdGlvbiBZKGEsYixjKXt2YXIgZCxlPWMtYixmPWMtYS5kYXkoKTtyZXR1cm4gZj5lJiYoZi09NyksZS03PmYmJihmKz03KSxkPWRiKGEpLmFkZChcImRcIixmKSx7d2VlazpNYXRoLmNlaWwoZC5kYXlPZlllYXIoKS83KSx5ZWFyOmQueWVhcigpfX1mdW5jdGlvbiBaKGEsYixjLGQsZSl7dmFyIGYsZyxoPVUoYSwwLDEpLmdldFVUQ0RheSgpO3JldHVybiBjPW51bGwhPWM/YzplLGY9ZS1oKyhoPmQ/NzowKS0oZT5oPzc6MCksZz03KihiLTEpKyhjLWUpK2YrMSx7eWVhcjpnPjA/YTphLTEsZGF5T2ZZZWFyOmc+MD9nOnUoYS0xKStnfX1mdW5jdGlvbiAkKGEpe3ZhciBiPWEuX2ksYz1hLl9mO3JldHVybiBudWxsPT09Yj9kYi5pbnZhbGlkKHtudWxsSW5wdXQ6ITB9KTooXCJzdHJpbmdcIj09dHlwZW9mIGImJihhLl9pPWI9QygpLnByZXBhcnNlKGIpKSxkYi5pc01vbWVudChiKT8oYT1pKGIpLGEuX2Q9bmV3IERhdGUoK2IuX2QpKTpjP20oYyk/UShhKTpOKGEpOlMoYSksbmV3IGYoYSkpfWZ1bmN0aW9uIF8oYSxiKXtkYi5mblthXT1kYi5mblthK1wic1wiXT1mdW5jdGlvbihhKXt2YXIgYz10aGlzLl9pc1VUQz9cIlVUQ1wiOlwiXCI7cmV0dXJuIG51bGwhPWE/KHRoaXMuX2RbXCJzZXRcIitjK2JdKGEpLGRiLnVwZGF0ZU9mZnNldCh0aGlzKSx0aGlzKTp0aGlzLl9kW1wiZ2V0XCIrYytiXSgpfX1mdW5jdGlvbiBhYihhKXtkYi5kdXJhdGlvbi5mblthXT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9kYXRhW2FdfX1mdW5jdGlvbiBiYihhLGIpe2RiLmR1cmF0aW9uLmZuW1wiYXNcIithXT1mdW5jdGlvbigpe3JldHVybit0aGlzL2J9fWZ1bmN0aW9uIGNiKGEpe3ZhciBiPSExLGM9ZGI7XCJ1bmRlZmluZWRcIj09dHlwZW9mIGVuZGVyJiYoYT8oZ2IubW9tZW50PWZ1bmN0aW9uKCl7cmV0dXJuIWImJmNvbnNvbGUmJmNvbnNvbGUud2FybiYmKGI9ITAsY29uc29sZS53YXJuKFwiQWNjZXNzaW5nIE1vbWVudCB0aHJvdWdoIHRoZSBnbG9iYWwgc2NvcGUgaXMgZGVwcmVjYXRlZCwgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyByZWxlYXNlLlwiKSksYy5hcHBseShudWxsLGFyZ3VtZW50cyl9LGgoZ2IubW9tZW50LGMpKTpnYi5tb21lbnQ9ZGIpfWZvcih2YXIgZGIsZWIsZmI9XCIyLjUuMVwiLGdiPXRoaXMsaGI9TWF0aC5yb3VuZCxpYj0wLGpiPTEsa2I9MixsYj0zLG1iPTQsbmI9NSxvYj02LHBiPXt9LHFiPXtfaXNBTW9tZW50T2JqZWN0Om51bGwsX2k6bnVsbCxfZjpudWxsLF9sOm51bGwsX3N0cmljdDpudWxsLF9pc1VUQzpudWxsLF9vZmZzZXQ6bnVsbCxfcGY6bnVsbCxfbGFuZzpudWxsfSxyYj1cInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHJlcXVpcmUsc2I9L15cXC8/RGF0ZVxcKChcXC0/XFxkKykvaSx0Yj0vKFxcLSk/KD86KFxcZCopXFwuKT8oXFxkKylcXDooXFxkKykoPzpcXDooXFxkKylcXC4/KFxcZHszfSk/KT8vLHViPS9eKC0pP1AoPzooPzooWzAtOSwuXSopWSk/KD86KFswLTksLl0qKU0pPyg/OihbMC05LC5dKilEKT8oPzpUKD86KFswLTksLl0qKUgpPyg/OihbMC05LC5dKilNKT8oPzooWzAtOSwuXSopUyk/KT98KFswLTksLl0qKVcpJC8sdmI9LyhcXFtbXlxcW10qXFxdKXwoXFxcXCk/KE1vfE1NP00/TT98RG98REREb3xERD9EP0Q/fGRkZD9kP3xkbz98d1tvfHddP3xXW298V10/fFlZWVlZWXxZWVlZWXxZWVlZfFlZfGdnKGdnZz8pP3xHRyhHR0c/KT98ZXxFfGF8QXxoaD98SEg/fG1tP3xzcz98U3sxLDR9fFh8eno/fFpaP3wuKS9nLHdiPS8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhMVHxMTD9MP0w/fGx7MSw0fSkvZyx4Yj0vXFxkXFxkPy8seWI9L1xcZHsxLDN9Lyx6Yj0vXFxkezEsNH0vLEFiPS9bK1xcLV0/XFxkezEsNn0vLEJiPS9cXGQrLyxDYj0vWzAtOV0qWydhLXpcXHUwMEEwLVxcdTA1RkZcXHUwNzAwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdK3xbXFx1MDYwMC1cXHUwNkZGXFwvXSsoXFxzKj9bXFx1MDYwMC1cXHUwNkZGXSspezEsMn0vaSxEYj0vWnxbXFwrXFwtXVxcZFxcZDo/XFxkXFxkL2dpLEViPS9UL2ksRmI9L1tcXCtcXC1dP1xcZCsoXFwuXFxkezEsM30pPy8sR2I9L1xcZC8sSGI9L1xcZFxcZC8sSWI9L1xcZHszfS8sSmI9L1xcZHs0fS8sS2I9L1srLV0/XFxkezZ9LyxMYj0vWystXT9cXGQrLyxNYj0vXlxccyooPzpbKy1dXFxkezZ9fFxcZHs0fSktKD86KFxcZFxcZC1cXGRcXGQpfChXXFxkXFxkJCl8KFdcXGRcXGQtXFxkKXwoXFxkXFxkXFxkKSkoKFR8ICkoXFxkXFxkKDpcXGRcXGQoOlxcZFxcZChcXC5cXGQrKT8pPyk/KT8oW1xcK1xcLV1cXGRcXGQoPzo6P1xcZFxcZCk/fFxccypaKT8pPyQvLE5iPVwiWVlZWS1NTS1ERFRISDptbTpzc1pcIixPYj1bW1wiWVlZWVlZLU1NLUREXCIsL1srLV1cXGR7Nn0tXFxkezJ9LVxcZHsyfS9dLFtcIllZWVktTU0tRERcIiwvXFxkezR9LVxcZHsyfS1cXGR7Mn0vXSxbXCJHR0dHLVtXXVdXLUVcIiwvXFxkezR9LVdcXGR7Mn0tXFxkL10sW1wiR0dHRy1bV11XV1wiLC9cXGR7NH0tV1xcZHsyfS9dLFtcIllZWVktREREXCIsL1xcZHs0fS1cXGR7M30vXV0sUGI9W1tcIkhIOm1tOnNzLlNTU1NcIiwvKFR8IClcXGRcXGQ6XFxkXFxkOlxcZFxcZFxcLlxcZHsxLDN9L10sW1wiSEg6bW06c3NcIiwvKFR8IClcXGRcXGQ6XFxkXFxkOlxcZFxcZC9dLFtcIkhIOm1tXCIsLyhUfCApXFxkXFxkOlxcZFxcZC9dLFtcIkhIXCIsLyhUfCApXFxkXFxkL11dLFFiPS8oW1xcK1xcLV18XFxkXFxkKS9naSxSYj1cIkRhdGV8SG91cnN8TWludXRlc3xTZWNvbmRzfE1pbGxpc2Vjb25kc1wiLnNwbGl0KFwifFwiKSxTYj17TWlsbGlzZWNvbmRzOjEsU2Vjb25kczoxZTMsTWludXRlczo2ZTQsSG91cnM6MzZlNSxEYXlzOjg2NGU1LE1vbnRoczoyNTkyZTYsWWVhcnM6MzE1MzZlNn0sVGI9e21zOlwibWlsbGlzZWNvbmRcIixzOlwic2Vjb25kXCIsbTpcIm1pbnV0ZVwiLGg6XCJob3VyXCIsZDpcImRheVwiLEQ6XCJkYXRlXCIsdzpcIndlZWtcIixXOlwiaXNvV2Vla1wiLE06XCJtb250aFwiLHk6XCJ5ZWFyXCIsREREOlwiZGF5T2ZZZWFyXCIsZTpcIndlZWtkYXlcIixFOlwiaXNvV2Vla2RheVwiLGdnOlwid2Vla1llYXJcIixHRzpcImlzb1dlZWtZZWFyXCJ9LFViPXtkYXlvZnllYXI6XCJkYXlPZlllYXJcIixpc293ZWVrZGF5OlwiaXNvV2Vla2RheVwiLGlzb3dlZWs6XCJpc29XZWVrXCIsd2Vla3llYXI6XCJ3ZWVrWWVhclwiLGlzb3dlZWt5ZWFyOlwiaXNvV2Vla1llYXJcIn0sVmI9e30sV2I9XCJEREQgdyBXIE0gRCBkXCIuc3BsaXQoXCIgXCIpLFhiPVwiTSBEIEggaCBtIHMgdyBXXCIuc3BsaXQoXCIgXCIpLFliPXtNOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9udGgoKSsxfSxNTU06ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMubGFuZygpLm1vbnRoc1Nob3J0KHRoaXMsYSl9LE1NTU06ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMubGFuZygpLm1vbnRocyh0aGlzLGEpfSxEOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZGF0ZSgpfSxEREQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kYXlPZlllYXIoKX0sZDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmRheSgpfSxkZDpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5sYW5nKCkud2Vla2RheXNNaW4odGhpcyxhKX0sZGRkOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLmxhbmcoKS53ZWVrZGF5c1Nob3J0KHRoaXMsYSl9LGRkZGQ6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMubGFuZygpLndlZWtkYXlzKHRoaXMsYSl9LHc6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy53ZWVrKCl9LFc6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pc29XZWVrKCl9LFlZOmZ1bmN0aW9uKCl7cmV0dXJuIGsodGhpcy55ZWFyKCklMTAwLDIpfSxZWVlZOmZ1bmN0aW9uKCl7cmV0dXJuIGsodGhpcy55ZWFyKCksNCl9LFlZWVlZOmZ1bmN0aW9uKCl7cmV0dXJuIGsodGhpcy55ZWFyKCksNSl9LFlZWVlZWTpmdW5jdGlvbigpe3ZhciBhPXRoaXMueWVhcigpLGI9YT49MD9cIitcIjpcIi1cIjtyZXR1cm4gYitrKE1hdGguYWJzKGEpLDYpfSxnZzpmdW5jdGlvbigpe3JldHVybiBrKHRoaXMud2Vla1llYXIoKSUxMDAsMil9LGdnZ2c6ZnVuY3Rpb24oKXtyZXR1cm4gayh0aGlzLndlZWtZZWFyKCksNCl9LGdnZ2dnOmZ1bmN0aW9uKCl7cmV0dXJuIGsodGhpcy53ZWVrWWVhcigpLDUpfSxHRzpmdW5jdGlvbigpe3JldHVybiBrKHRoaXMuaXNvV2Vla1llYXIoKSUxMDAsMil9LEdHR0c6ZnVuY3Rpb24oKXtyZXR1cm4gayh0aGlzLmlzb1dlZWtZZWFyKCksNCl9LEdHR0dHOmZ1bmN0aW9uKCl7cmV0dXJuIGsodGhpcy5pc29XZWVrWWVhcigpLDUpfSxlOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMud2Vla2RheSgpfSxFOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNvV2Vla2RheSgpfSxhOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubGFuZygpLm1lcmlkaWVtKHRoaXMuaG91cnMoKSx0aGlzLm1pbnV0ZXMoKSwhMCl9LEE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5sYW5nKCkubWVyaWRpZW0odGhpcy5ob3VycygpLHRoaXMubWludXRlcygpLCExKX0sSDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmhvdXJzKCl9LGg6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5ob3VycygpJTEyfHwxMn0sbTpmdW5jdGlvbigpe3JldHVybiB0aGlzLm1pbnV0ZXMoKX0sczpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNlY29uZHMoKX0sUzpmdW5jdGlvbigpe3JldHVybiBzKHRoaXMubWlsbGlzZWNvbmRzKCkvMTAwKX0sU1M6ZnVuY3Rpb24oKXtyZXR1cm4gayhzKHRoaXMubWlsbGlzZWNvbmRzKCkvMTApLDIpfSxTU1M6ZnVuY3Rpb24oKXtyZXR1cm4gayh0aGlzLm1pbGxpc2Vjb25kcygpLDMpfSxTU1NTOmZ1bmN0aW9uKCl7cmV0dXJuIGsodGhpcy5taWxsaXNlY29uZHMoKSwzKX0sWjpmdW5jdGlvbigpe3ZhciBhPS10aGlzLnpvbmUoKSxiPVwiK1wiO3JldHVybiAwPmEmJihhPS1hLGI9XCItXCIpLGIrayhzKGEvNjApLDIpK1wiOlwiK2socyhhKSU2MCwyKX0sWlo6ZnVuY3Rpb24oKXt2YXIgYT0tdGhpcy56b25lKCksYj1cIitcIjtyZXR1cm4gMD5hJiYoYT0tYSxiPVwiLVwiKSxiK2socyhhLzYwKSwyKStrKHMoYSklNjAsMil9LHo6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy56b25lQWJicigpfSx6ejpmdW5jdGlvbigpe3JldHVybiB0aGlzLnpvbmVOYW1lKCl9LFg6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bml4KCl9LFE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5xdWFydGVyKCl9fSxaYj1bXCJtb250aHNcIixcIm1vbnRoc1Nob3J0XCIsXCJ3ZWVrZGF5c1wiLFwid2Vla2RheXNTaG9ydFwiLFwid2Vla2RheXNNaW5cIl07V2IubGVuZ3RoOyllYj1XYi5wb3AoKSxZYltlYitcIm9cIl09ZChZYltlYl0sZWIpO2Zvcig7WGIubGVuZ3RoOyllYj1YYi5wb3AoKSxZYltlYitlYl09YyhZYltlYl0sMik7Zm9yKFliLkREREQ9YyhZYi5EREQsMyksaChlLnByb3RvdHlwZSx7c2V0OmZ1bmN0aW9uKGEpe3ZhciBiLGM7Zm9yKGMgaW4gYSliPWFbY10sXCJmdW5jdGlvblwiPT10eXBlb2YgYj90aGlzW2NdPWI6dGhpc1tcIl9cIitjXT1ifSxfbW9udGhzOlwiSmFudWFyeV9GZWJydWFyeV9NYXJjaF9BcHJpbF9NYXlfSnVuZV9KdWx5X0F1Z3VzdF9TZXB0ZW1iZXJfT2N0b2Jlcl9Ob3ZlbWJlcl9EZWNlbWJlclwiLnNwbGl0KFwiX1wiKSxtb250aHM6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX21vbnRoc1thLm1vbnRoKCldfSxfbW9udGhzU2hvcnQ6XCJKYW5fRmViX01hcl9BcHJfTWF5X0p1bl9KdWxfQXVnX1NlcF9PY3RfTm92X0RlY1wiLnNwbGl0KFwiX1wiKSxtb250aHNTaG9ydDpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5fbW9udGhzU2hvcnRbYS5tb250aCgpXX0sbW9udGhzUGFyc2U6ZnVuY3Rpb24oYSl7dmFyIGIsYyxkO2Zvcih0aGlzLl9tb250aHNQYXJzZXx8KHRoaXMuX21vbnRoc1BhcnNlPVtdKSxiPTA7MTI+YjtiKyspaWYodGhpcy5fbW9udGhzUGFyc2VbYl18fChjPWRiLnV0YyhbMmUzLGJdKSxkPVwiXlwiK3RoaXMubW9udGhzKGMsXCJcIikrXCJ8XlwiK3RoaXMubW9udGhzU2hvcnQoYyxcIlwiKSx0aGlzLl9tb250aHNQYXJzZVtiXT1uZXcgUmVnRXhwKGQucmVwbGFjZShcIi5cIixcIlwiKSxcImlcIikpLHRoaXMuX21vbnRoc1BhcnNlW2JdLnRlc3QoYSkpcmV0dXJuIGJ9LF93ZWVrZGF5czpcIlN1bmRheV9Nb25kYXlfVHVlc2RheV9XZWRuZXNkYXlfVGh1cnNkYXlfRnJpZGF5X1NhdHVyZGF5XCIuc3BsaXQoXCJfXCIpLHdlZWtkYXlzOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLl93ZWVrZGF5c1thLmRheSgpXX0sX3dlZWtkYXlzU2hvcnQ6XCJTdW5fTW9uX1R1ZV9XZWRfVGh1X0ZyaV9TYXRcIi5zcGxpdChcIl9cIiksd2Vla2RheXNTaG9ydDpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5fd2Vla2RheXNTaG9ydFthLmRheSgpXX0sX3dlZWtkYXlzTWluOlwiU3VfTW9fVHVfV2VfVGhfRnJfU2FcIi5zcGxpdChcIl9cIiksd2Vla2RheXNNaW46ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX3dlZWtkYXlzTWluW2EuZGF5KCldfSx3ZWVrZGF5c1BhcnNlOmZ1bmN0aW9uKGEpe3ZhciBiLGMsZDtmb3IodGhpcy5fd2Vla2RheXNQYXJzZXx8KHRoaXMuX3dlZWtkYXlzUGFyc2U9W10pLGI9MDs3PmI7YisrKWlmKHRoaXMuX3dlZWtkYXlzUGFyc2VbYl18fChjPWRiKFsyZTMsMV0pLmRheShiKSxkPVwiXlwiK3RoaXMud2Vla2RheXMoYyxcIlwiKStcInxeXCIrdGhpcy53ZWVrZGF5c1Nob3J0KGMsXCJcIikrXCJ8XlwiK3RoaXMud2Vla2RheXNNaW4oYyxcIlwiKSx0aGlzLl93ZWVrZGF5c1BhcnNlW2JdPW5ldyBSZWdFeHAoZC5yZXBsYWNlKFwiLlwiLFwiXCIpLFwiaVwiKSksdGhpcy5fd2Vla2RheXNQYXJzZVtiXS50ZXN0KGEpKXJldHVybiBifSxfbG9uZ0RhdGVGb3JtYXQ6e0xUOlwiaDptbSBBXCIsTDpcIk1NL0REL1lZWVlcIixMTDpcIk1NTU0gRCBZWVlZXCIsTExMOlwiTU1NTSBEIFlZWVkgTFRcIixMTExMOlwiZGRkZCwgTU1NTSBEIFlZWVkgTFRcIn0sbG9uZ0RhdGVGb3JtYXQ6ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5fbG9uZ0RhdGVGb3JtYXRbYV07cmV0dXJuIWImJnRoaXMuX2xvbmdEYXRlRm9ybWF0W2EudG9VcHBlckNhc2UoKV0mJihiPXRoaXMuX2xvbmdEYXRlRm9ybWF0W2EudG9VcHBlckNhc2UoKV0ucmVwbGFjZSgvTU1NTXxNTXxERHxkZGRkL2csZnVuY3Rpb24oYSl7cmV0dXJuIGEuc2xpY2UoMSl9KSx0aGlzLl9sb25nRGF0ZUZvcm1hdFthXT1iKSxifSxpc1BNOmZ1bmN0aW9uKGEpe3JldHVyblwicFwiPT09KGErXCJcIikudG9Mb3dlckNhc2UoKS5jaGFyQXQoMCl9LF9tZXJpZGllbVBhcnNlOi9bYXBdXFwuP20/XFwuPy9pLG1lcmlkaWVtOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gYT4xMT9jP1wicG1cIjpcIlBNXCI6Yz9cImFtXCI6XCJBTVwifSxfY2FsZW5kYXI6e3NhbWVEYXk6XCJbVG9kYXkgYXRdIExUXCIsbmV4dERheTpcIltUb21vcnJvdyBhdF0gTFRcIixuZXh0V2VlazpcImRkZGQgW2F0XSBMVFwiLGxhc3REYXk6XCJbWWVzdGVyZGF5IGF0XSBMVFwiLGxhc3RXZWVrOlwiW0xhc3RdIGRkZGQgW2F0XSBMVFwiLHNhbWVFbHNlOlwiTFwifSxjYWxlbmRhcjpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuX2NhbGVuZGFyW2FdO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGM/Yy5hcHBseShiKTpjfSxfcmVsYXRpdmVUaW1lOntmdXR1cmU6XCJpbiAlc1wiLHBhc3Q6XCIlcyBhZ29cIixzOlwiYSBmZXcgc2Vjb25kc1wiLG06XCJhIG1pbnV0ZVwiLG1tOlwiJWQgbWludXRlc1wiLGg6XCJhbiBob3VyXCIsaGg6XCIlZCBob3Vyc1wiLGQ6XCJhIGRheVwiLGRkOlwiJWQgZGF5c1wiLE06XCJhIG1vbnRoXCIsTU06XCIlZCBtb250aHNcIix5OlwiYSB5ZWFyXCIseXk6XCIlZCB5ZWFyc1wifSxyZWxhdGl2ZVRpbWU6ZnVuY3Rpb24oYSxiLGMsZCl7dmFyIGU9dGhpcy5fcmVsYXRpdmVUaW1lW2NdO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGU/ZShhLGIsYyxkKTplLnJlcGxhY2UoLyVkL2ksYSl9LHBhc3RGdXR1cmU6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLl9yZWxhdGl2ZVRpbWVbYT4wP1wiZnV0dXJlXCI6XCJwYXN0XCJdO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGM/YyhiKTpjLnJlcGxhY2UoLyVzL2ksYil9LG9yZGluYWw6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX29yZGluYWwucmVwbGFjZShcIiVkXCIsYSl9LF9vcmRpbmFsOlwiJWRcIixwcmVwYXJzZTpmdW5jdGlvbihhKXtyZXR1cm4gYX0scG9zdGZvcm1hdDpmdW5jdGlvbihhKXtyZXR1cm4gYX0sd2VlazpmdW5jdGlvbihhKXtyZXR1cm4gWShhLHRoaXMuX3dlZWsuZG93LHRoaXMuX3dlZWsuZG95KS53ZWVrfSxfd2Vlazp7ZG93OjAsZG95OjZ9LF9pbnZhbGlkRGF0ZTpcIkludmFsaWQgZGF0ZVwiLGludmFsaWREYXRlOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2ludmFsaWREYXRlfX0pLGRiPWZ1bmN0aW9uKGMsZCxlLGYpe3ZhciBnO3JldHVyblwiYm9vbGVhblwiPT10eXBlb2YgZSYmKGY9ZSxlPWEpLGc9e30sZy5faXNBTW9tZW50T2JqZWN0PSEwLGcuX2k9YyxnLl9mPWQsZy5fbD1lLGcuX3N0cmljdD1mLGcuX2lzVVRDPSExLGcuX3BmPWIoKSwkKGcpfSxkYi51dGM9ZnVuY3Rpb24oYyxkLGUsZil7dmFyIGc7cmV0dXJuXCJib29sZWFuXCI9PXR5cGVvZiBlJiYoZj1lLGU9YSksZz17fSxnLl9pc0FNb21lbnRPYmplY3Q9ITAsZy5fdXNlVVRDPSEwLGcuX2lzVVRDPSEwLGcuX2w9ZSxnLl9pPWMsZy5fZj1kLGcuX3N0cmljdD1mLGcuX3BmPWIoKSwkKGcpLnV0YygpfSxkYi51bml4PWZ1bmN0aW9uKGEpe3JldHVybiBkYigxZTMqYSl9LGRiLmR1cmF0aW9uPWZ1bmN0aW9uKGEsYil7dmFyIGMsZCxlLGY9YSxoPW51bGw7cmV0dXJuIGRiLmlzRHVyYXRpb24oYSk/Zj17bXM6YS5fbWlsbGlzZWNvbmRzLGQ6YS5fZGF5cyxNOmEuX21vbnRoc306XCJudW1iZXJcIj09dHlwZW9mIGE/KGY9e30sYj9mW2JdPWE6Zi5taWxsaXNlY29uZHM9YSk6KGg9dGIuZXhlYyhhKSk/KGM9XCItXCI9PT1oWzFdPy0xOjEsZj17eTowLGQ6cyhoW2tiXSkqYyxoOnMoaFtsYl0pKmMsbTpzKGhbbWJdKSpjLHM6cyhoW25iXSkqYyxtczpzKGhbb2JdKSpjfSk6KGg9dWIuZXhlYyhhKSkmJihjPVwiLVwiPT09aFsxXT8tMToxLGU9ZnVuY3Rpb24oYSl7dmFyIGI9YSYmcGFyc2VGbG9hdChhLnJlcGxhY2UoXCIsXCIsXCIuXCIpKTtyZXR1cm4oaXNOYU4oYik/MDpiKSpjfSxmPXt5OmUoaFsyXSksTTplKGhbM10pLGQ6ZShoWzRdKSxoOmUoaFs1XSksbTplKGhbNl0pLHM6ZShoWzddKSx3OmUoaFs4XSl9KSxkPW5ldyBnKGYpLGRiLmlzRHVyYXRpb24oYSkmJmEuaGFzT3duUHJvcGVydHkoXCJfbGFuZ1wiKSYmKGQuX2xhbmc9YS5fbGFuZyksZH0sZGIudmVyc2lvbj1mYixkYi5kZWZhdWx0Rm9ybWF0PU5iLGRiLnVwZGF0ZU9mZnNldD1mdW5jdGlvbigpe30sZGIubGFuZz1mdW5jdGlvbihhLGIpe3ZhciBjO3JldHVybiBhPyhiP0EoeShhKSxiKTpudWxsPT09Yj8oQihhKSxhPVwiZW5cIik6cGJbYV18fEMoYSksYz1kYi5kdXJhdGlvbi5mbi5fbGFuZz1kYi5mbi5fbGFuZz1DKGEpLGMuX2FiYnIpOmRiLmZuLl9sYW5nLl9hYmJyfSxkYi5sYW5nRGF0YT1mdW5jdGlvbihhKXtyZXR1cm4gYSYmYS5fbGFuZyYmYS5fbGFuZy5fYWJiciYmKGE9YS5fbGFuZy5fYWJiciksQyhhKX0sZGIuaXNNb21lbnQ9ZnVuY3Rpb24oYSl7cmV0dXJuIGEgaW5zdGFuY2VvZiBmfHxudWxsIT1hJiZhLmhhc093blByb3BlcnR5KFwiX2lzQU1vbWVudE9iamVjdFwiKX0sZGIuaXNEdXJhdGlvbj1mdW5jdGlvbihhKXtyZXR1cm4gYSBpbnN0YW5jZW9mIGd9LGViPVpiLmxlbmd0aC0xO2ViPj0wOy0tZWIpcihaYltlYl0pO2ZvcihkYi5ub3JtYWxpemVVbml0cz1mdW5jdGlvbihhKXtyZXR1cm4gcChhKX0sZGIuaW52YWxpZD1mdW5jdGlvbihhKXt2YXIgYj1kYi51dGMoMC8wKTtyZXR1cm4gbnVsbCE9YT9oKGIuX3BmLGEpOmIuX3BmLnVzZXJJbnZhbGlkYXRlZD0hMCxifSxkYi5wYXJzZVpvbmU9ZnVuY3Rpb24oYSl7cmV0dXJuIGRiKGEpLnBhcnNlWm9uZSgpfSxoKGRiLmZuPWYucHJvdG90eXBlLHtjbG9uZTpmdW5jdGlvbigpe3JldHVybiBkYih0aGlzKX0sdmFsdWVPZjpmdW5jdGlvbigpe3JldHVybit0aGlzLl9kKzZlNCoodGhpcy5fb2Zmc2V0fHwwKX0sdW5peDpmdW5jdGlvbigpe3JldHVybiBNYXRoLmZsb29yKCt0aGlzLzFlMyl9LHRvU3RyaW5nOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY2xvbmUoKS5sYW5nKFwiZW5cIikuZm9ybWF0KFwiZGRkIE1NTSBERCBZWVlZIEhIOm1tOnNzIFtHTVRdWlpcIil9LHRvRGF0ZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9vZmZzZXQ/bmV3IERhdGUoK3RoaXMpOnRoaXMuX2R9LHRvSVNPU3RyaW5nOmZ1bmN0aW9uKCl7dmFyIGE9ZGIodGhpcykudXRjKCk7cmV0dXJuIDA8YS55ZWFyKCkmJmEueWVhcigpPD05OTk5P0YoYSxcIllZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl1cIik6RihhLFwiWVlZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdXCIpfSx0b0FycmF5OmZ1bmN0aW9uKCl7dmFyIGE9dGhpcztyZXR1cm5bYS55ZWFyKCksYS5tb250aCgpLGEuZGF0ZSgpLGEuaG91cnMoKSxhLm1pbnV0ZXMoKSxhLnNlY29uZHMoKSxhLm1pbGxpc2Vjb25kcygpXX0saXNWYWxpZDpmdW5jdGlvbigpe3JldHVybiB4KHRoaXMpfSxpc0RTVFNoaWZ0ZWQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fYT90aGlzLmlzVmFsaWQoKSYmbyh0aGlzLl9hLCh0aGlzLl9pc1VUQz9kYi51dGModGhpcy5fYSk6ZGIodGhpcy5fYSkpLnRvQXJyYXkoKSk+MDohMX0scGFyc2luZ0ZsYWdzOmZ1bmN0aW9uKCl7cmV0dXJuIGgoe30sdGhpcy5fcGYpfSxpbnZhbGlkQXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fcGYub3ZlcmZsb3d9LHV0YzpmdW5jdGlvbigpe3JldHVybiB0aGlzLnpvbmUoMCl9LGxvY2FsOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuem9uZSgwKSx0aGlzLl9pc1VUQz0hMSx0aGlzfSxmb3JtYXQ6ZnVuY3Rpb24oYSl7dmFyIGI9Rih0aGlzLGF8fGRiLmRlZmF1bHRGb3JtYXQpO3JldHVybiB0aGlzLmxhbmcoKS5wb3N0Zm9ybWF0KGIpfSxhZGQ6ZnVuY3Rpb24oYSxiKXt2YXIgYztyZXR1cm4gYz1cInN0cmluZ1wiPT10eXBlb2YgYT9kYi5kdXJhdGlvbigrYixhKTpkYi5kdXJhdGlvbihhLGIpLGwodGhpcyxjLDEpLHRoaXN9LHN1YnRyYWN0OmZ1bmN0aW9uKGEsYil7dmFyIGM7cmV0dXJuIGM9XCJzdHJpbmdcIj09dHlwZW9mIGE/ZGIuZHVyYXRpb24oK2IsYSk6ZGIuZHVyYXRpb24oYSxiKSxsKHRoaXMsYywtMSksdGhpc30sZGlmZjpmdW5jdGlvbihhLGIsYyl7dmFyIGQsZSxmPXooYSx0aGlzKSxnPTZlNCoodGhpcy56b25lKCktZi56b25lKCkpO3JldHVybiBiPXAoYiksXCJ5ZWFyXCI9PT1ifHxcIm1vbnRoXCI9PT1iPyhkPTQzMmU1Kih0aGlzLmRheXNJbk1vbnRoKCkrZi5kYXlzSW5Nb250aCgpKSxlPTEyKih0aGlzLnllYXIoKS1mLnllYXIoKSkrKHRoaXMubW9udGgoKS1mLm1vbnRoKCkpLGUrPSh0aGlzLWRiKHRoaXMpLnN0YXJ0T2YoXCJtb250aFwiKS0oZi1kYihmKS5zdGFydE9mKFwibW9udGhcIikpKS9kLGUtPTZlNCoodGhpcy56b25lKCktZGIodGhpcykuc3RhcnRPZihcIm1vbnRoXCIpLnpvbmUoKS0oZi56b25lKCktZGIoZikuc3RhcnRPZihcIm1vbnRoXCIpLnpvbmUoKSkpL2QsXCJ5ZWFyXCI9PT1iJiYoZS89MTIpKTooZD10aGlzLWYsZT1cInNlY29uZFwiPT09Yj9kLzFlMzpcIm1pbnV0ZVwiPT09Yj9kLzZlNDpcImhvdXJcIj09PWI/ZC8zNmU1OlwiZGF5XCI9PT1iPyhkLWcpLzg2NGU1Olwid2Vla1wiPT09Yj8oZC1nKS82MDQ4ZTU6ZCksYz9lOmooZSl9LGZyb206ZnVuY3Rpb24oYSxiKXtyZXR1cm4gZGIuZHVyYXRpb24odGhpcy5kaWZmKGEpKS5sYW5nKHRoaXMubGFuZygpLl9hYmJyKS5odW1hbml6ZSghYil9LGZyb21Ob3c6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuZnJvbShkYigpLGEpfSxjYWxlbmRhcjpmdW5jdGlvbigpe3ZhciBhPXooZGIoKSx0aGlzKS5zdGFydE9mKFwiZGF5XCIpLGI9dGhpcy5kaWZmKGEsXCJkYXlzXCIsITApLGM9LTY+Yj9cInNhbWVFbHNlXCI6LTE+Yj9cImxhc3RXZWVrXCI6MD5iP1wibGFzdERheVwiOjE+Yj9cInNhbWVEYXlcIjoyPmI/XCJuZXh0RGF5XCI6Nz5iP1wibmV4dFdlZWtcIjpcInNhbWVFbHNlXCI7cmV0dXJuIHRoaXMuZm9ybWF0KHRoaXMubGFuZygpLmNhbGVuZGFyKGMsdGhpcykpfSxpc0xlYXBZZWFyOmZ1bmN0aW9uKCl7cmV0dXJuIHYodGhpcy55ZWFyKCkpfSxpc0RTVDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnpvbmUoKTx0aGlzLmNsb25lKCkubW9udGgoMCkuem9uZSgpfHx0aGlzLnpvbmUoKTx0aGlzLmNsb25lKCkubW9udGgoNSkuem9uZSgpfSxkYXk6ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5faXNVVEM/dGhpcy5fZC5nZXRVVENEYXkoKTp0aGlzLl9kLmdldERheSgpO3JldHVybiBudWxsIT1hPyhhPVYoYSx0aGlzLmxhbmcoKSksdGhpcy5hZGQoe2Q6YS1ifSkpOmJ9LG1vbnRoOmZ1bmN0aW9uKGEpe3ZhciBiLGM9dGhpcy5faXNVVEM/XCJVVENcIjpcIlwiO3JldHVybiBudWxsIT1hP1wic3RyaW5nXCI9PXR5cGVvZiBhJiYoYT10aGlzLmxhbmcoKS5tb250aHNQYXJzZShhKSxcIm51bWJlclwiIT10eXBlb2YgYSk/dGhpczooYj10aGlzLmRhdGUoKSx0aGlzLmRhdGUoMSksdGhpcy5fZFtcInNldFwiK2MrXCJNb250aFwiXShhKSx0aGlzLmRhdGUoTWF0aC5taW4oYix0aGlzLmRheXNJbk1vbnRoKCkpKSxkYi51cGRhdGVPZmZzZXQodGhpcyksdGhpcyk6dGhpcy5fZFtcImdldFwiK2MrXCJNb250aFwiXSgpfSxzdGFydE9mOmZ1bmN0aW9uKGEpe3N3aXRjaChhPXAoYSkpe2Nhc2VcInllYXJcIjp0aGlzLm1vbnRoKDApO2Nhc2VcIm1vbnRoXCI6dGhpcy5kYXRlKDEpO2Nhc2VcIndlZWtcIjpjYXNlXCJpc29XZWVrXCI6Y2FzZVwiZGF5XCI6dGhpcy5ob3VycygwKTtjYXNlXCJob3VyXCI6dGhpcy5taW51dGVzKDApO2Nhc2VcIm1pbnV0ZVwiOnRoaXMuc2Vjb25kcygwKTtjYXNlXCJzZWNvbmRcIjp0aGlzLm1pbGxpc2Vjb25kcygwKX1yZXR1cm5cIndlZWtcIj09PWE/dGhpcy53ZWVrZGF5KDApOlwiaXNvV2Vla1wiPT09YSYmdGhpcy5pc29XZWVrZGF5KDEpLHRoaXN9LGVuZE9mOmZ1bmN0aW9uKGEpe3JldHVybiBhPXAoYSksdGhpcy5zdGFydE9mKGEpLmFkZChcImlzb1dlZWtcIj09PWE/XCJ3ZWVrXCI6YSwxKS5zdWJ0cmFjdChcIm1zXCIsMSl9LGlzQWZ0ZXI6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYj1cInVuZGVmaW5lZFwiIT10eXBlb2YgYj9iOlwibWlsbGlzZWNvbmRcIiwrdGhpcy5jbG9uZSgpLnN0YXJ0T2YoYik+K2RiKGEpLnN0YXJ0T2YoYil9LGlzQmVmb3JlOmZ1bmN0aW9uKGEsYil7cmV0dXJuIGI9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGI/YjpcIm1pbGxpc2Vjb25kXCIsK3RoaXMuY2xvbmUoKS5zdGFydE9mKGIpPCtkYihhKS5zdGFydE9mKGIpfSxpc1NhbWU6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYj1ifHxcIm1zXCIsK3RoaXMuY2xvbmUoKS5zdGFydE9mKGIpPT09K3ooYSx0aGlzKS5zdGFydE9mKGIpfSxtaW46ZnVuY3Rpb24oYSl7cmV0dXJuIGE9ZGIuYXBwbHkobnVsbCxhcmd1bWVudHMpLHRoaXM+YT90aGlzOmF9LG1heDpmdW5jdGlvbihhKXtyZXR1cm4gYT1kYi5hcHBseShudWxsLGFyZ3VtZW50cyksYT50aGlzP3RoaXM6YX0sem9uZTpmdW5jdGlvbihhKXt2YXIgYj10aGlzLl9vZmZzZXR8fDA7cmV0dXJuIG51bGw9PWE/dGhpcy5faXNVVEM/Yjp0aGlzLl9kLmdldFRpbWV6b25lT2Zmc2V0KCk6KFwic3RyaW5nXCI9PXR5cGVvZiBhJiYoYT1JKGEpKSxNYXRoLmFicyhhKTwxNiYmKGE9NjAqYSksdGhpcy5fb2Zmc2V0PWEsdGhpcy5faXNVVEM9ITAsYiE9PWEmJmwodGhpcyxkYi5kdXJhdGlvbihiLWEsXCJtXCIpLDEsITApLHRoaXMpfSx6b25lQWJicjpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9pc1VUQz9cIlVUQ1wiOlwiXCJ9LHpvbmVOYW1lOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2lzVVRDP1wiQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWVcIjpcIlwifSxwYXJzZVpvbmU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fdHptP3RoaXMuem9uZSh0aGlzLl90em0pOlwic3RyaW5nXCI9PXR5cGVvZiB0aGlzLl9pJiZ0aGlzLnpvbmUodGhpcy5faSksdGhpc30saGFzQWxpZ25lZEhvdXJPZmZzZXQ6ZnVuY3Rpb24oYSl7cmV0dXJuIGE9YT9kYihhKS56b25lKCk6MCwodGhpcy56b25lKCktYSklNjA9PT0wfSxkYXlzSW5Nb250aDpmdW5jdGlvbigpe3JldHVybiB0KHRoaXMueWVhcigpLHRoaXMubW9udGgoKSl9LGRheU9mWWVhcjpmdW5jdGlvbihhKXt2YXIgYj1oYigoZGIodGhpcykuc3RhcnRPZihcImRheVwiKS1kYih0aGlzKS5zdGFydE9mKFwieWVhclwiKSkvODY0ZTUpKzE7cmV0dXJuIG51bGw9PWE/Yjp0aGlzLmFkZChcImRcIixhLWIpfSxxdWFydGVyOmZ1bmN0aW9uKCl7cmV0dXJuIE1hdGguY2VpbCgodGhpcy5tb250aCgpKzEpLzMpfSx3ZWVrWWVhcjpmdW5jdGlvbihhKXt2YXIgYj1ZKHRoaXMsdGhpcy5sYW5nKCkuX3dlZWsuZG93LHRoaXMubGFuZygpLl93ZWVrLmRveSkueWVhcjtyZXR1cm4gbnVsbD09YT9iOnRoaXMuYWRkKFwieVwiLGEtYil9LGlzb1dlZWtZZWFyOmZ1bmN0aW9uKGEpe3ZhciBiPVkodGhpcywxLDQpLnllYXI7cmV0dXJuIG51bGw9PWE/Yjp0aGlzLmFkZChcInlcIixhLWIpfSx3ZWVrOmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMubGFuZygpLndlZWsodGhpcyk7cmV0dXJuIG51bGw9PWE/Yjp0aGlzLmFkZChcImRcIiw3KihhLWIpKX0saXNvV2VlazpmdW5jdGlvbihhKXt2YXIgYj1ZKHRoaXMsMSw0KS53ZWVrO3JldHVybiBudWxsPT1hP2I6dGhpcy5hZGQoXCJkXCIsNyooYS1iKSl9LHdlZWtkYXk6ZnVuY3Rpb24oYSl7dmFyIGI9KHRoaXMuZGF5KCkrNy10aGlzLmxhbmcoKS5fd2Vlay5kb3cpJTc7cmV0dXJuIG51bGw9PWE/Yjp0aGlzLmFkZChcImRcIixhLWIpfSxpc29XZWVrZGF5OmZ1bmN0aW9uKGEpe3JldHVybiBudWxsPT1hP3RoaXMuZGF5KCl8fDc6dGhpcy5kYXkodGhpcy5kYXkoKSU3P2E6YS03KX0sZ2V0OmZ1bmN0aW9uKGEpe3JldHVybiBhPXAoYSksdGhpc1thXSgpfSxzZXQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYT1wKGEpLFwiZnVuY3Rpb25cIj09dHlwZW9mIHRoaXNbYV0mJnRoaXNbYV0oYiksdGhpc30sbGFuZzpmdW5jdGlvbihiKXtyZXR1cm4gYj09PWE/dGhpcy5fbGFuZzoodGhpcy5fbGFuZz1DKGIpLHRoaXMpfX0pLGViPTA7ZWI8UmIubGVuZ3RoO2ViKyspXyhSYltlYl0udG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9zJC8sXCJcIiksUmJbZWJdKTtfKFwieWVhclwiLFwiRnVsbFllYXJcIiksZGIuZm4uZGF5cz1kYi5mbi5kYXksZGIuZm4ubW9udGhzPWRiLmZuLm1vbnRoLGRiLmZuLndlZWtzPWRiLmZuLndlZWssZGIuZm4uaXNvV2Vla3M9ZGIuZm4uaXNvV2VlayxkYi5mbi50b0pTT049ZGIuZm4udG9JU09TdHJpbmcsaChkYi5kdXJhdGlvbi5mbj1nLnByb3RvdHlwZSx7X2J1YmJsZTpmdW5jdGlvbigpe3ZhciBhLGIsYyxkLGU9dGhpcy5fbWlsbGlzZWNvbmRzLGY9dGhpcy5fZGF5cyxnPXRoaXMuX21vbnRocyxoPXRoaXMuX2RhdGE7aC5taWxsaXNlY29uZHM9ZSUxZTMsYT1qKGUvMWUzKSxoLnNlY29uZHM9YSU2MCxiPWooYS82MCksaC5taW51dGVzPWIlNjAsYz1qKGIvNjApLGguaG91cnM9YyUyNCxmKz1qKGMvMjQpLGguZGF5cz1mJTMwLGcrPWooZi8zMCksaC5tb250aHM9ZyUxMixkPWooZy8xMiksaC55ZWFycz1kfSx3ZWVrczpmdW5jdGlvbigpe3JldHVybiBqKHRoaXMuZGF5cygpLzcpfSx2YWx1ZU9mOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX21pbGxpc2Vjb25kcys4NjRlNSp0aGlzLl9kYXlzK3RoaXMuX21vbnRocyUxMioyNTkyZTYrMzE1MzZlNipzKHRoaXMuX21vbnRocy8xMil9LGh1bWFuaXplOmZ1bmN0aW9uKGEpe3ZhciBiPSt0aGlzLGM9WChiLCFhLHRoaXMubGFuZygpKTtyZXR1cm4gYSYmKGM9dGhpcy5sYW5nKCkucGFzdEZ1dHVyZShiLGMpKSx0aGlzLmxhbmcoKS5wb3N0Zm9ybWF0KGMpfSxhZGQ6ZnVuY3Rpb24oYSxiKXt2YXIgYz1kYi5kdXJhdGlvbihhLGIpO3JldHVybiB0aGlzLl9taWxsaXNlY29uZHMrPWMuX21pbGxpc2Vjb25kcyx0aGlzLl9kYXlzKz1jLl9kYXlzLHRoaXMuX21vbnRocys9Yy5fbW9udGhzLHRoaXMuX2J1YmJsZSgpLHRoaXN9LHN1YnRyYWN0OmZ1bmN0aW9uKGEsYil7dmFyIGM9ZGIuZHVyYXRpb24oYSxiKTtyZXR1cm4gdGhpcy5fbWlsbGlzZWNvbmRzLT1jLl9taWxsaXNlY29uZHMsdGhpcy5fZGF5cy09Yy5fZGF5cyx0aGlzLl9tb250aHMtPWMuX21vbnRocyx0aGlzLl9idWJibGUoKSx0aGlzfSxnZXQ6ZnVuY3Rpb24oYSl7cmV0dXJuIGE9cChhKSx0aGlzW2EudG9Mb3dlckNhc2UoKStcInNcIl0oKX0sYXM6ZnVuY3Rpb24oYSl7cmV0dXJuIGE9cChhKSx0aGlzW1wiYXNcIithLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpK2Euc2xpY2UoMSkrXCJzXCJdKCl9LGxhbmc6ZGIuZm4ubGFuZyx0b0lzb1N0cmluZzpmdW5jdGlvbigpe3ZhciBhPU1hdGguYWJzKHRoaXMueWVhcnMoKSksYj1NYXRoLmFicyh0aGlzLm1vbnRocygpKSxjPU1hdGguYWJzKHRoaXMuZGF5cygpKSxkPU1hdGguYWJzKHRoaXMuaG91cnMoKSksZT1NYXRoLmFicyh0aGlzLm1pbnV0ZXMoKSksZj1NYXRoLmFicyh0aGlzLnNlY29uZHMoKSt0aGlzLm1pbGxpc2Vjb25kcygpLzFlMyk7cmV0dXJuIHRoaXMuYXNTZWNvbmRzKCk/KHRoaXMuYXNTZWNvbmRzKCk8MD9cIi1cIjpcIlwiKStcIlBcIisoYT9hK1wiWVwiOlwiXCIpKyhiP2IrXCJNXCI6XCJcIikrKGM/YytcIkRcIjpcIlwiKSsoZHx8ZXx8Zj9cIlRcIjpcIlwiKSsoZD9kK1wiSFwiOlwiXCIpKyhlP2UrXCJNXCI6XCJcIikrKGY/ZitcIlNcIjpcIlwiKTpcIlAwRFwifX0pO2ZvcihlYiBpbiBTYilTYi5oYXNPd25Qcm9wZXJ0eShlYikmJihiYihlYixTYltlYl0pLGFiKGViLnRvTG93ZXJDYXNlKCkpKTtiYihcIldlZWtzXCIsNjA0OGU1KSxkYi5kdXJhdGlvbi5mbi5hc01vbnRocz1mdW5jdGlvbigpe3JldHVybigrdGhpcy0zMTUzNmU2KnRoaXMueWVhcnMoKSkvMjU5MmU2KzEyKnRoaXMueWVhcnMoKX0sZGIubGFuZyhcImVuXCIse29yZGluYWw6ZnVuY3Rpb24oYSl7dmFyIGI9YSUxMCxjPTE9PT1zKGElMTAwLzEwKT9cInRoXCI6MT09PWI/XCJzdFwiOjI9PT1iP1wibmRcIjozPT09Yj9cInJkXCI6XCJ0aFwiO3JldHVybiBhK2N9fSkscmI/KG1vZHVsZS5leHBvcnRzPWRiLGNiKCEwKSk6XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcIm1vbWVudFwiLGZ1bmN0aW9uKGIsYyxkKXtyZXR1cm4gZC5jb25maWcmJmQuY29uZmlnKCkmJmQuY29uZmlnKCkubm9HbG9iYWwhPT0hMCYmY2IoZC5jb25maWcoKS5ub0dsb2JhbD09PWEpLGRifSk6Y2IoKX0pLmNhbGwodGhpcyk7IiwiLyogbW91c2V0cmFwIHYxLjQuNiBjcmFpZy5pcy9raWxsaW5nL21pY2UgKi9cbihmdW5jdGlvbihKLHIsZil7ZnVuY3Rpb24gcyhhLGIsZCl7YS5hZGRFdmVudExpc3RlbmVyP2EuYWRkRXZlbnRMaXN0ZW5lcihiLGQsITEpOmEuYXR0YWNoRXZlbnQoXCJvblwiK2IsZCl9ZnVuY3Rpb24gQShhKXtpZihcImtleXByZXNzXCI9PWEudHlwZSl7dmFyIGI9U3RyaW5nLmZyb21DaGFyQ29kZShhLndoaWNoKTthLnNoaWZ0S2V5fHwoYj1iLnRvTG93ZXJDYXNlKCkpO3JldHVybiBifXJldHVybiBoW2Eud2hpY2hdP2hbYS53aGljaF06QlthLndoaWNoXT9CW2Eud2hpY2hdOlN0cmluZy5mcm9tQ2hhckNvZGUoYS53aGljaCkudG9Mb3dlckNhc2UoKX1mdW5jdGlvbiB0KGEpe2E9YXx8e307dmFyIGI9ITEsZDtmb3IoZCBpbiBuKWFbZF0/Yj0hMDpuW2RdPTA7Ynx8KHU9ITEpfWZ1bmN0aW9uIEMoYSxiLGQsYyxlLHYpe3ZhciBnLGssZj1bXSxoPWQudHlwZTtpZighbFthXSlyZXR1cm5bXTtcImtleXVwXCI9PWgmJncoYSkmJihiPVthXSk7Zm9yKGc9MDtnPGxbYV0ubGVuZ3RoOysrZylpZihrPVxubFthXVtnXSwhKCFjJiZrLnNlcSYmbltrLnNlcV0hPWsubGV2ZWx8fGghPWsuYWN0aW9ufHwoXCJrZXlwcmVzc1wiIT1ofHxkLm1ldGFLZXl8fGQuY3RybEtleSkmJmIuc29ydCgpLmpvaW4oXCIsXCIpIT09ay5tb2RpZmllcnMuc29ydCgpLmpvaW4oXCIsXCIpKSl7dmFyIG09YyYmay5zZXE9PWMmJmsubGV2ZWw9PXY7KCFjJiZrLmNvbWJvPT1lfHxtKSYmbFthXS5zcGxpY2UoZywxKTtmLnB1c2goayl9cmV0dXJuIGZ9ZnVuY3Rpb24gSyhhKXt2YXIgYj1bXTthLnNoaWZ0S2V5JiZiLnB1c2goXCJzaGlmdFwiKTthLmFsdEtleSYmYi5wdXNoKFwiYWx0XCIpO2EuY3RybEtleSYmYi5wdXNoKFwiY3RybFwiKTthLm1ldGFLZXkmJmIucHVzaChcIm1ldGFcIik7cmV0dXJuIGJ9ZnVuY3Rpb24geChhLGIsZCxjKXttLnN0b3BDYWxsYmFjayhiLGIudGFyZ2V0fHxiLnNyY0VsZW1lbnQsZCxjKXx8ITEhPT1hKGIsZCl8fChiLnByZXZlbnREZWZhdWx0P2IucHJldmVudERlZmF1bHQoKTpiLnJldHVyblZhbHVlPSExLGIuc3RvcFByb3BhZ2F0aW9uP1xuYi5zdG9wUHJvcGFnYXRpb24oKTpiLmNhbmNlbEJ1YmJsZT0hMCl9ZnVuY3Rpb24geShhKXtcIm51bWJlclwiIT09dHlwZW9mIGEud2hpY2gmJihhLndoaWNoPWEua2V5Q29kZSk7dmFyIGI9QShhKTtiJiYoXCJrZXl1cFwiPT1hLnR5cGUmJno9PT1iP3o9ITE6bS5oYW5kbGVLZXkoYixLKGEpLGEpKX1mdW5jdGlvbiB3KGEpe3JldHVyblwic2hpZnRcIj09YXx8XCJjdHJsXCI9PWF8fFwiYWx0XCI9PWF8fFwibWV0YVwiPT1hfWZ1bmN0aW9uIEwoYSxiLGQsYyl7ZnVuY3Rpb24gZShiKXtyZXR1cm4gZnVuY3Rpb24oKXt1PWI7KytuW2FdO2NsZWFyVGltZW91dChEKTtEPXNldFRpbWVvdXQodCwxRTMpfX1mdW5jdGlvbiB2KGIpe3goZCxiLGEpO1wia2V5dXBcIiE9PWMmJih6PUEoYikpO3NldFRpbWVvdXQodCwxMCl9Zm9yKHZhciBnPW5bYV09MDtnPGIubGVuZ3RoOysrZyl7dmFyIGY9ZysxPT09Yi5sZW5ndGg/djplKGN8fEUoYltnKzFdKS5hY3Rpb24pO0YoYltnXSxmLGMsYSxnKX19ZnVuY3Rpb24gRShhLGIpe3ZhciBkLFxuYyxlLGY9W107ZD1cIitcIj09PWE/W1wiK1wiXTphLnNwbGl0KFwiK1wiKTtmb3IoZT0wO2U8ZC5sZW5ndGg7KytlKWM9ZFtlXSxHW2NdJiYoYz1HW2NdKSxiJiZcImtleXByZXNzXCIhPWImJkhbY10mJihjPUhbY10sZi5wdXNoKFwic2hpZnRcIikpLHcoYykmJmYucHVzaChjKTtkPWM7ZT1iO2lmKCFlKXtpZighcCl7cD17fTtmb3IodmFyIGcgaW4gaCk5NTxnJiYxMTI+Z3x8aC5oYXNPd25Qcm9wZXJ0eShnKSYmKHBbaFtnXV09Zyl9ZT1wW2RdP1wia2V5ZG93blwiOlwia2V5cHJlc3NcIn1cImtleXByZXNzXCI9PWUmJmYubGVuZ3RoJiYoZT1cImtleWRvd25cIik7cmV0dXJue2tleTpjLG1vZGlmaWVyczpmLGFjdGlvbjplfX1mdW5jdGlvbiBGKGEsYixkLGMsZSl7cVthK1wiOlwiK2RdPWI7YT1hLnJlcGxhY2UoL1xccysvZyxcIiBcIik7dmFyIGY9YS5zcGxpdChcIiBcIik7MTxmLmxlbmd0aD9MKGEsZixiLGQpOihkPUUoYSxkKSxsW2Qua2V5XT1sW2Qua2V5XXx8W10sQyhkLmtleSxkLm1vZGlmaWVycyx7dHlwZTpkLmFjdGlvbn0sXG5jLGEsZSksbFtkLmtleV1bYz9cInVuc2hpZnRcIjpcInB1c2hcIl0oe2NhbGxiYWNrOmIsbW9kaWZpZXJzOmQubW9kaWZpZXJzLGFjdGlvbjpkLmFjdGlvbixzZXE6YyxsZXZlbDplLGNvbWJvOmF9KSl9dmFyIGg9ezg6XCJiYWNrc3BhY2VcIiw5OlwidGFiXCIsMTM6XCJlbnRlclwiLDE2Olwic2hpZnRcIiwxNzpcImN0cmxcIiwxODpcImFsdFwiLDIwOlwiY2Fwc2xvY2tcIiwyNzpcImVzY1wiLDMyOlwic3BhY2VcIiwzMzpcInBhZ2V1cFwiLDM0OlwicGFnZWRvd25cIiwzNTpcImVuZFwiLDM2OlwiaG9tZVwiLDM3OlwibGVmdFwiLDM4OlwidXBcIiwzOTpcInJpZ2h0XCIsNDA6XCJkb3duXCIsNDU6XCJpbnNcIiw0NjpcImRlbFwiLDkxOlwibWV0YVwiLDkzOlwibWV0YVwiLDIyNDpcIm1ldGFcIn0sQj17MTA2OlwiKlwiLDEwNzpcIitcIiwxMDk6XCItXCIsMTEwOlwiLlwiLDExMTpcIi9cIiwxODY6XCI7XCIsMTg3OlwiPVwiLDE4ODpcIixcIiwxODk6XCItXCIsMTkwOlwiLlwiLDE5MTpcIi9cIiwxOTI6XCJgXCIsMjE5OlwiW1wiLDIyMDpcIlxcXFxcIiwyMjE6XCJdXCIsMjIyOlwiJ1wifSxIPXtcIn5cIjpcImBcIixcIiFcIjpcIjFcIixcblwiQFwiOlwiMlwiLFwiI1wiOlwiM1wiLCQ6XCI0XCIsXCIlXCI6XCI1XCIsXCJeXCI6XCI2XCIsXCImXCI6XCI3XCIsXCIqXCI6XCI4XCIsXCIoXCI6XCI5XCIsXCIpXCI6XCIwXCIsXzpcIi1cIixcIitcIjpcIj1cIixcIjpcIjpcIjtcIiwnXCInOlwiJ1wiLFwiPFwiOlwiLFwiLFwiPlwiOlwiLlwiLFwiP1wiOlwiL1wiLFwifFwiOlwiXFxcXFwifSxHPXtvcHRpb246XCJhbHRcIixjb21tYW5kOlwibWV0YVwiLFwicmV0dXJuXCI6XCJlbnRlclwiLGVzY2FwZTpcImVzY1wiLG1vZDovTWFjfGlQb2R8aVBob25lfGlQYWQvLnRlc3QobmF2aWdhdG9yLnBsYXRmb3JtKT9cIm1ldGFcIjpcImN0cmxcIn0scCxsPXt9LHE9e30sbj17fSxELHo9ITEsST0hMSx1PSExO2ZvcihmPTE7MjA+ZjsrK2YpaFsxMTErZl09XCJmXCIrZjtmb3IoZj0wOzk+PWY7KytmKWhbZis5Nl09ZjtzKHIsXCJrZXlwcmVzc1wiLHkpO3MocixcImtleWRvd25cIix5KTtzKHIsXCJrZXl1cFwiLHkpO3ZhciBtPXtiaW5kOmZ1bmN0aW9uKGEsYixkKXthPWEgaW5zdGFuY2VvZiBBcnJheT9hOlthXTtmb3IodmFyIGM9MDtjPGEubGVuZ3RoOysrYylGKGFbY10sYixkKTtyZXR1cm4gdGhpc30sXG51bmJpbmQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gbS5iaW5kKGEsZnVuY3Rpb24oKXt9LGIpfSx0cmlnZ2VyOmZ1bmN0aW9uKGEsYil7aWYocVthK1wiOlwiK2JdKXFbYStcIjpcIitiXSh7fSxhKTtyZXR1cm4gdGhpc30scmVzZXQ6ZnVuY3Rpb24oKXtsPXt9O3E9e307cmV0dXJuIHRoaXN9LHN0b3BDYWxsYmFjazpmdW5jdGlvbihhLGIpe3JldHVybi0xPChcIiBcIitiLmNsYXNzTmFtZStcIiBcIikuaW5kZXhPZihcIiBtb3VzZXRyYXAgXCIpPyExOlwiSU5QVVRcIj09Yi50YWdOYW1lfHxcIlNFTEVDVFwiPT1iLnRhZ05hbWV8fFwiVEVYVEFSRUFcIj09Yi50YWdOYW1lfHxiLmlzQ29udGVudEVkaXRhYmxlfSxoYW5kbGVLZXk6ZnVuY3Rpb24oYSxiLGQpe3ZhciBjPUMoYSxiLGQpLGU7Yj17fTt2YXIgZj0wLGc9ITE7Zm9yKGU9MDtlPGMubGVuZ3RoOysrZSljW2VdLnNlcSYmKGY9TWF0aC5tYXgoZixjW2VdLmxldmVsKSk7Zm9yKGU9MDtlPGMubGVuZ3RoOysrZSljW2VdLnNlcT9jW2VdLmxldmVsPT1mJiYoZz0hMCxcbmJbY1tlXS5zZXFdPTEseChjW2VdLmNhbGxiYWNrLGQsY1tlXS5jb21ibyxjW2VdLnNlcSkpOmd8fHgoY1tlXS5jYWxsYmFjayxkLGNbZV0uY29tYm8pO2M9XCJrZXlwcmVzc1wiPT1kLnR5cGUmJkk7ZC50eXBlIT11fHx3KGEpfHxjfHx0KGIpO0k9ZyYmXCJrZXlkb3duXCI9PWQudHlwZX19O0ouTW91c2V0cmFwPW07XCJmdW5jdGlvblwiPT09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZCYmZGVmaW5lKG0pfSkod2luZG93LGRvY3VtZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cuTW91c2V0cmFwO1xud2luZG93Lk1vdXNldHJhcCA9IG51bGw7IiwiLypcblxuIEpTIFNpZ25hbHMgPGh0dHA6Ly9taWxsZXJtZWRlaXJvcy5naXRodWIuY29tL2pzLXNpZ25hbHMvPlxuIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuIEF1dGhvcjogTWlsbGVyIE1lZGVpcm9zXG4gVmVyc2lvbjogMS4wLjAgLSBCdWlsZDogMjY4ICgyMDEyLzExLzI5IDA1OjQ4IFBNKVxuKi9cbihmdW5jdGlvbihpKXtmdW5jdGlvbiBoKGEsYixjLGQsZSl7dGhpcy5fbGlzdGVuZXI9Yjt0aGlzLl9pc09uY2U9Yzt0aGlzLmNvbnRleHQ9ZDt0aGlzLl9zaWduYWw9YTt0aGlzLl9wcmlvcml0eT1lfHwwfWZ1bmN0aW9uIGcoYSxiKXtpZih0eXBlb2YgYSE9PVwiZnVuY3Rpb25cIil0aHJvdyBFcnJvcihcImxpc3RlbmVyIGlzIGEgcmVxdWlyZWQgcGFyYW0gb2Yge2ZufSgpIGFuZCBzaG91bGQgYmUgYSBGdW5jdGlvbi5cIi5yZXBsYWNlKFwie2ZufVwiLGIpKTt9ZnVuY3Rpb24gZSgpe3RoaXMuX2JpbmRpbmdzPVtdO3RoaXMuX3ByZXZQYXJhbXM9bnVsbDt2YXIgYT10aGlzO3RoaXMuZGlzcGF0Y2g9ZnVuY3Rpb24oKXtlLnByb3RvdHlwZS5kaXNwYXRjaC5hcHBseShhLGFyZ3VtZW50cyl9fWgucHJvdG90eXBlPXthY3RpdmU6ITAscGFyYW1zOm51bGwsZXhlY3V0ZTpmdW5jdGlvbihhKXt2YXIgYjt0aGlzLmFjdGl2ZSYmdGhpcy5fbGlzdGVuZXImJihhPXRoaXMucGFyYW1zP3RoaXMucGFyYW1zLmNvbmNhdChhKTpcbmEsYj10aGlzLl9saXN0ZW5lci5hcHBseSh0aGlzLmNvbnRleHQsYSksdGhpcy5faXNPbmNlJiZ0aGlzLmRldGFjaCgpKTtyZXR1cm4gYn0sZGV0YWNoOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNCb3VuZCgpP3RoaXMuX3NpZ25hbC5yZW1vdmUodGhpcy5fbGlzdGVuZXIsdGhpcy5jb250ZXh0KTpudWxsfSxpc0JvdW5kOmZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLl9zaWduYWwmJiEhdGhpcy5fbGlzdGVuZXJ9LGlzT25jZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9pc09uY2V9LGdldExpc3RlbmVyOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2xpc3RlbmVyfSxnZXRTaWduYWw6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fc2lnbmFsfSxfZGVzdHJveTpmdW5jdGlvbigpe2RlbGV0ZSB0aGlzLl9zaWduYWw7ZGVsZXRlIHRoaXMuX2xpc3RlbmVyO2RlbGV0ZSB0aGlzLmNvbnRleHR9LHRvU3RyaW5nOmZ1bmN0aW9uKCl7cmV0dXJuXCJbU2lnbmFsQmluZGluZyBpc09uY2U6XCIrdGhpcy5faXNPbmNlK1xuXCIsIGlzQm91bmQ6XCIrdGhpcy5pc0JvdW5kKCkrXCIsIGFjdGl2ZTpcIit0aGlzLmFjdGl2ZStcIl1cIn19O2UucHJvdG90eXBlPXtWRVJTSU9OOlwiMS4wLjBcIixtZW1vcml6ZTohMSxfc2hvdWxkUHJvcGFnYXRlOiEwLGFjdGl2ZTohMCxfcmVnaXN0ZXJMaXN0ZW5lcjpmdW5jdGlvbihhLGIsYyxkKXt2YXIgZT10aGlzLl9pbmRleE9mTGlzdGVuZXIoYSxjKTtpZihlIT09LTEpe2lmKGE9dGhpcy5fYmluZGluZ3NbZV0sYS5pc09uY2UoKSE9PWIpdGhyb3cgRXJyb3IoXCJZb3UgY2Fubm90IGFkZFwiKyhiP1wiXCI6XCJPbmNlXCIpK1wiKCkgdGhlbiBhZGRcIisoIWI/XCJcIjpcIk9uY2VcIikrXCIoKSB0aGUgc2FtZSBsaXN0ZW5lciB3aXRob3V0IHJlbW92aW5nIHRoZSByZWxhdGlvbnNoaXAgZmlyc3QuXCIpO31lbHNlIGE9bmV3IGgodGhpcyxhLGIsYyxkKSx0aGlzLl9hZGRCaW5kaW5nKGEpO3RoaXMubWVtb3JpemUmJnRoaXMuX3ByZXZQYXJhbXMmJmEuZXhlY3V0ZSh0aGlzLl9wcmV2UGFyYW1zKTtyZXR1cm4gYX0sXG5fYWRkQmluZGluZzpmdW5jdGlvbihhKXt2YXIgYj10aGlzLl9iaW5kaW5ncy5sZW5ndGg7ZG8tLWI7d2hpbGUodGhpcy5fYmluZGluZ3NbYl0mJmEuX3ByaW9yaXR5PD10aGlzLl9iaW5kaW5nc1tiXS5fcHJpb3JpdHkpO3RoaXMuX2JpbmRpbmdzLnNwbGljZShiKzEsMCxhKX0sX2luZGV4T2ZMaXN0ZW5lcjpmdW5jdGlvbihhLGIpe2Zvcih2YXIgYz10aGlzLl9iaW5kaW5ncy5sZW5ndGgsZDtjLS07KWlmKGQ9dGhpcy5fYmluZGluZ3NbY10sZC5fbGlzdGVuZXI9PT1hJiZkLmNvbnRleHQ9PT1iKXJldHVybiBjO3JldHVybi0xfSxoYXM6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGEsYikhPT0tMX0sYWRkOmZ1bmN0aW9uKGEsYixjKXtnKGEsXCJhZGRcIik7cmV0dXJuIHRoaXMuX3JlZ2lzdGVyTGlzdGVuZXIoYSwhMSxiLGMpfSxhZGRPbmNlOmZ1bmN0aW9uKGEsYixjKXtnKGEsXCJhZGRPbmNlXCIpO3JldHVybiB0aGlzLl9yZWdpc3Rlckxpc3RlbmVyKGEsXG4hMCxiLGMpfSxyZW1vdmU6ZnVuY3Rpb24oYSxiKXtnKGEsXCJyZW1vdmVcIik7dmFyIGM9dGhpcy5faW5kZXhPZkxpc3RlbmVyKGEsYik7YyE9PS0xJiYodGhpcy5fYmluZGluZ3NbY10uX2Rlc3Ryb3koKSx0aGlzLl9iaW5kaW5ncy5zcGxpY2UoYywxKSk7cmV0dXJuIGF9LHJlbW92ZUFsbDpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLl9iaW5kaW5ncy5sZW5ndGg7YS0tOyl0aGlzLl9iaW5kaW5nc1thXS5fZGVzdHJveSgpO3RoaXMuX2JpbmRpbmdzLmxlbmd0aD0wfSxnZXROdW1MaXN0ZW5lcnM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fYmluZGluZ3MubGVuZ3RofSxoYWx0OmZ1bmN0aW9uKCl7dGhpcy5fc2hvdWxkUHJvcGFnYXRlPSExfSxkaXNwYXRjaDpmdW5jdGlvbihhKXtpZih0aGlzLmFjdGl2ZSl7dmFyIGI9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxjPXRoaXMuX2JpbmRpbmdzLmxlbmd0aCxkO2lmKHRoaXMubWVtb3JpemUpdGhpcy5fcHJldlBhcmFtcz1cbmI7aWYoYyl7ZD10aGlzLl9iaW5kaW5ncy5zbGljZSgpO3RoaXMuX3Nob3VsZFByb3BhZ2F0ZT0hMDtkbyBjLS07d2hpbGUoZFtjXSYmdGhpcy5fc2hvdWxkUHJvcGFnYXRlJiZkW2NdLmV4ZWN1dGUoYikhPT0hMSl9fX0sZm9yZ2V0OmZ1bmN0aW9uKCl7dGhpcy5fcHJldlBhcmFtcz1udWxsfSxkaXNwb3NlOmZ1bmN0aW9uKCl7dGhpcy5yZW1vdmVBbGwoKTtkZWxldGUgdGhpcy5fYmluZGluZ3M7ZGVsZXRlIHRoaXMuX3ByZXZQYXJhbXN9LHRvU3RyaW5nOmZ1bmN0aW9uKCl7cmV0dXJuXCJbU2lnbmFsIGFjdGl2ZTpcIit0aGlzLmFjdGl2ZStcIiBudW1MaXN0ZW5lcnM6XCIrdGhpcy5nZXROdW1MaXN0ZW5lcnMoKStcIl1cIn19O3ZhciBmPWU7Zi5TaWduYWw9ZTt0eXBlb2YgZGVmaW5lPT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kP2RlZmluZShmdW5jdGlvbigpe3JldHVybiBmfSk6dHlwZW9mIG1vZHVsZSE9PVwidW5kZWZpbmVkXCImJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWY6aS5zaWduYWxzPVxuZn0pKHRoaXMpOyIsbnVsbF19
