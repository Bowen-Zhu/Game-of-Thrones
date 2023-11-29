class RelationshipNetwork {
    constructor(parentElement, data, sharedScreenTime, groupedCharacter) {
        this.parentElement = parentElement;
        this.data = data;
        this.copy = data;
        this.sharedScreenTime = sharedScreenTime;
        this.groupedCharacter = groupedCharacter;

        this.initVis();
    }



    initVis() {
        let vis = this;

        vis.margin = {top: 50, right: 50, bottom: 50, left: 50};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.bottom - vis.margin.top;

        // Create SVG area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.width / 2}, ${vis.height / 2})`);

        // Create groups
        vis.link = vis.svg.append("g").attr("class", "links");
        vis.node = vis.svg.append("g").attr("class", "nodes");

        // Define color scale
        vis.color = d3.scaleOrdinal(d3.schemeTableau10);

        // Create tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "network-tooltip")
            .style("opacity", 0);

        // Initialize force simulation
        vis.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-20))
            .force("center", d3.forceCenter(0, 0))
            .on("tick", () => vis.ticked());

        vis.wrangleData();

    }



    wrangleData() {
        let vis = this;
        // console.log("Processed Data in network.js:", vis.data);
        // console.log("Shared Screen Time in network.js:", vis.sharedScreenTime);
        // console.log("Grouped Characters in network.js:", vis.groupedCharacter);

        vis.nodes = [];
        vis.links = [];
        vis.selectedNodes = [];

        // Process nodes
        vis.data.forEach((d, i) => {
            vis.nodes.push({
                ...d,
                "id": i
            });
        });

        // Process links
        vis.nodes.forEach((node, i) => {
            vis.data.forEach((d) => {
                ["killed", "marriedEngaged", "guardianOf", "guardedBy", "killedBy", "parents", "parentOf", "serves", "servedBy", "siblings"].forEach((relation) => {
                    if (d[relation] && d[relation].includes(node.characterName)) {
                        let targetNode = vis.nodes.find(n => n.characterName === d.characterName);
                        if (targetNode) {
                            vis.links.push({
                                "source": node.id,
                                "target": targetNode.id,
                            });
                        }
                    }
                });
            });
        });

        // Count links for each node
        vis.linkCount = new Array(vis.nodes.length).fill(0);
        let countedLinks = new Set();

        vis.links.forEach(link => {
            let linkId = link.source < link.target ? `${link.source}-${link.target}` : `${link.target}-${link.source}`;

            if (!countedLinks.has(linkId)) {
                vis.linkCount[link.source]++;
                vis.linkCount[link.target]++;
                countedLinks.add(linkId);
            }
        });

        vis.updateVis();
    }



    updateVis() {
        let vis = this;

        // Update links
        vis.link = vis.svg.selectAll(".link")
            .data(vis.links, d => d.source.id + "-" + d.target.id);
        vis.link.exit().remove();
        vis.link = vis.link.enter().append("line")
            .attr("class", "link")
            .merge(vis.link)
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.5);

        // Update nodes
        vis.node = vis.svg.selectAll(".node")
            .data(vis.nodes, d => d.id);
        vis.node.exit().remove();
        vis.node = vis.node.enter().append("circle")
            .attr("class", "node")
            .merge(vis.node)
            .attr("r", d => 5 + Math.sqrt(vis.linkCount[d.id]) * 3)
            .attr("fill", d => vis.color(d.group))
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .on("mouseover", function (event, d) {
                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                let tooltipContent = `
                Name: <b>${d.characterName}</b><br/>
                House: <b>${d.group}</b><br/>
                Count: <b>${vis.linkCount[d.id]}</b>
                `;
                vis.tooltip.html(tooltipContent)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                vis.tooltip
                    .style("opacity", 0);
            })
            .on("click", function (event, d) {
                if (!d.isSelected) {
                    d.isSelected = true;
                    vis.links.forEach(link => {
                        if (link.source === d || link.target === d) {
                            let connectedNode = link.source === d ? link.target : link.source;
                            connectedNode.isSelected = true;
                        }
                    });
                } else {
                    d.isSelected = false;
                }
                vis.node
                    .attr("stroke", node => node.isSelected ? "black" : "white")
                    .attr("stroke-width", node => node.isSelected ? 2 : 1.5);
                vis.handleNodeClick(d);
            })
            .call(this.drag(vis.simulation));

        // Re-append nodes
        vis.node.each(function() {
            this.parentNode.appendChild(this);
        });

        // Update graph
        vis.simulation.nodes(vis.nodes);
        vis.simulation.force("link").links(vis.links);
        vis.simulation.alpha(1).restart();

        vis.createLegend();
    }



    ticked() {
        let vis = this;

        vis.node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        vis.link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    }



    drag(simulation) {
        function dragStarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragEnded(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded);
    }




    createLegend() {
        let vis = this;

        vis.groups = Array.from(new Set(vis.nodes.map(node => node.group))).sort();

        vis.legendRectSize = 15;
        vis.legendSpacing = 20;

        vis.svg.select(".legend").remove();

        // Create legend group
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(-${vis.width / 2}, -${vis.height / 2})`);

        // Update legend group
        vis.groups.forEach((group, index) => {
            let legendItem = vis.legend.append("g")
                .attr("class", "legend-item")
                .attr("transform", `translate(0, ${index * vis.legendSpacing})`);

            legendItem.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", vis.legendRectSize)
                .attr("height", vis.legendRectSize)
                .style("fill", vis.color(group));

            legendItem.append("text")
                .attr("x", vis.legendRectSize + 5)
                .attr("y", vis.legendRectSize / 2)
                .attr("dy", ".35em")
                .style("text-anchor", "start")
                .text(group);
        });
    }



    handleNodeClick(node) {
        let vis = this;

        vis.selectedNodes = [];

        vis.nodes.forEach(node => {
            let matchedData = vis.data.find(d => d.characterName === node.characterName);
            if (node.isSelected && matchedData) {
                vis.selectedNodes.push(matchedData);
            }
        });

        if (!node.isSelected) {
            vis.selectedNodes = vis.selectedNodes.filter(d => d.characterName !== node.characterName);
        }
        // console.log("Selected Nodes in network.js:", vis.selectedNodes);

        /*
        let connectedLinks = vis.links.filter(link => {
            let sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            let targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return sourceId === node.id || targetId === node.id;
        });
        console.log("Links connected to " + node.name + ":", connectedLinks);
         */
    }



    submitSelectedNodes() {
        let vis = this;

        if (vis.selectedNodes.length < 4) {
            document.getElementById("select-node").disabled = true;

            let toastElement = document.getElementById("liveToast");
            let toast = new bootstrap.Toast(toastElement);
            toast.show();

            return;
        } else {
            document.getElementById("select-node").disabled = false;
        }

        vis.data = vis.selectedNodes;

        vis.nodes.forEach(node => {
            node.isSelected = false;
        });

        // Pass variable to main.js
        let event = new CustomEvent("nodeSelected", { detail: vis.data });
        document.dispatchEvent(event);

        vis.wrangleData();
    }



    reloadSelectedNodes() {
        let vis = this;

        document.getElementById("select-node").disabled = false;

        vis.data = vis.copy;

        vis.nodes.forEach(node => {
            node.isSelected = false;
        });

        // Pass variable to main.js
        let event = new CustomEvent("nodeSelected", { detail: vis.data });
        document.dispatchEvent(event);

        vis.wrangleData();
    }

}
