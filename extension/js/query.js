function Query($tr, url, data, maxPrice) {
	this.$tr = $tr;
	this.url = url;
	this.data = data;
	this.maxPrice = maxPrice;

	// this.xhr = new XMLHttpRequest();
	this.stopped = false;
}

Query.prototype = function() {

	var maxNumRequests = 5;
	var numRequests = 0;
	var waitQueue = [];

	var prototype = {
		start: function() {
			clearTimeout(this.timeout);
			if (this.stopped) {
				return;
			}
			if (numRequests >= maxNumRequests) {
				waitQueue.push(this);
				var $span = $("<span/>").addClass("status text-info");
				$span.text("Pending");
				$span.attr("title", "Waiting to send request");
				this.$tr.find(".col-status").html($span);
				return;
			}

			var xhr = this.xhr = new XMLHttpRequest();
			var requestUrl = this.url + "?" + $.param(this.data);
			xhr.open("GET", requestUrl);
			xhr.responseType = "document";

			xhr.send();
			numRequests++;

			var $span = $("<span/>").addClass("status text-info");
			$span.text("Waiting");
			$span.attr("title", "Request sent, waiting for response");
			this.$tr.find(".col-status").html($span);

			var self = this;
			xhr.onload = function(e) {
				var $tr= self.$tr;
				if (this.status === 200) {
					maxNumRequests += 0.1;

					var doc = this.response;
					var $flights = $("#productResultsArea .flightItem", doc);
					for (var i = 0; i < $flights.length; i++) {
						var $flight = $flights.eq(i);
						var price = getFlightPrice($flight);
						if (price > self.maxPrice) {
							break;
						}
						if (checkFlightDuration($flight)) {
							$tr.addClass("success");
							sound.play();

							updateRow($tr, $flight);
							var $span = $("<span/>").addClass("status text-success");
							$span.text("Complete");
							$span.attr("title", "Response received");
							$tr.find(".col-status").html($span);

							finishQuery(self);
							return;
						}
					}
					// search results expired
					if ($("#su404expired", doc).length > 0) {
						maxNumRequests -= 0.5;
						waitQueue.unshift(self); // resend request ASAP
						var $span = $("<span/>").addClass("status text-warning");
						$span.text("Expired");
						$span.attr("title", "Search results expired");
						$tr.find(".col-status").html($span);

						finishQuery(self);
						return;
					}
					// no flight satisfies requirement
					$tr.removeClass("success");
					if ($flights.length > 0) {
						updateRow($tr, $flight);
					}
					else {
						var $text = $("<strong/>").text("No flight").css("letter-spacing", ".2px");
						var $link = $("<a/>").attr("href", requestUrl).append($text);
						$link.click(function(e) {
							e.preventDefault();
							chrome.windows.create({
								"url": $(this).attr("href"),
								"incognito": true
							});
						});
						$tr.find(".col-offer").html($link);
						// $tr.find(".col-offer").html("No flight");
						$tr.find(".col-duration").html("");
					}
					var $span = $("<span/>").addClass("status text-success");
					$span.text("Complete");
					$span.attr("title", "Response received");
					$tr.find(".col-status").html($span);

					finishQuery(self);
					return;
				}
				else {
					var $span = $("<span/>").addClass("status text-warning");
					$span.text("Request error");
					$span.attr("title", this.status + " " + this.statusText);
					$span.attr("data-request", requestUrl);
					$tr.find(".col-status").html($span);

					finishQuery(self);
					return;
				}

				function getFlightPrice($flight) {
					var priceText = $flight.find(".pricepoint").text();
					priceText = priceText.replace(/,/g, ""); // remove the comma in price
					var price = Number(priceText.match(/\d+/)[0]);
					return price;
				}

				function checkFlightDuration($flight) {
					var $durations = $flight.find(".flightItemCol2 .flightDetailDuration");

					if ($("#departDuration").val().trim() !== "") {
						var du = Number($("#departDuration").val());
						if (du < getDuration($durations.eq(0))) {
							return false;
						}
					}

					if (!$("#oneWay").prop("checked") && $("#returnDuration").val().trim() !== "") {
						var du = Number($("#returnDuration").val());
						if (du < getDuration($durations.eq(1))) {
							return false;
						}
					}

					return true;

					function getDuration($duration) {
						var text = $duration.text().trim();
						var hour = Number(text.match(/\d+(?=hr)/));
						var min = Number(text.match(/\d+(?=min)/));
						return hour + min/60;
					}
				}

				function updateRow($tr, $flight) {
					var price = getFlightPrice($flight);
					var $text = $("<strong/>").text("$" + price).css("letter-spacing", ".5px");
					var $link = $("<a/>").attr("href", requestUrl).append($text);
					$link.click(function(e) {
						e.preventDefault();
						chrome.windows.create({
							"url": $(this).attr("href"),
							"incognito": true
						});
					});
					$tr.find(".col-offer").html($link);

					var durations = [];
					$flight.find(".flightItemCol2 .flightDetailDuration").each(function() {
						var time = $(this).contents().filter(function() {
							return this.nodeType === 3;
						}).text().trim();
						durations.push(time);
					});
					$tr.find(".col-duration").html($("<small/>").text(durations.join(" | ")));
				}
			};

			xhr.onerror = function(e) {
				var $span = $("<span/>").addClass("status text-warning");
				$span.text("Connection error");
				$span.attr("title", "Connection failed");
				$span.attr("data-request", requestUrl);
				self.$tr.find(".col-status").html($span);
				
				finishQuery(self);
				// timeout = setTimeout(self.start.bind(self), (wait + Math.floor(wait * Math.random())) * 1000);
			};
		},

		stop: function() {
			maxNumRequests = 5;
			numRequests = 0;
			waitQueue = [];
			sound.stop();

			this.stopped = true;
			this.xhr && this.xhr.abort();
			clearTimeout(this.timeout);

			var $span = $("<span/>").addClass("status text-info");
			$span.text("Stopped");
			this.$tr.find(".col-status").html($span);
			// $("#" + this.id).children().last().text("Stopped");
		}
	};

	function shiftWaitQueue() {
		while (numRequests < maxNumRequests && waitQueue.length > 0) {
			var query = waitQueue.shift();
			query.start();
		}
	}

	function finishQuery(query) {
		query.timeout = setTimeout(query.start.bind(query), 10 * 1000);
		// query.timeout = setTimeout(query.start.bind(query), Math.floor(Math.random() * 20) * 1000);
		console.log("# request: " + numRequests + "\t# max request: " + maxNumRequests.toFixed(1));

		numRequests--;
		shiftWaitQueue();
	}

	var sound = {
		audio: new Audio("audio/apple_ring.mp3"),

		play: function() {
			this.audio.currentTime = 0;
			this.audio.play();
		},

		stop: function() {
			this.audio.pause();
		},
	};

	return prototype;

}();

// restore the constructor
Object.defineProperty(Query.prototype, "constructor", {
	enumerable: false,
	value: Query
});