var start = Number(localStorage.start) || 50;
var end = Number(localStorage.end) || 100; // this is the end id, feel free to change it

/* Do not modify anything below */
chrome.browserAction.onClicked.addListener(openMainPage);

function openMainPage() {
	var mainPageUrl = chrome.extension.getURL("main.html");
	// chrome.tabs.query({ "currentWindow": true }, function(tabs) {
	// 	for (var i = 0; i < tabs.length; i++) {
	// 		if (tabs[i].url === mainPageUrl) {
	// 			chrome.tabs.update(tabs[i].id, {"active": true});
	// 			return;
	// 		}
	// 	}
		chrome.tabs.create({"url": mainPageUrl});
	// });
}

function yamiExtractor() {
	var loadingAnimation = new LoadingAnimation();
	loadingAnimation.start();
	
	chrome.browserAction.onClicked.removeListener(yamiExtractor);
	
	var yami = "http://www.yamibuy.com/goods.php?id=";
	var count = 0;
	var data = "";
	
	for (var id = start; id <= end; id++) {
		count++;

		var xhr = new XMLHttpRequest();
		xhr.open("GET", yami + id);
		xhr.responseType = "document";
		xhr.send();

		xhr.onload = function() {
			count--;
			if (this.status === 200) {
				collectData(this.responseXML);
			}
			if (count === 0) {
				showResult();
			}
		};
		xhr.onerror = function() {
			count--;
			if (count === 0) {
				showResult();
			}
		};
	}

	function collectData(resDoc) {
		var product = resDoc.querySelector(".breadcrumb");
		if (!product) {
			return;
		}
		product = product.textContent.trim();
		var price = resDoc.querySelector(".current_price").textContent.trim();
		var other = resDoc.querySelector(".otherinfo").textContent.trim();
		var desc = resDoc.querySelector(".product_tw").textContent.trim() || "N/A";
		var reg = /\s+/g;
		product = product.replace(reg, " ");
		product = product.replace(/\s+>\s+/g, ">");
		price = price.replace(reg, " ");
		other = other.replace(reg, " ");
		desc = desc.replace(reg, " ");
		data += product + "\t" + price + "\t" + other + "\t" + desc + "\t" + resDoc.documentURI + "\n";
	}
	
	function showResult() {
		loadingAnimation.stop();
		var url = "data:text/plain;charset=utf-8," + encodeURIComponent(data);
		chrome.tabs.create({ url: url });
		chrome.browserAction.onClicked.addListener(yamiExtractor);
	}
}

// A "loading" animation displayed while we wait for the response
// This animates the badge text with a dot that cycles from left to right.
function LoadingAnimation() {
  this.timerId_ = 0;
  this.maxCount_ = 8;  // Total number of states in animation
  this.current_ = 0;  // Current state
  this.maxDot_ = 4;  // Max number of dots in animation
}

LoadingAnimation.prototype.paintFrame = function() {
  var text = "";
  for (var i = 0; i < this.maxDot_; i++) {
    text += (i == this.current_) ? "." : " ";
  }
  if (this.current_ >= this.maxDot_)
    text += "";

	chrome.browserAction.setBadgeBackgroundColor({color:[200, 120, 150, 200]});
  chrome.browserAction.setBadgeText({text:text});
  this.current_++;
  if (this.current_ == this.maxCount_)
    this.current_ = 0;
}

LoadingAnimation.prototype.start = function() {
  if (this.timerId_)
    return;

  var self = this;
  this.timerId_ = window.setInterval(function() {
    self.paintFrame();
  }, 100);
}

LoadingAnimation.prototype.stop = function() {
  if (!this.timerId_)
    return;

  window.clearInterval(this.timerId_);
  this.timerId_ = 0;
  chrome.browserAction.setBadgeText({text:""});
}
