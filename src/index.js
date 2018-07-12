import './index.scss'
import * as d3 from 'd3'
import * as qs from 'query-string'

let q = qs.parse(location.search),
    containerId = 'chart-container',
    containerWidth = document.getElementById(containerId).offsetWidth,
    containerHeight = document.getElementById(containerId).offsetHeight,
    svg = d3.select(`#${containerId}`).append("svg").attr("width", containerWidth).attr("height", containerHeight),
    margin = { top: 20, right: 20, bottom: 30, left: 100 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    helperWidth = width / 20,
    realTrendRatio = +q.r > 0 ? Math.min(1, Math.abs(+q.r)) : 0.25,
    realTrendData = [], userTrendData = [],
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

let parseTime = d3.timeParse("%Y-%m-%d");

let x = d3.scaleTime().rangeRound([0, width]),
    y = d3.scaleLinear().rangeRound([height, 0]),
    c = d3.scaleSequential(d3.interpolateRdYlGn).domain([1, 0]),
    s = d3.scaleSqrt().domain([0, 0.5]).rangeRound([100, 0]).clamp(true);

let line = d3.line()
    .x(function (d) { return x(d.date); })
    .y(function (d) { return y(d.close); });

let spline = d3.line().curve(d3.curveLinear);

d3
    .json("https://api.iextrading.com/1.0/ref-data/symbols")
    .then(function (allSymbols) {

        let symbols = allSymbols.filter(d => d.isEnabled),
            symbol = symbols[Math.floor(d3.randomUniform(symbols.length-1)())];

        d3.json(
            `https://api.iextrading.com/1.0/stock/${symbol.symbol.toLowerCase()}/chart/5y?chartSimplify=1`
        ).then(
            function (data) {

                data = data.map(function(d) { d.date = parseTime(d.date); return d; }).slice(10);

                x.domain(d3.extent(data, function (d) { return d.date; }));
                y.domain(d3.extent(data, function (d) { return d.close; }));

                realTrendData = data.map(d => [x(d.date) + margin.left, y(d.close) + margin.top]);

                g.append("path")
                    .datum(data.slice(0, Math.floor(data.length * realTrendRatio) + 1))
                    .attr("class", "real-trend real-trend-first")
                    .attr("stroke", "steelblue")
                    .attr("d", line);

                g.append("path")
                    .datum(data.slice(Math.floor(data.length * realTrendRatio)))
                    .attr("class", "real-trend real-trend-last")
                    .attr("stroke", "steelblue")
                    .attr("opacity", 0)
                    .attr("d", line);

                g.append("g")
                    .attr("class", "drag-helper")
                    .call(sel => { drawRect(sel, "Begin to draw your trend from here...") });

                g.append("g")
                    .attr("class", "drag-helper")
                    .attr("transform", `translate(${width - helperWidth},0)`)
                    .call(sel => { drawRect(sel, "... end to draw your trend here.") });

                g.append("g")
                    .attr("transform", "translate(0," + height + ")")
                    .call(d3.axisBottom(x))
                    .append("text")
                    .attr("fill", "#000")
                    .attr("x", width)
                    .attr("dy", "-0.71em")
                    .attr("dx", "-0.71em")
                    .attr("text-anchor", "end")
                    .text("Time");

                g.append("g")
                    .call(d3.axisLeft(y))
                    .append("text")
                    .attr("fill", "#000")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "0.71em")
                    .attr("dx", "-0.71em")
                    .attr("text-anchor", "end")
                    .text("Price ($)");

                svg.append("path")
                    .attr("class", "user-trend")
                    .attr("stroke", "black");

                svg.call(
                    d3.drag()
                        .container(function () { return this; })
                        .subject(function () { var p = [d3.event.x, d3.event.y]; return [p, p]; })
                        .on("start", dragstarted)
                        .on("end", dragended)
                );

                function dragended() {

                    if (d3.event.x < width + margin.left - helperWidth || !svg.select(".user-trend").attr("d")) return;

                    d3.select(".real-trend-last").attr("opacity", 1);
                    svg.attr("class", null);
                    d3.select('body').style("background-color", null);

                    let sqm = Math.sqrt(userTrendData
                        .map(d => realTrendData[d3.bisector(d => d[0]).right(realTrendData, d[0])][1] - d[1])
                        .reduce((m, n) => m + n ** 2, 0) / userTrendData.length) / height;

                    d3.select("#score-container").text(`You earned ${Math.floor(s(sqm))} dollars from ${symbol.name}!`);
                }

                function dragstarted() {

                    if (!realTrendRatio) {
                        if (d3.event.x < margin.left || d3.event.x > margin.left + helperWidth) return;
                    } else {
                        if (d3.event.x < realTrendData[Math.max(0, Math.floor(data.length * realTrendRatio) - 10)][0] || d3.event.x > width + margin.left - helperWidth) return;
                    }

                    svg.select(".real-trend-last").attr("opacity", 0);
                    svg.select(".user-trend").attr("d", null)
                    d3.select("#score-container").html("&nbsp;");

                    userTrendData = d3.event.subject;

                    let active = svg.select(".user-trend").datum(userTrendData),
                        x0 = d3.event.x,
                        y0 = d3.event.y;

                    d3.event.on("drag", function () {

                        if (d3.event.x > width + margin.left) return;
                        if (d3.event.y > height + margin.top) return;
                        if (d3.event.y < margin.top) return;

                        var x1 = Math.floor(d3.event.x),
                            y1 = Math.floor(d3.event.y),
                            dx = x1 - x0,
                            dy = y1 - y0;

                        if (dx * dx + dy * dy > 100) {
                            userTrendData.push([x0 = x1, y0 = y1]);
                        } else {
                            userTrendData[userTrendData.length - 1] = [x1, y1];
                        }

                        let nearestPointX = realTrendData[d3.bisector(d => d[0]).right(realTrendData, x1)],
                            currentDistanceY = nearestPointX[1] - y1;
                        svg.attr("class", currentDistanceY < 0 ? 'up' : 'down');
                        d3.select('body').style("background-color", c(Math.abs(currentDistanceY / height)));

                        active
                            .datum(userTrendData = userTrendData.filter(d => d[0] <= x1))
                            .attr("d", spline);

                    });

                }

                function drawRect(sel, msg) {

                    sel.append("rect")
                        .attr("y", 0)
                        .attr("x", 0)
                        .attr("width", helperWidth)
                        .attr("height", height);

                    sel.append("text")
                        .attr("transform", `rotate(-90)translate(${-height / 2},${helperWidth})`)
                        .attr("dy", "-0.5em")
                        .attr("text-anchor", "middle")
                        .text(msg || "");

                }

            }
        );

    });
