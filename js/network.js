class RelationshipNetwork {
    constructor(parentElement, data, sharedScreenTime, groupedCharacter, selectedNodesSubmit) {
        this.parentElement = parentElement;
        this.data = data;
        this.sharedScreenTime = sharedScreenTime;
        this.groupedCharacter = groupedCharacter;
        this.nodes = [];
        this.links = [];
        this.selectedNodes = [];
        this.selectedNodesSubmit = selectedNodesSubmit;

        this.wrangleData();
    }

    wrangleData() {
        let vis = this;
        console.log("Processed Data in network.js:", vis.data);
        // console.log("Shared Screen Time in network.js:", vis.sharedScreenTime);
        // console.log("Grouped Characters in network.js:", vis.groupedCharacter);

        // Process nodes
        vis.data.forEach((d, i) => {
            vis.nodes.push({
                "name": d.characterName,
                "group": d.group,
                "id": i
            });
        });

        // Process links
        vis.sharedScreenTime.forEach((row, i) => {
            row.forEach((value, j) => {
                if (value > 0 && i !== j) {
                    vis.links.push({
                        "source": i,
                        "target": j,
                        "value": value
                    });
                }
            });
        });

        // Count links for each node
        vis.linkCount = new Array(vis.nodes.length).fill(0);
        vis.links.forEach(link => {
            vis.linkCount[link.source]++;
            vis.linkCount[link.target]++;
        });

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 50, right: 50, bottom: 50, left: 50};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.bottom - vis.margin.top;

        // Create SVG area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        // Define color scale
        vis.color = d3.scaleOrdinal(d3.schemeCategory10);

        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "network-tooltip")
            .style("opacity", 0);

        // Initialize force simulation
        vis.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(350).strength(0.03))
            .force("charge", d3.forceManyBody().strength(-50))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2));

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Create links - not working
        let link = vis.svg.selectAll(".links")
            .data(vis.links, d => d.source.id + "-" + d.target.id);

        link = link
            .enter().append("line")
            .attr("class", "links")
            .merge(link)
            .attr("stroke-width", 1)
            .attr("stroke", "lightGray");

        link.exit().remove();

        // Create nodes - not working
        let node = vis.svg.selectAll(".nodes")
            .data(vis.nodes, d => d.id);

        node = node
            .enter().append("circle")
            .merge(node)
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
            })
            .on("click", function (event, d) {
                vis.handleNodeClick(d);
            });

        node.exit().remove();

        // Update simulation
        vis.simulation.nodes(vis.nodes).on("tick", ticked);
        vis.simulation.force("link").links(vis.links);
        vis.simulation.alpha(1).restart();

        function ticked() {
            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);

            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
        }

        vis.simulation.alpha(1).restart();



        // Create legend
        const legendMargin = { top: 10, right: 5, bottom: 10, left: 5 };
        const legendRectSize = 18;
        const legendSpacing = 20;

        const groups = [...new Set(vis.nodes.map(d => d.group))];
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

    handleNodeClick(node) {
        let vis = this;
        let matchedData = vis.data.find(d => d.characterName === node.name);
        if (matchedData && !vis.selectedNodes.find(d => d.characterName === matchedData.characterName)) {
            vis.selectedNodes.push(matchedData);
            console.log("Selected Nodes in network.js:", vis.selectedNodes);
        }
    }

    submitSelectedNodes() {
        let vis = this;
        if (this.selectedNodesSubmit && typeof this.selectedNodesSubmit === "function") {
            this.selectedNodesSubmit(this.selectedNodes);
            vis.data = vis.selectedNodes;
            console.log("Submitted Nodes in network.js:", vis.data);
            // vis.wrangleData(vis.data);
        }
    }

}
