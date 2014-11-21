bg = chrome.extension.getBackgroundPage();

(function() {

	// array to store info of cities and airports
	var locations = [];

	// encapsulate operations on result table
	var resultTable = {
		$table: $("table"),

		reset: function() {
			this.$table.html("<thead></thead><tbody></tbody>");
			this.rowNum = 0;

			var $tr = $("<tr/>");
			$tr.append("<th class='col-xs-1 col-number'>#</th>");
			$tr.append("<th class='col-xs-2 col-depart'>Depart</th>");
			if (!$("#oneWay").prop("checked")) {
				$tr.append("<th class='col-xs-2 col-return'>Return</th>");
			}
			$tr.append("<th class='col-offer'>Offer</th>");
			$tr.append("<th class='col-duration'>Duration</th>");
			$tr.append("<th class='col-status'>Status</th>");

			this.$table.children("thead").append($tr);
		},

		addRow: function(values) {
			this.rowNum++;

			var $headings = this.$table.find("th");
			values.unshift(this.rowNum); // insert row number at the start
			while (values.length < $headings.length) {
				values.push("");
			}

			var $tr = $("<tr/>");
			$tr.attr("id", "query" + this.rowNum);
			for (var i = 0; i < $headings.length; i++) {
				var $td = $("<td/>");
				$td.addClass($headings.eq(i).attr("class"));
				$td.text(values[i]);
				$tr.append($td);
			}

			this.$table.children("tbody").append($tr);
			return $tr;
		}
	};

	getLocations();

	$(".location").keydown(keyDownHandler);
	$(".location").keyup(keyUpHandler);
	$("html").mouseup(clearLocationDropdownMenu);

	initializeDatePicker();

	$("form").submit(submitHandler);

	///////////////////////////////////////
	// function implementation

	function getLocations() {
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

	// function blurHandler(e) {
	// 	var $menu = $(this).parent().find(".dropdown-menu");
	// 	$menu.hide().empty();
	// }

	function keyDownHandler(e) {
		var $menu = $(this).parent().find(".dropdown-menu");
		// keep default behavior if no menu
		if (!$menu.html()) {
			return;
		}
		// tab or enter pressed
		if (e.which === 9 || e.which === 13) {
			e.preventDefault();
		}
		// up arrow
		else if (e.which === 38) {
			var $curr = $menu.find(".active");
			$curr.removeClass("active");
			var $prev = $curr.prev();
			if ($prev.length === 0) {
				$prev = $menu.children().last();
			}
			$prev.addClass("active");
		}
		// down arrow
		else if (e.which === 40) {
			var $curr = $menu.find(".active");
			$curr.removeClass("active");
			var $next = $curr.next();
			if ($next.length === 0) {
				$next = $menu.children().first();
			}
			$next.addClass("active");
		}
	}

	function keyUpHandler(e) {
		// tab or enter pressed
		if (e.which === 9 || e.which === 13) {
			var $menu = $(this).parent().find(".dropdown-menu");
			if ($menu.html()) {
				this.value = $menu.find(".active").text();
				$menu.hide().empty();
				focusNextInputField(this);
				// e.preventDefault();
			}
		}
		else {
			generateLocationList.bind(this, e)();
		}

		function focusNextInputField(currInput) {
			var $inputs = $("input");
			var index = $inputs.index(currInput);
			if (index > -1 && index + 1 < $inputs.length ) {
				$inputs.eq(index + 1).focus();
			}
		}
	}

	function clearLocationDropdownMenu(e) {
		// get all location menu that have menu items
		var $menu = $(".location").parent().find(".dropdown-menu:parent");
		$menu.each(function(){
			var dropdown = this.parentNode;
			if (dropdown === $(e.target).siblings(".dropdown")[0]
				|| dropdown === $(e.target).parents(".dropdown")[0]) {
				return;
			}
			$(this).hide().empty();
		});
	}

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

		return function(e) {
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

		$(".date").datepicker("update", new Date().toDateString());

		$("#departs").datepicker().on("changeDate", function(e) {
			if (e.date.getTime() > $("#returns").datepicker("getDate").getTime()) {
				$("#returns").datepicker("setDate", e.date);
			}
		});
	}

	function submitHandler(e) {
		e.preventDefault();

		// clear error
		$("#error").empty();

		if (!checkAirports()) {
			return;
		}

		resultTable.reset();

		var queries = buildQueries();

		$("form").find("input, select, button").prop("disabled", true);
		$("#stop").prop("disabled", false);

		$("#stop").click(function() {
			queries.forEach(function(query) {
				query.stop();
			});
			$("form").find("input, select, button").prop("disabled", false);
			$("#stop").prop("disabled", true);
		});
	}

	function checkAirports() {
		var $inputs = $("input:not([disabled]).location");
		for (var i = 0; i < $inputs.length; i++) {
			var $field = $inputs.eq(i);
			var str = $field.val().trim().toLowerCase();
			var valid = false;
			for (var j = 0; j < locations.length; j++) {
				var loc = locations[j];
				if (str === loc.displayName.toLowerCase() || str === loc.code.toLowerCase()) {
					str = loc.code;
					valid = true;
					break;
				}
			}
			if (valid) {
				$field.attr("data-code", str);
			}
			else {
				var $error = $("<div/>").attr("class", "alert alert-danger alert-dismissible").attr("role", "alert");
				$error.html('<button type="button" class="close" data-dismiss="alert">&times;</button>'
					+ "<strong>Error!</strong> Can not recognize <em>" + str + "</em>");
				$("#error").html($error);
				$field.focus();
				$("body").animate({
					scrollTop: $error.offset().top,
				});
				return false;
			}
		}
		return true;
	}

	function buildQueries() {
		var commonData = {
			// tripType: "2",
			// origin: "LAX",
			// origin2: "",
			// destination: "BJS",
			// destination2: "",
			// numTravelers: "1",
			// departs: "10/23/2014",
			// returns: "10/29/2014",
			// // return_time: "anytime",
			// // departure_time: "anytime",
			// // product: "flight",
			productType: "flight",
		};

		commonData.tripType = Number($(".tripType:checked").val());
		commonData.origin = $("#origin").attr("data-code");
		commonData.destination = $("#destination").attr("data-code");
		commonData.departs = $("#departs").val();
		commonData.numTravelers = $("#numTravelers").val();

		var queries = [];
		var url = "http://www.studentuniverse.com/app/product/search";
		var maxPrice = Number($("#maxPrice").val());

		if (commonData.tripType === 1) {
			var departStart = -Number($("#departDaysBefore").val());
			var departEnd = Number($("#departDaysAfter").val());

			for (var i = departStart; i <= departEnd; i++) {
				var data = JSON.parse(JSON.stringify(commonData));
				data.departs = getDateAfterDays(data.departs, i);

				var $tr = resultTable.addRow([data.departs]);
				var query = new Query($tr, url, data, maxPrice);
				query.start();
				// setTimeout(query.start.bind(query), (departEnd - departStart) / 10 * 1000 * (count - 1));
				queries.push(query);
			}
		}
		else  {
			commonData.returns = $("#returns").val();
			if (commonData.tripType === 3) {
				// TODO:
				// commonData.origin2 = 
				// commonData.destination2 = 
			}

			var departStart = -Number($("#departDaysBefore").val());
			var departEnd = Number($("#departDaysAfter").val());
			var returnStart = -Number($("#returnDaysBefore").val());
			var returnEnd = Number($("#returnDaysAfter").val());

			for (var i = departStart; i <= departEnd; i++) {
				for (var j = returnStart; j <= returnEnd; j++) {
					var data = JSON.parse(JSON.stringify(commonData));
					data.departs = getDateAfterDays(data.departs, i);
					data.returns = getDateAfterDays(data.returns, j);

					var $tr = resultTable.addRow([data.departs, data.returns]);
					var query = new Query($tr, url, data, maxPrice);
					query.start();
					// setTimeout(query.start.bind(query), (departEnd - departStart) * (returnEnd - returnStart) / 20 * 1000 * (count - 1));
					queries.push(query);
				}
			}
		}

		return queries;
	}

	function getDateAfterDays(date, number) {
		date = new Date(date);
		date.setDate(date.getDate() + number);

		var mm = date.getMonth() + 1;
		mm = mm < 10 ? "0" + mm : mm;
		var dd = date.getDate();
		dd = dd < 10 ? "0" + dd : dd;
		var yyyy = date.getFullYear();

		return [mm, dd, yyyy].join("/");
	}

})();
