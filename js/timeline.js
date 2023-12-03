class Storyline{
    constructor(parentElement, data){
        this.parentElement = parentElement;
        this.fullData = data; // Store the full dataset
        this.data = data;

        this.tooltip = d3.select("body").append("div")
            .attr("class", "storyline-tooltip")
            .style("opacity", 0);

        this.renderStoryline();
    }
    renderStoryline(){
        let vis = this;

        vis.margin = {top:50, right:50, bottom:100, left:60};

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.bottom - vis.margin.top;

        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        let episodeDurations = {};
        vis.data.forEach(character => {
            character.timePeriods.forEach(period => {
                let key = `S${period.seasonNum}E${period.episodeNum}`;
                let periodDuration = this.sec(period.sceneEnd) - this.sec(period.sceneStart);
                episodeDurations[key] = (episodeDurations[key] || 0) + periodDuration;
            });
        });

        let cumulativeDurations = {};
        let totalDuration = 0;
        Object.keys(episodeDurations).sort().forEach(key => {
            cumulativeDurations[key] = totalDuration;
            totalDuration += episodeDurations[key];
        });

        //define scales
        vis.yScale = d3.scaleBand()
            .range([vis.height, 0])
            .domain(vis.data.map(d => d.characterName))
            .padding(0.1);

        vis.xScale = d3.scaleLinear()
            .range([0, vis.width])
            .domain([0, totalDuration]);

        let seasonBoundaries = {};
        vis.data.forEach(character => {
            character.timePeriods.forEach(period => {
                let seasonKey = `Season ${period.seasonNum}`;
                let key = `S${period.seasonNum}E${period.episodeNum}`;
                let xStart = vis.xScale(cumulativeDurations[key] + this.sec(period.sceneStart));
                let xEnd = vis.xScale(cumulativeDurations[key] + this.sec(period.sceneEnd));

                if (!seasonBoundaries[seasonKey]) {
                    seasonBoundaries[seasonKey] = { start: xStart, end: xEnd };
                } else {
                    seasonBoundaries[seasonKey].start = Math.min(seasonBoundaries[seasonKey].start, xStart);
                    seasonBoundaries[seasonKey].end = Math.max(seasonBoundaries[seasonKey].end, xEnd);
                }
            });
        });

        // Draw season rectangles
        Object.keys(seasonBoundaries).forEach(season => {
            vis.svg.append("rect")
                .attr("class", "season-rect")
                .attr("x", seasonBoundaries[season].start)
                .attr("y", 0)
                .attr("width", seasonBoundaries[season].end - seasonBoundaries[season].start)
                .attr("height", vis.height)
                .attr("fill", "none")
                .attr("stroke", "lightyellow")
                .attr("stroke-width", 0.5)
                .attr("transform", `translate(${vis.margin.left + 10}, 0)`);

            let titleX = seasonBoundaries[season].start + (seasonBoundaries[season].end - seasonBoundaries[season].start) / 2;

            // Draw the title above the rectangle
            vis.svg.append("text")
                .attr("class", "season-title")
                .attr("x", titleX)
                .attr("y", -5)
                .attr("text-anchor", "middle")
                .attr("fill", "lightyellow")
                .text(season)
                .attr("transform", `translate(${vis.margin.left + 10}, 0)`);
        });

        vis.seasonColors = d3.scaleOrdinal()
            .domain([...new Set(vis.data.flatMap(d => d.timePeriods.map(tp => tp.seasonNum)))])
            .range(["#ffffe0", "#fffacd", "#ffef96", "#ffe066", "#ffd700", "#e6c300", "#ccad00", "#d4af37"]);

        // Add y-axis
        vis.yAxis = d3.axisLeft(vis.yScale);

        vis.svg.append("g")
            .attr("class", "axis y-axis")
            .attr("transform", `translate(${vis.margin.left + 10}, 0)`)
            .call(vis.yAxis)
            .selectAll(".tick text")
            .attr("class", "axis-text");

        vis.data.forEach(character => {
            //bind the timePeriod data
            let rects = vis.svg.selectAll(".scene-rect-" + character.characterName)
                .data(character.timePeriods, d => d.sceneStart + "-" + d.sceneEnd);

            // Create rectangles
            rects.enter()
                .append("rect")
                .attr("class", "scene-rect-" + character.characterName)
                .attr("x", d => {
                    let key = `S${d.seasonNum}E${d.episodeNum}`;
                    return vis.xScale(cumulativeDurations[key] + this.sec(d.sceneStart));
                })
                .attr("y", d => vis.yScale(character.characterName))
                .attr("width", d => vis.xScale(this.sec(d.sceneEnd)) - vis.xScale(this.sec(d.sceneStart)))
                .attr("height", vis.yScale.bandwidth())
                .attr("transform", `translate(${vis.margin.left + 10}, 0)`)
                .attr("fill", d => vis.seasonColors(d.seasonNum))
                .attr("opacity", 0.8)
                .on("mouseover", function (event, d) {
                    vis.tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    vis.tooltip.html(`
                                  Season No. <b>${d.seasonNum}</b><br/>
                                  Episode No. <b>${d.episodeNum}</b><br/>
                                  Scene: <b>${d.sceneStart}</b> - <b>${d.sceneEnd}</b><br/>
                                  Character: <b>${character.characterName}</b>
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function (event, d) {
                    vis.tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        });
    }
    update(selectedCharacterNames = []) {
        let vis = this;

        vis.data = selectedCharacterNames.length > 0
            ? vis.fullData.filter(character => selectedCharacterNames.includes(character.characterName))
            : vis.fullData;
        // If no specific characters are selected, use the full dataset
        let filteredData = selectedCharacterNames.length > 0
            ? vis.data.filter(character => selectedCharacterNames.includes(character.characterName))
            : vis.data;

        // Remove the existing SVG to redraw it
        d3.select("#" + vis.parentElement).select("svg").remove();

        // Update the data
        vis.data = filteredData;

        // Re-render the storyline with the updated data
        vis.renderStoryline();
    }

    sec(timeString){
        var sec = 0;
        if (timeString.length == 0) return sec;
        var splitArray = timeString.split(":");
        sec = 3600*parseFloat(splitArray[0])+60*parseFloat(splitArray[1])+parseFloat(splitArray[2]);
        return sec;
   }

}
