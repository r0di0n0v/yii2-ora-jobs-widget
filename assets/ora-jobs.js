

var Chart = function (options) {

    this.selector = options.selector
    this.url = options.url

    this.items = []
    this.labels = []

    this.timeStart = new Date(3100, 0, 1)
    this.timeEnd = new Date(1970, 0, 1)

    this.brush = null
    this.gBrush = null

    this.xMiniScale = null


    this.MAIN_LINE_HEIGHT = 12
    this.MAIN_LINE_MARGIN = 3
    this.MINI_LINE_HEIGHT = 2
    this.MINI_LINE_MARGIN = 0

    this.PADDING_TOP = 20
    this.PADDING_BOTTOM = 20
    this.PADDING_LEFT = 200
    this.PADDING_RIGHT = 20

    /**
     * Минимальная ширина элемента графика
     * @type {number}
     */
    this.MIN_BAR_WIDTH = null
    if (parseFloat(options.min_bar_width) > 0) {
        this.MIN_BAR_WIDTH = parseFloat(options.min_bar_width)
    }

    this.width = options.width || 1160

    this._getChartData();

    return this
}

Chart.prototype._getChartData = function () {
    $.ajax({
        'url': this.url,
        'dataType': 'json',
        'context': this
    }).done(function (d) {
        this.items = [];

        for (var k in d['rows']) {
            this.items.push({
                id: d['rows'][k].id,
                s: new Date(parseInt(d['rows'][k].s)),
                e: new Date(parseInt(d['rows'][k].e)),
                res: d['rows'][k].res
            })
        }

        this.labels = d.labels

        this._drawChart(this.selector, this.labels, this.items)
    })
}

Chart.prototype._drawChart = function (tag, labels, items) {
    var MIN_BAR_WIDTH = this.MIN_BAR_WIDTH

    var dataLen = labels.length

    for (var key in items) {
        if (items[key].s < this.timeStart) {
            this.timeStart = items[key].s
        }
        if (items[key].e > this.timeEnd) {
            this.timeEnd = items[key].e
        }
    }

    var m = [this.PADDING_TOP, this.PADDING_RIGHT, this.PADDING_BOTTOM, this.PADDING_LEFT] //top right bottom left

    var mainLineHeigth = this.MAIN_LINE_HEIGHT,
        mainLineBetween = this.MAIN_LINE_MARGIN,
        miniLineHeight = this.MINI_LINE_HEIGHT,
        miniLineBetween = this.MINI_LINE_MARGIN,

        miniHeight = dataLen * (miniLineHeight + miniLineBetween),
        mainHeight = dataLen * (mainLineHeigth + mainLineBetween),

        h = mainHeight + miniHeight,
        canvasHeight = h + m[0] + m[2],

        canvasWidth = this.width,
        w = canvasWidth - m[1] - m[3]

    //scales
    var xMiniScale = d3.scaleTime()
        .domain([this.timeStart, this.timeEnd])
        .range([0, w]);

    this.xMiniScale = xMiniScale

    var x1 = d3.scaleLinear()
        .range([0, w]);

    var y1 = d3.scaleLinear()
        .domain([0, dataLen])
        .range([0, mainHeight]);
    var chart = d3.select(tag)
        .append("svg")
        .attr("width", canvasWidth)
        .attr("height", canvasHeight)
        .attr("class", "chart");


    chart.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", w)
        .attr("height", mainHeight);

    var main = chart.append("g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")")
        .attr("width", w)
        .attr("height", mainHeight)
        .attr("class", "main");

    //main labels and texts
    main.append("g")
        .selectAll(".laneLines")
        .data(items)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("y1", function (d) {
            return y1(d.id);
        })
        .attr("x2", w)
        .attr("y2", function (d) {
            return y1(d.id);
        })
        .attr("stroke", "lightgray")

    main.append("g")
        .selectAll(".laneText")
        .data(labels)
        .enter()
        .append("text")
        .text(function (d) {
            return d;
        })
        .attr("x", -m[1])
        .attr("y", function (d, i) {
            return y1(i + .5);
        })
        .attr("dy", ".5ex")
        .attr("text-anchor", "end")
        .attr("class", "laneText");


    var mini = chart.append("g")
        .attr("transform", "translate(" + m[3] + "," + (mainHeight + m[0]) + ")")
        .attr("width", w)
        .attr("height", miniHeight)
        .attr("class", "mini");

    //mini labels and texts

    var itemRects = main.append("g")
        .attr("clip-path", "url(#clip)")

    //mini item rects
    mini.append("g").selectAll("miniItems")
        .data(items)
        .enter().append("rect")
        .attr("class", function (d) {
            return "miniItem" + d.id + _getResultClass(d.res);
        })
        .attr("x", function (d) {
            return xMiniScale(d.s);
        })
        .attr("y", function (d) {
            return d.id * miniLineHeight + miniLineBetween * d.id;
        })
        .attr("width", function (d) {
            return xMiniScale(d.e) - xMiniScale(d.s);
        })
        .attr("height", miniLineHeight);

    // AXIS

    var xMiniAxis = d3.axisBottom(xMiniScale)
        .tickFormat(d3.timeFormat("%d. %H:%M"))
        .tickSize(-miniHeight)

    mini.append("g")
        .attr("class", "xaxis")   // give it a class so it can be used to select only xaxis labels  below
        .attr("transform", "translate(0," + (miniHeight + miniLineBetween) + ")")
        .call(xMiniAxis);


    var xMainScale = d3.scaleTime()
        .domain([this.timeStart, this.timeEnd])    // values between 0 and 100
        .range([0, w]);

    var xMainAxis = d3.axisTop(xMainScale)
        .tickFormat(d3.timeFormat("%d. %H:%M"))
        .tickSize(-mainHeight)

    var xMain = main.append("g")
        .attr("class", "xmainaxis")   // give it a class so it can be used to select only xaxis labels  below
        // .attr("transform", "translate(0," + mainHeight + ")")
        .call(xMainAxis);

    //brush
    var brush = d3.brushX()
        .extent([[0, 0], [w, miniHeight]])
        .on("brush", display);

    this.brush = brush


    var gBrush = mini.append("g")
        .attr("class", "x brush")
        .call(brush)

    this.gBrush = gBrush

    gBrush.selectAll("rect")
        .attr("height", miniHeight); // 10 - высота оси с лейблом

    // tooltip
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    this.setInitialBrushPos();

    function display() {
        var selection = d3.event ? d3.event.selection : [0, 0]
        var rects,
            minExtent = xMiniScale.invert(selection[0]),
            maxExtent = xMiniScale.invert(selection[1]),
            visItems = items.filter(function (d) {
                return d.s < maxExtent && d.e > minExtent;
            });

        x1.domain([minExtent, maxExtent]);

        //update main item rects
        rects = itemRects.selectAll("rect")
            .data(visItems, function (d) {
                return d.id;
            })
            .attr("x", function (d) {
                return x1(d.s);
            })
            .attr("width", function (d) {
                let w = x1(d.e) - x1(d.s);
                if (MIN_BAR_WIDTH) {
                    if (w < MIN_BAR_WIDTH) {
                        w = MIN_BAR_WIDTH
                    }
                }
                return w;
            });

        rects.enter().append("rect")
            .attr("class", function (d) {
                return "mainItem" + d.id + _getResultClass(d.res);
            })
            .attr("x", function (d) {
                return x1(d.s);
            })
            .attr("y", function (d) {
                return y1(d.id);
            })
            .attr("width", function (d) {
                let w = x1(d.e) - x1(d.s);
                if (MIN_BAR_WIDTH) {
                    if (w < MIN_BAR_WIDTH) {
                        w = MIN_BAR_WIDTH
                    }
                }
                return w;
            })
            .attr("height", function (d) {
                return .8 * y1(1);
            })
            .on("mousemove", function (d) {
                tooltip.transition()
                    .duration(150)
                    .style("opacity", .9);
                tooltip
                    .html(labels[d.id] + "<br/>" + _dateFormat(d.s) + "<br/>" + _dateFormat(d.e))
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(150)
                    .style("opacity", 0);
            });

        rects.exit().remove();

        xMainScale.domain([minExtent, maxExtent]);
        xMain.call(xMainAxis);
    }

    function _getResultClass (result) {
        switch (result) {
            case 'fail':
                return ' fail'
            case 'success':
                return ' success'
            case 'run':
                return ' running'
            default:
                return ''
        }
    }

    function _dateFormat (dt) {
        return ('0' + dt.getDate()).substr(-2)
            +'.'
            +('0' + (dt.getMonth()+1)).substr(-2)
            + ' '
            +('0' + dt.getHours()).substr(-2)
            +':'
            +('0'+dt.getMinutes()).substr(-2)
    }
}

Chart.prototype.setInitialBrushPos = function () {
    var brushTimeStart = new Date(this.timeEnd)

    // Start time
    if (brushTimeStart.getHours() <= 22) {
        brushTimeStart.setDate(brushTimeStart.getDate() - 1)
    }
    brushTimeStart.setHours(22)
    brushTimeStart.setMinutes(0)
    brushTimeStart.setSeconds(0)
    brushTimeStart.setMilliseconds(0)

    var brushTimeEnd = new Date(brushTimeStart)
    brushTimeEnd.setDate(brushTimeEnd.getDate() + 1)
    brushTimeEnd.setHours(10)

    if (brushTimeStart < this.timeStart) {
        brushTimeStart = new Date(this.timeStart)

    }

    // end Time
    if (brushTimeEnd > this.timeEnd) {
        brushTimeEnd = new Date(this.timeEnd)
    }

    this.brush.move(this.gBrush, [ this.xMiniScale(brushTimeStart), this.xMiniScale(brushTimeEnd) ])
}
