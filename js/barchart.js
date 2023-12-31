class Barchart {
    constructor(parentElement, battlesData) {
        this.parentElement = parentElement;
        this.battlesData = battlesData;
        this.kingsData = this.processData();
        this.kingsArray = this.convertToArray(this.kingsData);


        $('#kingsuccess').on('shown.bs.modal', function() {
            let newWidth = document.getElementById(this.parentElement).getBoundingClientRect().width;
            if (newWidth > 0) {
                this.createChart(newWidth);
            } else {
                console.error("Invalid width for chart container.");
            }
        }.bind(this));

    }

    convertToArray(kingsData) {
        return Object.keys(kingsData).map(key => {
            return { king: key, ...kingsData[key] };
        });
    }

    processData() {
        let kingsData = {};

        this.battlesData.forEach(battle => {
            // Initialize data structure for each king
            [battle.attacker_king, battle.defender_king].forEach(king => {
                if (king && !kingsData[king]) {
                    kingsData[king] = {
                        attackingWins: 0,
                        attackingLosses: 0,
                        defendingWins: 0,
                        defendingLosses: 0
                    };
                }
            });

            // Increment attacking and defending counts
            if (battle.attacker_king) {
                if (battle.attacker_outcome === 'win') {
                    kingsData[battle.attacker_king].attackingWins += 1;
                } else if (battle.attacker_outcome === 'loss') {
                    kingsData[battle.attacker_king].attackingLosses += 1;
                }
            }
            if (battle.defender_king) {
                if (battle.attacker_outcome === 'loss') {
                    kingsData[battle.defender_king].defendingWins += 1;
                } else if (battle.attacker_outcome === 'win') {
                    kingsData[battle.defender_king].defendingLosses += 1;
                }
            }
        });

        return kingsData;
    }

    // Method to create the bar chart (to be implemented later)
    createChart(newWidth) {
        const vis = this;
        const margin = {top: 20, right: 30, bottom: 40, left: 140};
        const width = newWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Remove any existing SVG to avoid duplicates
        d3.select("#" + vis.parentElement).select("svg").remove();

        // Check if width is valid
        if (width <= 0) {
            console.error("Invalid width for chart container.");
            return;
        }

        // Append SVG Object to the body
        const svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("class", "bar-chart-svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create X and Y scales
        const x = d3.scaleLinear().domain([0, 30]).range([0, width]);
        const y = d3.scaleBand().range([0, height]).padding(0.1);
        this.kingsArray = this.convertToArray(this.kingsData);
        y.domain(this.kingsArray.map(d => d.king))

        const tooltip = d3.select("#tooltip");

        const mouseover = function(event, d) {
            function generateTooltipContent(d) {
                const totalBattles = d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses;
                const attackingBattles = d.attackingWins + d.attackingLosses;
                const defendingBattles = d.defendingWins + d.defendingLosses;

                const barHeight = 150;
                const barWidth = 50;
                const spacing = 40;
                const svgWidth = barWidth * 3 + spacing * 4;
                const labelOffset = 20;

                const titleHtml = `<strong style="padding-left: 50px; font-size: 18px;">${d.king}</strong><br><br><svg width="${svgWidth}" height="${barHeight + labelOffset * 2}">`;

                // Add legend in tooltip
                const legendHtml = `
                    <div style="float: right; clear: both; text-align: right; margin-top: 5px;">
                        <div><svg width="10" height="10" style="background-color: teal;"></svg> Wins&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                        <div><svg width="10" height="10" style="background-color: coral;"></svg> Losses&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                    </div>`;
                let html = legendHtml + titleHtml;

                // Function to create a bar and its labels
                const createBar = (x, wins, losses) => {
                    const total = wins + losses;
                    const winsHeight = total > 0 ? (wins / total) * barHeight : 0;
                    const lossesHeight = total > 0 ? (losses / total) * barHeight : 0;
                    const winsY = barHeight - winsHeight;
                    const lossesY = winsY - lossesHeight; // Position losses above wins

                    let barHtml = `<rect width="${barWidth}" height="${winsHeight}" fill="teal" x="${x}" y="${winsY}"></rect>` +
                        `<rect width="${barWidth}" height="${lossesHeight}" fill="coral" x="${x}" y="${lossesY}"></rect>`;

                    // Add text labels for wins and losses
                    if (wins > 0) {
                        barHtml += `<text x="${x + barWidth / 2}" y="${winsY + winsHeight / 2 + 5}" text-anchor="middle" fill="white" font-size="12">${wins}</text>`;
                    }
                    if (losses > 0) {
                        barHtml += `<text x="${x + barWidth / 2}" y="${lossesY + lossesHeight / 2 + 5}" text-anchor="middle" fill="white" font-size="12">${losses}</text>`;
                    }

                    return barHtml;
                };

                // Create bars with labels
                html += createBar(spacing, d.attackingWins + d.defendingWins, d.attackingLosses + d.defendingLosses);
                html += createBar(barWidth + spacing * 2, d.attackingWins, d.attackingLosses);
                html += createBar(barWidth * 2 + spacing * 3, d.defendingWins, d.defendingLosses);

                // Add labels below bars
                html += `<text x="${spacing + barWidth / 2}" y="${barHeight + labelOffset}" text-anchor="middle" font-size="16">Total</text>`;
                html += `<text x="${barWidth + spacing * 2 + barWidth / 2}" y="${barHeight + labelOffset}" text-anchor="middle" font-size="16">Attacking</text>`;
                html += `<text x="${barWidth * 2 + spacing * 3 + barWidth / 2}" y="${barHeight + labelOffset}" text-anchor="middle" font-size="16">Defending</text>`;

                html += `</svg>`;

                return html;
            }
            const modalRect = document.getElementById('kingsuccess').getBoundingClientRect();

            // Calculate position relative to the modal
            const relativeX = event.clientX - modalRect.left;
            const relativeY = event.clientY - modalRect.top;

            tooltip.style("opacity", 1);
            const htmlContent = generateTooltipContent(d);
            tooltip.html(htmlContent)
                .style("left", (relativeX + 10) + "px")
                .style("top", (relativeY - 100) + "px");

        };

        const mouseout = function(d) {
            tooltip.style("opacity", 0);
        };

        // Constants for bar segments
        const barHeight = y.bandwidth() / 2;
        const attackingColor = "#2f4f4f";
        const defendingColor = "#FFD700";

        // Group each pair of attacking and defending bars
        const barGroup = svg.selectAll(".bar-group")
            .data(this.kingsArray)
            .enter().append("g")
            .attr("class", "bar-group");

        // Create attacking bars
        barGroup.append("rect")
            .attr("class", "bar bar-attacking")
            .attr("x", 0)
            .attr("y", d => y(d.king) + barHeight / 2)
            .attr("width", d => x(d.attackingWins + d.attackingLosses))
            .attr("height", barHeight)
            .attr("fill", attackingColor)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

        // Create defending bars
        barGroup.append("rect")
            .attr("class", "bar bar-defending")
            .attr("x", d => x(d.attackingWins + d.attackingLosses))
            .attr("y", d => y(d.king) + barHeight / 2)
            .attr("width", d => x(d.defendingWins + d.defendingLosses))
            .attr("height", barHeight)
            .attr("fill", defendingColor)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

        // Add labels for attacking and defending
        svg.selectAll(".label-attacking")
            .data(this.kingsArray)
            .enter().append("text")
            .attr("x", d => x(d.attackingWins + d.attackingLosses) - 5)
            .attr("y", d => y(d.king) + barHeight)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .text(d => (d.attackingWins + d.attackingLosses > 0 && d.defendingWins + d.defendingLosses > 0) ? d.attackingWins + d.attackingLosses : "");

        svg.selectAll(".label-defending")
            .data(this.kingsArray)
            .enter().append("text")
            .attr("x", d => x(d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses) - 5) // Adjust position as needed
            .attr("y", d => y(d.king) + barHeight)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .text(d => (d.attackingWins + d.attackingLosses > 0 && d.defendingWins + d.defendingLosses > 0) ? d.defendingWins + d.defendingLosses : "");

        // Add label for total
        svg.selectAll(".label-total")
            .data(this.kingsArray)
            .enter().append("text")
            .attr("x", d => x(d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses) + 5)
            .attr("y", d => y(d.king) + barHeight)
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .text(d => d.attackingWins + d.attackingLosses + d.defendingWins + d.defendingLosses);

        // Add the X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // Add Legend at the upper right side
        const legendX = width - 30;
        const legendY = 30;
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${legendX}, ${legendY})`);

        // Add green rectangle for wins
        legend.append("rect")
            .attr("x", -5)
            .attr("y", -5)
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", "darkslategray");

        // Add yellow rectangle for losses
        legend.append("rect")
            .attr("x", -5)
            .attr("y", 25)
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", "gold");

        // Add text label for wins
        legend.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .text("Wins")
            .style("fill", "darkslategray")
            .attr("font-size", "15px");

        // Add text label for losses
        legend.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .text("Losses")
            .style("fill", "darkslategray")
            .attr("font-size", "15px");
    }
}
