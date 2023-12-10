class RelationshipMatrix {
    constructor(matrixData, parentElement, characterNames, data) {
        this.matrixData = matrixData;
        this.originalMatrixData = matrixData.slice().map(row => row.slice()); // Deep copy
        this.parentElement = parentElement;
        this.characterNames = characterNames;
        this.originalCharacterNames = [...characterNames]; // Shallow copy
        this.data = data;
        this.currentGroupFilter = 'All'; // Default group filter
        this.currentCharacterFilter = []; // Default character filter

        console.log(data)

        this.maxScreenTime = this.calculateMaxScreenTime();

        //define tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "matrix-tooltip")
            .style("opacity", 0);

        this.renderMatrix();
    }

    getTimeColor(screenTime) {
        return this.goldScale(screenTime);
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

        vis.margin = {top: 100, right: 50, bottom: 50, left: 150};

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

        vis.goldScale = d3.scaleLinear()
            .domain([0, this.maxScreenTime])
            .range(["rgba(255, 255, 224, 0.1)", "rgba(255, 255, 224, 1)"])
            .interpolate(d3.interpolateRgb);

        const cellSize = vis.yScale.bandwidth();

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
            .style("font-size", "10px")
            .style("fill", "lightyellow");

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
            .style("font-size", "10px")
            .style("fill", "lightyellow");

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
                return vis.characterNames[d.rowIndex] === vis.characterNames[d.colIndex] ? "#000000" : this.getTimeColor(d.cellValue);
            })
            .style("stroke", "#0a0a0a")
            .style("stroke-width", "2px")
            .style("opacity", 1)
            .on("mouseover", function (event, d) {
                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                let screenTimeText = d.rowIndex === d.colIndex ?
                    " " : `Screen Time Together: <b>${d.cellValue} seconds</b>`;

                vis.tooltip.html(`Relationship between <b>${vis.characterNames[d.rowIndex]} & ${vis.characterNames[d.colIndex]}</b><br/>${screenTimeText}`)
                    .style("left", event.pageX + "px")
                    .style("top", event.pageY + "px")
                    .style("visibility", "visible");
            })
            .on("mouseout", function (event, d) {
                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0)
                    .end()
                    .then(() => {
                        // Ensure the transition has completed before changing the visibility
                        if (vis.tooltip.style("opacity") === "0") {
                            vis.tooltip.style("visibility", "hidden");
                        }
                    })
                    .catch(error => {
                        console.warn("Transition was interrupted:", error);
                    });
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
            .data(vis.goldScale.ticks().map((tick, i, nodes) => (
                { offset: `${100*i/nodes.length}%`, color: vis.goldScale(tick) }
            )))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        // Legend bar dimensions
        const legendWidth = 300;
        const legendHeight = 30;

        // Append the legend bar
        vis.svg.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#gradient)")
            .attr("transform", `translate(${vis.margin.left*5},0)`);

        // Define a scale and axis for the legend
        let legendScale = d3.scaleLinear()
            .domain([0, this.maxScreenTime])
            .range([0, legendWidth]);

        let legendAxis = d3.axisTop(legendScale)
            .ticks(3);

        // Append the legend axis
        vis.svg.append("g")
            .attr("class", "legend-axis")
            .attr("transform", `translate(${vis.margin.left*5},0)`)
            .call(legendAxis);

        // Add a title for the legend
        vis.svg.append("text")
            .attr("class", "legend-title")
            .attr("x", vis.margin.left*5)
            .attr("y", -30)
            .text("Shared Screen Time (seconds)")
            .style("font-size", "15px")
            .style("fill", "lightyellow");
    }
    updateMatrixBasedOnGroup(groupName) {
        this.currentGroupFilter = groupName;
        this.applyFilters();
    }

    updateMatrix(selectedCharacterNames) {
        this.currentCharacterFilter = selectedCharacterNames;
        this.applyFilters();
    }

    applyFilters() {
        if (this.currentGroupFilter !== 'All') {
            this.filterMatrixBasedOnGroup();
        } else if (this.currentCharacterFilter.length > 0) {
            this.filterMatrixBasedOnCharacters();
        } else {
            this.resetMatrix();
        }
    }

    filterMatrixBasedOnGroup() {
        let groupCharacters = this.data.filter(character => character.group === this.currentGroupFilter)
            .map(character => character.characterName);

        if (groupCharacters.length === 0) {
            // If no characters in group and no characters selected in character filter, reset matrix
            alert(`No characters found in the '${this.currentGroupFilter}' group among the top 50 characters. Resetting matrix to show all characters`);
            if (this.currentCharacterFilter.length > 0) {
                document.getElementById('groupSelect').value = 'All';
                this.filterMatrixBasedOnCharacters();
            } else {
                document.getElementById('groupSelect').value = 'All';
                this.resetMatrix();
            }
            return;
        }

        this.characterNames = this.originalCharacterNames.filter(name => groupCharacters.includes(name));
        this.updateFilteredMatrixData();
        this.reRenderMatrix();
    }


    filterMatrixBasedOnCharacters() {
        this.characterNames = this.originalCharacterNames.filter(name => this.currentCharacterFilter.includes(name));
        this.updateFilteredMatrixData();
        this.reRenderMatrix();
    }

    updateFilteredMatrixData() {
        let filteredIndices = this.characterNames.map(name => this.originalCharacterNames.indexOf(name));
        this.matrixData = filteredIndices.map(rowIndex =>
            filteredIndices.map(colIndex => this.originalMatrixData[rowIndex][colIndex])
        );
    }

    reRenderMatrix() {
        d3.select("#" + this.parentElement).select("svg").remove();
        this.renderMatrix();
    }

    resetMatrix() {
        this.currentGroupFilter = 'All';
        this.currentCharacterFilter = [];
        this.characterNames = [...this.originalCharacterNames];
        this.matrixData = this.originalMatrixData.map(row => row.slice());

        this.reRenderMatrix();
    }



}
