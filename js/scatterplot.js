class Scatterplot {
    constructor(processedDataFull, deathsData, battlesData) {
        this.processedDataFull = processedDataFull;
        this.deathsData = deathsData;
        this.battlesData = battlesData;
        this.currentPlotType = 'Links';  // 'Links' or 'Battles'
        // Initialize clicked tooltip state
        this.clickedTooltipData = null;
        // Bind event handlers
        this.mouseover = this.mouseover.bind(this);
        this.mouseleave = this.mouseleave.bind(this);
        this.clickDot = this.clickDot.bind(this);
        this.clickOutside = this.clickOutside.bind(this);

        // this.chaptersPerBook = 80; // Assuming each book has 80 chapters
        this.totalChapters = [73, 70, 82, 46, 73]; // Total chapters in each book
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
            .domain([1, d3.max(this.data, d => d.survivedChapters + 40)]) // Domain based on survivedChapters
            .range([this.height, 0]);

        // Add X and Y axis
        this.svg.append("g")
            .attr("transform", `translate(0, ${this.height})`)
            .call(d3.axisBottom(this.x)); // X-axis for link count

        this.svg.append("text")
            .attr("transform", `translate(${this.width/2}, ${this.height + this.margin.top + 20})`)
            .style("text-anchor", "middle")
            .text(`Number of ${this.currentPlotType}`);

        this.svg.append("g")
            .call(d3.axisLeft(this.y));
            // .call(d3.axisLeft(this.y).tickFormat(d => {return Number.isInteger(d) ? `Book ${Math.floor(d)}` : ``})); // Y-axis for death chapter

        this.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x", 0 - (this.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Survived Chapters");

        // Initialize the tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "scatter-tooltip")
            .style("opacity", 0);

        // Attach click event listener to the document
        d3.select(document).on("click", this.clickOutside);
    }

    clearPlot() {
        // Remove all elements inside the SVG
        this.svg.selectAll("*").remove();

        // Re-append the X and Y axis placeholders
        // Add X and Y axis
        this.svg.append("g")
            .attr("transform", `translate(0, ${this.height})`)
            .call(d3.axisBottom(this.x)); // X-axis for link count

        this.svg.append("text")
            .attr("transform", `translate(${this.width/2}, ${this.height + this.margin.top + 20})`)
            .style("text-anchor", "middle")
            .text(`Number of ${this.currentPlotType}`);

        this.svg.append("g")
            .call(d3.axisLeft(this.y));
            // .call(d3.axisLeft(this.y).tickFormat(d => {return Number.isInteger(d) ? `Book ${Math.floor(d)}` : ``})); // Y-axis for death chapter

        this.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x", 0 - (this.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Survived Chapters");

    }

    wrangleDataLinks(data) {
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

                // const bookScaledChapter = death['Book of Death'] + death['Death Chapter'] / this.chaptersPerBook;
                // Handle cases where 'Book of Intro' is empty
                if (!death['Book of Intro']) {
                    console.warn(`Missing 'Book of Intro' for ${death.Name}`);
                    return;
                }

                const introBook = death['Book of Intro'];
                let introChapter = death['Book Intro Chapter'];
                const deathBook = death['Book of Death'];
                let deathChapter = death['Death Chapter'];

                // Validate the chapter numbers
                if (introChapter > this.totalChapters[introBook - 1]) {
                    console.warn(`Intro Chapter number exceeds max for ${death.Name}`);
                    introChapter = 0
                }
                if  (deathBook && deathChapter > this.totalChapters[deathBook - 1]) {
                    console.warn(`Death Chapter number exceeds max for ${death.Name}`);
                    deathChapter = this.totalChapters[deathBook - 1]
                }

                // Check if the intro is later than death
                if (deathBook && (introBook > deathBook || (introBook === deathBook && introChapter > deathChapter))) {
                    console.warn(`Intro after death for ${death.Name}`);
                    return;
                }

                // Calculate survived chapters
                let survivedChapters = -1;
                for (let book = introBook; book <= (deathBook || 5); book++) {
                    let startChapter = book === introBook ? introChapter : 1;
                    let endChapter = book === deathBook ? deathChapter : this.totalChapters[book - 1];
                    survivedChapters += endChapter - startChapter + 1;
                }

                dataset.push({
                    name: death.Name,
                    survivedChapters: survivedChapters,
                    count: linkCount,
                    bookOfDeath: deathBook,
                    deathChapter: deathChapter,
                    introBook: introBook,
                    introChapter: introChapter
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
                    // const bookScaledChapter = death['Book of Death'] + death['Death Chapter'] / this.chaptersPerBook;
                    // Handle cases where 'Book of Intro' is empty
                    if (!death['Book of Intro']) {
                        console.warn(`Missing 'Book of Intro' for ${death.Name}`);
                        return;
                    }

                    const introBook = death['Book of Intro'];
                    let introChapter = death['Book Intro Chapter'];
                    const deathBook = death['Book of Death'];
                    let deathChapter = death['Death Chapter'];

                    // Validate the chapter numbers
                    if (introChapter > this.totalChapters[introBook - 1]) {
                        console.warn(`Intro Chapter number exceeds max for ${death.Name}`);
                        introChapter = 0
                    }
                    if  (deathBook && deathChapter > this.totalChapters[deathBook - 1]) {
                        console.warn(`Death Chapter number exceeds max for ${death.Name}`);
                        deathChapter = this.totalChapters[deathBook - 1]
                    }

                    // Check if the intro is later than death
                    if (deathBook && (introBook > deathBook || (introBook === deathBook && introChapter > deathChapter))) {
                        console.warn(`Intro after death for ${death.Name}`);
                        return;
                    }

                    // Calculate survived chapters
                    let survivedChapters = -1;
                    for (let book = introBook; book <= (deathBook || 5); book++) {
                        let startChapter = book === introBook ? introChapter : 1;
                        let endChapter = book === deathBook ? deathChapter : this.totalChapters[book - 1];
                        survivedChapters += endChapter - startChapter + 1;
                    }

                    dataset.push({
                        name: character.characterName,
                        survivedChapters: survivedChapters,
                        count: battleCount,
                        bookOfDeath: deathBook,
                        deathChapter: deathChapter,
                        introBook: introBook,
                        introChapter: introChapter
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

    // Mouse event functions
    mouseover(event, d) {
        // reset the clicked tooltip data
        if (this.clickedTooltipData && this.clickedTooltipData !== d) {
            // Remove 'selected' class from all dots
            d3.selectAll('.dot').classed('dot-selected', false);

            this.clickedTooltipData = null;
        }
        this.tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        // this.tooltip.html(`Character: ${d.name}<br>${this.currentPlotType}: ${d.count}<br>Death: Book ${d.bookOfDeath}, Chapter ${d.deathChapter}`)
        this.tooltip.html(`Character: ${d.name}<br>${this.currentPlotType}: ${d.count}<br>Intro: Book ${d.introBook}, Chapter ${d.introChapter}<br>Death: Book ${d.bookOfDeath || 'N/A'}, Chapter ${d.deathChapter || 'N/A'}<br>Survived Chapters: ${d.survivedChapters}`)
            .style("left", (event.pageX + 15) + "px") // +15 to prevent the tooltip from blocking the dot itself
            .style("top", (event.pageY - 28) + "px");
    }

    mouseleave(event, d) {
        if (!this.clickedTooltipData) {
            this.tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        }
    }

    clickDot(event, d) {
        // Remove 'selected' class from all dots
        d3.selectAll('.dot').classed('dot-selected', false);

        // Set the clicked dot as the new selected dot
        this.clickedTooltipData = d;
        d3.select(event.target).classed('dot-selected', true);

        this.mouseover(event, d);
        event.stopPropagation();
    }

    clickOutside() {
        if (this.clickedTooltipData) {
            // Remove 'selected' class when clicking outside
            d3.selectAll('.dot').classed('dot-selected', false);
            this.clickedTooltipData = null;
            this.tooltip.style("opacity", 0);
        }
    }

    updateChart() {
        const plotTypeText = this.currentPlotType;
        // Tooltip setup
        const tooltip = d3.select("body").append("div")
            .attr("class", "scatter-tooltip")
            .style("opacity", 0);

        // Add dots (data points)
        this.svg.selectAll(".dot")
            .data(this.data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => this.x(d.count))
            .attr("cy", d => this.y(d.survivedChapters))
            .attr("r", 5);

        this.svg.selectAll(".dot")
            .on("mouseover", this.mouseover)
            .on("mouseleave", this.mouseleave)
            .on("click", this.clickDot);
    }
}
