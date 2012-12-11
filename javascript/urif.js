/************************************************************
 * University Restaurant Information Finder
 * Copyright (c) 2012, Brennon Bortz and Panagiotis Apostolellis
 * All rights reserved.
 * 
 * brennon@brennonbortz.com / www.brennonbortz.com
 ************************************************************/
/************************************************************
 * d3.js
 * Copyright (c) 2012, Michael Bostock
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * * The name Michael Bostock may not be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 ************************************************************/

/************************************************************
 * Global variables
 ************************************************************/

// Global university data
var universityInfo = {
	fees: { min: 0, max: 0 },
	salary: { min: 0, max: 0 }
};

// Global restaurant data
var restaurantInfo = { mostReviews: 0, leastReviews: 10000000 };
var uniqueRestaurantStatID = 0;
var starRange = [2, 5];

// Datasets
var universities, restaurants;

// Number of CSV files
var dataFiles = 2;
var dataFilesLoaded = 0;

// Sort orders
// Initial sort by either "stats" or "restaurants"
var mainSortKey = "restaurants";
var styleOrder = ["american", "african", "asian", "european", "latin_american", "middle_eastern", "mediterranean", "mexican", "uncategorized"];
var alignedCategoryOrder = ["salary", "fees"];
var stackedCategoryOrder = ["people", "genders", "residencies","ethnicities"];
var stackedSubcategoryOrders = {
	people: ["undergrads", "grads", "faculty"],
	genders: ["male", "female"],
	statuses: ["full_time", "part_time"],
	residencies: ["out_of_state", "in_state", "international", "unknown_residence"],
	ethnicities: ["white","hispanic","asian","nonresident_alien","other"]
};
var customUniversityOrder = [];
var customStyleOrder = [];
var ordering = "automatic";
// var sortUniversity = "";

// Description strings for attributes
var descriptions = {
	undergrads: "Undergraduate Students",
	grads: "Graduate Students",
	faculty: "Faculty Members",
	male: "Male Students",
	female: "Female Students",
	full_time: "Full-Time Students",
	part_time: "Part-Time Students",
	in_state: "In-State Students",
	out_of_state: "Out-of-State Students",
	international: "International Students",
	unknown_residence: "Unknown Residence",
	nonresident_alien: "Non-Resident Alien",
	hispanic: "Hispanic Students",
	islander: "Islander Students",
	black: "Black/African-American Students",
	asian: "Asian Students",
	alaskan: "Alaskan Students",
	unknown_race: "Students of Unknown Race",
	white: "White/Caucasian Students",
	mixed_race: "Mixed Race Students",
	other: "Other Race",
	american: "American Restaurants",
	african: "African Restaurants",
	asian: "Asian Restaurants",
	european: "European Restaurants",
	latin_american: "Latin American Restaurants",
	middle_eastern: "Middle Eastern Restaurants",
	mediterranean: "Mediterranean Restaurants",
	mexican: "Mexican Restaurants",
	uncategorized: "Uncategorized Restaurants",
	salary: "Average Faculty Salary",
	fees: "Annual Cost of Attendance"
};


/************************************************************
 * Parser functions for restaurant data
 ************************************************************/

// Parse the data for all restaurants
var parseRestaurantsData = function() {
	restaurants.forEach(parseRestaurantData);
	
	var extrema = [];
	universities.forEach(function(university) {
		var reviews = [];
		for (var prop in university.restaurantStats) {
			reviews.push(university.restaurantStats[prop]["totalReviews"]);
		}
		extrema.push(d3.max(reviews));
		extrema.push(d3.min(reviews));
	});
	restaurantInfo.mostReviews = d3.max(extrema);
	restaurantInfo.leastReviews = d3.min(extrema);
};

// Parse stats for an individual restaurant
var parseRestaurantData = function(restaurant) {
	restaurant.category = restaurant.category.toUnderscored();
	var university = getUniversityByName(restaurant.university_name, universities);
	university.restaurants.push(restaurant);
	
	if (university.restaurantStats[restaurant.category] === undefined)
		university.restaurantStats[restaurant.category] = new restaurantCategoryStats(university.name, restaurant.category, uniqueRestaurantStatID++);
	
	university.restaurantStats[restaurant.category].totalStars += +restaurant.stars;
	university.restaurantStats[restaurant.category].totalReviews += +restaurant.review_count;
	
	university.restaurantStats[restaurant.category].totalRestaurants++;
	university.totalRestaurantStars += +restaurant.stars;
	university.averageRestaurantStars = university.totalRestaurantStars / university.restaurants.length;
};

// Object to hold restaurant category statistics
var restaurantCategoryStats = function(university, category, id) {
	this.id = id;
	this.university = university;
	this.category = category;
	this.totalRestaurants = 0;
	this.totalReviews = 0;
	this.totalStars = 0;
	this.averageStars = function() {
		if (this.totalRestaurants == 0) return 0.0;
		else return this.totalStars / this.totalRestaurants;
	};
};


/************************************************************
 * Parser functions for university data
 ************************************************************/

// Parse the data for all universities
var parseUniversitiesData = function() {
	universities.forEach(parseIndividualUniversityData);
};

// Parse university stats
var parseUniversitySummaryData = function() {
	// Collect costs and salaries into arrays
	var costs = universities.map( function(d) {
		return parseInt(d.fees);
	});
	
	var salaries = universities.map( function(d) {
		return parseInt(d.salary);
	});
	
	// Calculate maximum and minimum costs and salaries across universities
	universityInfo.fees.max = d3.max(costs);
	universityInfo.fees.min = d3.min(costs);
	universityInfo.salary.max = 150000;
	universityInfo.salary.min = d3.min(salaries);
};

// Parsing and formatting of raw data from CSV file
var parseIndividualUniversityData = function(university) {
	university.salary = +university.salary;
	university.fees = +university.fees;
	
	var totalPeople = +university.total_faculty + +university.undergrads + +university.grads;
	university.people = {
		faculty: +university.total_faculty / totalPeople,
		undergrads: +university.undergrads / totalPeople,
		grads: +university.grads / totalPeople
	};
	delete university.total_faculty;
	delete university.undergrads;
	delete university.grads;
	
	university.residencies = {
		in_state: +university.in_state / 100,
		out_of_state: +university.out_of_state / 100,
		international: +university.international / 100,
		unknown_residence: +university.unknown_residence / 100
	};
	delete university.in_state;
	delete university.out_of_state;
	delete university.international;
	delete university.unknown_residence;
	
	university.statuses = {
		part_time: +university.part_time / 100,
		full_time: +university.full_time / 100
	};
	delete university.part_time;
	delete university.full_time;
	
	university.ethnicities = {
		nonresident_alien: +university.nonresident_alien / 100,
		hispanic: +university.hispanic / 100,
		islander: +university.islander / 100,
		black: +university.black / 100,
		asian: +university.asian / 100,
		alaskan: +university.alaskan / 100,
		unknown_race: +university.unknown_race / 100,
		white: +university.white / 100,
		mixed_race: +university.mixed_race / 100,
		other: +university.other / 100
	};
	delete university.nonresident_alien;
	delete university.hispanic;
	delete university.islander;
	delete university.black;
	delete university.asian;
	delete university.alaskan;
	delete university.unknown_race;
	delete university.white;
	delete university.mixed_race;
	delete university.other;
	
	university.genders = {
		male: +university.male / 100,
		female: +university.female / 100
	};
	delete university.male;
	delete university.female;
	
	university.id = parseInt(university.id);
	university.restaurants = [];
	university.averageRestaurantStars = 0;
	university.totalRestaurantStars = 0;
	
	university.restaurantStats = {};
};


/************************************************************
 * Helper functions
 ************************************************************/

// Helper function to convert space-separated to underscore-separated strings
var toUnderscored = function() {
	return this.replace(/\s/g, "_").toLowerCase();
};
String.prototype.toUnderscored = toUnderscored;

// Get a university by name
var getUniversityByName = function(name, array) {
	return array.filter( function(u) { if (u.name == name) return true; } )[0];
};

// Import data from CSV files
var importCSVData = function(callback) {
	d3.csv("./data/restaurants.csv", function(csv) {
		restaurants = csv;
		callback();
	});
	
	d3.csv("./data/colleges.csv", function(csv) {
		universities = csv;
		callback();
	});
};

var addTooltips = function() {
	$('svg rect').tipsy({
		fade: true,
		gravity: $.fn.tipsy.autoWE,
		html: true
	});
	
	$('svg text').tipsy({
		fade: true,
		gravity: $.fn.tipsy.autoWE,
		html: true
	});
	
	$("svg circle").tipsy({
		fade: true,
		gravity: $.fn.tipsy.autoNS,
		html: true
	});
	
	$("svg image.universityLogo").tipsy({
		fade: true,
		gravity: $.fn.tipsy.autoNS,
		html: true
	});
	
	$("svg image.restaurantLabel").tipsy({
		fade: true,
		gravity: $.fn.tipsy.autoWE,
		html: true
	});
}


/************************************************************
 * Drawing functions
 ************************************************************/

var buildEntireChart = function(div, isResizing) {
	
	// Visualization-wide dimensions
	var dimensions = {
		svg: {
			width: function() { return $(div).width(); },
			height: function() { return $(div).height(); }
		},
		rows: {
			bubbles: {
				height: function() {
					if (dimensions.bubbles.height() < dimensions.bubbles.width()) {
						return dimensions.bubbles.height() / styleOrder.length;
					}
					else {
						return dimensions.bubbles.width() / styleOrder.length;
					}
				}
			}
		},
		restaurantLabels: {
			width: function() { return dimensions.svg.width() * 0.05; },
		},
		columns: {
			width: function() {
				return (dimensions.svg.width() - dimensions.restaurantLabels.width()) / universities.length;
			},
		},
		bubbles: {
			x: function() { return dimensions.restaurantLabels.width(); },
			y: function() { return 0; },
			width: function() { return dimensions.svg.width() - dimensions.restaurantLabels.width(); },
			height: function() { return dimensions.svg.height() * 0.6; }
		},
		logos: {
			x: function() { return dimensions.restaurantLabels.width(); },
			y: function() { return dimensions.bubbles.height(); },
			width: function() { dimensions.svg.width() - dimensions.restaurantLabels.width(); },
			height: function() { return dimensions.columns.width(); }
		},
		bars: {
			x: function() { return dimensions.restaurantLabels.width(); },
			y: function() { return dimensions.bubbles.height() + dimensions.logos.height() + 5; },
			width: function() { return dimensions.svg.width() - dimensions.restaurantLabels.width(); },
			height: function() { return dimensions.svg.height() - dimensions.bubbles.height() - dimensions.logos.height() - 5; }
		}
	}
	
	// SVG for drawing
	var svg;
	
	// If window is resizing, clear and redraw
	if (isResizing) {
		$(div).empty();
	
		// Main SVG element
		svg = d3.select(div)
			.append("svg")
			.attr("width", dimensions.svg.width())
			.attr("height", dimensions.svg.height());
	
	// Otherwise, draw in the existing SVG element
	} else {
		svg = d3.select("div#visualization svg");
	}
	
	// Sort universities based on the current sort order
	var sortDescription = "";
	universities = universities.sort(function(a, b) {
		var compareA, compareB;
		if (mainSortKey == "restaurants") {
			sortDescription = descriptions[styleOrder[0]];
			var aStats = a.restaurantStats[styleOrder[0]];
			var bStats = b.restaurantStats[styleOrder[0]];
			if (aStats === undefined) compareA = 0.0;
			else compareA = aStats.averageStars();
			if (bStats === undefined) compareB = 0.0;
			else compareB = bStats.averageStars();
		} else if (mainSortKey == "stacked") {
			sortDescription = descriptions[stackedSubcategoryOrders[stackedCategoryOrder[0]][0]];
			compareA = a[stackedCategoryOrder[0]][stackedSubcategoryOrders[stackedCategoryOrder[0]][0]];
			compareB = b[stackedCategoryOrder[0]][stackedSubcategoryOrders[stackedCategoryOrder[0]][0]];
		} else if (mainSortKey == "aligned") {
			sortDescription = descriptions[alignedCategoryOrder[0]];
			compareA = a[alignedCategoryOrder[0]];
			compareB = b[alignedCategoryOrder[0]];
		}
		return compareB - compareA;
	});
	
	customStyleOrder = styleOrder;
	customUniversityOrder = universities.map(function(u) { return u.id; });
	
	d3.select("#sortDescription").text(sortDescription);
	
	drawLabels(svg, dimensions);
	drawColumns(svg, dimensions);
	
	if (isResizing) {
		drawGrid(svg, dimensions);
		drawLegend();
	}
}

var drawLabels = function(svg, dimensions) {
	
	var restaurantLabels = svg.selectAll("image.restaurantLabel")
		.data(function() {
			return styleOrder.map(function(d) {
				return {name: d, description: descriptions[d]};
			})
		}, function(d) { return d.name; });
	
	restaurantLabels.enter()
		.append("image")
		.classed("restaurantLabel", true)
		.attr("x", -100)
		.attr("height", function(d) { return dimensions.columns.width() - 5; })
		.attr("width", function(d) { return dimensions.columns.width() - 5; })
		.attr("y", function(d, i) {
			return (dimensions.rows.bubbles.height() * i);
		})
		.attr("xlink:href", function(d) { return "./images/"+d.name+".png"; })
		.attr("title", function(d) {
			return d.description;
		})
		.attr("x", 0)
		.on("click", function(d) { 
			updateStyleOrder(d.name, "restaurants");
		});
	
	restaurantLabels.transition()
		.duration(2000)
		.attr("y", function(d, i) {
			return (dimensions.rows.bubbles.height() * i);
		});
}

var drawColumns = function(svg, dimensions) {
	
	var currentColumnOrder = universities.map(function(d) { return d.name; });
	
	var columns = svg.selectAll("g.column")
		.data(universities, function(d) { return d.name; });
	
	columns.attr("transform", function(d, i) { return "translate("+ (dimensions.columns.width() * i) +",0)"; });
	
	columns.enter()
		.append("g")
		.classed("column", true)
		.attr("transform", function(d, i) { return "translate("+ (dimensions.columns.width() * i) +",0)"; })
		.attr("width", function () { return dimensions.columns.width(); })
		.attr("height", dimensions.svg.height())
		.attr("id", function(d) { return d.name; });
	
	drawLines(svg, dimensions, currentColumnOrder);
	drawBubbles(svg, dimensions, currentColumnOrder);
	drawLogos(svg, dimensions, currentColumnOrder);
	drawBarCharts(svg, dimensions, currentColumnOrder);
}

var drawBubbles = function(svg, dimensions, currentColumnOrder) {
	
	var circleRadiusScale = d3.scale.linear()
		.domain([2, 5])
		.range([0, (dimensions.rows.bubbles.height() / 2)]);
	
	var circleHueScale = d3.scale.pow()
		.domain([restaurantInfo.mostReviews, restaurantInfo.leastReviews])
		.range([25, 25])
		.exponent(0.05);
	
	var circleSaturationScale = d3.scale.pow()
		.domain([restaurantInfo.mostReviews, restaurantInfo.leastReviews])
		.range([1.0, 1.0])
		.exponent(0.05);
	
	var circleLightnessScale = d3.scale.pow()
		.domain([restaurantInfo.mostReviews, restaurantInfo.leastReviews])
		.range([0.1, 0.9])
		.exponent(0.05);
	
	var allRestaurantStats = [];
	universities.forEach(function(d) {
		for (var category in d.restaurantStats)
			allRestaurantStats.push(d.restaurantStats[category]);
	});
	
	var bubbles = svg.selectAll("circle.bubble")
		.data(allRestaurantStats, function(d) { return d.id; });
	
	bubbles.transition()
		.duration(2000)
		.attr("cx", function (d) {
			var index = currentColumnOrder.indexOf(d.university);
				return dimensions.bubbles.x() + (index * dimensions.columns.width()) + (dimensions.columns.width() / 2);
		})
		.attr("cy", function(d) {
			var index = styleOrder.indexOf(d.category);
			return (index * dimensions.rows.bubbles.height()) + (dimensions.rows.bubbles.height() / 2);
		});
	
	bubbles.enter()
		.append("circle")
		.classed("bubble", true)
		.attr("r", 0)
		.attr("cx", function (d) {
			var index = currentColumnOrder.indexOf(d.university);
			return dimensions.bubbles.x() + (index * dimensions.columns.width()) + (dimensions.columns.width() / 2);
		})
		.attr("fill", function(d) { return d3.hsl(circleHueScale(d.totalReviews), circleSaturationScale(d.totalReviews), circleLightnessScale(d.totalReviews)); })
		.attr("cy", function(d) {
			var index = styleOrder.indexOf(d.category);
			return (index * dimensions.rows.bubbles.height()) + (dimensions.rows.bubbles.height() / 2);
		})
		.attr("title", function(d) {
			return "Style: "+descriptions[d.category]+"<br />Restaurants: "+d.totalRestaurants+"<br />Reviews: "+d.totalReviews+"<br />Average stars: "+d.averageStars().toFixed(2);
		})
		.on("click", function() { 
			var style = d3.select(this)[0][0].__data__.category;
			updateStyleOrder(style, "restaurants");
		})
		.transition()
		.duration(1000)
		.attr("r", function(d) { return circleRadiusScale(d.averageStars()); });
}

var drawLines = function(svg, dimensions, currentColumnOrder) {
	var lineScale = d3.scale.linear()
		.domain([2, 5])
		.range([(dimensions.columns.width() / 2), dimensions.columns.width()]);
	
	var averageLines = svg.selectAll("line.averageLine")
		.data(universities, function(d) { return d.name; });
	
	averageLines.transition()
		.duration(1000)
		.attr("transform", function(d, i) {
			var x = (i * dimensions.columns.width()) + (lineScale(d.averageRestaurantStars));
			return "translate("+x+",0)";
		});
	
	averageLines.enter()
		.append("line")
		.classed("averageLine", true)
		.attr("transform", function(d, i) {
			var x = (i * dimensions.columns.width()) + (lineScale(d.averageRestaurantStars));
			return "translate("+x+",0)";
		})
		.attr("stroke", "rgb(0,0,0)")
		.attr("stroke-width", 0.5)
		// .style("opacity", 0.5)
		.attr("x1", dimensions.bubbles.x())
		.attr("x2", dimensions.bubbles.x())
		.attr("y1", (dimensions.bubbles.y() + dimensions.bubbles.height()) / 2)
		.attr("y2", (dimensions.bubbles.y() + dimensions.bubbles.height()) / 2)
		.transition()
		.delay(2000)
		.duration(1000)
		.attr("y1", dimensions.bubbles.y())
		.attr("y2", dimensions.bubbles.y() + dimensions.bubbles.height());
}

var drawLogos = function(svg, dimensions, currentColumnOrder) {
	var clip = svg.append("clipPath")
		.attr("id", "logoClip")
		.append("svg:rect")
		.attr("id", "clip-rect")
		.attr("width", function(d) { return dimensions.columns.width() - 5; })
		.attr("height", function(d) { return dimensions.columns.width() - 5; })
		.attr("rx", 5)
		.attr("ry", 5);
	
	var logos = svg.selectAll("image.universityLogo")
			.data(universities, function(d) { return d.name; });

	logos.transition()
		.duration(2000)
		.attr("transform", function(d, i) {
			var x = dimensions.restaurantLabels.width() + dimensions.columns.width() * i + 2.5;
			var y = dimensions.bubbles.height() + 2.5;
			return "translate("+x+","+y+")";
		});
	
	logos.enter()
		.append("image")
		.classed("universityLogo", true)
		.attr("transform", function(d, i) {
			var x = dimensions.restaurantLabels.width() + dimensions.columns.width() * i + 2.5;
			var y = dimensions.bubbles.height() + 2.5;
			return "translate("+x+","+y+")";
		})
		.attr("height", function(d) { return dimensions.columns.width() - 5; })
		.attr("width", function(d) { return dimensions.columns.width() - 5; })
		.attr("xlink:href", function(d) { return d.logo; })
		.attr("opacity", 0.0)
		.attr("clip-path", "url(#logoClip)")
		// .call(drag)
		// .on("click", function(d) { updateStyleOrder(d, "university"); })
		.transition()
		.duration(2000)
		.attr("opacity", 1.0)
		.attr("title", function(d) {
			var text = ""
			return text += d.name;
		});
}

// var drag = d3.behavior.drag()
// 	.on("drag", function(d,i) {
// 		var mouse = d3.mouse(d3.select("svg").node());
// 		d3.select(this).attr("x", mouse[0]);
// 	});

var drawBarCharts = function(svg, dimensions, currentColumnOrder) {
	drawStackedBarCharts(svg, dimensions, currentColumnOrder);
	drawAlignedBarCharts(svg, dimensions, currentColumnOrder);
}

var drawStackedBarCharts = function(svg, dimensions, currentColumnOrder) {
	var numberOfStackedBars = stackedCategoryOrder.length;
	var barMargin = 1;
	var chartMargin = 4;
	var stackedBarWidth = (dimensions.columns.width() - (barMargin * (numberOfStackedBars - 1)) - (chartMargin * 2)) / numberOfStackedBars;
	var stackedBarHeight = (dimensions.bars.height() / 2) - 8;
	
	var stackedCharts = svg.selectAll("g.stackedChart")
		.data(universities, function(d) { return d.name; });
	
	stackedCharts.enter()
		.append("g")
		.classed("stackedChart", true)
	
	for (var c in stackedCategoryOrder) {
		var category = stackedCategoryOrder[c];
		for (var s in stackedSubcategoryOrders[category]) {
			var subcategory = stackedSubcategoryOrders[category][s];
			
			var rects = stackedCharts.selectAll("rect." + category + "-" + subcategory)
				.data(function(d) {
					var data = {
						category: category,
						subcategory: subcategory,
						university: this.parentNode.__data__.name,
						value: d[category][subcategory]
					}
					return ([data]);
				});
			
			rects.transition()
				.duration(2000)
				.attr("height", function(d) { return stackedBarHeight * d.value; })
				.attr("x", function(d) {
					var index = currentColumnOrder.indexOf(d.university);
					var subindex = stackedCategoryOrder.indexOf(d.category);
					return dimensions.bars.x() + (index * dimensions.columns.width()) + chartMargin + (subindex * stackedBarWidth) + (subindex * barMargin);
				})
				.attr("y", function(d) {
					var index = stackedSubcategoryOrders[d.category].indexOf(d.subcategory);
					var accumulatedHeight = 0;
					for (var i = 0; i < index; i++) {
						accumulatedHeight += this.parentNode.__data__[d.category][stackedSubcategoryOrders[d.category][i]] * stackedBarHeight;
					}
					return accumulatedHeight + dimensions.bars.y();
				});
			
			rects.enter()
				.append("rect")
				.attr("class", category + "-" + subcategory)
				.classed("highlighted", true)
				.classed("stat", true)
				.attr("width", stackedBarWidth)
				.attr("height", function(d) { return stackedBarHeight * d.value; })
				.attr("x", function(d) {
					var index = currentColumnOrder.indexOf(d.university);
					var subindex = stackedCategoryOrder.indexOf(d.category);
					return dimensions.bars.x() + (index * dimensions.columns.width()) + chartMargin + (subindex * stackedBarWidth) + (subindex * barMargin);
				})
				.attr("y", dimensions.svg.height())
				.attr("title", function(d) {
					var percent = d.value * 100;
					return descriptions[d.subcategory] + ": " + percent.toFixed(0) + "%"; 
				})
				.on("click", function(d) {
					var className = this.className.baseVal;
					var thisCat = className.substring(0,className.indexOf("-"));
					updateStyleOrder({subcategory: d.subcategory, category: thisCat}, "stacked");
				})
				.on("mouseover", function() {
					var highlightedClassName = d3.select(this).attr("class").split(" ")[0];
					$("rect.stat").each(function() {
						var thisClassName = d3.select(this).attr("class").split(" ")[0];
						if (thisClassName != highlightedClassName) {
							d3.select(this).classed("highlighted", false);
							d3.select(this).classed("muted", true);
						}
					});
				})
				.on("mouseout", function() {
					var highlightedClassName = d3.select(this).attr("class").split(" ")[0];
					$("rect.stat").each(function() {
						var thisClassName = d3.select(this).attr("class").split(" ")[0];
						if (thisClassName != highlightedClassName) {
							d3.select(this).classed("highlighted", true);
							d3.select(this).classed("muted", false);
						}
					});
				})
				.transition()
				.duration(1000)
				.attr("y", function(d) {
					var index = stackedSubcategoryOrders[d.category].indexOf(d.subcategory);
					var accumulatedHeight = 0;
					for (var i = 0; i < index; i++) {
						accumulatedHeight += this.parentNode.__data__[d.category][stackedSubcategoryOrders[d.category][i]] * stackedBarHeight;
					}
					return accumulatedHeight + dimensions.bars.y();
				});
		}
	}
}

var drawAlignedBarCharts = function(svg, dimensions, currentColumnOrder) {
	var numberOfAlignedBars = alignedCategoryOrder.length;
	var barMargin = 1;
	var chartMargin = 4;
	var alignedBarWidth = (dimensions.columns.width() - (barMargin * (numberOfAlignedBars - 1)) - (chartMargin * 2)) / numberOfAlignedBars;
	var alignedBarHeight = (dimensions.bars.height() / 2) - 8;
		
	var alignedCharts = svg.selectAll("g.alignedChart")
		.data(universities, function(d) { return d.name; });
	
	alignedCharts.enter()
		.append("g")
		.classed("alignedChart", true);
	
	for (var c in alignedCategoryOrder) {
		var category = alignedCategoryOrder[c];
		var rects = alignedCharts.selectAll("rect." + category)
			.data(function(d) {
				var data = {
					category: category,
					value: d[category],
					university: d.name
				}
				return ([data]);
			});
		
		rects.transition()
			.duration(2000)
			.attr("x", function(d) {
				var index = currentColumnOrder.indexOf(d.university);
				var subindex = alignedCategoryOrder.indexOf(d.category);
				return dimensions.bars.x() + (index * dimensions.columns.width()) + chartMargin + (subindex * alignedBarWidth) + (subindex * barMargin);
			});
		
		rects.enter()
			.append("rect")
			.attr("class", category)
			.classed("highlighted", true)
			.classed("stat", true)
			.attr("width", alignedBarWidth)
			.attr("height", function(d) {
				var maxDollars = d3.max([universityInfo.fees.max, universityInfo.salary.max]);
				return alignedBarHeight * (d.value / maxDollars);
			})
			.attr("x", function(d) {
				var index = currentColumnOrder.indexOf(d.university);
				var subindex = alignedCategoryOrder.indexOf(d.category);
				return dimensions.bars.x() + (index * dimensions.columns.width()) + chartMargin + (subindex * alignedBarWidth) + (subindex * barMargin);
			})
			.attr("y", function(d) {
				return dimensions.svg.height();
			})
			.attr("title", function(d) { 
				return descriptions[d.category] + ": $" + d.value; 
			})
			.on("mouseover", function() {
				var highlightedClassName = d3.select(this).attr("class").split(" ")[0];
				$("rect.stat").each(function() {
					var thisClassName = d3.select(this).attr("class").split(" ")[0];
					if (thisClassName != highlightedClassName) {
						d3.select(this).classed("highlighted", false);
						d3.select(this).classed("muted", true);
					}
				});
			})
			.on("mouseout", function() {
				var highlightedClassName = d3.select(this).attr("class").split(" ")[0];
				$("rect.stat").each(function() {
					var thisClassName = d3.select(this).attr("class").split(" ")[0];
					if (thisClassName != highlightedClassName) {
						d3.select(this).classed("highlighted", true);
						d3.select(this).classed("muted", false);
					}
				});
			})
			.on("click", function(d) { 
				var className = this.className.baseVal;
				var thisCat = className.substring(0,className.indexOf(" "));
				if (thisCat == "")
					thisCat = className;
				updateStyleOrder({category: thisCat}, "aligned");
			})
			.transition()
			.duration(1000)
			.attr("y", function(d) {
				return dimensions.bars.y() + dimensions.bars.height() / 2;
			});
	}
}

var drawGrid = function(svg, dimensions) {
		var grid = svg.append("g");
	
		grid.classed("grid", true);
	
		for (var i = 1; i < styleOrder.length; i++) {
			grid.append("line")
				.attr("x1", dimensions.bubbles.x() + (dimensions.bubbles.width() / 2))
				.attr("y1", dimensions.bubbles.y() + (i * dimensions.rows.bubbles.height()))
				.attr("x2", dimensions.bubbles.x() + (dimensions.bubbles.width() / 2))
				.attr("y2", dimensions.bubbles.y() + (i * dimensions.rows.bubbles.height()))
				.attr("stroke", "rgb(20,20,20)")
				.attr("stroke-width", 1)
				.attr("stroke-dasharray", "3, 3")
				.transition()
				.duration(2000)
				.attr("x1", dimensions.bubbles.x())
				.attr("y1", dimensions.bubbles.y() + (i * dimensions.rows.bubbles.height()))
				.attr("x2", dimensions.bubbles.x() + dimensions.bubbles.width())
				.attr("y2", dimensions.bubbles.y() + (i * dimensions.rows.bubbles.height()));
		}
	
		for (var i = 1; i < universities.length; i++) {
			grid.append("line")
				.attr("x1", dimensions.bubbles.x() + (i * dimensions.columns.width()))
				.attr("y1", dimensions.bubbles.y() + (dimensions.bubbles.height() / 2))
				.attr("x2", dimensions.bubbles.x() + (i * dimensions.columns.width()))
				.attr("y2", dimensions.bubbles.y() + (dimensions.bubbles.height() / 2))
				.attr("stroke", "rgb(20,20,20)")
				.attr("stroke-width", 1)
				.attr("stroke-dasharray", "3, 3")
				.transition()
				.duration(2000)
				.attr("x1", dimensions.bubbles.x() + (i * dimensions.columns.width()))
				.attr("y1", dimensions.bubbles.y())
				.attr("x2", dimensions.bubbles.x() + (i * dimensions.columns.width()))
				.attr("y2", dimensions.bubbles.y() + dimensions.bubbles.height());
	
		addTooltips();
	}
	
	var lineScale = d3.scale.linear()
		.domain([starRange[0], starRange[1]])
		.range([0, dimensions.columns.width() / 2]);
	
	for (var i = starRange[0]; i <= starRange[1]; i++) {
		grid.append("line")
			.classed("scale", true)
			.attr("x1", dimensions.bubbles.x() + lineScale(i))
			.attr("y1", dimensions.bubbles.y())
			.attr("x2", dimensions.bubbles.x() + lineScale(i))
			.attr("y2", dimensions.bubbles.y() + 3)
			.attr("stroke", "rgb(20,20,20)")
			.attr("stroke-width", 1);
	}
	
	for (var i = starRange[0]; i <= starRange[1]; i++) {
		grid.append("text")
			.classed("scale", true)
			.attr("x", dimensions.bubbles.x() + lineScale(i))
			.attr("y", dimensions.bubbles.y())
			.attr("dx", -2)
			.attr("dy", 11)
			.text(function() {
				var label = starRange[1] + starRange[0] - i;
				return label.toString()
			});
	}
	
	grid.append("line")
		.classed("scale", true)
		.attr("x1", dimensions.bars.x() - 10)
		.attr("x2", dimensions.bars.x() - 10)
		.attr("y1", dimensions.bars.y())
		.attr("y2", (dimensions.bars.y() + (dimensions.bars.height() / 2)) - 8)
		.attr("stroke", "rgb(20,20,20)")
		.attr("stroke-width", 1);
	
	var singleChartHeight = dimensions.bars.height() - 16;
	
	for (var i = 0; i < 5; i++) {
		grid.append("line")
			.classed("scale", true)
			.attr("x1", dimensions.bars.x() - 20)
			.attr("x2", dimensions.bars.x() - 10)
			.attr("y1", dimensions.bars.y() + (singleChartHeight * i) / 8)
			.attr("y2", dimensions.bars.y() + (singleChartHeight * i) / 8)
			.attr("stroke", "rgb(20,20,20)")
			.attr("stroke-width", 1);
		
		grid.append("text")
			.classed("scale", true)
			.attr("x", dimensions.bars.x() - 20)
			.attr("y", dimensions.bars.y() + (singleChartHeight * i) / 8)
			.attr("dx", -24)
			.attr("dy", 3)
			.text(function() {
				return (i * 25) + "%";
			});
	}
	
	grid.append("line")
		.classed("scale", true)
		.attr("x1", dimensions.bars.x() - 10)
		.attr("x2", dimensions.bars.x() - 10)
		.attr("y1", (dimensions.bars.y() + (dimensions.bars.height() / 2)))
		.attr("y2", dimensions.bars.y() + dimensions.bars.height() - 8)
		.attr("stroke", "rgb(20,20,20)")
		.attr("stroke-width", 1);
	
	for (var j = 0; j < 7; j++) {
		grid.append("line")
			.classed("scale", true)
			.attr("x1", dimensions.bars.x() - 20)
			.attr("x2", dimensions.bars.x() - 10)
			.attr("y1", dimensions.bars.y() + (dimensions.bars.height() / 2) + (singleChartHeight * j) / 12)
			.attr("y2", dimensions.bars.y() + (dimensions.bars.height() / 2) + (singleChartHeight * j) / 12)
			.attr("stroke", "rgb(20,20,20)")
			.attr("stroke-width", 1);
		
		grid.append("text")
			.classed("scale", true)
			.attr("x", dimensions.bars.x() - 20)
			.attr("y", dimensions.bars.y() + (dimensions.bars.height() / 2) + (singleChartHeight * j) / 12)
			.attr("dx", -24)
			.attr("dy", 3)
			.text(function() {
				return (j * 25) + "K";
			});
	}
};

var drawLegend = function() {
	// var divName = "div#legend";
	// 
	// var container = $(divName);
	// container.empty();
	// 
	// var svg = d3.select(divName).append("svg")
	// 	.attr("height", 100)
	// 	.attr("width", 100);
	// 
	// svg.append("rect")
	// 	// .attr("transform", function() { return "translate(0,0)"; })
	// 	.attr("x", 0)
	// 	.attr("y", 0)
	// 	.attr("rx", 15)
	// 	.attr("width", 90)
	// 	.attr("height", 40)
	// 	.attr("fill", "rgb(10,10,10)");
}


/************************************************************
 * Event handler helpers
 ************************************************************/
var updateStyleOrder = function(d, key) {
	mainSortKey = key;
	if (key == "stacked") {
		var categoryIndex = stackedCategoryOrder.indexOf(d.category);
		var subcategoryIndex = stackedSubcategoryOrders[d.category].indexOf(d.subcategory);

		if (categoryIndex != 0) {
			stackedCategoryOrder.splice(categoryIndex, 1);
			stackedCategoryOrder.unshift(d.category);
		}

		if (subcategoryIndex != 0) {
			stackedSubcategoryOrders[d.category].splice(subcategoryIndex, 1);
			stackedSubcategoryOrders[d.category].unshift(d.subcategory);
		}
	} else if (key == "restaurants") {
		var index = styleOrder.indexOf(d);
		styleOrder.splice(index, 1);
		styleOrder.unshift(d);
	} else if (key == "aligned"){
		var index = alignedCategoryOrder.indexOf(d.category);
		alignedCategoryOrder.splice(index, 1);
		alignedCategoryOrder.unshift(d.category);
	}
	// else if (key == "university") {
	// 	updateSortOrdersForUniversity(d);
	// 	sortUniversity = d;
	// 	console.log(sortUniversity.name);
	// }
	drawURIF(false);
}

// var updateSortOrdersForUniversity = function(u) {
// 	styleOrder = styleOrder.sort(function(a, b) {
// 		var compareA = u.restaurantStats[a];
// 		var compareB = u.restaurantStats[b];
// 		if (compareA === undefined) compareA = 0; else compareA = compareA.averageStars();
// 		if (compareB === undefined) compareB = 0; else compareB = compareB.averageStars();
// 		return compareB - compareA;
// 	});
// }

function playSound() {
	document.getElementById("soundfile").innerHTML="<embed src=\"./media/whoosh.wav\" hidden=\"true\" autostart=\"true\" loop=\"false\" />";
}


/************************************************************
 * Setup routines
 ************************************************************/
// Initial build
var startURIF = function() {
	importCSVData(csvCallback);
};

var parseCSVData = function() {
	parseUniversitySummaryData();
	parseUniversitiesData();
	parseRestaurantsData();
	drawURIF(true);
};

var csvCallback = function() {
	if (++dataFilesLoaded == dataFiles) parseCSVData();
};

var drawURIF = function(isResizing) {
	buildEntireChart("div#visualization", isResizing);
};

var resetURIF = function() {
	mainSortKey = "restaurants";
	styleOrder = ["american", "african", "asian", "european", "latin_american", "middle_eastern", "mediterranean", "mexican", "uncategorized"];
	alignedCategoryOrder = ["salary", "fees"];
	stackedCategoryOrder = ["people", "genders", "residencies","ethnicities"];
	stackedSubcategoryOrders = {
		people: ["undergrads", "grads", "faculty"],
		genders: ["male", "female"],
		statuses: ["full_time", "part_time"],
		residencies: ["out_of_state", "in_state", "international", "unknown_residence"],
		ethnicities: ["white","hispanic","asian","nonresident_alien","other"]
	};
	// sortUniversity = "";
	
	drawURIF(false);
};

window.onresize = function() {
	drawURIF(true);
	// playSound();
}