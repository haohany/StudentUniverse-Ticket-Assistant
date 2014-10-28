bg = chrome.extension.getBackgroundPage();

(function() {

	initializeDatePicker();

	$("form").submit(submitHandler);


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

	function submitHandler(e) {
		e.preventDefault();

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
		commonData.origin = $("#origin").val();
		commonData.destination = $("#destination").val();
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
