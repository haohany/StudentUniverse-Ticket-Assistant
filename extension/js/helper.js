// load location data with sync ajax request
function loadLocations(locations) {
	$.ajax({
		url: "http://www.studentuniverse.com/grails/geolocation/getLocations",
		async: false,
		dataType: "text", // prevent jQuery from converting the data
		success: function(data, textStatus, jqXHR) {
			if (jqXHR.status !== 200) {
				errorHandler(jqXHR.status + " " + jqXHR.statusText);
				return;
			}
			var items = JSON.parse(data);
			items.forEach(function(item) {
				if (item.displayName && item.code) {
					locations.push(item);
				}
			});
		},
		error: function(jqXHR) {
			errorHandler(jqXHR.status + " " + jqXHR.statusText);
		},
	});

	function errorHandler(msg) {
		var $error = $("<div/>").attr("class", "alert alert-danger").attr("role", "alert");
		$error.html("Failed to fetch airports info from server: "
			+ "<strong>" + msg + "</strong>"
			+". Please try it later.");
		$("#error").html($error);
		$("form, table").hide();
	}
}

// generate location dropdown menu for binded location input box
var generateLocationList = function() {
	var prevStr = "";

	function escapeRegExp(string) {
		return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
	}

	// for dropdown menu items
	function mouseEnterHandler(e) {
		$(this).siblings(".active").removeClass("active");
		$(this).addClass("active");
	}

	// for dropdown menu items
	function clickHandler(e) {
		var $input = $(this).parents(".dropdown").siblings(".location");
		$input.val(this.textContent);
		$input.focus();
		var $menu = $(this).parent();
		$menu.hide().empty();
	}

	return function(locations) {
		var str = this.value;
		// if the string didn't change, do nothing
		if (str === prevStr) {
			return;
		}
		prevStr = str;
		// clear current list if it exists
		var $menu = $(this).parent().find(".dropdown-menu");
		$menu.hide().empty();

		str = str.trim();
		// don't give prompts when there are less than 3 characters
		if (str.length < 3) {
			return;
		}

		locations.forEach(function(loc) {
			if (new RegExp(escapeRegExp(str), "i").test(loc.displayName)) {
				var item = loc.displayName.replace(new RegExp("(" + escapeRegExp(str) + ")", "gi"), "<strong>$1</strong>");
				var $li = $("<li/>").html(item);
				str.toUpperCase() === loc.code ? $menu.prepend($li) : $menu.append($li);
			}
			else {
				var tokens = str.split(/\s+/);
				var contained = true;
				for (var i = 0; i < tokens.length; i++) {
					if (!new RegExp(escapeRegExp(tokens[i]), "i").test(loc.displayName)) {
						contained = false;
						break;
					}
				}
				if (contained) {
					var $li = $("<li/>").html(loc.displayName);
					$menu.append($li);
				}
			}
		});

		if ($menu.html()) {
			$menu.children().first().addClass("active");
			$menu.children().mouseenter(mouseEnterHandler);
			$menu.children().click(clickHandler);
			$menu.show();
		}
	};
}();

function initializeDatePicker() {
	$(".date").datepicker({
		autoclose: true,
		orientation: "top auto",
		startDate: "0d"
	});

	var initialDate = new Date();
	initialDate.setDate(initialDate.getDate() + 1);
	$(".date").datepicker("update", new Date(initialDate.toDateString()));

	$("#departs").datepicker().on("changeDate", function(e) {
		if (e.date.getTime() > $("#returns").datepicker("getDate").getTime()) {
			$("#returns").datepicker("setDate", e.date);
		}
	});
}

