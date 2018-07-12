import './index.scss'
import * as d3 from 'd3'
import * as qs from 'query-string'

let q = qs.parse(location.search),
    containerId = 'chart-container',
    containerWidth = document.getElementById(containerId).offsetWidth,
    containerHeight = document.getElementById(containerId).offsetHeight,
    svg = d3.select(`#${containerId}`).append("svg").attr("width", containerWidth).attr("height", containerHeight),
    margin = { top: 20, right: 20, bottom: 30, left: 50 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    helperWidth = width / 20,
    realTrendRatio = +q.r > 0 ? Math.min(1,Math.abs(+q.r)) : 0,
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

let parseTime = d3.timeParse("%d-%b-%y");

let x = d3.scaleTime().rangeRound([0, width]),
    y = d3.scaleLinear().rangeRound([height, 0]),
    c = d3.scaleSequential(d3.interpolateRdYlGn).domain([1,0]);

let line = d3.line()
    .x(function (d) { return x(d.date); })
    .y(function (d) { return y(d.close); });

let spline = d3.line().curve(d3.curveLinear);

d3.csv(
    "data.csv",
    function (d) {
        d.date = parseTime(d.date);
        d.close = +d.close;
        return d;
    }
).then(
    function (data) {

        x.domain(d3.extent(data, function (d) { return d.date; }));
        y.domain(d3.extent(data, function (d) { return d.close; }));

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
            .text("Year");

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

        g.append("path")
            .datum(data.slice(0,Math.floor(data.length*realTrendRatio)+1))
            .attr("class", "real-trend real-trend-first")
            .attr("stroke", "steelblue")
            .attr("d", line);

        g.append("path")
            .datum(data.slice(Math.floor(data.length*realTrendRatio)))
            .attr("class", "real-trend real-trend-last")
            .attr("stroke", "steelblue")
            .attr("display", "none")
            .attr("d", line);

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
            d3.select(".real-trend-last").attr("display", null);
            svg.attr("class", null);
            d3.select('body').style("background-color", null);
        }
        
        function dragstarted() {
        
            if (!realTrendRatio) {
                if(d3.event.x < margin.left || d3.event.x > margin.left + helperWidth) return;
            } else {
                if (d3.event.x < x(data[Math.max(0,Math.floor(data.length*realTrendRatio)-10)].date) + margin.left || d3.event.x > width + margin.left - helperWidth) return;
            }
        
            svg.select(".real-trend-last").attr("display", "none");
            svg.select(".user-trend").attr("d", null)
        
            var d = d3.event.subject,
                active = svg.select(".user-trend").datum(d),
                x0 = d3.event.x,
                y0 = d3.event.y;
                //nearestPoint = data[Math.max(0,Math.floor(data.length*realTrendRatio)-1)];
        
            d3.event.on("drag", function () {
        
                if (d3.event.x > width + margin.left) return;
                if (d3.event.y > height + margin.top) return;
                if (d3.event.y < margin.top) return;
        
                var x1 = Math.floor(d3.event.x),
                    y1 = Math.floor(d3.event.y),
                    dx = x1 - x0,
                    dy = y1 - y0;
        
                if (dx * dx + dy * dy > 100) {
                    d.push([x0 = x1, y0 = y1]);
                } else {
                    d[d.length - 1] = [x1, y1];
                }

                let nearestPoint = data[d3.bisector(p => p.date).right(data,x.invert(x1-margin.left))],
                    currentDistance = y(nearestPoint.close) - y1 + margin.top;
                svg.attr("class", currentDistance < 0 ? 'up' : 'down');
                d3.select('body').style("background-color", c(Math.abs(currentDistance/height)));
        
                active
                    .datum(d = d.filter(p => p[0] <= x1))
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
                .attr("dy", "-0.71em")
                .attr("text-anchor", "middle")
                .text(msg||"");
        
        }

    }
);
