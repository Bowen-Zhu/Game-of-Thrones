class RelationshipNetwork {
    constructor(parentElement, data, sharedScreenTime, groupedCharacter, selectedNodesSubmit) {
        this.parentElement = parentElement;
        this.data = data;
        this.sharedScreenTime = sharedScreenTime;
        this.groupedCharacter = groupedCharacter;
        this.selectedNodes = [];
        this.selectedNodesSubmit = selectedNodesSubmit;

        this.wrangleData();
    }

    wrangleData() {
        let vis = this;
        // console.log("Processed Data in network.js:", vis.data);
        // console.log("Shared Screen Time in network.js:", vis.sharedScreenTime);
        // console.log("Grouped Characters in network.js:", vis.groupedCharacter);

        this.nodes = [];
        this.links = [];

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
        vis.color = d3.scaleOrdinal(d3.schemeCategory10);

        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "network-tooltip")
            .style("opacity", 0);

        // Initialize force simulation
        vis.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(100).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-10))
            .force("center", d3.forceCenter(0, 0))
            .on("tick", () => vis.ticked());

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update links
        vis.link = vis.link.selectAll(".link")
            .data(vis.links, d => d.source.id + "-" + d.target.id);
        vis.link.exit().remove();
        vis.link = vis.link.enter().append("line").merge(vis.link)
            .attr("stroke", "lightGray")
            .attr("stroke-width", 1);

        // Update nodes
        vis.node = vis.node.selectAll(".node")
            .data(vis.nodes, d => d.id);
        vis.node.exit().remove();
        vis.node = vis.node.enter().append("circle").merge(vis.node)
            .attr("r", 8)
            .attr("fill", d => vis.color(d.group))
            .on("mouseover", function (event, d) {
                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                let tooltipContent = `
                Name: <b>${d.characterName}</b><br/>
                Group: <b>${d.group}</b><br/>
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
                d.isSelected = !d.isSelected;
                d3.select(this)
                    .attr("stroke", d.isSelected ? "black" : "none")
                    .attr("stroke-width", d.isSelected ? 2 : 0);
                vis.handleNodeClick(d);
            });

        // Update graph
        vis.simulation.nodes(vis.nodes);
        vis.simulation.force("link").links(vis.links);
        vis.simulation.alpha(1).restart();
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

    handleNodeClick(node) {
        let vis = this;
        let matchedData = vis.data.find(d => d.characterName === node.characterName);

        if (node.isSelected) {
            if (matchedData && !vis.selectedNodes.find(d => d.characterName === matchedData.characterName)) {
                vis.selectedNodes.push(matchedData);
            }
        } else {
            vis.selectedNodes = vis.selectedNodes.filter(d => d.characterName !== matchedData.characterName);
        }
        console.log("Selected Nodes in network.js:", vis.selectedNodes);

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
        if (this.selectedNodesSubmit && typeof this.selectedNodesSubmit === "function") {
            this.selectedNodesSubmit(this.selectedNodes);
            vis.data = vis.selectedNodes;
            // console.log("Submitted Nodes in network.js:", vis.data);

            vis.nodes.forEach(node => {
                node.isSelected = false;
            });

            vis.wrangleData();
        }
    }

}
