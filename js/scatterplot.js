class Scatterplot {
    constructor(processedDataFull, deathsData, battlesData) {
        this.processedDataFull = processedDataFull;
        this.deathsData = deathsData;
        this.battlesData = battlesData;
        this.currentPlotType = 'Links';  // 'Links' or 'Battles'

        this.chaptersPerBook = 80; // Assuming each book has 80 chapters
        this.init();
    }

    init() {
        // Map to quickly find a character in processedDataFull
        this.characterMap = new Map(this.processedDataFull.map(d => [d.characterName, d]));
        // Prepare the data for the scatterplot
        this.data = this.prepareDataLinks();

        this.margin = { top: 10, right: 30, bottom: 40, left: 60 };
        this.width = 600 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

        this.svg = d3.select("#scatterplot")
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Create X and Y scales
        // this.x = d3.scaleLinear()
        //     .domain([0, d3.max(this.data, d => d.linkCount)]) // Domain based on link count
        //     .range([0, this.width]);
        this.x = d3.scaleLinear()
            .range([0, this.width]);

        this.y = d3.scaleLinear()
            .domain([1, d3.max(this.data, d => d.bookScaledChapter+0.1)]) // Domain based on bookScaledChapter
            .range([this.height, 0]);

        // Add X and Y axis
        this.svg.append("g")
            .attr("transform", `translate(0, ${this.height})`)
            .call(d3.axisBottom(this.x)); // X-axis for link count

        this.svg.append("g")
            .call(d3.axisLeft(this.y).tickFormat(d => {return Number.isInteger(d) ? `Book ${Math.floor(d)}` : ``})); // Y-axis for death chapter
    }

    clearPlot() {
        // Remove all elements inside the SVG
        this.svg.selectAll("*").remove();

        // Re-append the X and Y axis placeholders
        // Add X and Y axis
        this.svg.append("g")
            .attr("transform", `translate(0, ${this.height})`)
            .call(d3.axisBottom(this.x)); // X-axis for link count

        this.svg.append("g")
            .call(d3.axisLeft(this.y).tickFormat(d => {return Number.isInteger(d) ? `Book ${Math.floor(d)}` : ``})); // Y-axis for death chapter

    }

    wrangleDataLinks(data) {
        // console.log("Processed Data in network.js:", data);

        let nodes = [];
        let links = [];

        // Process nodes
        data.forEach((d, i) => {
            nodes.push({
                ...d,
                "id": i
            });
        });

        // Process links
        nodes.forEach((node, i) => {
            data.forEach((d) => {
                ["killed", "marriedEngaged", "guardianOf", "guardedBy", "killedBy", "parents", "parentOf", "serves", "servedBy", "siblings"].forEach((relation) => {
                    if (d[relation] && d[relation].includes(node.characterName)) {
                        let targetNode = nodes.find(n => n.characterName === d.characterName);
                        if (targetNode) {
                            links.push({
                                "source": node.id,
                                "target": targetNode.id,
                            });
                        }
                    }
                });
            });
        });

        // Count links for each node
        let linkCount = new Array(nodes.length).fill(0);
        let countedLinks = new Set();

        links.forEach(link => {
            let linkId = link.source < link.target ? `${link.source}-${link.target}` : `${link.target}-${link.source}`;

            if (!countedLinks.has(linkId)) {
                linkCount[link.source]++;
                linkCount[link.target]++;
                countedLinks.add(linkId);
            }
        });
        return linkCount;
    }

    prepareDataLinks() {
        // const linkCountArr = this.relationshipNetwork.linkCount;
        const linkCountArr = this.wrangleDataLinks(this.processedDataFull);

        let dataset = [];
        this.deathsData.forEach(death => {
            if (death['Book of Death'] && death['Death Chapter'] && this.characterMap.has(death.Name)) {
                const characterIndex = this.processedDataFull.findIndex(d => d.characterName === death.Name);
                const linkCount = linkCountArr[characterIndex];
                const bookScaledChapter = death['Book of Death'] + death['Death Chapter'] / this.chaptersPerBook;

                dataset.push({
                    name: death.Name,
                    bookScaledChapter: bookScaledChapter,
                    count: linkCount,
                    bookOfDeath: death['Book of Death'],
                    deathChapter: death['Death Chapter']
                });
            }
        });

        return dataset;
    }

    drawRelationships() {
        this.currentPlotType = 'Links';
        this.data = this.prepareDataLinks();
        this.x = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.count)]) // Domain based on link count
            .range([0, this.width]);
        this.clearPlot(); // Clear existing plot
        this.updateChart();
    }

    prepareDataBattles() {
        let dataset = [];
        this.processedDataFull.forEach(character => {
            let battleCount = 0;
            this.battlesData.forEach(battle => {
                // Convert the battle record into a string and check for character's name
                const battleString = JSON.stringify(battle).toLowerCase();
                const characterName = character.characterName.toLowerCase();
                if (battleString.includes(characterName)) {
                    battleCount++;
                }
            });

            if (this.characterMap.has(character.characterName)) {
                const characterIndex = this.processedDataFull.findIndex(d => d.characterName === character.characterName);
                const death = this.deathsData.find(d => d.Name === character.characterName);

                if (death && death['Book of Death'] && death['Death Chapter']) {
                    const bookScaledChapter = death['Book of Death'] + death['Death Chapter'] / this.chaptersPerBook;
                    dataset.push({
                        name: character.characterName,
                        bookScaledChapter: bookScaledChapter,
                        count: battleCount,
                        bookOfDeath: death['Book of Death'],
                        deathChapter: death['Death Chapter']
                    });
                }
            }
        });

        return dataset;
    }

    drawBattles() {
        this.currentPlotType = 'Battles';
        this.data = this.prepareDataBattles();
        this.x = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.count)]) // Domain based on link count
            .range([0, this.width]);
        this.clearPlot(); // Clear existing plot
        this.updateChart();
    }

    updateChart() {
        const plotTypeText = this.currentPlotType;
        // Tooltip setup
        const tooltip = d3.select("body").append("div")
            .attr("class", "scatter-tooltip")
            .style("opacity", 0);

        // Mouse event functions
        const mouseover = function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Character: ${d.name}<br>${plotTypeText}: ${d.count}<br>Death: Book ${d.bookOfDeath}, Chapter ${d.deathChapter}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        };

        const mousemove = function(event, d) {
            tooltip.style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        };

        const mouseleave = function(event, d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        };

        // Add dots (data points)
        this.svg.selectAll(".dot")
            .data(this.data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => this.x(d.count))
            .attr("cy", d => this.y(d.bookScaledChapter))
            .attr("r", 5)
            // .style("fill", "#69b3a2")
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
    }
}
