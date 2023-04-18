$(document).ready(function(){
    // close preloader
	preloader(0);
    // check for backtotop button
	$(window).on("scroll",function(){
		var sc = $(window).scrollTop();
		if(sc > 200){
			$("#backToTop").fadeIn();
		}
		else{
			$("#backToTop").fadeOut();
		}
	});
});

/* begin audio api */
var audio = new Audio;
audio.crossOrigin = "anonymous";
audio.defaultMuted=false;
audio.volume = 1;
audio.addEventListener("play",function(e){
	$(audiobtn).children().first().removeClass("fa-play").addClass("fa-pause");
	$(audiobtn).attr("onclick","audPause()");
});
audio.addEventListener("error",function(e){
	$(audiobtn).children().first().removeClass("fa-pause").addClass("fa-play");
	$(audiobtn).attr("onclick","audPlay(this)");
	Err("AUDIO ERROR OCCURRED <br> CODE: "+e.target.error.code);
});
audio.addEventListener("ended",function(e){
	$(audiobtn).children().first().removeClass("fa-pause").addClass("fa-play");
	$(audiobtn).attr("onclick","audPlay(this)");
});
audio.addEventListener("pause",function(e){
	$(audiobtn).children().first().removeClass("fa-pause").addClass("fa-play");
	$(audiobtn).attr("onclick","audReplay()");
});
audio.autoplay=true;
var audiobtn;
var audiobtns = [];
function audPause(){
	audio.pause();
}
function audReplay(){
	audio.play();
}
function audPlay(btn){
	audiobtns.forEach(function(ab){
		$('button[data-src="'+ab+'"]').children().first().removeClass("fa-pause").addClass("fa-play");
		$('button[data-src="'+ab+'"]').attr("onclick","audPlay(this)");
	});
	audiobtns = [];
	var src = $(btn).attr("data-src");
	src = "/pipeaud?q="+src.toString();
	audio.src = src;
	audio.play();
	audiobtn = btn;
	audiobtns.push(src);
}
/* end audio api */

function img_res(){$(".img_res").each(function(){var e=$(this).width();$(this).height()<=e?$(this).css("width","auto").css("height","100%"):$(this).css("width","100%").css("height","auto"),$(this).css("opacity","1")})}

//the following variable and function returns readable of time difference between timestamp passsed and current time
var timex=0;
function timer(date){
	if(parseInt(date).toString() != 'NaN'){
		var dnow = Number(timex);
		var seconds = Math.floor((dnow - date) / 1000);

		var interval = Math.floor(seconds / 31536000);

		if (interval > 1) {
		return interval + "years";
		}
		interval = Math.floor(seconds / 2592000);
		if (interval > 1) {
		return interval + " months";
		}
		interval = Math.floor(seconds / 86400);
		if (interval > 1) {
		return interval + " days";
		}
		interval = Math.floor(seconds / 3600);
		if (interval > 1) {
		return interval + " hours";
		}
		interval = Math.floor(seconds / 60);
		if (interval > 1) {
		return interval + " minutes";
		}
		return Math.floor(seconds) + " seconds ago";
	}
	else{
		return "Welcome Message";
	}
}

// this clones an array
function clone(x){
	return JSON.parse(JSON.stringify(x));
}

//preloader function
function preloader(a){
	if(a == 1){
		$("#preloader").show();
	}
	if(a == 0){
		$("#preloader").hide();
	}
}

//open tabs record
var visited = [];

//function to open tab
function tab(a){
	$('.tab').fadeOut(100);
	$("#tab-"+a).fadeIn(100);
	var obj = "tab('"+a.toString()+"')";
	var last = visited.length - 1;
	if(obj == visited[last]){
		visited.pop();
	}
	visited.push(obj);
	if(a == "search"){
		$("#search").focus();
	}
	img_res();
	$("body").addClass("stop");
	if(a == "search"){
		$("#searchinp").focus();
	}
}

//function to close tab
function cli(a){
	$(".tab").fadeOut(100);
	visited.pop();
	var last = visited.length - 1;
	eval(visited[last]);
	$("body").removeClass("stop");
}


// back top top func
function backToTop(){
	$(window).scrollTop(0);
}

// opens an empty bootbox dialog with a title
function dia(obj){
	var htm = '<div class="headery no-bg"><p class="light-black">'+obj.title+'</p><button onclick="bootbox.hideAll()" class="grey no-bg"><i class="fa fa-close"></i></button></div>'+obj.html;
	bootbox.dialog({
		closeButton:false,
		message:htm
	});
}

// custom alert pop-ups
function Err(err){
	bootbox.alert("<h3 class='text-danger panH2'>Error</h3><p class='panP light-black'>"+err+"</p>");
}
function Succ(succ){
	bootbox.alert("<h3 class='text-success panH2'>Success</h3><p class='panP light-black'>"+succ+"</p>");
}
function Info(info){
	bootbox.alert("<h3 class='text-info	text-primary panH2'>Info</h3><p class='panP light-black'>"+info+"</p>");
}
function Confirm(quest,callback,closeBtn){
	var htm = '<div class="wide no-bg"><p class="panP light-bottom padten black wide">'+quest+'</p><div class="wide text-right"><button class="btn btn-default marfive" onclick="confcall(true)">Yes</button><button onclick="confcall(false)" class="btn btn-default marfive">No</button></div></div>';
	window.confirmx = callback;
	bootbox.dialog({
		message:htm,
		closeButton:closeBtn,
		locale:'en',
		callback:function(re){
			confcall(false);
		},
		onEscape:false
	});
}

function confcall(res){
	unboot();
	confirmx(res);
}

function unboot(){
	bootbox.hideAll();
}

// checks whether browser accepts local/session storage
function checkForStorage(){
	if(typeof(Storage) !== "undefined") {
		return true;
	} else {
		return false;
	}
}

// removes html entities from strings to be displayed in browser
function entities(str){
	var rep = str.replace(/</g,"&lt;").replace(/>/g,"&gt;")
	.replace(/"/g,"&quot;")
	.replace(/'/g,"&apos;")
	.replace(/\n/g,"<br>");
	return rep;
}

// uploader functions
function upl(val){
	$("#upl").text(val.toString() + "%").attr("aria-valuenow",val.toString()).css("width",val.toString() + "%");
}
function uploader(n){
	upl(0);
	if(n == 1){
		$("#uploader").show();
	}
	if(n == 0){
		$("#uploader").hide();
	}
}


// checks whether param is an array
function isArray(x) {
    return x.constructor.toString().indexOf("Array") > -1;
}

// note component functions: customised bottom pop ups display
function note(htm,mill){
	if(htm != ""){
		if(window.noteTO != "undefined"){
			clearTimeout(window.noteTO);
			delete window.noteTO;
		}
		if(window.noteON != "undefined"){
			clearTimeout(window.noteON);
			delete window.noteON;
		}
		var n = document.getElementById("note");
		if(n != null){
		var c = n.classList.toString();
		if(c.match(/active/gi) != null){
			closeNote();
			window.noteON = setTimeout(note,500,htm,mill);
		}
		else{
			$("#noti").html(htm);
			openNote();
			if(mill != 0){
				window.noteTO = setTimeout(closeNote,mill);
			}
		}
		}
	}
}
function openNote(){
	$("#note").addClass("active");
}
function closeNote(){
	var n = document.getElementById("note");
	if(n != null){
	var c = n.classList.toString();
	if(c.match(/active/gi) != null){
		$("#note").removeClass("active");
	}
	if(window.noteTO != "undefined"){
		clearTimeout(window.noteTo);
		delete window.noteTO;
	}
	if(window.noteON != "undefined"){
		clearTimeout(window.noteON);
		delete window.noteON;
	}
	}
}
function muteNote(){
	Confirm("are you sure you want to mute notifications?<br><small>(you will not be getting important notifications until you reload this page)</small>",function(result){
		if(result){
			closeNote();
			setTimeout(function(){
				$("#note").detach();
			},500);
		}
	},false);
}


// function to add commas to a number
function addComs(x) {
	var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// function to make a string url-ready
function sanitize(strin) {
    return strin.trim() // Remove surrounding whitespace.
    .toLowerCase() // Lowercase.
    .replace(/[^a-z0-9]+/g,'-') // Find everything that is not a lowercase letter or number, one or more times, globally, and replace it with a dash.
    .replace(/^-+/, '') // Remove all dashes from the beginning of the string.
    .replace(/-+$/, ''); // Remove all dashes from the end of the string.
}

//anchor for non anchor tags
function link(n){
	window.location = n;
}


//generates a readable date string from param timestamp
function dateFromTimestamp(ts){
	var ee = Number(ts);
	var a = new Date(ee);
	var dd = a.getDate();
	var mm = a.getMonth();
	var yyyy = a.getFullYear();
	var hh = a.getHours();
	var am;
	if(hh > 11){
		am = "PM";
		if(hh > 12){
			hh = hh - 12;
		}
	}
	else{
		am = "AM";
		if(hh < 1){
			hh = 12;
		}
	}
	var mx = a.getMinutes();
	if(hh.toString().length == 1){
		hh = "0" + hh;
	}
	if(mx.toString().length == 1){
		mx = "0" + mx;
	}
	var m;
	switch(mm){
		case 0:
			m = "Jan";
		break;
		case 1:
			m = "Feb";
		break;
		case 2:
			m = "Mar";
		break;
		case 3:
			m = "Apr";
		break;
		case 4:
			m = "May";
		break;
		case 5:
			m = "Jun";
		break;
		case 6:
			m = "Jul";
		break;
		case 7:
			m = "Aug";
		break;
		case 8:
			m = "Sep";
		break;
		case 9:
			m = "Oct";
		break;
		case 10:
			m = "Nov";
		break;
		case 11:
			m = "Dec";
		break;
		default:
			m = "Jan";
	}
	var b = m + " " + dd + ", " + yyyy + " at " + hh + ":" + mx + " " + am;
	return b;
}


// jquery check if element in viewport func
$.fn.isInViewport = function(){
	var elementTop = $(this).offset().top;
	var elementBottom = elementTop + $(this).outerHeight();
	var viewportTop = $(window).scrollTop();
	var viewportBottom = viewportTop + $(window).height();
	return elementBottom > viewportTop && elementTop < viewportBottom;
}

// function that abbreviates numbers
abbrNum = function(num, fixed) {
	if (num === null) { return null; } // terminate early
	if (num === 0) { return '0'; } // terminate early
	fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
	var b = (num).toPrecision(2).split("e"), // get power
		k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
		c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3) ).toFixed(1 + fixed), // divide by power
		d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
		e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power
	return e;
}
