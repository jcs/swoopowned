// ==UserScript==
// @name           swoopowned
// @namespace      http://jcs.org/
// @description    swoopo auction monitor and automated bidder
// @include        http://www.swoopo.com/auction/*
// ==/UserScript==
//
// Copyright (c) 2009 joshua stein <jcs@jcs.org>
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
// 3. The name of the author may not be used to endorse or promote products
//    derived from this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
// OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
// IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
// NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
// THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// see these pages for information on what this script does:
//   http://jcs.org/notaweblog/2009/03/06/trying_to_game_swoopo_com/
//   http://jcs.org/notaweblog/2009/03/11/trying_to_game_swoopo_com_part_2/
//


/* define your url to post data to (you'll have to set this up) */
var log_url = "http://localhost/swoopo/";


/* create our floating status window */
var wrapper = document.createElement("div");
wrapper.style.position = "absolute";
wrapper.style.backgroundColor = "white";
wrapper.style.top = 0;
wrapper.style.right = 0;
wrapper.style.width = "400px";
wrapper.style.border = "1px solid red";
wrapper.style.padding = "3px";
wrapper.style.fontSize = "9pt";
document.body.appendChild(wrapper);

/* add a toggle whether to log data */
var do_log = document.createElement("input");
do_log.type = "checkbox";
do_log.id = "do_log";
do_log.checked = true;
wrapper.appendChild(do_log);

/* add a toggle whether to place bids */
var do_bid = document.createElement("input");
do_bid.type = "checkbox";
do_bid.id = "do_bid";
do_bid.style.marginLeft = "300px";
do_bid.style.backgroundColor = "red";
wrapper.appendChild(do_bid);

/* the div where we will append data to */
var l = document.createElement("div");
l.id = "logger";
l.style.height = "130px";
l.style.overflowY = "auto";
wrapper.appendChild(l);

/* find the function that the bid button calls */
var bidfunc;
as = document.getElementsByTagName("a");
for (x = 0; x < as.length; x++)
	if (as[x].href.match(/javascript:place_bid/))
		bidfunc = unescape(as[x].href.replace(/^javascript:/, ""));

var auction_id;
var broked = false;
if (bidfunc) {
	m = bidfunc.match(/^place_bid\('(\d+)'/);
	auction_id = m[1];
} else {
	broked = true;
	do_log.disabled = true;
}

/* setup some globals we'll use while looping */
var last_price;
var last_time;
var my_last_bid;

/* this will run every 500ms and extract the current price, etc. */
function looper() {
	var d = new Date();

	var ct = document.getElementById("countertime").innerHTML;
	if (!last_time)
		last_time = ct;

	var p = document.getElementById("a_current_price").innerHTML;

	if (do_log.checked) {
		if (p != last_price) {
			hist = document.getElementById("ghistorie_tbl");
			tds = hist.getElementsByTagName("td");

			start_recording = false;
			for (x = tds.length - 1; x >= 0; x -= 3) {
				price = tds[x - 2].innerHTML;
				bidder = tds[x - 1].innerHTML;
				bidtype = tds[x].innerHTML;

				if (!price || !last_price)
					break;

				if (parseFloat(price.replace(/\$/, "")) >
				parseFloat(last_price.replace(/\$/, "")))
					start_recording = true;

				if (start_recording)
					store_data(parseInt(d.getTime() / 1000) + "," +
						last_time + "," + ct + "," + price + "," + bidder +
						"," + bidtype);
			}

			l.scrollTop = l.scrollHeight;
		}
	}

	if (do_bid.checked) {
		if ((ct == "00:00:01" || ct == "00:00:00") && (my_last_bid != p)) {
			if (document.getElementById("a_current_winner").innerHTML != "Your bid!") {
				store_data(parseInt(d.getTime() / 1000) + "," +
					"bidding at " + p);

				/* directly call swoopo's javascript function to place a bid */
				eval("unsafeWindow." + bidfunc);

				my_last_bid = p;
			}
		} else if (ct == "00:00:03") {
			/* start timer to expire 2.5 seconds from now */
			window.setTimeout(blindbid, 2500);
		}
	}

	last_price = p;
	last_time = ct;

	window.setTimeout(looper, 500);
}

/* we were called 2.5 seconds ago.  if the timer display still reads
 * 00:00:03 or 00:00:02, assume the display locked up and blindly bid */
function blindbid() {
	ct = document.getElementById("countertime").innerHTML;
	p = document.getElementById("a_current_price").innerHTML;

	if ((ct == "00:00:03" || ct == "00:00:02") && (my_last_bid != p)) {
		if (document.getElementById("a_current_winner").innerHTML != "Your bid!") {
			store_data(parseInt(d.getTime() / 1000) + "," +
				"blindly bidding at " + p);

			eval("unsafeWindow." + bidfunc);

			my_last_bid = p;
		}
	}
}

/* post data to our server */
function store_data(data) {
	GM_xmlhttpRequest({
		method: "POST",
		url: log_url + auction_id,
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		data: "data=" + encodeURI(data)
	});

	l.innerHTML += data + "<br />\n";
}

/* if we found all the elements we were looking for, start watching data */
if (!broked)
	window.setTimeout(looper, 500);
