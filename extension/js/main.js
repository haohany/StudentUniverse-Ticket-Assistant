bg = chrome.extension.getBackgroundPage();

(function() {

	// array to store info of cities and airports
	var locations = [];

	loadLocations(locations);

	$(".location").keydown(keyDownHandler);
	$(".location").keyup(keyUpHandler);
	$("html").mouseup(clearLocationDropdownMenu);

	initializeDatePicker();

	$("form").submit(submitHandler);

	///////////////////////////////////////
	// function implementation

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
			generateLocationList.bind(this, locations)();
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

	function checkReturnDate() {}
})();