class RelationshipMatrix {
    constructor(matrixData, parentElement, topN, characterNames) {
        this.matrixData = matrixData;
        this.parentElement = parentElement;
        this.topN = topN;
        this.characterNames = characterNames;

        this.maxScreenTime = this.calculateMaxScreenTime();


        //define tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "matrix-tooltip")
            .style("opacity", 0);

        this.purpleScale = d3.scaleLinear()
            .domain([0, this.maxScreenTime])
            .range(["#f2e0f7", "#d000d0"])
            .interpolate(d3.interpolateRgb);

        this.renderMatrix();
    }

    getTimeColor(screenTime) {
        return this.purpleScale(screenTime);
    }

    calculateMaxScreenTime() {
        let maxTime = 0;
        this.matrixData.forEach((row, rowIndex) => {
            row.forEach((cellValue, colIndex) => {
                // Check if the rowIndex and colIndex are not the same to exclude self-relations
                if (rowIndex !== colIndex && cellValue > maxTime) {
                    maxTime = cellValue;
                }
            });
        });
        return maxTime;
    }


    renderMatrix() {
        let vis = this;

        vis.margin = {top: 150, right: 50, bottom: 50, left: 150};

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;


        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);


        // Define scales
        vis.xScale = d3.scaleBand()
            .range([0, vis.width])
            .domain(vis.characterNames)
            .padding(0.1);

        vis.yScale = d3.scaleBand()
            .range([0, vis.height])
            .domain(vis.characterNames)
            .padding(0.1);

        const cellSize = vis.xScale.bandwidth();

        // Column labels
        vis.svg.append("g")
            .selectAll("text")
            .data(vis.characterNames)
            .enter()
            .append("text")
            .text(d => d)
            .attr("x", (d, i) => cellSize * i + cellSize / 2)
            .attr("y", -10)
            .attr("text-anchor", "start")
            .attr("transform", (d, i) => `rotate(-90, ${cellSize * i + cellSize / 2}, -10)`)
            .style("font-size", "12px");

        // Row labels
        vis.svg.append("g")
            .selectAll("text")
            .data(vis.characterNames)
            .enter()
            .append("text")
            .text(d => d)
            .attr("x", -10)
            .attr("y", (d, i) => cellSize * i + cellSize / 2)
            .attr("text-anchor", "end")
            .style("font-size", "12px");

        // Add matrix cells
        vis.rows = vis.svg.selectAll(".row")
            .data(vis.matrixData)
            .enter()
            .append("g")
            .attr("transform", (d, i) => `translate(0, ${cellSize * i})`);

        vis.rows.selectAll(".cell")
            .data((d, rowIndex) => d.map((cellValue, colIndex) => {
                return { cellValue, rowIndex, colIndex };
            }))
            .enter()
            .append("rect")
            .attr("class", "cell")
            .attr("x", (d, i) => cellSize * i)
            .attr("y", 0)
            .attr("width", cellSize)
            .attr("height", cellSize)
            .style("fill", d => {
                return vis.characterNames[d.rowIndex] === vis.characterNames[d.colIndex] ? "#f2e0f7" : this.getTimeColor(d.cellValue);
            })
            .style("stroke", "white")
            .style("stroke-width", "2px")
            .style("opacity", 0.9)
            .on("mouseover", function (event, d) {
                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                let screenTimeText = d.rowIndex === d.colIndex ?
                    " " : `Screen Time Together: <b>${d.cellValue} seconds</b>`;

                vis.tooltip.html(`Relationship between <b>${vis.characterNames[d.rowIndex]} & ${vis.characterNames[d.colIndex]}</b><br/>${screenTimeText}`)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                vis.tooltip
                    .style("opacity", 0);
            });

        this.createLegend();
    }

    createLegend() {
        let vis = this;

        // Define the gradient for the legend
        let gradient = vis.svg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        // Populate the gradient with colors from the scale
        gradient.selectAll("stop")
            .data(vis.purpleScale.ticks().map((tick, i, nodes) => (
                { offset: `${100*i/nodes.length}%`, color: vis.purpleScale(tick) }
            )))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        // Legend bar dimensions
        const legendWidth = vis.width - vis.margin.left;
        const legendHeight = 30;

        // Append the legend bar
        vis.svg.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#gradient)")
            .attr("transform", `translate(0,${vis.height-50})`);

        // Define a scale and axis for the legend
        let legendScale = d3.scaleLinear()
            .domain([0, this.maxScreenTime])
            .range([0, legendWidth]);

        let legendAxis = d3.axisTop(legendScale)
            .ticks(5);

        // Append the legend axis
        vis.svg.append("g")
            .attr("class", "legend-axis")
            .attr("transform", `translate(0, ${vis.height-50})`)
            .call(legendAxis);
    }

}
