class RelationshipNetwork {
    constructor(parentElement, data, sharedScreenTime, groupedCharacter) {
        this.parentElement = parentElement;
        this.data = data;
        this.sharedScreenTime = sharedScreenTime;
        this.groupedCharacter = groupedCharacter;
        this.matrix = {"nodes":[], "links":[]};

        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "network-tooltip")
            .style("opacity", 0);

        this.processData();
        this.renderNetwork();
    }

    processData() {
        let vis = this;
        console.log("Processed Data:", vis.data);
        console.log("Shared Screen Time:", vis.sharedScreenTime);
        console.log("Grouped Characters:", vis.groupedCharacter);

        // Process nodes
        vis.data.forEach((d, i) => {
            vis.matrix.nodes.push({
                "name": d.characterName,
                "group": d.group,
                "id": i
            });
        });

        // Process links
        vis.sharedScreenTime.forEach((row, i) => {
            row.forEach((value, j) => {
                if (value > 0 && i !== j) {
                    vis.matrix.links.push({
                        "source": i,
                        "target": j,
                        "value": value
                    });
                }
            });
        });

        // Count links for each node
        vis.linkCount = new Array(vis.matrix.nodes.length).fill(0);
        vis.matrix.links.forEach(link => {
            vis.linkCount[link.source]++;
            vis.linkCount[link.target]++;
        });
    }

    renderNetwork() {
        let vis = this;

        vis.margin = {top: 50, right: 50, bottom: 50, left: 50};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.bottom - vis.margin.top;

        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        vis.color = d3.scaleOrdinal(d3.schemeCategory10);

        // Create links
        let link = vis.svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(vis.matrix.links)
            .enter().append("line")
            .attr("stroke-width", 1)
            .attr("stroke", "lightGray");

        // Create nodes
        let node = vis.svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(vis.matrix.nodes)
            .enter().append("circle")
            .attr("r", d => 3 * Math.sqrt(vis.linkCount[d.id]))
            .attr("fill", d => vis.color(d.group))
            .on("mouseover", function (event, d) {
                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);

                let tooltipContent = `Name: <b>${d.name}</b><br/>Group: <b>${d.group}</b><br/>Link Count: <b>${vis.linkCount[d.id]}</b>`;

                vis.tooltip.html(tooltipContent)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                vis.tooltip
                    .style("opacity", 0);
            });

        // console.log(vis.matrix.nodes.map(d => d.group));

        // Enable dragging
        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

        // Force simulation
        vis.simulation = d3.forceSimulation(vis.matrix.nodes)
            .force("link", d3.forceLink(vis.matrix.links)
                .id(d => d.id)
                .distance(350)
                .strength(0.03))
            .force("charge", d3.forceManyBody().strength(-50))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                node
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);
            });

        node.call(drag(vis.simulation));

        vis.createLegend();
    }

    createLegend() {
        let vis = this;

        const legendMargin = { top: 10, right: 5, bottom: 10, left: 5 };
        const legendRectSize = 18;
        const legendSpacing = 20;

        const groups = [...new Set(vis.matrix.nodes.map(d => d.group))];
        vis.groupColors = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(groups);

        // Create legend SVG group
        const legendSvg = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width - 150}, ${legendMargin.top})`);

        // Create legend
        groups.forEach((group, index) => {
            const legendItem = legendSvg.append("g")
                .attr("class", "legend-item")
                .attr("transform", `translate(0, ${index * legendSpacing})`);

            // Draw rectangle
            legendItem.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", legendRectSize)
                .attr("height", legendRectSize)
                .style("fill", vis.groupColors(group));

            // Add label
            legendItem.append("text")
                .attr("x", legendRectSize + 5)
                .attr("y", legendRectSize / 2)
                .attr("dy", ".35em")
                .style("text-anchor", "start")
                .text(group);
        });
    }

}